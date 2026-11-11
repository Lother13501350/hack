/** Step 5: quality of earnings and red flags (issues #2 and #5). */
import {
  formatDelta,
  formatFY,
  formatM1,
  formatM2,
  formatPct,
} from "@/lib/finance/format";
import { cn } from "@/lib/utils";
import type { DealReview } from "@/types/deal";
import { Button, Card, Coach, Columns, Dot, PageTitle, Stats } from "./chrome";

export function StepQuality({
  review,
  coachOn,
  onToggleCoach,
  onNext,
}: {
  review: DealReview;
  coachOn: boolean;
  onToggleCoach: () => void;
  onNext: () => void;
}) {
  const { metrics } = review;
  const overstated = review.reportedEbitdaM - review.normalizedEbitdaM;
  const change =
    review.reportedEbitdaM !== 0
      ? (review.normalizedEbitdaM - review.reportedEbitdaM) /
        review.reportedEbitdaM
      : 0;
  const high = review.redFlags.filter(
    (flag) => flag.severity === "HIGH",
  ).length;
  const medium = review.redFlags.length - high;
  const period = `${formatFY(metrics.fromYear)}–${String(metrics.toYear).slice(-2)}`;

  return (
    <>
      <PageTitle
        title="Quality of earnings"
        subtitle={`Reported EBITDA overstates repeatable earnings by ${formatM2(overstated)}.`}
        aside={
          <Button
            variant="secondary"
            role="switch"
            aria-checked={coachOn}
            onClick={onToggleCoach}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-2 rounded-full",
                coachOn ? "bg-db-accent" : "bg-db-line",
              )}
            />
            Coach {coachOn ? "on" : "off"}
          </Button>
        }
      />

      <Stats
        items={[
          {
            label: `Reported EBITDA ${formatFY(metrics.toYear)}`,
            value: formatM2(review.reportedEbitdaM),
          },
          {
            label: "Normalized EBITDA",
            value: formatM2(review.normalizedEbitdaM),
            note: (
              <span className="text-db-risk">
                {change < 0 ? "−" : "+"}
                {Math.abs(Math.round(change * 100))}%
              </span>
            ),
          },
          { label: "Red flags", value: `${high} high · ${medium} medium` },
          {
            label: `Revenue growth ${period}`,
            value: `${formatPct(metrics.revenueCagr, 1)} / yr`,
          },
        ]}
      />

      <Columns
        rail={
          <>
            <Card title="Reported to normalized">
              <div className="-mt-1">
                {review.bridge.map((row) => (
                  <div
                    key={row.id}
                    title={row.source}
                    className={cn(
                      "border-db-line flex items-baseline justify-between gap-4 border-b py-2 text-[13px] last:border-0",
                      row.kind === "adjustment"
                        ? "text-db-muted"
                        : "font-medium",
                    )}
                  >
                    <span>{row.label}</span>
                    <span
                      className={cn(
                        "font-medium tabular-nums",
                        row.kind === "adjustment" && row.deltaM < 0
                          ? "text-db-risk"
                          : "text-db-ink",
                      )}
                    >
                      {row.kind === "adjustment"
                        ? formatDelta(row.deltaM)
                        : formatM2(row.runningM)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Price impact">
              <p className="text-db-muted -mt-2 text-[13px] leading-relaxed">
                Pricing on reported EBITDA would overpay by
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                {formatM1(review.overpayIfReportedM)}
              </p>
              <p className="text-db-muted mt-1 text-xs leading-relaxed">
                At a {review.multiple.toFixed(1)}× multiple
                {review.multipleIsPlaceholder &&
                  ", a placeholder until comparable deals are entered"}
                .
              </p>
              <Button className="mt-4 w-full" onClick={onNext} arrow>
                Walk-away price
              </Button>
            </Card>
          </>
        }
      >
        <Card title="Red flags" className="pb-1">
          <ul className="divide-db-line -mt-1 divide-y">
            {review.redFlags.map((flag) => (
              <li key={flag.id} className="py-4 first:pt-1">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="flex items-center gap-2.5 text-sm font-medium">
                    <Dot high={flag.severity === "HIGH"} />
                    {flag.title}
                    <span className="text-db-muted text-xs font-normal">
                      {flag.severity === "HIGH" ? "High" : "Medium"}
                    </span>
                  </h3>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {flag.metric}
                  </span>
                </div>
                <p className="text-db-muted mt-1.5 pl-[18px] font-mono text-xs">
                  {flag.formula}
                </p>
                <p className="text-db-muted mt-0.5 pl-[18px] text-xs">
                  {flag.source}
                </p>
                {coachOn && (
                  <Coach title="Why an expert cares" className="mt-3 ml-[18px]">
                    {flag.coach}
                  </Coach>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </Columns>
    </>
  );
}
