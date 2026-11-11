/**
 * Acceptance check for the finance engine (issue #2).
 * Runs the engine on the demo fixtures and compares against the expected table.
 *   pnpm verify:finance
 */
import { sampleBuyer, sampleSynergies, sampleTarget } from "@/data";
import { formatPct, reviewDeal } from "@/lib/finance";
import { runBacktest } from "@/lib/backtest";

const review = reviewDeal({
  buyer: sampleBuyer,
  target: sampleTarget,
  synergies: sampleSynergies,
});
const backtest = runBacktest();
const walkAt = (realization: number) =>
  review.sensitivity
    .find((point) => point.realization === realization)
    ?.walkAwayM.toFixed(1) ?? "missing";

const rows: [label: string, actual: string, expected: string][] = [
  ["Normalized EBITDA", review.normalizedEbitdaM.toFixed(2), "2.40"],
  [
    "Customer concentration",
    formatPct(review.metrics.customerConcentration ?? Number.NaN, 1),
    "37.9%",
  ],
  [
    "Customer concentration (display)",
    formatPct(review.metrics.customerConcentration ?? Number.NaN),
    "38%",
  ],
  [
    "DSO",
    `${Math.round(review.metrics.dsoStartDays)} -> ${Math.round(review.metrics.dsoEndDays)}`,
    "52 -> 71",
  ],
  [
    "Gross margin",
    `${formatPct(review.metrics.grossMarginStart, 1)} -> ${formatPct(review.metrics.grossMarginEnd, 1)}`,
    "31.5% -> 28.9%",
  ],
  ["Revenue CAGR FY23-25", formatPct(review.metrics.revenueCagr, 1), "8.4%"],
  ["Standalone value (5.0x)", review.walkAway.standaloneM.toFixed(1), "12.0"],
  ["Walk-away 0%", walkAt(0), "11.4"],
  ["Walk-away 25%", walkAt(0.25), "12.4"],
  ["Walk-away 50%", walkAt(0.5), "13.4"],
  ["Walk-away 75%", walkAt(0.75), "14.4"],
  ["Walk-away 100%", walkAt(1), "15.4"],
  [
    "Combined EBITDA x 3.0",
    review.financing.grossDebtCapacityM.toFixed(1),
    "25.2",
  ],
  ["Max fundable", review.financing.maxFundableM.toFixed(1), "18.7"],
  ["Overpay on reported EBITDA", review.overpayIfReportedM.toFixed(1), "3.5"],
  ["Ask above base-case walk-away", review.askVsWalkAwayM.toFixed(1), "3.1"],
  ["Red flags", String(review.redFlags.length), "5"],
  ["multipleIsPlaceholder", String(review.multipleIsPlaceholder), "true"],
  // Issue #10: Electro-Sensors backtest. Expected values follow the issue comment,
  // except EV / 10-K EBITDA: the comment used the proxy's projected FY2025
  // depreciation (126); the 10-K cash flow statement reports 89, so EBITDA is 91.
  ["ELSE equity value ($M)", backtest.equityValueM.toFixed(2), "27.38"],
  ["ELSE enterprise value ($M)", backtest.enterpriseValueM.toFixed(2), "16.78"],
  ["ELSE net cash per share", backtest.netCashPerShare.toFixed(2), "3.00"],
  ["ELSE EV / 10-K EBITDA", backtest.multiples[0].multiple.toFixed(1), "184.3"],
  [
    "ELSE normalized EBITDA ($K)",
    (backtest.normalizedEbitdaM * 1000).toFixed(0),
    "1007",
  ],
  [
    "ELSE DealBrief value at 5.0x",
    backtest.dealBrief.perShareBase.toFixed(2),
    "4.43",
  ],
  ["ELSE EV / proxy EBITDA", backtest.multiples[1].multiple.toFixed(1), "45.6"],
  [
    "ELSE EV / proxy pro forma",
    backtest.multiples[3].multiple.toFixed(1),
    "13.1",
  ],
  ["ELSE EV / revenue", backtest.evToRevenue.toFixed(2), "1.65"],
  [
    "ELSE premium vs advisor median",
    formatPct(backtest.premiums.vsAdvisorMedian, 1),
    "54.1%",
  ],
  ["ELSE DSO FY25", Math.round(backtest.metrics.dsoEndDays).toString(), "51"],
];

let failed = 0;
for (const [label, actual, expected] of rows) {
  const ok = actual === expected;
  if (!ok) failed++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label.padEnd(34)} ${actual.padEnd(16)} expected ${expected}`,
  );
}
console.log(
  failed
    ? `\n${failed} of ${rows.length} checks failed`
    : `\nAll ${rows.length} checks passed`,
);
process.exit(failed ? 1 : 0);
