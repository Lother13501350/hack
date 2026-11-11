import { z } from "zod";
import { sampleBuyer, sampleSynergies, sampleTarget } from "@/data";
import { handle, parseBody, readJson } from "@/lib/api";
import { buildMemo } from "@/lib/deal/memo";
import { reviewDeal } from "@/lib/finance";
import { AcquisitionCriteriaSchema, DealReviewSchema } from "@/types/deal";

const BodySchema = z.object({
  review: DealReviewSchema.optional(),
  criteria: AcquisitionCriteriaSchema.optional(),
});

/**
 * POST /api/deal/memo (issue #5)
 * The recommendation and price limit are decided in code. The LLM writes the
 * supporting text, and any dollar figure it writes must exist in the review.
 * With an empty body it writes the memo for the sample deal.
 */
export const POST = handle(async (request) => {
  const body = parseBody(BodySchema, await readJson(request));
  const review =
    body.review ??
    reviewDeal({
      buyer: sampleBuyer,
      target: sampleTarget,
      synergies: sampleSynergies,
    });
  const memo = await buildMemo(review, body.criteria);
  return Response.json({ memo });
});
