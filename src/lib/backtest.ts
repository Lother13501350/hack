/**
 * Real-deal backtest (issue #10): run the DealBrief engine on Electro-Sensors
 * and compare its answer with what the buyer actually paid and with the
 * board's financial advisor.
 *
 * Every input comes from the fixture, which copies figures from SEC filings.
 * Every output is computed here. No LLM is involved.
 */
import backtestJson from "@/data/electro-sensors.json";
import {
  computeMetrics,
  detectRedFlags,
  normalizeEbitda,
  round2,
  round4,
} from "@/lib/finance";
import {
  enterpriseValueM,
  equityValueM,
  impliedMultiple,
  perShareFromEnterpriseValue,
  premium,
} from "@/lib/finance/valuation";
import {
  type BacktestFixture,
  BacktestFixtureSchema,
  type FiledYear,
} from "@/types/backtest";
import type {
  Adjustment,
  BridgeItem,
  DealMetrics,
  Financials,
  RedFlag,
} from "@/types/deal";

export const electroSensors: BacktestFixture =
  BacktestFixtureSchema.parse(backtestJson);

/** Placeholder multiples around DealBrief's 5.0x default. Not sourced. */
export const BACKTEST_MULTIPLES = { low: 4, base: 5, high: 6 };

/** $K as filed to $M. Not rounded: rounding happens once, on output. */
const toM = (valueK: number) => valueK / 1000;

/** Converts a filed year ($K) into the engine's Financials ($M). */
function toFinancials(year: FiledYear): Financials {
  return {
    fiscalYear: year.fiscalYear,
    revenueM: toM(year.revenue.valueK),
    grossProfitM: toM(year.grossProfit.valueK),
    ebitdaReportedM: toM(
      year.operatingIncome.valueK + year.depreciation.valueK,
    ),
    accountsReceivableM: toM(year.receivables.valueK),
    // The 10-K only says no customer reached 10% of revenue.
    topCustomerRevenueM: null,
    cashM: toM(year.cash.valueK + year.investments.valueK),
    debtM: toM(year.borrowings.valueK),
  };
}

export interface MultipleBasis {
  label: string;
  ebitdaM: number;
  multiple: number;
  source: string;
}

export interface Backtest {
  fixture: BacktestFixture;
  latestYear: number;
  equityValueM: number;
  /** Basic shares plus Dec-2025 options (treasury stock method) and RSUs. */
  dilutedShares: number;
  dilutedEquityValueM: number;
  cashAndInvestmentsM: number;
  debtM: number;
  enterpriseValueM: number;
  netCashPerShare: number;
  operatingValuePerShare: number;
  /** EV / EBITDA on each basis, from the raw 10-K figure to the proxy's pro forma. */
  multiples: MultipleBasis[];
  evToRevenue: number;
  reportedEbitdaM: number;
  normalizedEbitdaM: number;
  bridge: BridgeItem[];
  metrics: DealMetrics;
  redFlags: RedFlag[];
  dealBrief: {
    multiples: typeof BACKTEST_MULTIPLES;
    perShareLow: number;
    perShareBase: number;
    perShareHigh: number;
  };
  /** The proxy's FY estimate next to what the 10-K later reported. */
  projectionVsActual: {
    fiscalYear: number;
    projectedRevenueM: number;
    actualRevenueM: number;
    projectedOperatingIncomeM: number;
    actualOperatingIncomeM: number;
  } | null;
  premiums: {
    vsUnaffected: number;
    vsAdvisorMedian: number;
    vsDealBriefBase: number;
  };
  advisorHigh: number;
}

export function runBacktest(fixture = electroSensors): Backtest {
  const years = [...fixture.filed].sort((a, b) => a.fiscalYear - b.fiscalYear);
  const latest = years[years.length - 1];
  const financials = years.map(toFinancials);
  const last = financials[financials.length - 1];

  const adjustments: Adjustment[] = [
    {
      id: "public_company_costs",
      label: "Public company costs and related items (proxy)",
      amountM: toM(fixture.publicCompanyCosts.valueK),
      type: "add_back",
      category: "other",
      source: fixture.publicCompanyCosts.source,
    },
  ];
  const { normalizedEbitdaM, bridge } = normalizeEbitda(
    last.ebitdaReportedM,
    adjustments,
    `${latest.operatingIncome.source}; depreciation from ${latest.depreciation.source}`,
  );
  const metrics = computeMetrics(financials);
  const redFlags = detectRedFlags(
    {
      name: fixture.target.name,
      location: fixture.target.location,
      askingPriceM: 1,
      sourceFile: "10-K FY2025",
      financials,
      adjustments,
    },
    metrics,
    BACKTEST_MULTIPLES.base,
  );

  const { deal } = fixture;
  const equityM = equityValueM(deal.sharesOutstanding, deal.pricePerShare);
  // Treasury stock method: in-the-money options net of exercise proceeds, plus RSUs.
  const { dilution } = fixture;
  const optionShares =
    dilution.optionExercisePrice < deal.pricePerShare
      ? dilution.options *
        (1 - dilution.optionExercisePrice / deal.pricePerShare)
      : 0;
  const dilutedShares = deal.sharesOutstanding + optionShares + dilution.rsus;
  const cashM = last.cashM;
  const debtM = last.debtM;
  const evM = enterpriseValueM(equityM, cashM, debtM);
  const netCashPerShare =
    ((cashM - debtM) * 1_000_000) / deal.sharesOutstanding;

  const projected = fixture.projections.rows.find(
    (row) => row.fiscalYear === latest.fiscalYear,
  );
  const multiples: MultipleBasis[] = [
    {
      label: `${latest.fiscalYear} EBITDA as reported in the 10-K`,
      ebitdaM: round4(last.ebitdaReportedM),
      multiple: impliedMultiple(evM, last.ebitdaReportedM),
      source: "10-K operating income + depreciation",
    },
    ...(projected
      ? [
          {
            label: `${latest.fiscalYear} EBITDA in the proxy (pre-signing estimate)`,
            ebitdaM: toM(projected.ebitdaK),
            multiple: impliedMultiple(evM, toM(projected.ebitdaK)),
            source: fixture.projections.source,
          },
        ]
      : []),
    {
      label: "DealBrief normalized EBITDA (10-K + public company costs)",
      ebitdaM: round4(normalizedEbitdaM),
      multiple: impliedMultiple(evM, normalizedEbitdaM),
      source: "Computed from the bridge",
    },
    ...(projected
      ? [
          {
            label: `${latest.fiscalYear} pro forma EBITDA in the proxy`,
            ebitdaM: toM(projected.proFormaEbitdaK),
            multiple: impliedMultiple(evM, toM(projected.proFormaEbitdaK)),
            source: fixture.projections.source,
          },
        ]
      : []),
  ];

  const perShareAt = (multiple: number) =>
    perShareFromEnterpriseValue(
      normalizedEbitdaM * multiple,
      cashM,
      debtM,
      deal.sharesOutstanding,
    );
  const dealBrief = {
    multiples: BACKTEST_MULTIPLES,
    perShareLow: round2(perShareAt(BACKTEST_MULTIPLES.low)),
    perShareBase: round2(perShareAt(BACKTEST_MULTIPLES.base)),
    perShareHigh: round2(perShareAt(BACKTEST_MULTIPLES.high)),
  };

  return {
    fixture,
    latestYear: latest.fiscalYear,
    equityValueM: round2(equityM),
    dilutedShares: Math.round(dilutedShares),
    dilutedEquityValueM: round2(
      equityValueM(dilutedShares, deal.pricePerShare),
    ),
    cashAndInvestmentsM: round2(cashM),
    debtM: round2(debtM),
    enterpriseValueM: round2(evM),
    netCashPerShare: round2(netCashPerShare),
    operatingValuePerShare: round2(deal.pricePerShare - netCashPerShare),
    multiples,
    evToRevenue: Math.round((evM / last.revenueM) * 100) / 100,
    reportedEbitdaM: round4(last.ebitdaReportedM),
    normalizedEbitdaM: round4(normalizedEbitdaM),
    bridge,
    metrics,
    redFlags,
    dealBrief,
    projectionVsActual: projected
      ? {
          fiscalYear: latest.fiscalYear,
          projectedRevenueM: toM(projected.revenueK),
          actualRevenueM: last.revenueM,
          projectedOperatingIncomeM: toM(projected.operatingIncomeK),
          actualOperatingIncomeM: toM(latest.operatingIncome.valueK),
        }
      : null,
    premiums: {
      vsUnaffected: premium(deal.pricePerShare, deal.unaffectedClose),
      vsAdvisorMedian: premium(
        deal.pricePerShare,
        fixture.advisor.medianPerShare,
      ),
      vsDealBriefBase: premium(
        deal.pricePerShare,
        perShareAt(BACKTEST_MULTIPLES.base),
      ),
    },
    advisorHigh: Math.max(
      ...fixture.advisor.methods.map((method) => method.perShareHigh),
    ),
  };
}
