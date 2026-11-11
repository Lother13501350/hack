/** Step 6: walk-away price, financing check and sensitivity (issues #2 and #5). */
import { formatM1, formatM2, formatPct } from "@/lib/finance/format";
import { cn } from "@/lib/utils";
import type { DealReview } from "@/types/deal";
import {
  Button,
  Card,
  Coach,
  Columns,
  Label,
  PageTitle,
  Row,
  tableHeadClass,
} from "./chrome";

const REALIZATION_CHOICES = [0, 0.5, 1];

function Bar({
  label,
  value,
  from,
  to,
  max,
  color,
  strong = false,
}: {
  label: string;
  value: string;
  from: number;
  to: number;
  max: number;
  color: string;
  strong?: boolean;
}) {
  const left = (Math.min(from, to) / max) * 100;
  const width = (Math.abs(to - from) / max) * 100;
  return (
    <div className="grid grid-cols-[minmax(0,168px)_minmax(0,1fr)_64px] items-center gap-4 py-1.5 text-[13px]">
      <span className={strong ? "font-medium" : "text-db-muted"}>{label}</span>
      <div className="bg-db-subtle relative h-2 rounded-full">
        <div
          className={cn(
            "absolute inset-y-0 rounded-full transition-all duration-300",
            color,
          )}
          style={{ left: `${left}%`, width: `${Math.max(width, 0.8)}%` }}
        />
      </div>
      <span className="text-right font-medium tabular-nums">{value}</span>
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
  const max = Math.max(review.askingPriceM, ceiling) * 1.05;
  const gap = review.askVsWalkAwayM;
  const beforeCost = walkAway.standaloneM + walkAway.synergyM;
  const fundingIsLimit = financing.maxFundableM < walkAway.walkAwayM;
  const assumptions = [
    {
      item: synergies.costLabel ?? "Cost synergies",
      amount: `${formatM2(synergies.costM)} / yr`,
      basis: synergies.costBasis,
    },
    {
      item: synergies.revenueLabel ?? "Revenue synergies",
      amount: `${formatM2(synergies.revenueM)} / yr`,
      basis: synergies.revenueBasis,
    },
    {
      item: "Integration cost",
      amount: `${formatM2(synergies.integrationCostM)} once`,
      basis: synergies.integrationBasis,
    },
  ];

  return (
    <>
      <PageTitle
        title="Walk-away price"
        subtitle="The most the company is worth to you, and whether you can fund it."
      />
      <Columns
        rail={
          <>
            <Card>
              <Label>Recommended range</Label>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-db-muted text-[13px]">Open at</p>
                  <p className="text-xl font-semibold tracking-tight tabular-nums">
                    ≤ {formatM1(review.openingBidM)}
                  </p>
                </div>
                <div>
                  <p className="text-db-muted text-[13px]">Walk away above</p>
                  <p className="text-xl font-semibold tracking-tight tabular-nums">
                    {formatM1(walkAway.walkAwayM)}
                  </p>
                </div>
              </div>
              <Button
                className="mt-4 w-full"
                onClick={onMemo}
                busy={busy === "memo"}
                arrow
              >
                Write CFO memo
              </Button>
            </Card>

            <Card title="Financing">
              <div className="-mt-2">
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
              </div>
              <p
                className={cn(
                  "mt-2 text-xs leading-relaxed",
                  fundingIsLimit ? "text-db-risk" : "text-db-muted",
                )}
              >
                {fundingIsLimit
                  ? "Financing is the limit: you cannot fund the walk-away price."
                  : "Financing is not the limit here. Value is."}
              </p>
            </Card>

            <Card title="Sensitivity">
              <div className="-mt-2">
                {review.sensitivity.map((point) => (
                  <Row
                    key={point.realization}
                    label={`${formatPct(point.realization)} of synergies`}
                    value={formatM1(point.walkAwayM)}
                    strong={point.realization === walkAway.realization}
                  />
                ))}
              </div>
              <p className="text-db-muted mt-2 text-xs leading-relaxed">
                {review.askingPriceM > ceiling
                  ? `Even at 100%, the asking price is above what ${shortName} is worth to you.`
                  : `At 100%, the asking price is within what ${shortName} is worth to you.`}
              </p>
            </Card>
          </>
        }
      >
        <Card>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Label>Walk-away price</Label>
              <p className="text-db-accent mt-1 text-5xl font-semibold tracking-tight tabular-nums">
                {formatM1(walkAway.walkAwayM)}
              </p>
            </div>
            <div className="text-right">
              <Label>Seller asking</Label>
              <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                {formatM1(review.askingPriceM)}
              </p>
              <p
                className={cn(
                  "text-[13px]",
                  gap > 0 ? "text-db-risk" : "text-db-muted",
                )}
              >
                {gap > 0
                  ? `${formatM1(gap)} above walk-away`
                  : `${formatM1(-gap)} inside walk-away`}
              </p>
            </div>
          </div>

          <fieldset className="border-db-line mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
            <legend className="sr-only">Share of synergies achieved</legend>
            <span className="text-[13px] font-medium" aria-hidden="true">
              Synergies you expect to achieve
            </span>
            <div className="bg-db-subtle flex rounded-lg p-0.5">
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
                      "h-8 min-w-16 rounded-md px-3 text-[13px] font-medium tabular-nums transition-colors",
                      active
                        ? "text-db-ink bg-white shadow-sm"
                        : "text-db-muted hover:text-db-ink",
                    )}
                  >
                    {formatPct(choice)}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-4">
            <Bar
              label={`Standalone (${review.normalizedEbitdaM.toFixed(2)} × ${review.multiple.toFixed(1)})`}
              value={formatM1(walkAway.standaloneM)}
              from={0}
              to={walkAway.standaloneM}
              max={max}
              color="bg-db-ink/30"
            />
            <Bar
              label="+ Synergies paid for"
              value={`+${formatM1(walkAway.synergyM)}`}
              from={walkAway.standaloneM}
              to={beforeCost}
              max={max}
              color="bg-db-accent/45"
            />
            <Bar
              label="− Integration cost"
              value={formatM1(-walkAway.integrationCostM)}
              from={beforeCost - walkAway.integrationCostM}
              to={beforeCost}
              max={max}
              color="bg-db-risk"
            />
            <Bar
              label="Walk-away price"
              value={formatM1(walkAway.walkAwayM)}
              from={0}
              to={walkAway.walkAwayM}
              max={max}
              color="bg-db-accent"
              strong
            />
            <Bar
              label="Seller asking"
              value={formatM1(review.askingPriceM)}
              from={0}
              to={review.askingPriceM}
              max={max}
              color="bg-db-ink"
              strong
            />
          </div>
        </Card>

        <Card title="Synergy assumptions">
          <div className="-mt-1 overflow-x-auto">
            <table className="w-full min-w-[480px] text-[13px]">
              <thead>
                <tr className={tableHeadClass}>
                  <th className="w-[30%] py-2 font-medium">Item</th>
                  <th className="w-[20%] py-2 font-medium">Amount</th>
                  <th className="py-2 font-medium">Basis</th>
                </tr>
              </thead>
              <tbody>
                {assumptions.map((row) => (
                  <tr
                    key={row.item}
                    className="border-db-line border-b last:border-0"
                  >
                    <td className="py-2.5 pr-3">{row.item}</td>
                    <td className="py-2.5 pr-3 font-medium tabular-nums">
                      {row.amount}
                    </td>
                    <td className="text-db-muted py-2.5">
                      {row.basis ?? "Analyst estimate"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Coach title="Why an expert cares" className="mt-4">
            If you pay for 100% of the synergies, the seller keeps all the value
            you create. Revenue synergies are discounted more heavily than cost
            synergies, because selling to someone else&apos;s customers depends
            on people you do not control.
          </Coach>
        </Card>
      </Columns>
    </>
  );
}
