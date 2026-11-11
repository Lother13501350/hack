/** Screen 2: quality of earnings and red flags (issues #2 and #5). */
import {
  formatDelta,
  formatFY,
  formatM1,
  formatM2,
  formatPct,
} from "@/lib/finance/format";
import { cn } from "@/lib/utils";
import type { DealReview } from "@/types/deal";
import { ActionButton, Badge, Card, DarkCard, Eyebrow } from "./chrome";

function Stat({
  label,
  value,
  note,
  highlight = false,
}: {
  label: string;
  value: string;
  note?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white p-4",
        highlight ? "border-db-blue border-2" : "border-db-line border",
      )}
    >
      <p
        className={cn(
          "text-sm",
          highlight ? "text-db-blue-ink font-semibold" : "text-db-muted",
        )}
      >
        {label}
      </p>
      <p className="mt-1 text-[26px] font-bold tracking-tight">
        {value}
        {note && (
          <span className="text-db-orange ml-2 text-sm font-semibold">
            {note}
          </span>
        )}
      </p>
    </div>
  );
}

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
  const shortName = review.targetName.split(" ")[0];
  const overstated = review.reportedEbitdaM - review.normalizedEbitdaM;
  const change =
    review.reportedEbitdaM !== 0
      ? (review.normalizedEbitdaM - review.reportedEbitdaM) /
        review.reportedEbitdaM
      : 0;
  const high = review.redFlags.filter(
    (flag) => flag.severity === "HIGH",
  ).length;
  const med = review.redFlags.length - high;
  const period = `${formatFY(metrics.fromYear)}–${String(metrics.toYear).slice(-2)}`;

  return (
    <>
      <div className="mt-8 mb-5 flex flex-wrap items-end justify-between gap-4">
        <PageTitleInline
          title={`How much does ${shortName} really earn?`}
          subtitle={`${review.redFlags.length} red flags found. Reported EBITDA overstates repeatable earnings by ${formatM2(overstated)}.`}
        />
        <ActionButton
          tone={coachOn ? "blue" : "outline"}
          aria-pressed={coachOn}
          onClick={onToggleCoach}
        >
          Coach mode: {coachOn ? "on" : "off"}
        </ActionButton>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={`Reported EBITDA ${formatFY(metrics.toYear)}`}
          value={formatM2(review.reportedEbitdaM)}
        />
        <Stat
          label="Normalized EBITDA"
          value={formatM2(review.normalizedEbitdaM)}
          note={`${change < 0 ? "−" : "+"}${Math.abs(Math.round(change * 100))}%`}
          highlight
        />
        <Stat label="Red flags" value={`${high} high · ${med} med`} />
        <Stat
          label={`Revenue growth ${period}`}
          value={`${formatPct(metrics.revenueCagr, 1)} / yr`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <h2 className="mb-3 text-xl font-semibold">Red flags</h2>
          <div className="flex flex-col gap-4">
            {review.redFlags.map((flag) => (
              <article
                key={flag.id}
                className="border-db-line rounded-2xl border bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="flex flex-wrap items-center gap-2.5 text-[17px] font-semibold">
                    <Badge tone={flag.severity === "HIGH" ? "orange" : "amber"}>
                      {flag.severity}
                    </Badge>
                    {flag.title}
                  </h3>
                  <span className="shrink-0 text-[17px] font-bold tabular-nums">
                    {flag.metric}
                  </span>
                </div>
                <p className="text-db-muted mt-2 font-mono text-[13px]">
                  {flag.formula}
                </p>
                <p className="text-db-muted mt-1 text-[13px]">{flag.source}</p>
                {coachOn && (
                  <div className="bg-db-blue-soft mt-3 rounded-xl p-4">
                    <Eyebrow className="text-db-blue-ink">
                      Why an expert cares
                    </Eyebrow>
                    <p className="mt-1.5 text-[15px] leading-relaxed">
                      {flag.coach}
                    </p>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>

        <aside className="flex flex-col gap-5">
          <Card>
            <h2 className="mb-2 text-lg font-semibold">
              From reported to real EBITDA
            </h2>
            {review.bridge.map((row) => (
              <div
                key={row.id}
                title={row.source}
                className={cn(
                  "border-db-line flex items-baseline justify-between gap-4 border-b py-2 text-[15px] last:border-0",
                  row.kind === "adjustment" ? "text-db-muted" : "font-semibold",
                )}
              >
                <span>{row.label}</span>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    row.kind === "end" && "text-db-blue-ink",
                    row.kind === "adjustment" &&
                      (row.deltaM < 0 ? "text-db-orange" : "text-db-green"),
                  )}
                >
                  {row.kind === "adjustment"
                    ? formatDelta(row.deltaM)
                    : formatM2(row.runningM)}
                </span>
              </div>
            ))}
          </Card>

          <DarkCard>
            <Eyebrow className="text-white/70">
              What this means for price
            </Eyebrow>
            <p className="mt-2 text-[17px] leading-relaxed">
              Pricing on reported EBITDA would overpay by{" "}
              <strong className="text-2xl">
                {formatM1(review.overpayIfReportedM)}
              </strong>{" "}
              at a {review.multiple.toFixed(1)}× multiple.
            </p>
            <ActionButton
              tone="white"
              className="mt-4 w-full"
              onClick={onNext}
              arrow
            >
              Next: walk-away price
            </ActionButton>
          </DarkCard>
          {review.multipleIsPlaceholder && (
            <p className="text-db-muted px-1 text-[13px] leading-relaxed">
              {review.multiple.toFixed(1)}× is a placeholder multiple. Replace
              it with comparable deals before the CFO review.
            </p>
          )}
        </aside>
      </div>
    </>
  );
}

function PageTitleInline({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <h1 className="text-[34px] leading-[1.15] font-bold tracking-tight">
        {title}
      </h1>
      <p className="text-db-muted mt-2 text-[17px]">{subtitle}</p>
    </div>
  );
}
