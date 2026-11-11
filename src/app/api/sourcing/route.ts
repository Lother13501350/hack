import { z } from "zod";
import { ApiError, handle, parseBody, readJson } from "@/lib/api";
import { findCandidates } from "@/lib/sourcing";
import { AcquisitionCriteriaSchema, SAMPLE_DATA_LABEL } from "@/types/deal";

const BodySchema = z.object({ criteria: AcquisitionCriteriaSchema });

/**
 * POST /api/sourcing (issue #4)
 * Takes CEO-approved criteria and returns a shortlist of five candidates.
 * Every evidence line carries a source URL. Falls back to the fixture when
 * live search is unavailable; the response says which via `source`.
 */
export const POST = handle(async (request) => {
  const { criteria } = parseBody(BodySchema, await readJson(request));
  if (criteria.status !== "approved") {
    throw new ApiError(
      409,
      `Criteria must be approved by the CEO before sourcing (status is "${criteria.status}")`,
    );
  }
  const result = await findCandidates(criteria);
  return Response.json({
    ...result,
    dataLabel: result.source === "fixture" ? SAMPLE_DATA_LABEL : null,
  });
});
