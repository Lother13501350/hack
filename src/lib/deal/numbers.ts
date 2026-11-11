/**
 * Guards that keep LLM prose from introducing numbers the engine did not compute.
 */
import type { DealReview } from "@/types/deal";

const NUMBER = /\d+(?:\.\d+)?/g;
const DOLLAR_AMOUNT = /\$\s?(\d+(?:,\d{3})*(?:\.\d+)?)/g;

function numbersIn(text: string): number[] {
  return (text.replace(/,/g, "").match(NUMBER) ?? []).map(Number);
}

/** Every number in `text` must also appear in `allowedText`. */
export function usesOnlyNumbersFrom(
  text: string,
  allowedText: string,
): boolean {
  const allowed = numbersIn(allowedText);
  return numbersIn(text).every((value) =>
    allowed.some((candidate) => Math.abs(candidate - value) < 0.005),
  );
}

/** Every dollar figure the engine produced for this review, in $M. */
export function reviewAmountsM(review: DealReview): number[] {
  const amounts = [
    review.askingPriceM,
    review.reportedEbitdaM,
    review.normalizedEbitdaM,
    review.walkAway.standaloneM,
    review.walkAway.synergyM,
    review.walkAway.integrationCostM,
    review.walkAway.walkAwayM,
    review.openingBidM,
    review.financing.debtCapacityM,
    review.financing.cashAvailableM,
    review.financing.maxFundableM,
    review.overpayIfReportedM,
    review.askVsWalkAwayM,
    ...review.sensitivity.map((point) => point.walkAwayM),
    ...review.bridge.flatMap((row) => [row.deltaM, row.runningM]),
  ];
  // Inputs quoted in red-flag arithmetic (e.g. $8.1M of $21.4M) are fair game too.
  for (const flag of review.redFlags) {
    for (const text of [flag.metric, flag.formula]) {
      for (const match of text.matchAll(DOLLAR_AMOUNT)) {
        amounts.push(Number(match[1].replace(/,/g, "")));
      }
    }
  }
  return amounts.map(Math.abs);
}

/** Dollar figures in `text` that are not in the review. Empty means the text is clean. */
export function unknownAmounts(text: string, review: DealReview): string[] {
  const allowed = reviewAmountsM(review);
  const unknown: string[] = [];
  for (const match of text.matchAll(DOLLAR_AMOUNT)) {
    const value = Number(match[1].replace(/,/g, ""));
    if (!allowed.some((amount) => Math.abs(amount - value) < 0.005)) {
      unknown.push(match[0]);
    }
  }
  return unknown;
}
