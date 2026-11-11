/** Interlude between outreach and deal review. Front-end only; fictional timeline. */
import { ArrowRight } from "lucide-react";

type Actor = "Agent" | "CEO" | "Seller";

export function StepLater({
  ceoFirstName,
  sentCount,
  founderName,
  targetShortName,
  otherCompany,
  askingPrice,
  onStart,
  busy,
}: {
  ceoFirstName: string;
  sentCount: number;
  founderName: string;
  targetShortName: string;
  otherCompany?: string;
  askingPrice: string;
  onStart: () => void;
  busy: boolean;
}) {
  const founderFirst = founderName.split(" ")[0];
  const sentLabel =
    sentCount === 1
      ? "One approved email"
      : `${["Zero", "One", "Two", "Three", "Four", "Five"][sentCount] ?? sentCount} approved emails`;
  const events: { day: number; text: string; actor: Actor }[] = [
    {
      day: 0,
      text: `${sentLabel} sent from ${ceoFirstName}’s inbox.`,
      actor: "Agent",
    },
    {
      day: 3,
      text: `${founderName} replies. DealBrief notifies ${ceoFirstName}.`,
      actor: "Agent",
    },
    {
      day: 6,
      text: `${ceoFirstName} and ${founderFirst} meet for coffee.`,
      actor: "CEO",
    },
    ...(otherCompany
      ? [
          {
            day: 7,
            text: `No reply from ${otherCompany}. A follow-up draft waits for approval.`,
            actor: "Agent" as const,
          },
        ]
      : []),
    { day: 10, text: "Both sides sign an NDA.", actor: "CEO" },
    {
      day: 14,
      text: `${targetShortName} sends three years of financials and an asking price of ${askingPrice}.`,
      actor: "Seller",
    },
  ];

  return (
    <main className="bg-db-ink flex min-h-screen items-center text-white">
      <div className="mx-auto w-full max-w-[880px] px-6 py-20">
        <p className="text-[11px] font-medium tracking-[0.08em] text-white/60 uppercase">
          Meanwhile, people do what only people can
        </p>
        <h1 className="mt-3 text-5xl font-semibold tracking-tight">
          Two weeks later
        </h1>

        <ol className="mt-12 border-t border-white/15">
          {events.map((event) => (
            <li
              key={event.day}
              className="grid grid-cols-[64px_minmax(0,1fr)_56px] items-baseline gap-4 border-b border-white/15 py-4"
            >
              <span className="text-[13px] text-white/60 tabular-nums">
                Day {event.day}
              </span>
              <span className="text-base">{event.text}</span>
              <span className="text-right text-[11px] font-medium tracking-[0.08em] text-white/60 uppercase">
                {event.actor}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={onStart}
            disabled={busy}
            className="text-db-ink flex h-10 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-medium hover:bg-white/90 disabled:opacity-60"
          >
            {busy ? "Working…" : `Start deal review for ${targetShortName}`}
            {!busy && <ArrowRight className="size-4" aria-hidden="true" />}
          </button>
          <span className="text-[13px] text-white/60">
            Sample timeline (fictional)
          </span>
        </div>
      </div>
    </main>
  );
}
