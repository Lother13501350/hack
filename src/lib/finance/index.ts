/**
 * Deal finance engine (issue #2). Pure functions: no LLM, no network.
 * Every number the product shows comes from here.
 */
import type {
  BuyerFinancials,
  DealReview,
  Synergies,
  TargetCompany,
} from "@/types/deal";
import { computeFinancing } from "./financing";
import { round2 } from "./format";
import { computeMetrics, firstAndLast } from "./metrics";
import { normalizeEbitda } from "./normalize";
import { detectRedFlags } from "./redFlags";
import {
  BASE_CASE_REALIZATION,
  DEFAULT_MULTIPLE,
  computeSensitivity,
  computeWalkAway,
  overpayIfReportedM,
} from "./walkAway";

export * from "./financing";
export * from "./format";
export * from "./metrics";
export * from "./normalize";
export * from "./redFlags";
export * from "./walkAway";

export interface ReviewInput {
  buyer: BuyerFinancials;
  target: TargetCompany;
  synergies: Synergies;
  /** Defaults to the 5.0x placeholder. */
  multiple?: number;
  /** Defaults to the 50% base case. */
  realization?: number;
}

export function reviewDeal(input: ReviewInput): DealReview {
  const { buyer, target, synergies } = input;
  const multiple = input.multiple ?? DEFAULT_MULTIPLE;
  const realization = input.realization ?? BASE_CASE_REALIZATION;

  const { last } = firstAndLast(target.financials);
  const ebitdaCell = target.fieldSources?.ebitdaReportedM;
  const { normalizedEbitdaM, bridge } = normalizeEbitda(
    last.ebitdaReportedM,
    target.adjustments,
    ebitdaCell ? `${target.sourceFile} › ${ebitdaCell}` : target.sourceFile,
  );
  const metrics = computeMetrics(target.financials);
  const walkAway = computeWalkAway({
    normalizedEbitdaM,
    multiple,
    synergies,
    realization,
  });
  const sensitivity = computeSensitivity({
    normalizedEbitdaM,
    multiple,
    synergies,
  });

  return {
    targetName: target.name,
    askingPriceM: round2(target.askingPriceM),
    reportedEbitdaM: round2(last.ebitdaReportedM),
    normalizedEbitdaM,
    bridge,
    metrics,
    redFlags: detectRedFlags(target, metrics),
    multiple,
    multipleIsPlaceholder: true,
    walkAway,
    openingBidM: computeWalkAway({
      normalizedEbitdaM,
      multiple,
      synergies,
      realization: 0,
    }).walkAwayM,
    sensitivity,
    financing: computeFinancing(buyer, normalizedEbitdaM),
    overpayIfReportedM: overpayIfReportedM(
      last.ebitdaReportedM,
      normalizedEbitdaM,
      multiple,
    ),
    askVsWalkAwayM: round2(target.askingPriceM - walkAway.walkAwayM),
    coachSource: "template",
  };
}
