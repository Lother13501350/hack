/**
 * Decision memo (issue #5).
 * The recommendation and every dollar figure are decided in code.
 * The LLM writes reasons, risks, conditions and questions around them.
 */
import { z } from "zod";
import { formatFY, formatM, formatPct } from "@/lib/finance";
import { chatJSON, isLlmConfigured } from "@/lib/llm";
import type {
  AcquisitionCriteria,
  DealMemo,
  DealReview,
  Recommendation,
  RedFlag,
} from "@/types/deal";
import { unknownAmounts } from "./numbers";

/** Above this multiple of the full-synergy walk-away, the gap is too wide to negotiate. */
const WALK_AWAY_RATIO = 1.25;

function walkAwayAt(review: DealReview, realization: number): number {
  return (
    review.sensitivity.find((point) => point.realization === realization)
      ?.walkAwayM ?? review.walkAway.walkAwayM
  );
}

/**
 * Rule from issue #5: an ask above the limit means "Proceed with conditions"
 * with the cap spelled out. Far above even the full-synergy value means walk away.
 */
export function decideRecommendation(review: DealReview): Recommendation {
  if (review.normalizedEbitdaM <= 0) return "Walk away";
  if (review.askingPriceM <= review.walkAway.walkAwayM) return "Proceed";
  if (review.askingPriceM > walkAwayAt(review, 1) * WALK_AWAY_RATIO) {
    return "Walk away";
  }
  return "Proceed with conditions";
}

function priceLines(review: DealReview): {
  priceGuidance: string;
  askGap: string;
} {
  const realization = review.walkAway.realization;
  const caseLabel =
    realization === 0.5
      ? "base case"
      : `${formatPct(realization)} of synergies counted`;
  const gap = review.askVsWalkAwayM;
  return {
    priceGuidance: `Do not exceed ${formatM(review.walkAway.walkAwayM)} (${caseLabel})`,
    askGap:
      gap > 0
        ? `The ask is ${formatM(gap)} above`
        : `The ask is ${formatM(-gap)} inside your limit`,
  };
}

const QUESTION_BY_FLAG: Record<string, (flag: RedFlag) => string> = {
  customer_concentration: () =>
    "Can we see the contract with your largest customer, including its term and what happens to it if ownership changes?",
  dso_increase: () =>
    "Can you share the list of unpaid invoices by age, and explain why customers are taking longer to pay?",
  gross_margin_decline: () =>
    "What drove the drop in gross margin, and which of those costs have you been able to pass on to customers?",
  one_time_revenue: () =>
    "Which revenue in the latest year came from orders you do not expect to repeat?",
  owner_pay: () =>
    "What does the owner do day to day, and what would it cost to hire someone to do it after the sale?",
};

function questionFor(flag: RedFlag): string {
  const key = Object.keys(QUESTION_BY_FLAG).find((prefix) =>
    flag.id.startsWith(prefix),
  );
  return key
    ? QUESTION_BY_FLAG[key](flag)
    : `Can you walk us through this: ${flag.title.toLowerCase()}?`;
}

const CONDITION_BY_FLAG: Record<string, string> = {
  customer_concentration:
    "See the contract with the largest customer before signing a letter of intent.",
  dso_increase: "Get the list of unpaid invoices by age.",
  gross_margin_decline:
    "Get gross margin by customer and by product line for the last three years.",
  one_time_revenue:
    "Have the seller confirm in writing which revenue was one-time.",
  owner_pay: "Agree how long the owner stays on and at what pay.",
};

function conditionFor(flag: RedFlag): string | undefined {
  const key = Object.keys(CONDITION_BY_FLAG).find((prefix) =>
    flag.id.startsWith(prefix),
  );
  return key ? CONDITION_BY_FLAG[key] : undefined;
}

/** Memo written entirely from templates and engine numbers. Always available. */
export function templateMemo(review: DealReview): DealMemo {
  const { metrics } = review;
  const adjustmentCount = review.bridge.filter(
    (row) => row.kind === "adjustment",
  ).length;
  const highFlags = review.redFlags.filter((flag) => flag.severity === "HIGH");
  const risks = [
    ...highFlags,
    ...review.redFlags.filter((f) => f.severity === "MED"),
  ]
    .slice(0, 3)
    .map((flag) =>
      // Skip the metric when the title already states it ("One customer is 38% of revenue").
      flag.title.includes(flag.metric.split(" ")[0])
        ? `${flag.title}.`
        : `${flag.title} (${flag.metric}).`,
    );

  return {
    recommendation: decideRecommendation(review),
    ...priceLines(review),
    reasons: [
      `${formatM(review.normalizedEbitdaM)} of the ${formatM(review.reportedEbitdaM)} reported yearly profit holds up after ${adjustmentCount} adjustments.`,
      `At ${review.multiple.toFixed(1)}x that is worth ${formatM(review.walkAway.standaloneM)} on its own, and you can fund up to ${formatM(review.financing.maxFundableM)}, so money is not the constraint.`,
      `Revenue grew ${formatPct(metrics.revenueCagr, 1)} a year from ${formatFY(metrics.fromYear)} to ${formatFY(metrics.toYear)}.`,
    ],
    risks,
    conditionsBeforeLoi: review.redFlags
      .map(conditionFor)
      .filter((condition): condition is string => Boolean(condition))
      .slice(0, 4),
    sellerQuestions: review.redFlags.slice(0, 5).map((flag) => ({
      question: questionFor(flag),
      redFlagId: flag.id,
    })),
    source: "template",
  };
}

const MemoReplySchema = z.object({
  reasons: z.array(z.string()).length(3),
  risks: z.array(z.string()).length(3),
  conditionsBeforeLoi: z.array(z.string()).min(2).max(4),
  sellerQuestions: z
    .array(z.object({ question: z.string(), redFlagId: z.string() }))
    .min(1)
    .max(5),
});

const SYSTEM = `You are writing a short decision memo for a CEO who is considering buying a company.
You are given a computed deal review and the recommendation, which is already decided.
Write:
- reasons: 3 reasons that support the recommendation.
- risks: 3 risks, most serious first.
- conditionsBeforeLoi: 2 to 4 things to obtain before signing a letter of intent.
- sellerQuestions: one question for the seller per red flag (up to 5), each with that flag's id as redFlagId.
Rules:
- Use only dollar amounts and percentages that appear in the review. Never calculate or estimate a new number.
- Write dollar amounts exactly as "$13.4M".
- Plain language, one sentence per item. Do not restate the recommendation or the price limit.`;

function problemsWith(
  reply: z.infer<typeof MemoReplySchema>,
  review: DealReview,
): string[] {
  const problems: string[] = [];
  const text = [
    ...reply.reasons,
    ...reply.risks,
    ...reply.conditionsBeforeLoi,
    ...reply.sellerQuestions.map((entry) => entry.question),
  ].join("\n");
  const unknown = unknownAmounts(text, review);
  if (unknown.length) {
    problems.push(
      `These dollar amounts are not in the review: ${unknown.join(", ")}`,
    );
  }
  const flagIds = new Set(review.redFlags.map((flag) => flag.id));
  const badIds = reply.sellerQuestions
    .map((entry) => entry.redFlagId)
    .filter((id) => !flagIds.has(id));
  if (badIds.length) {
    problems.push(`Unknown redFlagId values: ${badIds.join(", ")}`);
  }
  const expected = Math.min(5, review.redFlags.length);
  if (new Set(reply.sellerQuestions.map((e) => e.redFlagId)).size < expected) {
    problems.push(`Write one question for each of the ${expected} red flags`);
  }
  return problems;
}

/**
 * Builds the memo. Uses the LLM for wording when available, regenerates once if
 * it invents a number, then falls back to the template. Never throws.
 */
export async function buildMemo(
  review: DealReview,
  criteria?: AcquisitionCriteria,
): Promise<DealMemo> {
  const fallback = templateMemo(review);
  if (!isLlmConfigured()) return fallback;

  const context = JSON.stringify({
    recommendation: fallback.recommendation,
    priceGuidance: fallback.priceGuidance,
    askGap: fallback.askGap,
    review,
    buyerGoal: criteria
      ? { reason: criteria.reason, mustHaves: criteria.mustHaves }
      : undefined,
  });

  try {
    let feedback = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      const reply = await chatJSON(
        SYSTEM,
        feedback ? `${context}\n\nFix these problems: ${feedback}` : context,
        MemoReplySchema,
        { maxTokens: 1800 },
      );
      const problems = problemsWith(reply, review);
      if (problems.length === 0) {
        return { ...fallback, ...reply, source: "llm" };
      }
      feedback = problems.join("; ");
    }
  } catch (error) {
    console.warn("Memo fell back to the template:", error);
  }
  return fallback;
}
