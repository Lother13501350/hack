/** Step 7: one-page decision memo for the CFO (issue #5). */
import type { ReactNode } from "react";
import type { DealMemo, DealReview } from "@/types/deal";
import { Button, Card, Columns, Dot, Label, tableHeadClass } from "./chrome";

export type MemoStatus = "awaiting" | "approved" | "changes";

const STATUS_TEXT: Record<MemoStatus, string> = {
  awaiting: "Awaiting review",
  approved: "Approved: proceed to LOI",
  changes: "Changes requested",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
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
  const listClass = "space-y-1.5 pl-5 text-sm leading-relaxed";

  return (
    <Columns
      rail={
        <>
          <Card>
            <Label>CFO decision</Label>
            <p className="mt-2 text-base font-semibold" role="status">
              {STATUS_TEXT[status]}
            </p>
            <Button
              className="mt-4 w-full"
              onClick={() => onStatus("approved")}
              disabled={status === "approved" || !canProceed}
            >
              Approve: proceed to LOI
            </Button>
            <Button
              variant="secondary"
              className="mt-2 w-full"
              onClick={() => onStatus("changes")}
              disabled={status === "changes"}
            >
              Request changes
            </Button>
            <Button
              variant="ghost"
              className="mt-1 w-full"
              onClick={() => window.print()}
            >
              Export PDF
            </Button>
          </Card>

          <Card title="Beyond this memo">
            <div className="-mt-1 space-y-3 text-[13px] leading-relaxed">
              <div>
                <p className="text-db-muted">Done in-house</p>
                <p>
                  Screening, earnings check, walk-away price, seller questions
                </p>
              </div>
              <div>
                <p className="text-db-muted">Bring in experts for</p>
                <p>
                  LOI negotiation, quality-of-earnings report, legal due
                  diligence
                </p>
              </div>
            </div>
          </Card>
        </>
      }
    >
      <Card className="p-8 sm:p-10">
        <Label>Decision memo · {dateLabel}</Label>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Acquisition of {review.targetName}
        </h1>
        <p className="text-db-muted mt-1 text-[13px]">
          To the CFO · Prepared by {analyst.name}, {analyst.title}
        </p>

        <div className="bg-db-subtle mt-6 rounded-lg p-5">
          <Label>Recommendation</Label>
          <p className="mt-1 text-lg font-semibold tracking-tight">
            {memo.headline}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed">{memo.summary}</p>
        </div>

        <Section title="Why pursue it">
          <ul className={`list-disc ${listClass}`}>
            {memo.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </Section>

        <Section title="Key risks">
          <ul className={`list-disc ${listClass}`}>
            {memo.risks.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </Section>

        <Section title="Conditions before signing an LOI">
          <ol className={`list-decimal ${listClass}`}>
            {memo.conditionsBeforeLoi.map((condition) => (
              <li key={condition}>{condition}</li>
            ))}
          </ol>
        </Section>

        <Section title="Questions for the seller">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className={tableHeadClass}>
                  <th className="w-7 py-2 font-medium">#</th>
                  <th className="py-2 font-medium">Question</th>
                  <th className="w-[26%] py-2 pl-4 font-medium">Red flag</th>
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
                      <td className="text-db-muted py-2.5 tabular-nums">
                        {index + 1}
                      </td>
                      <td className="py-2.5 leading-relaxed">
                        {entry.question}
                      </td>
                      <td className="py-2.5 pl-4 text-[13px]">
                        <span className="flex items-center gap-2">
                          <Dot high={flag?.severity === "HIGH"} />
                          {flag?.shortLabel ?? "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        <p className="text-db-muted border-db-line mt-8 border-t pt-4 text-xs leading-relaxed">
          Every figure comes from the model and traces to a source cell;{" "}
          {assumptions} assumptions were entered by the analyst.{" "}
          {memo.source === "llm"
            ? "Wording written by AI and checked against the model's numbers."
            : "Wording from the standard template."}
        </p>
      </Card>
    </Columns>
  );
}
