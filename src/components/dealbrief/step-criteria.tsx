/** Screen A: acquisition criteria, CEO checkpoint 1 (issue #6). */
import { formatM1 } from "@/lib/finance/format";
import type { ParsedCriteria } from "@/lib/criteria";
import type { AcquisitionCriteria } from "@/types/deal";
import {
  ActionButton,
  Badge,
  Card,
  CardHeading,
  CheckpointCard,
  CoachCard,
  Columns,
  PageTitle,
  Row,
  Skeleton,
} from "./chrome";

const STATUS_LABEL: Record<AcquisitionCriteria["status"], string> = {
  draft: "Draft",
  waiting: "Waiting for the CEO",
  approved: "Approved by the CEO",
};

export function StepCriteria({
  notes,
  onNotes,
  parsed,
  criteria,
  parsing,
  answers,
  onAnswer,
  onUseSampleAnswers,
  onParse,
  onSend,
  onApprove,
  onFindTargets,
  busy,
  ceoName,
  buyerFile,
}: {
  notes: string;
  onNotes: (value: string) => void;
  parsed: ParsedCriteria | null;
  criteria: AcquisitionCriteria | null;
  parsing: boolean;
  answers: string[];
  onAnswer: (index: number, value: string) => void;
  onUseSampleAnswers: () => void;
  onParse: () => void;
  onSend: () => void;
  onApprove: () => void;
  onFindTargets: () => void;
  busy: string | null;
  ceoName: string;
  buyerFile: string;
}) {
  const status = criteria?.status ?? "draft";
  const locked = status !== "draft";
  const budget = parsed?.budget;
  const budgetLabel = budget
    ? `Up to ~$${Math.floor(budget.maxFundableM)}M`
    : "";
  const rows = criteria
    ? [
        ...criteria.mustHaves.map((row) => ({ ...row, type: "must" as const })),
        ...criteria.niceToHaves.map((row) => ({
          ...row,
          type: "nice" as const,
        })),
        {
          label: "Budget",
          value: `${budgetLabel} (from our financials)`,
          type: "info" as const,
        },
      ]
    : [];

  return (
    <>
      <PageTitle
        eyebrow="Step A · Sample data (fictional)"
        title="What exactly is our CEO looking for?"
        subtitle="Turn a 15-minute conversation into search criteria the CEO signs off on."
      />
      <Columns
        rail={
          <>
            <CheckpointCard eyebrow="CEO checkpoint 1 of 3">
              <p className="text-db-muted mt-1 text-sm">Status</p>
              <p className="text-xl font-semibold">{STATUS_LABEL[status]}</p>
              {status === "draft" && (
                <ActionButton
                  className="mt-4 w-full"
                  onClick={onSend}
                  busy={busy === "send"}
                  disabled={!criteria || parsing}
                >
                  Send to CEO for approval
                </ActionButton>
              )}
              {status === "waiting" && (
                <>
                  <p className="text-db-muted mt-2 text-sm">
                    {ceoName} reviews the criteria and her answers. Nothing is
                    searched until she approves.
                  </p>
                  <ActionButton
                    className="mt-4 w-full"
                    tone="dark"
                    onClick={onApprove}
                    busy={busy === "approve"}
                  >
                    Approve as {ceoName.split(" ")[0]} (CEO)
                  </ActionButton>
                </>
              )}
              {status === "approved" && (
                <ActionButton
                  className="mt-4 w-full"
                  onClick={onFindTargets}
                  busy={busy === "sourcing"}
                  arrow
                >
                  Find targets
                </ActionButton>
              )}
            </CheckpointCard>

            <CoachCard>
              Vague criteria waste everyone&apos;s time: the agent finds
              hundreds of companies and the CEO rejects them one by one. Getting
              a signed-off list of must-haves first is what a Corp Dev team does
              before any search.
            </CoachCard>

            <Card>
              <h2 className="text-lg font-semibold">
                Budget, from our own numbers
              </h2>
              {budget ? (
                <>
                  <p className="mt-1 text-[28px] font-bold tracking-tight">
                    {budgetLabel}
                  </p>
                  <div className="mt-2">
                    <Row
                      label="Minimum cash to keep"
                      value={formatM1(criteria?.financialLimits.minCashM ?? 0)}
                    />
                    <Row
                      label="Max debt / EBITDA"
                      value={`${budget.maxDebtToEbitda.toFixed(1)}×`}
                    />
                    <Row
                      label="Existing debt"
                      value={formatM1(budget.existingDebtM)}
                    />
                  </div>
                  <p className="text-db-muted mt-3 text-[13px] leading-relaxed">
                    Read from {buyerFile}; the CFO can change the limits.
                    Recalculated for each target in Deal review.
                  </p>
                </>
              ) : (
                <Skeleton className="mt-3 h-28" />
              )}
            </Card>
          </>
        }
      >
        <Card>
          <CardHeading
            title="1. Notes from your talk with the CEO"
            subtitle="Paste notes or a transcript. Plain words are fine."
          />
          <label htmlFor="notes" className="text-sm font-semibold">
            Interview notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(event) => onNotes(event.target.value)}
            disabled={locked}
            rows={4}
            className="border-db-line focus:border-db-blue mt-1.5 w-full resize-y rounded-xl border bg-white px-3.5 py-3 text-[15px] leading-relaxed outline-none disabled:opacity-70"
          />
          {!locked && (
            <ActionButton
              tone="outline"
              className="mt-3"
              onClick={onParse}
              busy={parsing}
              disabled={!notes.trim()}
            >
              Update criteria from notes
            </ActionButton>
          )}
        </Card>

        <Card>
          <CardHeading
            title="2. Criteria the agent will search with"
            subtitle="Must-haves remove a company. Nice-to-haves raise its score."
          />
          {parsing || !criteria ? (
            <div className="flex flex-col gap-2.5" aria-busy="true">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-9" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-[15px]">
                <thead>
                  <tr className="text-db-muted border-db-line border-b text-xs tracking-[0.09em] uppercase">
                    <th className="w-[22%] py-2 font-semibold">Criterion</th>
                    <th className="py-2 font-semibold">Value</th>
                    <th className="w-[18%] py-2 font-semibold">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={`${row.type}-${row.label}`}
                      className="border-db-line border-b last:border-0"
                    >
                      <td className="py-2.5 pr-4 font-medium">{row.label}</td>
                      <td className="py-2.5 pr-4">{row.value}</td>
                      <td className="py-2.5">
                        {row.type === "must" && (
                          <Badge tone="ink">Must-have</Badge>
                        )}
                        {row.type === "nice" && (
                          <Badge tone="blue">Nice-to-have</Badge>
                        )}
                        {row.type === "info" && <Badge tone="gray">Info</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeading
            title="3. Questions you forgot to ask"
            subtitle="What an experienced Corp Dev lead would clarify before searching."
            aside={
              !locked && parsed?.sampleAnswers ? (
                <button
                  type="button"
                  onClick={onUseSampleAnswers}
                  className="text-db-blue shrink-0 py-2 text-sm font-semibold hover:underline"
                >
                  Use sample answers
                </button>
              ) : undefined
            }
          />
          {parsing || !parsed ? (
            <Skeleton className="h-40" />
          ) : (
            <div className="flex flex-col gap-4">
              {parsed.forgottenQuestions.map((question, index) => (
                <div key={question}>
                  <label
                    htmlFor={`answer-${index}`}
                    className="text-[15px] font-semibold"
                  >
                    {question}
                  </label>
                  <input
                    id={`answer-${index}`}
                    value={answers[index] ?? ""}
                    onChange={(event) => onAnswer(index, event.target.value)}
                    disabled={locked}
                    placeholder="The CEO's answer"
                    className="border-db-line focus:border-db-blue mt-1.5 w-full rounded-xl border bg-white px-3.5 py-3 text-[15px] outline-none disabled:opacity-70"
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      </Columns>
    </>
  );
}
