/** Screen 3: walk-away price, financing check and sensitivity (issues #2 and #5). */
import { formatM1, formatM2, formatPct } from "@/lib/finance/format";
import { cn } from "@/lib/utils";
import type { DealReview } from "@/types/deal";
import { ActionButton, Card, DarkCard, Eyebrow, Row } from "./chrome";

const REALIZATION_CHOICES = [0, 0.5, 1];

function Bar({
  label,
  value,
  from,
  to,
  max,
  color,
}: {
  label: string;
  value: string;
  from: number;
  to: number;
  max: number;
  color: string;
}) {
  const left = (Math.min(from, to) / max) * 100;
  const width = (Math.abs(to - from) / max) * 100;
  return (
    <div className="grid grid-cols-[minmax(0,190px)_minmax(0,1fr)_76px] items-center gap-4 py-1.5">
      <span className="text-db-muted text-[15px]">{label}</span>
      <div className="bg-db-track relative h-7 overflow-hidden rounded-md">
        <div
          className={cn(
            "absolute inset-y-0 rounded-md transition-all duration-300",
            color,
          )}
          style={{ left: `${left}%`, width: `${Math.max(width, 0.6)}%` }}
        />
      </div>
      <span className="text-right text-[15px] font-semibold tabular-nums">
        {value}
      </span>
    </div>
  );
}

export function StepWalkAway({
  review,
  onRealization,
  onMemo,
  busy,
}: {
  review: DealReview;
  onRealization: (value: number) => void;
  onMemo: () => void;
  busy: string | null;
}) {
  const { walkAway, financing, synergies } = review;
  const shortName = review.targetName.split(" ")[0];
  const ceiling =
    review.sensitivity.find((point) => point.realization === 1)?.walkAwayM ??
    walkAway.walkAwayM;
  const max = Math.max(review.askingPriceM, ceiling) * 1.1;
  const gap = review.askVsWalkAwayM;
  const beforeCost = walkAway.standaloneM + walkAway.synergyM;
  const fundingIsLimit = financing.maxFundableM < walkAway.walkAwayM;

  return (
    <>
      <h1 className="mt-8 mb-6 text-[34px] leading-[1.15] font-bold tracking-tight">
        What is the most we should pay?
      </h1>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card className="p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-db-muted text-[15px]">Walk-away price</p>
                <p className="text-db-blue-ink text-6xl font-bold tracking-tight tabular-nums">
                  {formatM1(walkAway.walkAwayM)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-db-muted text-[15px]">Seller asking</p>
                <p className="text-3xl font-bold tracking-tight tabular-nums">
                  {formatM1(review.askingPriceM)}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[15px] font-semibold",
                    gap > 0 ? "text-db-orange" : "text-db-green",
                  )}
                >
                  {gap > 0
                    ? `${formatM1(gap)} above our walk-away`
                    : `${formatM1(-gap)} inside our walk-away`}
                </p>
              </div>
            </div>

            <fieldset className="mt-6">
              <legend className="text-[15px] font-semibold">
                How much of the synergies will we actually achieve?
              </legend>
              <div className="mt-2.5 flex gap-2">
                {REALIZATION_CHOICES.map((choice) => {
                  const active = walkAway.realization === choice;
                  return (
                    <button
                      key={choice}
                      type="button"
                      aria-pressed={active}
                      disabled={busy === "realization"}
                      onClick={() => onRealization(choice)}
                      className={cn(
                        "min-h-11 min-w-[76px] rounded-xl border px-4 text-[15px] font-semibold transition-colors",
                        active
                          ? "border-db-blue bg-db-blue text-white"
                          : "border-db-line hover:border-db-ink/40 bg-white",
                      )}
                    >
                      {formatPct(choice)}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-5">
              <Bar
                label={`Standalone value (${review.normalizedEbitdaM.toFixed(2)} × ${review.multiple.toFixed(1)})`}
                value={formatM1(walkAway.standaloneM)}
                from={0}
                to={walkAway.standaloneM}
                max={max}
                color="bg-[#9aa1b1]"
              />
              <Bar
                label="+ Synergies we pay for"
                value={`+${formatM1(walkAway.synergyM)}`}
                from={walkAway.standaloneM}
                to={beforeCost}
                max={max}
                color="bg-[#6f8fe8]"
              />
              <Bar
                label="− Integration cost"
                value={formatM1(-walkAway.integrationCostM)}
                from={beforeCost - walkAway.integrationCostM}
                to={beforeCost}
                max={max}
                color="bg-[#e58a3c]"
              />
              <Bar
                label="= Walk-away price"
                value={formatM1(walkAway.walkAwayM)}
                from={0}
                to={walkAway.walkAwayM}
                max={max}
                color="bg-db-blue"
              />
              <Bar
                label="Seller asking"
                value={formatM1(review.askingPriceM)}
                from={0}
                to={review.askingPriceM}
                max={max}
                color="bg-db-ink"
              />
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-xl font-semibold">Synergy assumptions</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-[15px]">
                <thead>
                  <tr className="text-db-muted border-db-line border-b text-xs tracking-[0.09em] uppercase">
                    <th className="w-[30%] py-2 font-semibold">Item</th>
                    <th className="w-[18%] py-2 font-semibold">Per year</th>
                    <th className="py-2 font-semibold">Basis</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-db-line border-b">
                    <td className="py-2.5 pr-3 font-medium">
                      {synergies.costLabel ?? "Cost synergies"}
                    </td>
                    <td className="py-2.5 tabular-nums">
                      {formatM2(synergies.costM)}
                    </td>
                    <td className="text-db-muted py-2.5">
                      {synergies.costBasis ?? "Analyst estimate"}
                    </td>
                  </tr>
                  <tr className="border-db-line border-b">
                    <td className="py-2.5 pr-3 font-medium">
                      {synergies.revenueLabel ?? "Revenue synergies"}
                    </td>
                    <td className="py-2.5 tabular-nums">
                      {formatM2(synergies.revenueM)}
                    </td>
                    <td className="text-db-muted py-2.5">
                      {synergies.revenueBasis ?? "Analyst estimate"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-medium">
                      Integration cost
                    </td>
                    <td className="py-2.5 tabular-nums">
                      {formatM2(synergies.integrationCostM)} once
                    </td>
                    <td className="text-db-muted py-2.5">
                      {synergies.integrationBasis ?? "Analyst estimate"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="bg-db-blue-soft mt-4 rounded-xl p-4">
              <Eyebrow className="text-db-blue-ink">
                Why an expert cares
              </Eyebrow>
              <p className="mt-1.5 text-[15px] leading-relaxed">
                If you pay for 100% of the synergies, the seller keeps all the
                value you create. Experts discount revenue synergies more
                heavily than cost synergies, because selling to someone
                else&apos;s customers depends on people you do not control.
              </p>
            </div>
          </Card>
        </div>

        <aside className="flex flex-col gap-5">
          <DarkCard>
            <Eyebrow className="text-white/70">Recommended range</Eyebrow>
            <p className="mt-2.5 text-[15px] text-white/85">Open at</p>
            <p className="text-3xl font-bold tracking-tight tabular-nums">
              ≤ {formatM1(review.openingBidM)}
            </p>
            <p className="mt-3 text-[15px] text-white/85">Walk away above</p>
            <p className="text-3xl font-bold tracking-tight tabular-nums">
              {formatM1(walkAway.walkAwayM)}
            </p>
            <ActionButton
              tone="white"
              className="mt-5 w-full"
              onClick={onMemo}
              busy={busy === "memo"}
              arrow
            >
              Write CFO memo
            </ActionButton>
          </DarkCard>

          <Card>
            <h2 className="mb-1 text-lg font-semibold">Can we afford it?</h2>
            <Row
              label={`Combined EBITDA × ${financing.maxDebtToEbitda.toFixed(1)}`}
              value={formatM1(financing.grossDebtCapacityM)}
            />
            <Row
              label="Less existing debt"
              value={formatM1(-financing.existingDebtM)}
            />
            <Row
              label="Cash above minimum"
              value={`+${formatM1(financing.cashAvailableM)}`}
            />
            <div className="border-db-line mt-1 border-t pt-1">
              <Row
                strong
                label="Max we can fund"
                value={formatM1(financing.maxFundableM)}
              />
            </div>
            <p
              className={cn(
                "mt-2 text-sm font-medium",
                fundingIsLimit ? "text-db-orange" : "text-db-green",
              )}
            >
              {fundingIsLimit
                ? "Financing is the limit here: we cannot fund the walk-away price."
                : "Financing is not the limit here. Value is."}
            </p>
          </Card>

          <Card>
            <h2 className="mb-1 text-lg font-semibold">Sensitivity</h2>
            <div className="text-db-muted flex justify-between py-1 text-[13px] font-semibold">
              <span>Synergies achieved</span>
              <span>Walk-away</span>
            </div>
            {review.sensitivity.map((point) => (
              <Row
                key={point.realization}
                label={formatPct(point.realization)}
                value={formatM1(point.walkAwayM)}
                strong={point.realization === walkAway.realization}
              />
            ))}
            <p className="text-db-muted mt-2 text-sm leading-relaxed">
              {review.askingPriceM > ceiling
                ? `Even at 100%, the asking price is above what ${shortName} is worth to us.`
                : `At 100%, the asking price is within what ${shortName} is worth to us.`}
            </p>
          </Card>
        </aside>
      </div>
    </>
  );
}
