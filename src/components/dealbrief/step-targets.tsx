/** Screen B: shortlist of targets, CEO checkpoint 2 (issue #4). */
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Candidate, SourcingResult } from "@/types/deal";
import {
  ActionButton,
  Badge,
  Card,
  CheckpointCard,
  CoachCard,
  Columns,
  Eyebrow,
  PageTitle,
} from "./chrome";

function ScoreBox({ score, selected }: { score: number; selected: boolean }) {
  return (
    <span
      className={cn(
        "flex size-14 shrink-0 items-center justify-center rounded-xl text-xl font-bold",
        selected
          ? "bg-db-blue text-white"
          : score >= 70
            ? "bg-db-blue-soft text-db-blue-ink"
            : "bg-db-track text-db-muted",
      )}
    >
      <span className="sr-only">Fit score </span>
      {score}
    </span>
  );
}

function Snapshot({ candidate }: { candidate: Candidate }) {
  const sources = candidate.evidence.filter(
    (item, index, all) =>
      all.findIndex((other) => other.sourceLabel === item.sourceLabel) ===
      index,
  );
  return (
    <div className="border-db-line mt-4 rounded-xl border bg-[#fafaf8] p-4">
      <div className="grid gap-x-6 gap-y-4 md:grid-cols-3">
        <div>
          <Eyebrow>What they do</Eyebrow>
          <p className="mt-1 text-[15px]">{candidate.snapshot.what}</p>
        </div>
        <div>
          <Eyebrow>Ownership</Eyebrow>
          <p className="mt-1 text-[15px]">{candidate.snapshot.ownership}</p>
        </div>
        <div>
          <Eyebrow className="text-db-blue-ink">Why it fits</Eyebrow>
          <p className="mt-1 text-[15px]">{candidate.snapshot.whyFits}</p>
        </div>
        <div>
          <Eyebrow className="text-db-orange">Watch out</Eyebrow>
          <p className="mt-1 text-[15px]">{candidate.snapshot.watchOut}</p>
        </div>
      </div>
      <p className="text-db-muted mt-4 text-[13px] leading-relaxed">
        Sources:{" "}
        {sources.map((item, index) => (
          <span key={item.sourceUrl}>
            {index > 0 && ", "}
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              title={item.text}
              className="text-db-blue underline"
            >
              {item.sourceLabel}
            </a>
          </span>
        ))}
        {candidate.revenueIsEstimate &&
          " · Revenue estimated from headcount, not reported"}
      </p>
    </div>
  );
}

export function StepTargets({
  sourcing,
  selected,
  onToggle,
  onDraft,
  busy,
  analystName,
}: {
  sourcing: SourcingResult;
  selected: string[];
  onToggle: (id: string) => void;
  onDraft: () => void;
  busy: string | null;
  analystName: string;
}) {
  const [open, setOpen] = useState<string[]>(
    sourcing.candidates[0] ? [sourcing.candidates[0].id] : [],
  );
  const toggleOpen = (id: string) =>
    setOpen((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  const count = selected.length;

  return (
    <>
      <PageTitle
        eyebrow={
          sourcing.source === "fixture"
            ? "Step B · Sample data (fictional companies)"
            : "Step B · Live web search"
        }
        title="Which companies should we contact?"
        subtitle={`Found by the agent, checked by ${analystName} (analyst). You pick who gets an email.`}
      />

      <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 py-4">
        <p className="text-db-muted text-[15px]">
          Searched business registries, company websites, industry directories
          and local news with your approved criteria.
        </p>
        <div className="flex flex-wrap gap-2 text-[15px]">
          <span className="bg-db-track rounded-lg px-3 py-1.5">
            <strong>{sourcing.funnel.searchResults}</strong> found
          </span>
          <span className="bg-db-track rounded-lg px-3 py-1.5">
            <strong>{sourcing.funnel.passedMustHaves}</strong> meet all
            must-haves
          </span>
          <span className="bg-db-blue-soft text-db-blue-ink rounded-lg px-3 py-1.5">
            <strong>{sourcing.funnel.shortlisted}</strong> shortlisted
          </span>
        </div>
      </Card>

      <Columns
        rail={
          <>
            <CheckpointCard eyebrow="CEO checkpoint 2 of 3">
              <p className="mt-1 text-[28px] font-bold tracking-tight">
                {count} selected
              </p>
              <p className="text-db-muted mt-1 text-sm">
                The agent drafts one personal email for each. Nothing is sent
                until you approve it.
              </p>
              <ActionButton
                className="mt-4 w-full"
                onClick={onDraft}
                busy={busy === "draft"}
                disabled={count === 0}
                arrow
              >
                Draft {count} {count === 1 ? "email" : "emails"}
              </ActionButton>
            </CheckpointCard>
            <CoachCard>
              Contact a few companies at a time. Word travels fast in a small
              industry, and an owner who hears you emailed all his competitors
              will not trust you.
            </CoachCard>
            <Card>
              <h2 className="text-lg font-semibold">Rules the agent follows</h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px]">
                <li>Every fact links to a public source</li>
                <li>No company is invented from memory</li>
                <li>Financial figures are marked as estimates</li>
              </ul>
            </Card>
          </>
        }
      >
        {sourcing.candidates.map((candidate) => {
          const isSelected = selected.includes(candidate.id);
          const isOpen = open.includes(candidate.id);
          const range = candidate.estRevenueRangeM;
          return (
            <article
              key={candidate.id}
              className={cn(
                "rounded-2xl bg-white p-5",
                isSelected
                  ? "border-db-blue border-2"
                  : "border-db-line border",
              )}
            >
              <div className="flex items-start gap-4">
                <ScoreBox score={candidate.fitScore} selected={isSelected} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold">{candidate.name}</h2>
                  <p className="text-db-muted text-[15px]">
                    {candidate.location} · Est. revenue ${range.lowM}–
                    {range.highM}M
                  </p>
                  <Badge
                    className="mt-1.5"
                    tone={
                      candidate.analystRecommendation === "recommend"
                        ? "blue"
                        : "orange"
                    }
                  >
                    {candidate.analystRecommendation === "recommend"
                      ? "Analyst recommends"
                      : "Analyst suggests skip"}
                  </Badge>
                </div>
                <label
                  className={cn(
                    "flex min-h-11 shrink-0 cursor-pointer items-center gap-2.5 rounded-xl border px-4 text-[15px] font-semibold",
                    isSelected
                      ? "border-db-blue bg-db-blue-soft text-db-blue-ink"
                      : "border-db-line bg-white",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(candidate.id)}
                    className="accent-db-blue size-4"
                  />
                  Contact
                  <span className="sr-only"> {candidate.name}</span>
                </label>
              </div>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => toggleOpen(candidate.id)}
                className="text-db-blue mt-3 py-1.5 text-[15px] font-semibold hover:underline"
              >
                {isOpen ? "Hide snapshot" : "Show snapshot"}
              </button>
              {isOpen && <Snapshot candidate={candidate} />}
            </article>
          );
        })}
      </Columns>
    </>
  );
}
