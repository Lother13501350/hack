/**
 * Acceptance check for the finance engine (issue #2).
 * Runs the engine on the demo fixtures and compares against the expected table.
 *   pnpm verify:finance
 */
import { sampleBuyer, sampleSynergies, sampleTarget } from "@/data";
import { formatPct, reviewDeal } from "@/lib/finance";

const review = reviewDeal({
  buyer: sampleBuyer,
  target: sampleTarget,
  synergies: sampleSynergies,
});
const walkAt = (realization: number) =>
  review.sensitivity
    .find((point) => point.realization === realization)
    ?.walkAwayM.toFixed(1) ?? "missing";

const rows: [label: string, actual: string, expected: string][] = [
  ["Normalized EBITDA", review.normalizedEbitdaM.toFixed(2), "2.40"],
  [
    "Customer concentration",
    formatPct(review.metrics.customerConcentration, 1),
    "37.9%",
  ],
  [
    "Customer concentration (display)",
    formatPct(review.metrics.customerConcentration),
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
