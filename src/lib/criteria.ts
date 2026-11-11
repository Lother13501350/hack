/**
 * Interview notes -> acquisition criteria (issue #6).
 * The LLM sorts what the CEO said into must-haves and nice-to-haves.
 * Financial limits and the budget come from the buyer's numbers in code.
 */
import { z } from "zod";
import { sampleCriteria } from "@/data";
import { ApiError } from "@/lib/api";
import { computeFinancing } from "@/lib/finance";
import { chatJSON, isLlmConfigured } from "@/lib/llm";
import {
  type AcquisitionCriteria,
  AcquisitionReasonSchema,
  type BuyerFinancials,
  type CeoAnswer,
  type CriteriaStatus,
  type Financing,
  type TextSource,
} from "@/types/deal";

export interface ParsedCriteria {
  criteria: AcquisitionCriteria;
  /** Three questions the analyst forgot to ask the CEO. */
  forgottenQuestions: string[];
  /** What the buyer can fund before a target is chosen. Computed, not generated. */
  budget: Financing;
  source: TextSource;
}

const ReplySchema = z.object({
  reason: AcquisitionReasonSchema,
  industry: z.string(),
  regions: z.array(z.string()),
  revenueMinM: z.number().nonnegative(),
  revenueMaxM: z.number().nonnegative(),
  ownership: z.string(),
  mustHaves: z.array(z.string()).min(1),
  niceToHaves: z.array(z.string()),
  forgottenQuestions: z.array(z.string()).length(3),
});

const SYSTEM = `You turn an analyst's notes from a CEO interview into acquisition criteria.
- reason: why the CEO wants to buy. competitor = win customers from a rival; technology = get a capability; new_market = enter a region or segment; supply_chain = own a supplier or customer; buy_and_build = combine similar companies for scale.
- mustHaves: conditions the CEO stated as required ("must", "has to", "only", "cannot"). One short line each.
- niceToHaves: preferences ("would love", "ideally", "best case"). One short line each.
- revenueMinM and revenueMaxM: the revenue range in millions of dollars, copied from the notes. Use 0 if not stated.
- Do not include cash, debt or budget limits in mustHaves or niceToHaves; those are handled separately.
- forgottenQuestions: exactly 3 questions the analyst did not ask but should, such as whether the owner must stay for a handover, how much customer concentration is acceptable, or whether the brand is kept.
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
  const budget = computeFinancing(buyer);
  const financialLimits = limitsFrom(buyer);

  if (isLlmConfigured()) {
    try {
      const { forgottenQuestions, ...fields } = await chatJSON(
        SYSTEM,
        `Interview notes:\n${notes}`,
        ReplySchema,
        { maxTokens: 1200 },
      );
      return {
        criteria: {
          ...fields,
          financialLimits,
          ceoAnswers: [],
          status: "draft",
        },
        forgottenQuestions,
        budget,
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
    budget,
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
