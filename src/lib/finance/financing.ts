import type { BuyerFinancials, Financing } from "@/types/deal";
import { round2 } from "./format";

/**
 * Max fundable = (buyer EBITDA + target normalized EBITDA) x max debt multiple
 *                - existing debt + (cash - minimum cash to keep)
 *
 * Pass 0 for the target to get the buyer's budget before a target is chosen
 * (used on the criteria screen).
 */
export function computeFinancing(
  buyer: BuyerFinancials,
  targetNormalizedEbitdaM = 0,
): Financing {
  const debtCapacity =
    (buyer.ebitdaM + targetNormalizedEbitdaM) * buyer.maxDebtToEbitda -
    buyer.existingDebtM;
  const cashAvailable = buyer.cashM - buyer.minCashM;
  return {
    debtCapacityM: round2(debtCapacity),
    cashAvailableM: round2(cashAvailable),
    maxFundableM: round2(debtCapacity + cashAvailable),
  };
}
