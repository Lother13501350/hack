import type { DealMetrics, RedFlag, TargetCompany } from "@/types/deal";
import { formatDays, formatFY, formatM, formatPct, round2 } from "./format";
import { firstAndLast } from "./metrics";

/** First-pass thresholds from issue #2. Tunable. */
export const RED_FLAG_THRESHOLDS = {
  /** Top customer share of revenue at or above this is HIGH. */
  customerConcentration: 0.3,
  /** DSO rising by at least this many days over the period is HIGH. */
  dsoIncreaseDays: 15,
  /** Gross margin falling by at least this many points is MED. */
  grossMarginDropPts: 2,
};

function fieldSource(target: TargetCompany, field: string): string {
  const cell = target.fieldSources?.[field];
  return cell ? `${target.sourceFile} › ${cell}` : target.sourceFile;
}

/**
 * Rule-based red flags. Each carries the arithmetic (`formula`) and where the
 * inputs came from (`source`). `coach` starts as a fixed template; the review
 * API may replace it with LLM wording, never with new numbers.
 */
export function detectRedFlags(
  target: TargetCompany,
  metrics: DealMetrics,
  thresholds = RED_FLAG_THRESHOLDS,
): RedFlag[] {
  const { first, last } = firstAndLast(target.financials);
  const fromFY = formatFY(metrics.fromYear);
  const toFY = formatFY(metrics.toYear);
  const flags: RedFlag[] = [];

  if (metrics.customerConcentration >= thresholds.customerConcentration) {
    const share = formatPct(metrics.customerConcentration);
    flags.push({
      id: "customer_concentration",
      severity: "HIGH",
      title: `One customer is ${share} of revenue`,
      metric: `${share} of revenue`,
      formula: `${formatM(last.topCustomerRevenueM)} ÷ ${formatM(last.revenueM)} = ${formatPct(metrics.customerConcentration, 1)}`,
      source: fieldSource(target, "topCustomerRevenueM"),
      coach:
        "If that customer leaves or pushes on price, more than a third of the business moves with it. Experts ask to see the contract, how long it runs, and whether it can be cancelled when the owner changes.",
      stage: "cim",
    });
  }

  const dsoIncrease = metrics.dsoEndDays - metrics.dsoStartDays;
  if (dsoIncrease >= thresholds.dsoIncreaseDays) {
    const start = formatDays(metrics.dsoStartDays);
    const end = formatDays(metrics.dsoEndDays);
    flags.push({
      id: "dso_increase",
      severity: "HIGH",
      title: "Customers are paying slower",
      metric: `${Math.round(metrics.dsoStartDays)} → ${end}`,
      formula: `${fromFY}: ${formatM(first.accountsReceivableM)} ÷ ${formatM(first.revenueM)} × 365 = ${start}; ${toFY}: ${formatM(last.accountsReceivableM)} ÷ ${formatM(last.revenueM)} × 365 = ${end}`,
      source: fieldSource(target, "accountsReceivableM"),
      coach:
        "Sales that are booked but not collected are not cash yet. A jump like this can mean a customer in trouble, disputed invoices, or revenue pulled forward to make the year look better. Ask for the list of unpaid invoices by age.",
      stage: "cim",
    });
  }

  const marginDropPts =
    (metrics.grossMarginStart - metrics.grossMarginEnd) * 100;
  if (marginDropPts >= thresholds.grossMarginDropPts) {
    flags.push({
      id: "gross_margin_decline",
      severity: "MED",
      title: "Gross margin is slipping",
      metric: `${formatPct(metrics.grossMarginStart, 1)} → ${formatPct(metrics.grossMarginEnd, 1)}`,
      formula: `${fromFY}: ${formatM(first.grossProfitM)} ÷ ${formatM(first.revenueM)} = ${formatPct(metrics.grossMarginStart, 1)}; ${toFY}: ${formatM(last.grossProfitM)} ÷ ${formatM(last.revenueM)} = ${formatPct(metrics.grossMarginEnd, 1)}`,
      source: fieldSource(target, "grossProfitM"),
      coach:
        "Revenue grew while each dollar of it earned less. That usually means rising material or labor costs the company could not pass on, or discounts to keep a big customer. Ask which it is before assuming the margin comes back.",
      stage: "cim",
    });
  }

  for (const adjustment of target.adjustments) {
    if (adjustment.category === "one_time_revenue" && adjustment.amountM > 0) {
      flags.push({
        id: `one_time_revenue_${adjustment.id}`,
        severity: "MED",
        title: "Profit includes a one-time item",
        metric: `${formatM(adjustment.amountM)} will not repeat`,
        formula: `${adjustment.label}: ${formatM(adjustment.amountM)} removed from EBITDA`,
        source: adjustment.source,
        coach:
          "The price is a multiple of yearly profit, so profit that happens once gets paid for several times over. Experts take it out before applying the multiple.",
        stage: "data_room",
      });
    }
    if (
      adjustment.category === "owner_compensation" &&
      adjustment.type === "add_cost" &&
      adjustment.amountM > 0
    ) {
      flags.push({
        id: `owner_pay_${adjustment.id}`,
        severity: "MED",
        title: "The owner is paid below market",
        metric: `${formatM(adjustment.amountM)} a year understated`,
        formula: `Market CEO pay − owner's pay = ${formatM(round2(adjustment.amountM))} a year`,
        source: adjustment.source,
        coach:
          "The owner leaves after the sale and you will pay a replacement the market rate. That extra cost comes out of profit every year, so the reported profit overstates what you are buying.",
        stage: "data_room",
      });
    }
  }

  return flags;
}
