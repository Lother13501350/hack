/**
 * LLM wording for red-flag "coach" text (issue #5).
 * The numbers are already computed; the model only explains them.
 */
import { z } from "zod";
import { chatJSON, isLlmConfigured } from "@/lib/llm";
import type { DealReview, RedFlag } from "@/types/deal";
import { usesOnlyNumbersFrom } from "./numbers";

const CoachReplySchema = z.object({
  coaches: z.array(z.object({ id: z.string(), coach: z.string() })),
});

/** Coach text depends on the flags only, not on the realization slider, so it caches well. */
const cache = new Map<string, Map<string, string>>();

function cacheKey(flags: RedFlag[]): string {
  return flags
    .map((flag) => `${flag.id}|${flag.metric}|${flag.formula}`)
    .join("\n");
}

const SYSTEM = `You are an experienced M&A advisor coaching a first-time buyer.
For each red flag, write 2 to 3 plain sentences on why an expert cares about it and what to ask for.
Rules:
- Use only the numbers given for that flag. Do not calculate, estimate or introduce any other number.
- No jargon without a plain explanation. No advice to sign or not sign.
- Return one entry per flag, with the same id.`;

/**
 * Returns the review with LLM coach text where it passes the checks.
 * Falls back to the engine's template text per flag, and never throws.
 */
export async function withCoach(review: DealReview): Promise<DealReview> {
  if (!isLlmConfigured() || review.redFlags.length === 0) return review;

  const key = cacheKey(review.redFlags);
  let coaches = cache.get(key);
  if (!coaches) {
    try {
      const reply = await chatJSON(
        SYSTEM,
        JSON.stringify(
          review.redFlags.map(({ id, severity, title, metric, formula }) => ({
            id,
            severity,
            title,
            metric,
            formula,
          })),
        ),
        CoachReplySchema,
        { maxTokens: 1500 },
      );
      coaches = new Map(reply.coaches.map((entry) => [entry.id, entry.coach]));
      cache.set(key, coaches);
    } catch (error) {
      console.warn("Coach text fell back to templates:", error);
      return review;
    }
  }

  let used = 0;
  const redFlags = review.redFlags.map((flag) => {
    const coach = coaches.get(flag.id)?.trim();
    const allowed = `${flag.title} ${flag.metric} ${flag.formula}`;
    if (!coach || !usesOnlyNumbersFrom(coach, allowed)) return flag;
    used++;
    return { ...flag, coach };
  });
  return { ...review, redFlags, coachSource: used > 0 ? "llm" : "template" };
}
