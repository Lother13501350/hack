import { z } from "zod";
import { sampleBuyer, sampleSynergies, sampleTarget } from "@/data";
import { handle, parseBody, readJson } from "@/lib/api";
import { withCoach } from "@/lib/deal/coach";
import { targetFromExtraction } from "@/lib/deal/extract";
import { reviewDeal } from "@/lib/finance";
import {
  AcquisitionCriteriaSchema,
  AdjustmentSchema,
  BuyerFinancialsSchema,
  ExtractionResultSchema,
  SAMPLE_DATA_LABEL,
  SynergiesSchema,
  TargetCompanySchema,
} from "@/types/deal";

const BodySchema = z.object({
  buyer: BuyerFinancialsSchema.optional(),
  target: TargetCompanySchema.optional(),
  /** Output of /api/deal/extract. Every field must be confirmed. */
  extraction: ExtractionResultSchema.optional(),
  /** Replaces the target's adjustments, e.g. only the ones confirmed so far. */
  adjustments: z.array(AdjustmentSchema).optional(),
  synergies: SynergiesSchema.optional(),
  criteria: AcquisitionCriteriaSchema.optional(),
  realization: z.number().min(0).max(1).optional(),
  multiple: z.number().positive().optional(),
  /** Set false while dragging a slider: numbers only, no LLM wait. */
  withCoach: z.boolean().optional(),
});

/**
 * POST /api/deal/review (issue #5)
 * All numbers come from the finance engine. The LLM only rewords `coach`.
 * With an empty body it reviews the sample deal.
 */
export const POST = handle(async (request) => {
  const body = parseBody(BodySchema, await readJson(request));

  const baseTarget = body.extraction
    ? targetFromExtraction(body.extraction)
    : (body.target ?? sampleTarget);
  const target = body.adjustments
    ? { ...baseTarget, adjustments: body.adjustments }
    : baseTarget;
  const usesSample =
    !body.target && !body.extraction
      ? true
      : body.extraction?.source === "fixture";

  const numbers = reviewDeal({
    buyer: body.buyer ?? sampleBuyer,
    target,
    synergies: body.synergies ?? sampleSynergies,
    multiple: body.multiple,
    realization: body.realization,
  });
  const review = body.withCoach === false ? numbers : await withCoach(numbers);

  return Response.json({
    review,
    dataLabel: usesSample ? SAMPLE_DATA_LABEL : null,
  });
});
