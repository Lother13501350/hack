import { z } from "zod";
import { sampleCriteria } from "@/data";
import { ApiError, handle, parseBody, readJson } from "@/lib/api";
import { draftOutreach } from "@/lib/outreach";
import { AcquisitionCriteriaSchema, CandidateSchema } from "@/types/deal";

const BodySchema = z.object({
  /** The candidates the CEO ticked. */
  candidates: z.array(CandidateSchema).min(1),
  criteria: AcquisitionCriteriaSchema.optional(),
  /** Defaults to the sample CEO. */
  ceo: z
    .object({
      name: z.string(),
      company: z.string(),
      title: z.string().optional(),
      city: z.string().optional(),
      email: z.string().optional(),
    })
    .optional(),
});

/**
 * POST /api/outreach/draft (issue #7)
 * One personalized first-contact letter per selected candidate, status "draft".
 * Each letter cites only sourced facts, listed in `factsUsed` with their URLs.
 */
export const POST = handle(async (request) => {
  const body = parseBody(BodySchema, await readJson(request));
  if (body.candidates.length > 10) {
    throw new ApiError(400, "Draft at most 10 letters at a time");
  }
  const result = await draftOutreach(
    body.candidates,
    body.ceo ?? sampleCriteria.ceo,
    body.criteria,
  );
  return Response.json(result);
});
