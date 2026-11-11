/** Screen 1: deal setup (issue #9). Upload, confirm extracted numbers, run the review. */
import { Check } from "lucide-react";
import { useState } from "react";
import { formatM1 } from "@/lib/finance/format";
import type { AcquisitionCriteria, ExtractionResult } from "@/types/deal";
import {
  ActionButton,
  Badge,
  Card,
  CardHeading,
  CoachCard,
  Columns,
  DarkCard,
  Eyebrow,
  PageTitle,
  Skeleton,
} from "./chrome";

const REASON_LABEL: Record<AcquisitionCriteria["reason"], string> = {
  competitor: "Acquire a competitor",
  technology: "Acquire a technology",
  new_market: "Enter a new market",
  supply_chain: "Secure the supply chain",
  buy_and_build: "Buy and build",
};

function FileTile({
  eyebrow,
  file,
  status,
  parsed,
  dashed = false,
}: {
  eyebrow: string;
  file: string;
  status: string;
  parsed: boolean;
  dashed?: boolean;
}) {
  return (
    <div
      className={`border-db-line rounded-xl bg-[#fafaf8] p-4 ${dashed ? "border border-dashed" : "border"}`}
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <p className="mt-1.5 text-[17px] font-semibold break-words">{file}</p>
      <p
        className={`mt-1 flex items-start gap-1 text-sm ${parsed ? "text-db-green" : "text-db-muted"}`}
      >
        {parsed && <Check className="mt-0.5 size-3.5 shrink-0" aria-hidden />}
        {status}
      </p>
    </div>
  );
}

export function StepSetup({
  extraction,
  criteria,
  buyerFile,
  onConfirm,
  onConfirmAll,
  onRun,
  busy,
}: {
  extraction: ExtractionResult | null;
  criteria: AcquisitionCriteria | null;
  buyerFile: string;
  onConfirm: (key: string, confirmed: boolean) => void;
  onConfirmAll: () => void;
  onRun: () => void;
  busy: string | null;
}) {
  const [showNumbers, setShowNumbers] = useState(false);
  const target = extraction?.target;
  const fields = extraction?.fields ?? [];
  const pending = fields.filter((field) => !field.confirmed).length;
  const span = target
    ? Math.max(...target.financials.map((year) => year.fiscalYear)) -
      Math.min(...target.financials.map((year) => year.fiscalYear)) +
      1
    : 0;

  return (
    <>
      <PageTitle
        eyebrow="New deal review · Sample data (fictional)"
        title={
          target
            ? `Should we buy ${target.name}?`
            : "Should we buy this company?"
        }
        subtitle={
          target
            ? `${target.descriptor ?? target.location} · Seller asking ${formatM1(target.askingPriceM)}`
            : undefined
        }
      />
      <Columns
        rail={
          <>
            <DarkCard>
              <h2 className="text-xl font-semibold">What you will get</h2>
              <ol className="mt-3 list-decimal space-y-2.5 pl-5 text-[15px]">
                <li>
                  Red flags and the target&apos;s <strong>real</strong> earnings
                </li>
                <li>
                  The <strong>most you should pay</strong>, and why
                </li>
                <li>Questions to ask the seller</li>
                <li>A one-page memo for your CFO</li>
              </ol>
              <ActionButton
                tone="white"
                className="mt-5 w-full"
                onClick={onRun}
                busy={busy === "review"}
                disabled={!extraction || pending > 0}
                arrow
              >
                Run deal review
              </ActionButton>
              <p className="mt-2.5 text-center text-[13px] text-white/75">
                {pending > 0
                  ? `Confirm ${pending} extracted numbers first`
                  : "Numbers are calculated at once; the coach text takes a few seconds"}
              </p>
            </DarkCard>
            <CoachCard>
              Why do we need <strong>your</strong> numbers too? The same company
              is worth more to a buyer who can cut its costs or sell to its
              customers, and less to one who must borrow heavily to buy it.
              Experts never value a target in isolation.
            </CoachCard>
            <p className="text-db-muted px-1 text-[13px] leading-relaxed">
              Every number is calculated by a fixed model and links back to a
              cell in your files. AI writes only the explanations.
            </p>
          </>
        }
      >
        <Card>
          <CardHeading
            title="1. Upload financials"
            subtitle={
              <>
                Both companies. A target is only worth what it is worth{" "}
                <em>to you</em>.
              </>
            }
          />
          {extraction && target ? (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <FileTile
                  eyebrow="Your company (buyer)"
                  file={buyerFile}
                  status={`Parsed · ${span} years · P&L, balance sheet`}
                  parsed
                />
                <FileTile
                  eyebrow="Target company"
                  file={extraction.fileName}
                  status={`Parsed · ${span} years · customer list found`}
                  parsed
                />
                <FileTile
                  eyebrow="Seller's notes"
                  file={`${target.name.split(" ")[0]}_one-time_expenses.pdf`}
                  status={`${target.adjustments.length} adjustments found · asking price ${formatM1(target.askingPriceM)}`}
                  parsed={false}
                  dashed
                />
              </div>

              <div className="border-db-line mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3">
                <p className="text-[15px]">
                  <strong>{fields.length} numbers extracted</strong> from the
                  uploaded files.{" "}
                  {pending > 0 ? (
                    <span className="text-db-orange font-semibold">
                      {pending} not confirmed yet.
                    </span>
                  ) : (
                    <span className="text-db-green font-semibold">
                      All confirmed by the analyst.
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    tone="outline"
                    aria-expanded={showNumbers}
                    onClick={() => setShowNumbers((value) => !value)}
                  >
                    {showNumbers ? "Hide numbers" : "Check numbers"}
                  </ActionButton>
                  {pending > 0 && (
                    <ActionButton onClick={onConfirmAll}>
                      Confirm all
                    </ActionButton>
                  )}
                </div>
              </div>

              {showNumbers && (
                <div className="mt-3 max-h-80 overflow-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead>
                      <tr className="text-db-muted border-db-line border-b text-xs tracking-[0.09em] uppercase">
                        <th className="py-2 font-semibold">Number</th>
                        <th className="py-2 text-right font-semibold">
                          Value ($M)
                        </th>
                        <th className="py-2 pl-4 font-semibold">Read from</th>
                        <th className="px-3 py-2 font-semibold">Confidence</th>
                        <th className="py-2 font-semibold">Confirmed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field) => (
                        <tr
                          key={field.key}
                          className="border-db-line border-b last:border-0"
                        >
                          <td className="py-2 pr-3 font-medium">
                            {field.label}
                          </td>
                          <td className="py-2 text-right tabular-nums">
                            {field.value.toFixed(2)}
                          </td>
                          <td className="text-db-muted py-2 pl-4">
                            {field.sourceRef}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              tone={field.confidence >= 0.9 ? "green" : "amber"}
                            >
                              {Math.round(field.confidence * 100)}%
                            </Badge>
                          </td>
                          <td className="py-2">
                            <input
                              type="checkbox"
                              aria-label={`Confirm ${field.label}`}
                              checked={field.confirmed}
                              onChange={(event) =>
                                onConfirm(field.key, event.target.checked)
                              }
                              className="accent-db-blue size-4"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <Skeleton className="h-32" />
          )}
        </Card>

        <Card>
          <CardHeading
            title="2. Already agreed with your CEO"
            subtitle="Carried over from your search criteria. No need to ask again."
            aside={
              criteria?.status === "approved" ? (
                <Badge tone="green" className="px-2.5 py-1 text-[13px]">
                  Approved in step A
                </Badge>
              ) : undefined
            }
          />
          {criteria ? (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="border-db-line rounded-xl border bg-[#fafaf8] p-4">
                <Eyebrow>Why we are buying</Eyebrow>
                <p className="mt-1.5 text-[17px] font-semibold">
                  {REASON_LABEL[criteria.reason]}
                </p>
                <p className="text-db-muted mt-1 text-sm">
                  Decides which synergies we model in step 3
                </p>
              </div>
              <div className="border-db-line rounded-xl border bg-[#fafaf8] p-4">
                <Eyebrow>Financial limits</Eyebrow>
                <ul className="mt-1.5 space-y-1 text-[15px]">
                  <li>
                    Keep ≥ {formatM1(criteria.financialLimits.minCashM)} cash
                  </li>
                  <li>
                    Debt ≤ {criteria.financialLimits.maxDebtToEbitda.toFixed(1)}
                    × EBITDA
                  </li>
                  <li>
                    Existing debt{" "}
                    {formatM1(criteria.financialLimits.existingDebtM)}
                  </li>
                </ul>
              </div>
              <div className="border-db-line rounded-xl border bg-[#fafaf8] p-4">
                <Eyebrow>CEO&apos;s answers</Eyebrow>
                {criteria.ceoAnswers.length > 0 ? (
                  <ul className="mt-1.5 space-y-1 text-[15px]">
                    {criteria.ceoAnswers.map((entry) => (
                      <li key={entry.question} title={entry.question}>
                        {entry.answer}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-db-muted mt-1.5 text-[15px]">
                    No answers were recorded in step A.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-db-muted text-[15px]">
              No criteria yet. Go back to step A to set them.
            </p>
          )}
        </Card>
      </Columns>
    </>
  );
}
