/** Screen 4: one-page decision memo for the CFO (issue #5). */
import { cn } from "@/lib/utils";
import type { DealMemo, DealReview } from "@/types/deal";
import { ActionButton, Card, DarkCard, Eyebrow } from "./chrome";

export type MemoStatus = "awaiting" | "approved" | "changes";

const STATUS_TEXT: Record<MemoStatus, string> = {
  awaiting: "Awaiting your review",
  approved: "Approved: proceed to LOI",
  changes: "Changes requested",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7">
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function StepMemo({
  memo,
  review,
  status,
  onStatus,
  analyst,
  dateLabel,
}: {
  memo: DealMemo;
  review: DealReview;
  status: MemoStatus;
  onStatus: (status: MemoStatus) => void;
  analyst: { name: string; title: string };
  dateLabel: string;
}) {
  const flagOf = (id: string) => review.redFlags.find((flag) => flag.id === id);
  const assumptions = review.bridge.filter(
    (row) => row.kind === "adjustment",
  ).length;
  const canProceed = memo.recommendation !== "Walk away";

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="min-w-0 p-8 lg:p-10">
        <Eyebrow>Decision memo · {dateLabel}</Eyebrow>
        <h1 className="mt-1.5 text-[30px] leading-tight font-bold tracking-tight">
          Acquisition of {review.targetName}
        </h1>
        <p className="text-db-muted mt-1.5 text-[15px]">
          To: CFO · Prepared by: {analyst.name}, {analyst.title} · Reviewed by
          DealBrief
        </p>

        <div className="border-db-blue mt-6 rounded-xl border-2 p-5">
          <Eyebrow className="text-db-blue-ink">Recommendation</Eyebrow>
          <p className="mt-1 text-2xl font-bold tracking-tight">
            {memo.headline}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed">{memo.summary}</p>
        </div>

        <Section title="Why pursue it">
          <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed">
            {memo.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </Section>

        <Section title="Key risks">
          <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed">
            {memo.risks.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </Section>

        <Section title="Conditions before signing an LOI">
          <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-relaxed">
            {memo.conditionsBeforeLoi.map((condition) => (
              <li key={condition}>{condition}</li>
            ))}
          </ol>
        </Section>

        <Section title="Questions for the seller">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[15px]">
              <thead>
                <tr className="text-db-muted border-db-line border-b text-xs tracking-[0.09em] uppercase">
                  <th className="w-8 py-2 font-semibold">#</th>
                  <th className="py-2 font-semibold">Question</th>
                  <th className="w-[24%] py-2 pl-4 font-semibold">
                    Linked flag
                  </th>
                </tr>
              </thead>
              <tbody>
                {memo.sellerQuestions.map((entry, index) => {
                  const flag = flagOf(entry.redFlagId);
                  return (
                    <tr
                      key={entry.redFlagId + entry.question}
                      className="border-db-line border-b align-top last:border-0"
                    >
                      <td className="text-db-muted py-2.5">{index + 1}</td>
                      <td className="py-2.5">{entry.question}</td>
                      <td
                        className={cn(
                          "py-2.5 pl-4 font-semibold",
                          flag?.severity === "HIGH"
                            ? "text-db-orange"
                            : "text-db-amber",
                        )}
                      >
                        {flag?.shortLabel ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        <p className="text-db-muted mt-7 text-[13px]">
          {memo.source === "llm"
            ? "Wording written by AI from the computed review. Every figure was checked against the model's numbers."
            : "Wording from the standard template. Every figure comes from the model."}
        </p>
      </Card>

      <aside className="flex flex-col gap-5 print:hidden">
        <Card>
          <p className="text-db-muted text-sm">Status</p>
          <p className="text-xl font-semibold" role="status">
            {STATUS_TEXT[status]}
          </p>
          <ActionButton
            className="mt-4 w-full"
            onClick={() => onStatus("approved")}
            disabled={status === "approved" || !canProceed}
          >
            Approve: proceed to LOI
          </ActionButton>
          <ActionButton
            tone="outline"
            className="mt-2.5 w-full"
            onClick={() => onStatus("changes")}
            disabled={status === "changes"}
          >
            Request changes
          </ActionButton>
          <button
            type="button"
            onClick={() => window.print()}
            className="text-db-blue mt-2 min-h-11 w-full text-[15px] font-semibold hover:underline"
          >
            Export PDF
          </button>
        </Card>

        <DarkCard>
          <Eyebrow className="text-white/70">
            When to bring in an advisor
          </Eyebrow>
          <p className="mt-3 text-sm text-white/80">Done in-house</p>
          <p className="text-[15px] leading-relaxed">
            Screening, earnings check, walk-away price, seller questions
          </p>
          <p className="mt-4 text-sm text-white/80">Hire experts for</p>
          <p className="text-[15px] leading-relaxed">
            LOI negotiation, quality-of-earnings report, legal due diligence
          </p>
        </DarkCard>

        <Card>
          <h2 className="text-lg font-semibold">Audit trail</h2>
          <p className="text-db-muted mt-1.5 text-[15px] leading-relaxed">
            Every number in this memo links to a source cell and a named
            assumption. {assumptions} assumptions were entered by the analyst
            and are marked for your review.
          </p>
        </Card>
      </aside>
    </div>
  );
}
