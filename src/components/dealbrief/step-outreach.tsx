/** Screen C: one email per company, CEO checkpoint 3 (issues #7 and #8). */
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Candidate, OutreachDraft } from "@/types/deal";
import {
  ActionButton,
  Badge,
  Card,
  CheckpointCard,
  CoachCard,
  Columns,
  PageTitle,
} from "./chrome";

const STATUS_BADGE: Record<
  OutreachDraft["status"],
  { label: string; tone: "amber" | "blue" | "green" | "gray" }
> = {
  draft: { label: "Draft", tone: "amber" },
  approved: { label: "Approved", tone: "blue" },
  sent: { label: "Sent", tone: "green" },
  skipped: { label: "Not sent", tone: "gray" },
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
        eyebrow="Step C · Sample data (fictional)"
        title="Read each email. Approve it, and it goes out from your inbox."
      />

      <div
        role="tablist"
        aria-label="Emails"
        className="mb-4 flex flex-wrap gap-2"
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
                "flex min-h-11 items-center gap-2.5 rounded-xl bg-white px-4 text-[15px] font-semibold",
                isActive
                  ? "border-db-blue border-2"
                  : "border-db-line text-db-muted border",
              )}
            >
              {nameOf(item.candidateId)}
              <Badge tone={badge.tone}>{badge.label}</Badge>
            </button>
          );
        })}
      </div>

      <Columns
        rail={
          <>
            <CheckpointCard eyebrow="CEO checkpoint 3 of 3">
              <p className="mt-1 text-[28px] font-bold tracking-tight">
                {sent} of {drafts.length} sent
              </p>
              <p className="text-db-muted mt-1 text-sm">
                Each email needs your approval. Choosing a company is not the
                same as approving what we say to it.
              </p>
              <ActionButton
                tone="dark"
                className="mt-4 w-full"
                onClick={onContinue}
                disabled={open > 0 || sent === 0}
                arrow
              >
                Wait for replies
              </ActionButton>
              {open > 0 && (
                <p className="text-db-muted mt-2 text-[13px]">
                  {open}{" "}
                  {open === 1 ? "email still needs" : "emails still need"} a
                  decision.
                </p>
              )}
            </CheckpointCard>
            <CoachCard title="Coach: why this wording">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  No &quot;acquire&quot; or &quot;buy&quot; in a first message.
                  Owners rarely answer a cold offer for their life&apos;s work.
                </li>
                <li>
                  Uses facts you can check, so it reads as personal, not a mass
                  mailing.
                </li>
                <li>
                  Promises confidentiality: the owner&apos;s staff and customers
                  must not hear rumors.
                </li>
              </ul>
            </CoachCard>
            <Card>
              <h2 className="text-lg font-semibold">
                What DealBrief does with your inbox
              </h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px]">
                <li>Sends only emails you approved, one by one</li>
                <li>Never replies for you</li>
                <li>Tells you when a target replies</li>
              </ul>
              <p className="text-db-muted mt-3 text-[13px] leading-relaxed">
                Demo mode: approving marks the email as sent. Nothing is
                delivered to a real company.
              </p>
            </Card>
          </>
        }
      >
        <Card role="tabpanel">
          <dl className="grid grid-cols-[64px_minmax(0,1fr)] gap-y-1.5 text-[15px]">
            <dt className="text-db-muted">From</dt>
            <dd>{draft.from}</dd>
            <dt className="text-db-muted">To</dt>
            <dd>{draft.to}</dd>
            <dt className="text-db-muted">Subject</dt>
            <dd>
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
                  className="border-db-line focus:border-db-blue w-full rounded-lg border px-2.5 py-1.5 outline-none"
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
                className="border-db-line focus:border-db-blue w-full resize-y rounded-xl border px-3.5 py-3 text-[15px] leading-relaxed outline-none"
              />
            ) : (
              <p className="text-[15px] leading-[1.75] whitespace-pre-line">
                {draft.body}
              </p>
            )}
          </div>

          {draft.factsUsed.length > 0 && (
            <p className="text-db-muted mt-4 text-[13px] leading-relaxed">
              Facts used:{" "}
              {draft.factsUsed.map((fact, index) => (
                <span key={fact.sourceUrl + fact.text}>
                  {index > 0 && " · "}
                  <a
                    href={fact.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-db-blue underline"
                  >
                    {fact.text}
                  </a>
                </span>
              ))}
            </p>
          )}

          <div className="border-db-line mt-5 flex flex-wrap items-center gap-2 border-t pt-5">
            {isDraft ? (
              <>
                <ActionButton
                  onClick={() => {
                    setEditing(false);
                    onSend(draft.candidateId);
                  }}
                  busy={busy === `send:${draft.candidateId}`}
                >
                  Approve and send from my Gmail
                </ActionButton>
                <ActionButton
                  tone="outline"
                  onClick={() => setEditing((value) => !value)}
                >
                  {editing ? "Done editing" : "Edit"}
                </ActionButton>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    onSkip(draft.candidateId);
                  }}
                  className="text-db-muted hover:text-db-ink min-h-11 px-4 text-[15px] font-semibold"
                >
                  Don&apos;t send
                </button>
              </>
            ) : (
              <p className="text-[15px] font-semibold">
                {draft.status === "sent"
                  ? "Approved and sent. DealBrief will tell you when they reply."
                  : "You chose not to send this email."}
              </p>
            )}
          </div>
        </Card>
      </Columns>
    </>
  );
}
