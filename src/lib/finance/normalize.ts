import type { Adjustment, BridgeItem } from "@/types/deal";
import { round2 } from "./format";

/** Signed effect of an adjustment on EBITDA. `amountM` itself is always positive. */
export function signedDeltaM(adjustment: Adjustment): number {
  return adjustment.type === "add_back"
    ? adjustment.amountM
    : -adjustment.amountM;
}

/**
 * Normalized EBITDA = Reported EBITDA
 *   - one-time revenue
 *   - (market CEO pay - owner's pay)
 *   - related-party rent below market
 *   + one-time expenses
 */
export function normalizeEbitda(
  reportedEbitdaM: number,
  adjustments: Adjustment[],
  reportedSource: string,
): { normalizedEbitdaM: number; bridge: BridgeItem[] } {
  let running = reportedEbitdaM;
  const bridge: BridgeItem[] = [
    {
      id: "reported",
      label: "Reported EBITDA",
      deltaM: 0,
      runningM: round2(running),
      kind: "start",
      source: reportedSource,
    },
  ];
  for (const adjustment of adjustments) {
    const delta = signedDeltaM(adjustment);
    running += delta;
    bridge.push({
      id: adjustment.id,
      label: adjustment.label,
      deltaM: round2(delta),
      runningM: round2(running),
      kind: "adjustment",
      source: adjustment.source,
    });
  }
  const normalizedEbitdaM = round2(running);
  bridge.push({
    id: "normalized",
    label: "Normalized EBITDA",
    deltaM: 0,
    runningM: normalizedEbitdaM,
    kind: "end",
    source: "Computed from the rows above",
  });
  return { normalizedEbitdaM, bridge };
}
