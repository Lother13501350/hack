/**
 * Demo fixtures (issue #3). Every company and number here is fictional.
 * Parsing through the shared schemas means a fixture that drifts from the
 * types fails loudly at import time instead of in the UI.
 */
import { z } from "zod";
import {
  AcquisitionCriteriaSchema,
  BuyerFinancialsSchema,
  SourcingResultSchema,
  SynergiesSchema,
  TargetCompanySchema,
} from "@/types/deal";
import buyerJson from "./buyer.json";
import criteriaSampleJson from "./criteria-sample.json";
import hartwellJson from "./hartwell.json";
import sourcingFixtureJson from "./sourcing-fixture.json";
import synergiesJson from "./synergies.json";

export const CriteriaSampleSchema = z.object({
  ceo: z.object({ name: z.string(), company: z.string() }),
  notes: z.string(),
  expected: z.object({
    criteria: AcquisitionCriteriaSchema,
    forgottenQuestions: z.array(z.string()).length(3),
  }),
});
export type CriteriaSample = z.infer<typeof CriteriaSampleSchema>;

export const sampleBuyer = BuyerFinancialsSchema.parse(buyerJson);
export const sampleTarget = TargetCompanySchema.parse(hartwellJson);
export const sampleSynergies = SynergiesSchema.parse(synergiesJson);
export const sampleSourcing = SourcingResultSchema.parse(sourcingFixtureJson);
export const sampleCriteria = CriteriaSampleSchema.parse(criteriaSampleJson);
