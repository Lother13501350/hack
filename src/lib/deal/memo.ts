/**
 * Decision memo (issue #5, screen 4).
 * The recommendation and every dollar figure in the headline are decided in code.
 * The LLM writes reasons, risks, conditions and questions around them.
 */
import { z } from "zod";
import { formatFY, formatM1, formatM2, formatPct } from "@/lib/finance";
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

const HEADLINES: Record<Recommendation, string> = {
  Proceed: "Proceed to LOI",
  "Proceed with conditions": "Proceed to LOI, with conditions",
  "Walk away": "Do not proceed at this price",
};

/** The price-limit sentence under the headline. Every figure comes from the review. */
function summarize(review: DealReview): string {
  const { realization, walkAwayM } = review.walkAway;
  const share = `${formatPct(realization)} of synergies achieved`;
  const caseLabel = realization === 0.5 ? `base case, ${share}` : share;
  const limit = formatM1(walkAwayM);
  const ask = formatM1(review.askingPriceM);
  const gap = review.askVsWalkAwayM;
  if (gap <= 0) {
    return `The seller's ask of ${ask} is ${formatM1(-gap)} inside our limit of ${limit} (${caseLabel}).`;
  }
  const ceiling = walkAwayAt(review, 1);
  const versusCeiling =
    review.askingPriceM > ceiling
      ? `and above our ceiling even if every synergy is achieved (${formatM1(ceiling)})`
      : `but inside our ceiling if every synergy is achieved (${formatM1(ceiling)})`;
  return `Do not exceed ${limit} (${caseLabel}). The seller's ask of ${ask} is ${formatM1(gap)} above that, ${versusCeiling}.`;
}

const flagOf = (review: DealReview, idPrefix: string) =>
  review.redFlags.find((flag) => flag.id.startsWith(idPrefix));

const REASON_OPENERS: Record<AcquisitionCriteria["reason"], string> = {
  competitor: "Removes a direct competitor in our core segment",
  technology: "Brings a capability we do not have in-house",
  new_market: "Gives us a foothold in a new market",
  supply_chain: "Secures a key part of our supply chain",
  buy_and_build: "Adds scale in a business we already know",
};

function questionFor(flag: RedFlag, review: DealReview): string {
  const { fromYear, toYear } = review.metrics;
  if (flag.id.startsWith("customer_concentration")) {
    return "Share the top customer's contract, including term and change-of-control clauses.";
  }
  if (flag.id.startsWith("dso_increase")) {
    return `Provide receivables aging by customer for ${formatFY(Math.max(fromYear, toYear - 1))} and ${formatFY(toYear)}.`;
  }
  if (flag.id.startsWith("gross_margin_decline")) {
    return "Explain the gross margin decline: price changes vs. input costs.";
  }
  if (flag.id.startsWith("one_time_revenue")) {
    return `Confirm the ${flag.metric} of one-time revenue will not repeat in ${formatFY(toYear + 1)}.`;
  }
  if (flag.id.startsWith("owner_pay")) {
    return "Will the owner stay through a transition period, and on what terms?";
  }
  return `Walk us through this: ${flag.title.toLowerCase()}.`;
}

/** Memo written entirely from templates and engine numbers. Always available. */
export function templateMemo(
  review: DealReview,
  criteria?: AcquisitionCriteria,
): DealMemo {
  const { metrics, financing, synergies } = review;
  const recommendation = decideRecommendation(review);
  const concentration = flagOf(review, "customer_concentration");
  const dso = flagOf(review, "dso_increase");
  const dsoIncrease = Math.round(metrics.dsoEndDays - metrics.dsoStartDays);
  const yearsBack = metrics.toYear - metrics.fromYear;

  const opener = REASON_OPENERS[criteria?.reason ?? "competitor"];
  const reasons = [
    `${opener}; revenue has grown ${formatPct(metrics.revenueCagr, 1)} a year since ${formatFY(metrics.fromYear)}.`,
    synergies.costM > 0
      ? `${formatM2(synergies.costM)} a year of purchasing savings is within our control.`
      : `${formatM2(review.normalizedEbitdaM)} of yearly earnings holds up after our checks.`,
    `We can fund up to ${formatM1(financing.maxFundableM)} without breaching ${financing.maxDebtToEbitda.toFixed(1)}× leverage.`,
  ];

  const risks = [
    concentration
      ? `${concentration.title}. Losing it would erase most of the deal's value.`
      : undefined,
    `Real earnings are ${formatM2(review.normalizedEbitdaM)}, not the ${formatM2(review.reportedEbitdaM)} the seller reports.`,
    dso
      ? `Customers are paying ${dsoIncrease} days slower than ${yearsBack === 2 ? "two years ago" : `in ${formatFY(metrics.fromYear)}`}.`
      : undefined,
    ...review.redFlags
      .filter((flag) => flag !== concentration && flag !== dso)
      .map((flag) => `${flag.title} (${flag.metric}).`),
  ]
    .filter((risk): risk is string => Boolean(risk))
    .slice(0, 3);

  const conditionsBeforeLoi = [
    concentration
      ? "Top customer confirms the relationship survives a change of owner."
      : undefined,
    dso ? "Receivables aging shows no material disputes." : undefined,
    `Seller accepts valuation on ${formatM2(review.normalizedEbitdaM)} normalized EBITDA.`,
  ].filter((condition): condition is string => Boolean(condition));

  return {
    recommendation,
    headline: HEADLINES[recommendation],
    summary: summarize(review),
    reasons,
    risks,
    conditionsBeforeLoi,
    sellerQuestions: review.redFlags.slice(0, 5).map((flag) => ({
      question: questionFor(flag, review),
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

const SYSTEM = `You are writing a one-page decision memo for a CFO who is considering buying a company.
You are given a computed deal review, the buyer's goal, and a draft memo. The recommendation and the price limit are already decided.
Rewrite the draft's four lists in your own words, keeping the same substance:
- reasons: 3 reasons to pursue the deal.
- risks: 3 key risks, most serious first.
- conditionsBeforeLoi: 2 to 4 conditions to meet before signing a letter of intent.
- sellerQuestions: one question for the seller per red flag (up to 5), each with that flag's id as redFlagId.
Rules:
- Use only dollar amounts and percentages that appear in the review. Never calculate or estimate a new number.
- Write earnings-sized amounts like "$2.40M" and price-sized amounts like "$13.4M", exactly as they appear in the draft.
- Plain language a non-specialist can follow, one or two short sentences per item.
- Do not restate the recommendation or the price limit.`;

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
  const fallback = templateMemo(review, criteria);
  if (!isLlmConfigured()) return fallback;

  const context = JSON.stringify({
    recommendation: fallback.headline,
    priceLimit: fallback.summary,
    buyerGoal: criteria
      ? {
          reason: criteria.reason,
          mustHaves: criteria.mustHaves,
          ceoAnswers: criteria.ceoAnswers,
        }
      : undefined,
    draft: {
      reasons: fallback.reasons,
      risks: fallback.risks,
      conditionsBeforeLoi: fallback.conditionsBeforeLoi,
      sellerQuestions: fallback.sellerQuestions,
    },
    review,
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
