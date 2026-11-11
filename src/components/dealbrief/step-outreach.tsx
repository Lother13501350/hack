/** Step 3: one email per company, CEO checkpoint 3 (issues #7 and #8). */
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Candidate, OutreachDraft } from "@/types/deal";
import {
  Badge,
  Button,
  Card,
  Coach,
  Columns,
  Label,
  PageTitle,
  inputClass,
} from "./chrome";

const STATUS_BADGE: Record<
  OutreachDraft["status"],
  { label: string; tone: "muted" | "accent" | "solid" | "outline" }
> = {
  draft: { label: "Draft", tone: "muted" },
  approved: { label: "Approved", tone: "accent" },
  sent: { label: "Sent", tone: "solid" },
  skipped: { label: "Not sent", tone: "outline" },
};

export function StepOutreach({
  drafts,
  candidates,
  onEdit,
  onSend,
  onSkip,
  onContinue,
  busy,
}: {
  drafts: OutreachDraft[];
  candidates: Candidate[];
  onEdit: (
    candidateId: string,
    patch: Pick<OutreachDraft, "subject" | "body">,
  ) => void;
  onSend: (candidateId: string) => void;
  onSkip: (candidateId: string) => void;
  onContinue: () => void;
  busy: string | null;
}) {
  const [activeId, setActiveId] = useState(drafts[0]?.candidateId ?? "");
  const [editing, setEditing] = useState(false);
  const draft =
    drafts.find((item) => item.candidateId === activeId) ?? drafts[0];
  const nameOf = (id: string) =>
    candidates.find((candidate) => candidate.id === id)?.name ?? id;
  const sent = drafts.filter((item) => item.status === "sent").length;
  const open = drafts.filter((item) => item.status === "draft").length;

  if (!draft) return null;
  const isDraft = draft.status === "draft";

  return (
    <>
      <PageTitle
        title="Outreach"
        subtitle="Read each email. It goes out from the CEO's inbox only after she approves it."
      />
      <Columns
        rail={
          <>
            <Card>
              <Label>CEO checkpoint · 3 of 3</Label>
              <p className="mt-2 text-base font-semibold">
                {sent} of {drafts.length} sent
              </p>
              <p className="text-db-muted mt-1 text-[13px]">
                {open > 0
                  ? `${open} ${open === 1 ? "email still needs" : "emails still need"} a decision.`
                  : "Every email has a decision."}
              </p>
              <Button
                className="mt-4 w-full"
                onClick={onContinue}
                disabled={open > 0 || sent === 0}
                arrow
              >
                Wait for replies
              </Button>
            </Card>
            <Coach title="Why this wording">
              <ul className="list-disc space-y-1.5 pl-4">
                <li>
                  No &quot;acquire&quot; or &quot;buy&quot;. Owners rarely
                  answer a cold offer for their life&apos;s work.
                </li>
                <li>Facts you can check, so it reads as personal.</li>
                <li>
                  A promise of confidentiality: staff and customers must not
                  hear rumors.
                </li>
              </ul>
            </Coach>
          </>
        }
      >
        <div>
          <div
            role="tablist"
            aria-label="Emails"
            className="border-db-line flex gap-5 border-b"
          >
            {drafts.map((item) => {
              const badge = STATUS_BADGE[item.status];
              const isActive = item.candidateId === draft.candidateId;
              return (
                <button
                  key={item.candidateId}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveId(item.candidateId);
                    setEditing(false);
                  }}
                  className={cn(
                    "-mb-px flex h-10 items-center gap-2 border-b-2 text-[13px] font-medium",
                    isActive
                      ? "border-db-ink text-db-ink"
                      : "text-db-muted hover:text-db-ink border-transparent",
                  )}
                >
                  {nameOf(item.candidateId)}
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                </button>
              );
            })}
          </div>

          <Card role="tabpanel" className="mt-4">
            <dl className="grid grid-cols-[56px_minmax(0,1fr)] gap-y-1.5 text-[13px]">
              <dt className="text-db-muted">From</dt>
              <dd>{draft.from}</dd>
              <dt className="text-db-muted">To</dt>
              <dd>{draft.to}</dd>
              <dt className="text-db-muted">Subject</dt>
              <dd className="font-medium">
                {editing ? (
                  <input
                    aria-label="Subject"
                    value={draft.subject}
                    onChange={(event) =>
                      onEdit(draft.candidateId, {
                        subject: event.target.value,
                        body: draft.body,
                      })
                    }
                    className={inputClass}
                  />
                ) : (
                  draft.subject
                )}
              </dd>
            </dl>
            <div className="border-db-line mt-4 border-t pt-4">
              {editing ? (
                <textarea
                  aria-label="Email body"
                  value={draft.body}
                  onChange={(event) =>
                    onEdit(draft.candidateId, {
                      subject: draft.subject,
                      body: event.target.value,
                    })
                  }
                  rows={14}
                  className={`${inputClass} resize-y leading-relaxed`}
                />
              ) : (
                <p className="max-w-[68ch] text-sm leading-[1.7] whitespace-pre-line">
                  {draft.body}
                </p>
              )}
            </div>

            {draft.factsUsed.length > 0 && (
              <p className="text-db-muted mt-4 text-xs leading-relaxed">
                Facts used:{" "}
                {draft.factsUsed.map((fact, index) => (
                  <span key={fact.sourceUrl + fact.text}>
                    {index > 0 && " · "}
                    <a
                      href={fact.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-db-accent hover:underline"
                    >
                      {fact.text}
                    </a>
                  </span>
                ))}
              </p>
            )}

            <div className="border-db-line mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
              {isDraft ? (
                <>
                  <Button
                    onClick={() => {
                      setEditing(false);
                      onSend(draft.candidateId);
                    }}
                    busy={busy === `send:${draft.candidateId}`}
                  >
                    Approve and send
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setEditing((value) => !value)}
                  >
                    {editing ? "Done editing" : "Edit"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditing(false);
                      onSkip(draft.candidateId);
                    }}
                  >
                    Don&apos;t send
                  </Button>
                </>
              ) : (
                <p className="text-[13px] font-medium">
                  {draft.status === "sent"
                    ? "Approved and sent."
                    : "You chose not to send this email."}
                </p>
              )}
            </div>
          </Card>
          <p className="text-db-muted mt-3 text-xs">
            Demo mode: approving marks the email as sent and nothing is
            delivered. DealBrief never replies on the CEO&apos;s behalf.
          </p>
        </div>
      </Columns>
    </>
  );
}
