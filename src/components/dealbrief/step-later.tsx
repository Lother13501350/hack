/** Interlude between outreach and deal review. Front-end only; fictional timeline. */
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
      text: `${sentLabel} sent from ${ceoFirstName}’s Gmail.`,
      actor: "Agent",
    },
    {
      day: 3,
      text: `${founderName} replies. DealBrief notifies ${ceoFirstName}.`,
      actor: "Agent",
    },
    {
      day: 6,
      text: `${ceoFirstName} and ${founderFirst} meet for coffee in Dayton.`,
      actor: "CEO",
    },
    ...(otherCompany
      ? [
          {
            day: 7,
            text: `No reply from ${otherCompany}. A follow-up draft waits for ${ceoFirstName}’s approval.`,
            actor: "Agent" as const,
          },
        ]
      : []),
    { day: 10, text: "Both sides sign an NDA.", actor: "CEO" },
    {
      day: 14,
      text: `${targetShortName} sends 3 years of financials, his list of one-time expenses, and an asking price of ${askingPrice}.`,
      actor: "Seller",
    },
  ];

  return (
    <main className="bg-db-ink min-h-screen text-white">
      <div className="mx-auto w-full max-w-[1080px] px-6 py-20 lg:px-10">
        <p className="text-xs font-semibold tracking-[0.09em] text-white/70 uppercase">
          Meanwhile, people do what only people can
        </p>
        <h1 className="mt-3 text-6xl font-bold tracking-tight">
          Two weeks later.
        </h1>

        <ol className="mt-12 border-t border-white/15">
          {events.map((event) => (
            <li
              key={event.day}
              className="flex items-center gap-6 border-b border-white/15 py-5"
            >
              <span className="w-16 shrink-0 text-sm font-semibold text-white/70">
                Day {event.day}
              </span>
              <span className="min-w-0 flex-1 text-xl">{event.text}</span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                  event.actor === "Agent"
                    ? "bg-db-blue-soft text-db-blue-ink"
                    : "text-db-ink bg-white",
                )}
              >
                {event.actor}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-12 flex flex-wrap items-center gap-5">
          <button
            type="button"
            onClick={onStart}
            disabled={busy}
            className="text-db-ink flex min-h-14 items-center gap-2 rounded-xl bg-white px-7 text-lg font-semibold hover:bg-white/90 disabled:opacity-60"
          >
            {busy ? "Working…" : `Start deal review for ${targetShortName}`}
            {!busy && <ArrowRight className="size-5" aria-hidden="true" />}
          </button>
          <span className="text-[15px] text-white/70">
            Sample timeline (fictional)
          </span>
        </div>
      </div>
    </main>
  );
}
