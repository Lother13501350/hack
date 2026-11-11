/** Step 4: deal setup (issue #9). Upload, confirm extracted numbers, run the review. */
import { Check } from "lucide-react";
import { useState } from "react";
import { formatM1 } from "@/lib/finance/format";
import type { AcquisitionCriteria, ExtractionResult } from "@/types/deal";
import {
  Badge,
  Button,
  Card,
  Coach,
  Columns,
  Label,
  PageTitle,
  Skeleton,
  tableHeadClass,
} from "./chrome";

const REASON_LABEL: Record<AcquisitionCriteria["reason"], string> = {
  competitor: "Acquire a competitor",
  technology: "Acquire a technology",
  new_market: "Enter a new market",
  supply_chain: "Secure the supply chain",
  buy_and_build: "Buy and build",
};

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
  const files =
    extraction && target
      ? [
          { role: "Buyer", name: buyerFile, detail: "P&L, balance sheet" },
          {
            role: "Target",
            name: extraction.fileName,
            detail: "P&L, balance sheet, customer list",
          },
          {
            role: "Seller's notes",
            name: `${target.name.split(" ")[0]}_one-time_expenses.pdf`,
            detail: `${target.adjustments.length} adjustments, asking price ${formatM1(target.askingPriceM)}`,
          },
        ]
      : [];

  return (
    <>
      <PageTitle
        title={target?.name ?? "Deal setup"}
        subtitle={
          target
            ? `${target.descriptor ?? target.location} · Seller asking ${formatM1(target.askingPriceM)}`
            : undefined
        }
      />
      <Columns
        rail={
          <>
            <Card title="Deal review">
              <p className="text-db-muted -mt-2 text-[13px] leading-relaxed">
                Real earnings, the most you should pay, questions for the
                seller, and a one-page memo for the CFO.
              </p>
              <Button
                className="mt-4 w-full"
                onClick={onRun}
                busy={busy === "review"}
                disabled={!extraction || pending > 0}
                arrow
              >
                Run deal review
              </Button>
              {pending > 0 && (
                <p className="text-db-muted mt-2 text-xs">
                  Confirm the {pending} extracted numbers first.
                </p>
              )}
            </Card>
            <Coach>
              The same company is worth more to a buyer who can cut its costs or
              sell to its customers. Experts never value a target in isolation,
              which is why your own numbers are needed too.
            </Coach>
          </>
        }
      >
        <Card
          title="Financials"
          description="Both companies. A target is only worth what it is worth to you."
        >
          {extraction && target ? (
            <>
              <ul className="divide-db-line border-db-line divide-y rounded-lg border">
                {files.map((file) => (
                  <li
                    key={file.name}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
                  >
                    <span className="text-db-muted w-24 shrink-0 text-[13px]">
                      {file.role}
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium break-all">
                      {file.name}
                    </span>
                    <span className="text-db-muted flex items-center gap-1.5 text-[13px]">
                      <Check className="size-3.5" aria-hidden="true" />
                      {file.detail}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[13px]">
                  <span className="font-medium">
                    {fields.length} numbers extracted.
                  </span>{" "}
                  <span
                    className={pending > 0 ? "text-db-risk" : "text-db-muted"}
                  >
                    {pending > 0
                      ? `${pending} to confirm.`
                      : "All confirmed by the analyst."}
                  </span>
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    aria-expanded={showNumbers}
                    onClick={() => setShowNumbers((value) => !value)}
                  >
                    {showNumbers ? "Hide numbers" : "Review numbers"}
                  </Button>
                  {pending > 0 && (
                    <Button variant="secondary" onClick={onConfirmAll}>
                      Confirm all
                    </Button>
                  )}
                </div>
              </div>

              {showNumbers && (
                <div className="border-db-line mt-3 max-h-80 overflow-auto rounded-lg border">
                  <table className="w-full min-w-[560px] text-[13px]">
                    <thead className="sticky top-0 bg-white">
                      <tr className={tableHeadClass}>
                        <th className="px-4 py-2 font-medium">Number</th>
                        <th className="px-4 py-2 text-right font-medium">$M</th>
                        <th className="px-4 py-2 font-medium">Read from</th>
                        <th className="px-4 py-2 text-right font-medium">
                          Confidence
                        </th>
                        <th className="px-4 py-2 text-right font-medium">
                          Confirmed
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field) => (
                        <tr
                          key={field.key}
                          className="border-db-line border-b last:border-0"
                        >
                          <td className="px-4 py-2">{field.label}</td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {field.value.toFixed(2)}
                          </td>
                          <td className="text-db-muted px-4 py-2">
                            {field.sourceRef}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            <span
                              className={
                                field.confidence < 0.9
                                  ? "text-db-risk"
                                  : "text-db-muted"
                              }
                            >
                              {Math.round(field.confidence * 100)}%
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <input
                              type="checkbox"
                              aria-label={`Confirm ${field.label}`}
                              checked={field.confirmed}
                              onChange={(event) =>
                                onConfirm(field.key, event.target.checked)
                              }
                              className="accent-db-accent size-4 align-middle"
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

        <Card
          title="Agreed with the CEO"
          description="Carried over from the search criteria."
          aside={
            criteria?.status === "approved" ? (
              <Badge tone="outline">Approved</Badge>
            ) : undefined
          }
        >
          {criteria ? (
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-3">
              <div>
                <Label>Why we are buying</Label>
                <p className="mt-1.5 text-sm">
                  {REASON_LABEL[criteria.reason]}
                </p>
              </div>
              <div>
                <Label>Financial limits</Label>
                <ul className="mt-1.5 space-y-0.5 text-sm">
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
              <div>
                <Label>CEO&apos;s answers</Label>
                {criteria.ceoAnswers.length > 0 ? (
                  <ul className="mt-1.5 space-y-0.5 text-sm">
                    {criteria.ceoAnswers.map((entry) => (
                      <li key={entry.question} title={entry.question}>
                        {entry.answer}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-db-muted mt-1.5 text-sm">None recorded.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-db-muted text-sm">
              No criteria yet. Set them in step 1.
            </p>
          )}
        </Card>
        <p className="text-db-muted -mt-2 text-xs">
          Every number is calculated by a fixed model and traces back to your
          files. AI writes only the explanations.
        </p>
      </Columns>
    </>
  );
}
