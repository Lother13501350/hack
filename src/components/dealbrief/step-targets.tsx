/** Step 2: shortlist of targets, CEO checkpoint 2 (issue #4). */
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Candidate, SourcingResult } from "@/types/deal";
import {
  Badge,
  Button,
  Card,
  Coach,
  Columns,
  Label,
  PageTitle,
  Stats,
} from "./chrome";

function Snapshot({ candidate }: { candidate: Candidate }) {
  const sources = candidate.evidence.filter(
    (item, index, all) =>
      all.findIndex((other) => other.sourceLabel === item.sourceLabel) ===
      index,
  );
  const cells: [string, string, boolean][] = [
    ["What they do", candidate.snapshot.what, false],
    ["Ownership", candidate.snapshot.ownership, false],
    ["Why it fits", candidate.snapshot.whyFits, false],
    ["Watch out", candidate.snapshot.watchOut, true],
  ];
  return (
    <div className="mt-4 pl-[52px]">
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {cells.map(([label, text, isRisk]) => (
          <div key={label}>
            <Label className={isRisk ? "text-db-risk" : undefined}>
              {label}
            </Label>
            <p className="mt-1 text-[13px] leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
      <p className="text-db-muted mt-4 text-xs">
        Sources:{" "}
        {sources.map((item, index) => (
          <span key={item.sourceLabel}>
            {index > 0 && ", "}
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              title={item.text}
              className="text-db-accent hover:underline"
            >
              {item.sourceLabel}
            </a>
          </span>
        ))}
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
        title="Shortlist"
        subtitle={`Found by the agent, checked by ${analystName}. The CEO picks who gets an email.`}
      />
      <Stats
        items={[
          { label: "Companies found", value: sourcing.funnel.searchResults },
          {
            label: "Meet all must-haves",
            value: sourcing.funnel.passedMustHaves,
          },
          { label: "Shortlisted", value: sourcing.funnel.shortlisted },
        ]}
      />
      <Columns
        rail={
          <>
            <Card>
              <Label>CEO checkpoint · 2 of 3</Label>
              <p className="mt-2 text-base font-semibold">{count} selected</p>
              <p className="text-db-muted mt-1 text-[13px]">
                One personal email is drafted for each. Nothing is sent until
                you approve it.
              </p>
              <Button
                className="mt-4 w-full"
                onClick={onDraft}
                busy={busy === "draft"}
                disabled={count === 0}
                arrow
              >
                Draft {count} {count === 1 ? "email" : "emails"}
              </Button>
            </Card>
            <Coach>
              Contact a few companies at a time. Word travels fast in a small
              industry, and an owner who hears you emailed all his competitors
              will not trust you.
            </Coach>
          </>
        }
      >
        <Card className="p-0">
          <ul className="divide-db-line divide-y">
            {sourcing.candidates.map((candidate) => {
              const isSelected = selected.includes(candidate.id);
              const isOpen = open.includes(candidate.id);
              const range = candidate.estRevenueRangeM;
              const recommended =
                candidate.analystRecommendation === "recommend";
              return (
                <li key={candidate.id} className="px-5 py-4">
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      aria-label={`Contact ${candidate.name}`}
                      checked={isSelected}
                      onChange={() => onToggle(candidate.id)}
                      className="accent-db-accent size-4 shrink-0"
                    />
                    <span
                      className={cn(
                        "w-8 shrink-0 text-right text-lg font-semibold tabular-nums",
                        !recommended && "text-db-muted",
                      )}
                    >
                      <span className="sr-only">Fit score </span>
                      {candidate.fitScore}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        {candidate.name}
                        <Badge tone={recommended ? "accent" : "muted"}>
                          {recommended ? "Recommended" : "Skip suggested"}
                        </Badge>
                      </p>
                      <p className="text-db-muted mt-0.5 text-[13px]">
                        {candidate.location} · Est. revenue ${range.lowM}–
                        {range.highM}M
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? "Hide" : "Show"} details for ${candidate.name}`}
                      onClick={() => toggleOpen(candidate.id)}
                      className="text-db-muted hover:bg-db-subtle hover:text-db-ink flex size-8 shrink-0 items-center justify-center rounded-md"
                    >
                      <ChevronDown
                        className={cn(
                          "size-4 transition-transform",
                          isOpen && "rotate-180",
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                  {isOpen && <Snapshot candidate={candidate} />}
                </li>
              );
            })}
          </ul>
        </Card>
        <p className="text-db-muted -mt-2 text-xs">
          Every fact links to a public source. Revenue is estimated from
          headcount, not reported.
        </p>
      </Columns>
    </>
  );
}
