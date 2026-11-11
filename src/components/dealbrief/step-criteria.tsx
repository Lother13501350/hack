/** Step 1: acquisition criteria, CEO checkpoint 1 (issue #6). */
import type { ParsedCriteria } from "@/lib/criteria";
import { formatM1 } from "@/lib/finance/format";
import type { AcquisitionCriteria } from "@/types/deal";
import {
  Badge,
  Button,
  Card,
  Coach,
  Columns,
  Label,
  PageTitle,
  Row,
  Skeleton,
  inputClass,
  tableHeadClass,
} from "./chrome";

const STATUS_LABEL: Record<AcquisitionCriteria["status"], string> = {
  draft: "Draft",
  waiting: "Waiting for the CEO",
  approved: "Approved",
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
  const budgetLabel = budget ? `~$${Math.floor(budget.maxFundableM)}M` : "";
  const rows = criteria
    ? [
        ...criteria.mustHaves.map((row) => ({ ...row, type: "must" as const })),
        ...criteria.niceToHaves.map((row) => ({
          ...row,
          type: "nice" as const,
        })),
      ]
    : [];

  return (
    <>
      <PageTitle
        title="Acquisition criteria"
        subtitle="Turn the conversation with the CEO into search criteria she signs off on."
      />
      <Columns
        rail={
          <>
            <Card>
              <Label>CEO checkpoint · 1 of 3</Label>
              <p className="mt-2 text-base font-semibold">
                {STATUS_LABEL[status]}
              </p>
              {status === "draft" && (
                <Button
                  className="mt-4 w-full"
                  onClick={onSend}
                  busy={busy === "send"}
                  disabled={!criteria || parsing}
                >
                  Send to CEO for approval
                </Button>
              )}
              {status === "waiting" && (
                <>
                  <p className="text-db-muted mt-1 text-[13px]">
                    Nothing is searched until {ceoName.split(" ")[0]} approves.
                  </p>
                  <Button
                    className="mt-4 w-full"
                    onClick={onApprove}
                    busy={busy === "approve"}
                  >
                    Approve as {ceoName.split(" ")[0]} (CEO)
                  </Button>
                </>
              )}
              {status === "approved" && (
                <Button
                  className="mt-4 w-full"
                  onClick={onFindTargets}
                  busy={busy === "sourcing"}
                  arrow
                >
                  Find targets
                </Button>
              )}
            </Card>

            <Card title="Budget">
              {budget && criteria ? (
                <>
                  <p className="-mt-2 text-2xl font-semibold tracking-tight tabular-nums">
                    {budgetLabel}
                  </p>
                  <div className="border-db-line mt-3 border-t pt-2">
                    <Row
                      label="Minimum cash to keep"
                      value={formatM1(criteria.financialLimits.minCashM)}
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
                  <p className="text-db-muted mt-2 text-xs leading-relaxed">
                    From {buyerFile}. Recalculated for each target.
                  </p>
                </>
              ) : (
                <Skeleton className="h-28" />
              )}
            </Card>

            <Coach>
              Vague criteria produce hundreds of companies the CEO rejects one
              by one. A signed-off list of must-haves comes first.
            </Coach>
          </>
        }
      >
        <Card
          title="Interview notes"
          description="Paste notes or a transcript. Plain words are fine."
        >
          <textarea
            aria-label="Interview notes"
            value={notes}
            onChange={(event) => onNotes(event.target.value)}
            disabled={locked}
            rows={4}
            className={`${inputClass} resize-y leading-relaxed`}
          />
          {!locked && (
            <Button
              variant="secondary"
              className="mt-3"
              onClick={onParse}
              busy={parsing}
              disabled={!notes.trim()}
            >
              Extract criteria
            </Button>
          )}
        </Card>

        <Card
          title="Search criteria"
          description="Must-haves remove a company. Nice-to-haves raise its score."
        >
          {parsing || !criteria ? (
            <div className="flex flex-col gap-2" aria-busy="true">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-8" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className={tableHeadClass}>
                    <th className="w-[24%] py-2 font-medium">Criterion</th>
                    <th className="py-2 font-medium">Value</th>
                    <th className="w-[20%] py-2 text-right font-medium">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={`${row.type}-${row.label}`}
                      className="border-db-line border-b last:border-0"
                    >
                      <td className="text-db-muted py-2.5 pr-4">{row.label}</td>
                      <td className="py-2.5 pr-4">{row.value}</td>
                      <td className="py-2.5 text-right">
                        <Badge tone={row.type === "must" ? "solid" : "outline"}>
                          {row.type === "must" ? "Must-have" : "Nice-to-have"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card
          title="Open questions"
          description="What an experienced deal lead would clarify before searching."
          aside={
            !locked && parsed?.sampleAnswers ? (
              <Button
                variant="ghost"
                className="-my-1.5"
                onClick={onUseSampleAnswers}
              >
                Use sample answers
              </Button>
            ) : undefined
          }
        >
          {parsing || !parsed ? (
            <Skeleton className="h-36" />
          ) : (
            <div className="flex flex-col gap-4">
              {parsed.forgottenQuestions.map((question, index) => (
                <div key={question}>
                  <label
                    htmlFor={`answer-${index}`}
                    className="text-[13px] font-medium"
                  >
                    {question}
                  </label>
                  <input
                    id={`answer-${index}`}
                    value={answers[index] ?? ""}
                    onChange={(event) => onAnswer(index, event.target.value)}
                    disabled={locked}
                    placeholder="The CEO's answer"
                    className={`${inputClass} mt-1.5`}
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
