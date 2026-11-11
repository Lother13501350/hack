import type { DealMetrics, RedFlag, TargetCompany } from "@/types/deal";
import { formatDays, formatFY, formatM, formatM2, formatPct } from "./format";
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

/**
 * Rule-based red flags. Each carries the arithmetic (`formula`) and where the
 * inputs came from (`source`). `coach` starts as a fixed template; the review
 * API may replace it with LLM wording, never with new numbers.
 */
export function detectRedFlags(
  target: TargetCompany,
  metrics: DealMetrics,
  multiple: number,
  thresholds = RED_FLAG_THRESHOLDS,
): RedFlag[] {
  const { last } = firstAndLast(target.financials);
  const fromFY = formatFY(metrics.fromYear);
  const toFY = formatFY(metrics.toYear);
  const sourceOf = (field: string) =>
    target.fieldSources?.[field] ?? target.sourceFile;
  const flags: RedFlag[] = [];
  const uniqueId = (base: string) => {
    const taken = flags.filter((flag) => flag.id.startsWith(base)).length;
    return taken === 0 ? base : `${base}_${taken + 1}`;
  };

  if (
    metrics.customerConcentration !== null &&
    last.topCustomerRevenueM !== null &&
    metrics.customerConcentration >= thresholds.customerConcentration
  ) {
    const share = formatPct(metrics.customerConcentration);
    flags.push({
      id: "customer_concentration",
      severity: "HIGH",
      shortLabel: "Concentration",
      title: `One customer is ${share} of revenue`,
      metric: share,
      formula: `Top customer revenue ÷ total revenue = ${formatM(last.topCustomerRevenueM)} ÷ ${formatM(last.revenueM)}`,
      source: `Source: ${sourceOf("topCustomerRevenueM")}`,
      coach:
        "If this customer leaves after you buy, over a third of revenue leaves too. Experts check how long the contract runs, whether it can be cancelled when the owner changes, and whether the relationship belongs to the company or to the owner personally.",
      stage: "cim",
    });
  }

  const dsoIncrease = metrics.dsoEndDays - metrics.dsoStartDays;
  if (dsoIncrease >= thresholds.dsoIncreaseDays) {
    flags.push({
      id: "dso_increase",
      severity: "HIGH",
      shortLabel: "Slow payment",
      title: "Customers are paying slower",
      metric: `${Math.round(metrics.dsoStartDays)} → ${formatDays(metrics.dsoEndDays)}`,
      formula: "Days sales outstanding = receivables ÷ revenue × 365",
      source: `Source: ${sourceOf("accountsReceivableM")}`,
      coach:
        "Cash is getting stuck. Slower payment can mean disputes, weak customers, or sales pushed out early to make the year look better. Ask for an aging report showing which invoices are late and by how much.",
      stage: "cim",
    });
  }

  const marginDropPts =
    (metrics.grossMarginStart - metrics.grossMarginEnd) * 100;
  if (marginDropPts >= thresholds.grossMarginDropPts) {
    flags.push({
      id: "gross_margin_decline",
      severity: "MED",
      shortLabel: "Margin",
      title: `Gross margin fell ${marginDropPts.toFixed(1)} points`,
      metric: `${formatPct(metrics.grossMarginStart, 1)} → ${formatPct(metrics.grossMarginEnd, 1)}`,
      formula: `Gross profit ÷ revenue, ${fromFY} vs ${toFY}`,
      source: `Source: ${sourceOf("grossProfitM")}`,
      coach:
        "Either costs rose and the company could not pass them on, or it cut prices to win volume. Both mean less pricing power than the growth rate suggests.",
      stage: "cim",
    });
  }

  for (const adjustment of target.adjustments) {
    if (adjustment.amountM <= 0) continue;
    if (adjustment.category === "one_time_revenue") {
      flags.push({
        id: uniqueId("one_time_revenue"),
        severity: "MED",
        shortLabel: "One-time revenue",
        title: `One-time revenue inside ${toFY}`,
        metric: formatM2(adjustment.amountM),
        formula: adjustment.note ?? adjustment.label,
        source: `Source: ${adjustment.source}`,
        coach: `You pay a multiple of earnings, so every dollar of one-off profit can cost you ${multiple} dollars of price. Remove it before valuing.`,
        stage: "data_room",
      });
    }
    if (
      adjustment.category === "owner_compensation" &&
      adjustment.type === "add_cost"
    ) {
      const hasDetail =
        adjustment.marketM !== undefined && adjustment.actualM !== undefined;
      flags.push({
        id: uniqueId("owner_pay"),
        severity: "MED",
        shortLabel: "Owner dependence",
        title: "Owner is paid below market",
        metric: formatM2(-adjustment.amountM),
        formula: hasDetail
          ? `Market CEO pay ${formatM2(adjustment.marketM as number)} − owner salary ${formatM2(adjustment.actualM as number)}`
          : `Market CEO pay − owner salary = ${formatM2(adjustment.amountM)}`,
        source: `Source: ${adjustment.source}`,
        coach:
          "After the sale you must hire someone to run the company at market pay. That cost is real even though it is not in the seller’s numbers.",
        stage: "data_room",
      });
    }
  }

  return flags;
}
