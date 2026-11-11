/** Rounding and display helpers shared by the engine, the UI and the memo number check. */

const nudge = (x: number) => (x >= 0 ? 1e-9 : -1e-9);

/** Money in $M is carried at two decimals. */
export function round2(x: number): number {
  return Math.round(x * 100 + nudge(x)) / 100;
}

/** Ratios carried at six decimals, so display rounding happens only once. */
export function round6(x: number): number {
  return Math.round(x * 1_000_000 + nudge(x)) / 1_000_000;
}

/** Four decimals, for amounts in $M that need $100 precision. */
export function round4(x: number): number {
  return Math.round(x * 10_000 + nudge(x)) / 10_000;
}

function money(x: number, digits: number): string {
  const sign = x < 0 ? "−" : "";
  return `${sign}$${(Math.abs(x) + 1e-9).toFixed(digits)}M`;
}

/** Price-sized amounts: "$13.4M", "$12.0M". */
export function formatM1(x: number): string {
  return money(x, 1);
}

/** Earnings-sized amounts: "$2.40M", "$0.25M". */
export function formatM2(x: number): string {
  return money(x, 2);
}

/** One decimal unless the hundredths digit matters: "$8.1M", "$4.16M". Used inside formulas. */
export function formatM(x: number): string {
  const two = money(x, 2);
  return two.endsWith("0M") ? money(x, 1) : two;
}

/** Signed change with no unit, for the EBITDA bridge: "−0.40", "+0.10". */
export function formatDelta(x: number): string {
  return `${x < 0 ? "−" : "+"}${(Math.abs(x) + 1e-9).toFixed(2)}`;
}

/** 0.3785 -> "38%" (digits 0) or "37.9%" (digits 1). */
export function formatPct(ratio: number, digits = 0): string {
  return `${(ratio * 100 + nudge(ratio)).toFixed(digits)}%`;
}

export function formatDays(days: number): string {
  return `${Math.round(days)} days`;
}

export function formatFY(year: number): string {
  return `FY${String(year).slice(-2)}`;
}
