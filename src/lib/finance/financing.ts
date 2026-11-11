import type { BuyerFinancials, Financing } from "@/types/deal";
import { round2 } from "./format";

/**
 * Max fundable = (buyer EBITDA + target normalized EBITDA) x max debt multiple
 *                - existing debt + (cash - minimum cash to keep)
 */
export function computeFinancing(
  buyer: BuyerFinancials,
  targetNormalizedEbitdaM: number,
): Financing {
  const combinedEbitda = buyer.ebitdaM + targetNormalizedEbitdaM;
  const grossDebtCapacity = combinedEbitda * buyer.maxDebtToEbitda;
  const debtCapacity = grossDebtCapacity - buyer.existingDebtM;
  const cashAvailable = buyer.cashM - buyer.minCashM;
  return {
    combinedEbitdaM: round2(combinedEbitda),
    maxDebtToEbitda: buyer.maxDebtToEbitda,
    grossDebtCapacityM: round2(grossDebtCapacity),
    existingDebtM: round2(buyer.existingDebtM),
    debtCapacityM: round2(debtCapacity),
    cashAvailableM: round2(cashAvailable),
    maxFundableM: round2(debtCapacity + cashAvailable),
  };
}

/**
 * Placeholder EBITDA margin for a target that has not been found yet.
 * Deliberately conservative for a machining job shop; the real normalized
 * EBITDA replaces it as soon as a target is reviewed.
 */
export const ASSUMED_TARGET_EBITDA_MARGIN = 0.09;

/**
 * Budget shown on the criteria screen, before any target exists. Assumes a
 * target at the middle of the revenue range earning the placeholder margin.
 */
export function estimateSearchBudget(
  buyer: BuyerFinancials,
  revenueMinM: number,
  revenueMaxM: number,
): Financing & { assumedTargetEbitdaM: number } {
  const midRevenue = (revenueMinM + revenueMaxM) / 2;
  const assumedTargetEbitdaM = round2(
    midRevenue * ASSUMED_TARGET_EBITDA_MARGIN,
  );
  return {
    ...computeFinancing(buyer, assumedTargetEbitdaM),
    assumedTargetEbitdaM,
  };
}
