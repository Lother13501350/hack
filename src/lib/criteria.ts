/**
 * Interview notes -> acquisition criteria (issue #6, screen A).
 * The LLM sorts what the CEO said into must-haves and nice-to-haves.
 * Financial limits and the budget come from the buyer's numbers in code.
 */
import { z } from "zod";
import { sampleCriteria } from "@/data";
import { ApiError } from "@/lib/api";
import { estimateSearchBudget } from "@/lib/finance";
import { chatJSON, isLlmConfigured } from "@/lib/llm";
import {
  type AcquisitionCriteria,
  AcquisitionReasonSchema,
  type BuyerFinancials,
  type CeoAnswer,
  type CriteriaStatus,
  CriterionSchema,
  type TextSource,
} from "@/types/deal";

export interface ParsedCriteria {
  criteria: AcquisitionCriteria;
  /** Three questions the analyst forgot to ask the CEO. */
  forgottenQuestions: string[];
  /** Prepared answers for the sample notes, so the demo does not need typing. */
  sampleAnswers?: string[];
  /** What the buyer can fund, before a target is chosen. Computed, not generated. */
  budget: ReturnType<typeof estimateSearchBudget>;
  source: TextSource;
}

const ReplySchema = z.object({
  reason: AcquisitionReasonSchema,
  reasonText: z.string(),
  industry: z.string(),
  regions: z.array(z.string()),
  revenueMinM: z.number().nonnegative(),
  revenueMaxM: z.number().nonnegative(),
  ownership: z.string(),
  otherMustHaves: z.array(CriterionSchema),
  niceToHaves: z.array(CriterionSchema),
  forgottenQuestions: z.array(z.string()).length(3),
});

const SYSTEM = `You turn an analyst's notes from a CEO interview into acquisition criteria.
- reason: why the CEO wants to buy. competitor = buy a rival; technology = get a capability; new_market = enter a region or segment; supply_chain = own a supplier or customer; buy_and_build = combine similar companies for scale.
- reasonText: the reason in three or four words, e.g. "Acquire a competitor".
- industry: what the target must do, in one short phrase, e.g. "CNC machining for aerospace (AS9100 certified)". Add a certification only if it is standard for that work.
- regions: the places named.
- revenueMinM and revenueMaxM: the revenue range in millions of dollars, copied from the notes. Use 0 if not stated.
- ownership: everything the notes say about who should own the target, preferences and exclusions together, in one short phrase, e.g. "Family-owned, no private equity". Do not repeat ownership under niceToHaves.
- otherMustHaves: any further hard requirements ("must", "only", "no ...") not already covered above, as {label, value}. Usually empty.
- niceToHaves: preferences ("ideal", "would like", "wants") as {label, value}, e.g. {"label": "Owner situation", "value": "Near retirement, no named successor"}. Labels are one or two words.
- Do not include cash, debt or budget limits; those are handled separately.
- forgottenQuestions: exactly 3 short questions the analyst did not ask but should, in this order unless the notes already answer one: whether the owner must stay after the sale and for how long; whether one customer above 30% of revenue is a deal-breaker; whether the target's brand is kept or merged.
Use only what is in the notes. Do not invent conditions.`;

function limitsFrom(buyer: BuyerFinancials) {
  return {
    minCashM: buyer.minCashM,
    maxDebtToEbitda: buyer.maxDebtToEbitda,
    existingDebtM: buyer.existingDebtM,
  };
}

export async function parseCriteria(
  notes: string,
  buyer: BuyerFinancials,
): Promise<ParsedCriteria> {
  const financialLimits = limitsFrom(buyer);
  const isSampleNotes = notes.trim() === sampleCriteria.notes.trim();
  const sampleAnswers = isSampleNotes
    ? sampleCriteria.expected.sampleAnswers
    : undefined;

  if (isLlmConfigured()) {
    try {
      const reply = await chatJSON(
        SYSTEM,
        `Interview notes:\n${notes}`,
        ReplySchema,
        { maxTokens: 1200 },
      );
      const size =
        reply.revenueMaxM > 0
          ? `Revenue $${reply.revenueMinM}–${reply.revenueMaxM}M (estimated)`
          : undefined;
      // The table rows are assembled in code so the five core rows always appear in order.
      const mustHaves = [
        { label: "Reason", value: reply.reasonText },
        { label: "Capability", value: reply.industry },
        { label: "Region", value: reply.regions.join(", ") },
        ...(size ? [{ label: "Size", value: size }] : []),
        { label: "Ownership", value: reply.ownership },
        ...reply.otherMustHaves,
      ].filter((row) => row.value.trim().length > 0);
      return {
        criteria: {
          reason: reply.reason,
          industry: reply.industry,
          regions: reply.regions,
          revenueMinM: reply.revenueMinM,
          revenueMaxM: reply.revenueMaxM,
          ownership: reply.ownership,
          mustHaves,
          niceToHaves: reply.niceToHaves,
          financialLimits,
          ceoAnswers: [],
          status: "draft",
        },
        forgottenQuestions: reply.forgottenQuestions,
        sampleAnswers,
        budget: estimateSearchBudget(
          buyer,
          reply.revenueMinM,
          reply.revenueMaxM,
        ),
        source: "llm",
      };
    } catch (error) {
      console.warn("Criteria parsing fell back to the sample:", error);
    }
  }

  // Template fallback: the prepared parse of the sample notes.
  const { criteria, forgottenQuestions } = sampleCriteria.expected;
  return {
    criteria: { ...criteria, financialLimits, ceoAnswers: [], status: "draft" },
    forgottenQuestions,
    sampleAnswers: sampleCriteria.expected.sampleAnswers,
    budget: estimateSearchBudget(
      buyer,
      criteria.revenueMinM,
      criteria.revenueMaxM,
    ),
    source: "template",
  };
}

const NEXT_STATUS: Record<
  "send_to_ceo" | "approve",
  [CriteriaStatus, CriteriaStatus]
> = {
  send_to_ceo: ["draft", "waiting"],
  approve: ["waiting", "approved"],
};

/** draft -> waiting (sent to the CEO) -> approved. Anything else is a 409. */
export function advanceCriteria(
  criteria: AcquisitionCriteria,
  action: "send_to_ceo" | "approve",
  ceoAnswers?: CeoAnswer[],
): AcquisitionCriteria {
  const [from, to] = NEXT_STATUS[action];
  if (criteria.status !== from) {
    throw new ApiError(
      409,
      `Cannot ${action} criteria in status "${criteria.status}"; expected "${from}"`,
    );
  }
  return {
    ...criteria,
    ceoAnswers: ceoAnswers ?? criteria.ceoAnswers,
    status: to,
  };
}
