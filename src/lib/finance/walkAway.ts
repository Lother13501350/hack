import type { SensitivityPoint, Synergies, WalkAway } from "@/types/deal";
import { round2 } from "./format";

/** Placeholder until real comparable sales are entered. Always a parameter. */
export const DEFAULT_MULTIPLE = 5.0;
export const BASE_CASE_REALIZATION = 0.5;
export const SENSITIVITY_STEPS = [0, 0.25, 0.5, 0.75, 1];

interface WalkAwayInput {
  normalizedEbitdaM: number;
  multiple: number;
  synergies: Synergies;
  /** Share of the synergies you are willing to pay for, 0 to 1. */
  realization: number;
}

/**
 * Standalone value = Normalized EBITDA x multiple
 * Synergy value    = (yearly cost + revenue synergies) x multiple x realization
 * Walk-away        = standalone + synergy value - one-time integration cost
 */
export function computeWalkAway(input: WalkAwayInput): WalkAway {
  const { normalizedEbitdaM, multiple, synergies } = input;
  const realization = Math.min(1, Math.max(0, input.realization));
  const standalone = normalizedEbitdaM * multiple;
  const synergy =
    (synergies.costM + synergies.revenueM) * multiple * realization;
  return {
    standaloneM: round2(standalone),
    synergyM: round2(synergy),
    integrationCostM: round2(synergies.integrationCostM),
    walkAwayM: round2(standalone + synergy - synergies.integrationCostM),
    realization,
  };
}

export function computeSensitivity(
  input: Omit<WalkAwayInput, "realization">,
  steps = SENSITIVITY_STEPS,
): SensitivityPoint[] {
  return steps.map((realization) => ({
    realization,
    walkAwayM: computeWalkAway({ ...input, realization }).walkAwayM,
  }));
}

/** What pricing on the reported number, not the normalized one, would cost. */
export function overpayIfReportedM(
  reportedEbitdaM: number,
  normalizedEbitdaM: number,
  multiple: number,
): number {
  return round2((reportedEbitdaM - normalizedEbitdaM) * multiple);
}
