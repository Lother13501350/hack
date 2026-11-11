import { z } from "zod";
import { sampleBuyer, sampleCriteria } from "@/data";
import { ApiError, handle, parseBody, readJson } from "@/lib/api";
import { advanceCriteria, parseCriteria } from "@/lib/criteria";
import {
  AcquisitionCriteriaSchema,
  BuyerFinancialsSchema,
  CeoAnswerSchema,
} from "@/types/deal";

const BodySchema = z.object({
  action: z.enum(["parse", "send_to_ceo", "approve"]).default("parse"),
  /** parse: the analyst's interview notes. Defaults to the sample notes. */
  notes: z.string().optional(),
  buyer: BuyerFinancialsSchema.optional(),
  /** send_to_ceo / approve: the criteria being moved along. */
  criteria: AcquisitionCriteriaSchema.optional(),
  ceoAnswers: z.array(CeoAnswerSchema).optional(),
});

/**
 * POST /api/criteria (issue #6)
 *
 * - action "parse" (default): notes -> draft criteria + 3 forgotten questions + budget.
 * - action "send_to_ceo": draft -> waiting.
 * - action "approve": waiting -> approved (optionally with the CEO's answers).
 *
 * The server keeps no state: the client sends the criteria back each time.
 * Only approved criteria are accepted by /api/sourcing.
 */
export const POST = handle(async (request) => {
  const body = parseBody(BodySchema, await readJson(request));

  if (body.action === "parse") {
    const parsed = await parseCriteria(
      body.notes?.trim() || sampleCriteria.notes,
      body.buyer ?? sampleBuyer,
    );
    return Response.json(parsed);
  }

  if (!body.criteria) {
    throw new ApiError(
      400,
      `"criteria" is required for action "${body.action}"`,
    );
  }
  return Response.json({
    criteria: advanceCriteria(body.criteria, body.action, body.ceoAnswers),
  });
});
