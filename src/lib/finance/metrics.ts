import type { DealMetrics, Financials } from "@/types/deal";
import { round2, round6 } from "./format";

export function customerConcentration(year: Financials): number | null {
  if (year.topCustomerRevenueM === null) return null;
  return year.topCustomerRevenueM / year.revenueM;
}

/** Days sales outstanding = receivables / revenue x 365. */
export function dsoDays(year: Financials): number {
  return (year.accountsReceivableM / year.revenueM) * 365;
}

export function grossMargin(year: Financials): number {
  return year.grossProfitM / year.revenueM;
}

export function revenueCagr(first: Financials, last: Financials): number {
  const years = last.fiscalYear - first.fiscalYear;
  if (years <= 0) return 0;
  return Math.pow(last.revenueM / first.revenueM, 1 / years) - 1;
}

/** Earliest and latest fiscal year, whatever order they arrive in. */
export function firstAndLast(financials: Financials[]): {
  first: Financials;
  last: Financials;
} {
  const sorted = [...financials].sort((a, b) => a.fiscalYear - b.fiscalYear);
  return { first: sorted[0], last: sorted[sorted.length - 1] };
}

export function computeMetrics(financials: Financials[]): DealMetrics {
  const { first, last } = firstAndLast(financials);
  const concentration = customerConcentration(last);
  return {
    fromYear: first.fiscalYear,
    toYear: last.fiscalYear,
    customerConcentration:
      concentration === null ? null : round6(concentration),
    dsoStartDays: round2(dsoDays(first)),
    dsoEndDays: round2(dsoDays(last)),
    grossMarginStart: round6(grossMargin(first)),
    grossMarginEnd: round6(grossMargin(last)),
    revenueCagr: round6(revenueCagr(first, last)),
  };
}
