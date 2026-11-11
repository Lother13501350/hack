import { runBacktest } from "@/lib/backtest";

/**
 * GET /api/backtest/electro-sensors (issue #10)
 * The DealBrief engine run on a real, public acquisition. Inputs are copied
 * from SEC filings; every figure in the response is computed in code.
 */
export function GET() {
  const { fixture, ...result } = runBacktest();
  return Response.json({
    ...result,
    deal: fixture.deal,
    advisor: fixture.advisor,
    sources: fixture.sources,
    assumptions: [
      "Buyer is private, so the financing check is not applicable.",
      "Synergies are set to zero: this values the company on its own.",
      "4.0x–6.0x multiples are placeholders around DealBrief's 5.0x default.",
      "Equity value uses basic shares; options and RSUs are not included.",
    ],
  });
}
