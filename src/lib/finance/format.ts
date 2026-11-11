/** Rounding and display helpers shared by the engine, the UI and the memo number check. */

const nudge = (x: number) => (x >= 0 ? 1e-9 : -1e-9);

/** Money in $M is carried at two decimals. */
export function round2(x: number): number {
  return Math.round(x * 100 + nudge(x)) / 100;
}

/** Ratios are carried at four decimals (0.3785). */
export function round4(x: number): number {
  return Math.round(x * 10_000 + nudge(x)) / 10_000;
}

/**
 * "$13.4M", "$12.0M", "$0.25M": one decimal unless the hundredths digit matters.
 * This is the only place a dollar figure is turned into text.
 */
export function formatM(x: number): string {
  const rounded = round2(Math.abs(x));
  const two = rounded.toFixed(2);
  const text = two.endsWith("0") ? rounded.toFixed(1) : two;
  return `${x < 0 ? "-" : ""}$${text}M`;
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
