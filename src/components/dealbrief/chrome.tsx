/** Shared layout pieces for the DealBrief screens (design: issue #12). */
import { ArrowRight, Check, TrendingUp } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Role = "analyst" | "ceo" | "cfo";

const ROLE_LABEL: Record<Role, string> = {
  analyst: "Analyst view",
  ceo: "CEO view",
  cfo: "CFO view",
};

export function AppHeader({
  section,
  title,
  role,
  initials,
}: {
  section: string;
  title: string;
  role: Role;
  initials: string;
}) {
  const isAnalyst = role === "analyst";
  return (
    <header className="border-db-line border-b bg-white">
      <div className="flex items-center gap-4 px-6 py-3.5 lg:px-8">
        <span className="bg-db-ink flex size-8 items-center justify-center rounded-lg text-white">
          <TrendingUp className="size-4" aria-hidden="true" />
        </span>
        <span className="text-lg font-bold tracking-tight">DealBrief</span>
        <nav
          aria-label="Breadcrumb"
          className="text-db-muted ml-2 min-w-0 truncate text-sm"
        >
          {section} / <span className="text-db-ink font-medium">{title}</span>
        </nav>
        <span
          className={cn(
            "ml-auto shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
            isAnalyst
              ? "bg-db-blue-soft text-db-blue-ink"
              : "bg-db-ink text-white",
          )}
        >
          {ROLE_LABEL[role]}
        </span>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
            isAnalyst ? "bg-db-ink" : "bg-db-blue",
          )}
        >
          {initials}
        </span>
      </div>
    </header>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[1280px] px-6 pt-7 pb-24 lg:px-10">
      {children}
    </main>
  );
}

/** Main column plus a 320px rail that drops below on narrow screens. */
export function Columns({
  children,
  rail,
}: {
  children: ReactNode;
  rail: ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
      <div className="flex min-w-0 flex-col gap-5">{children}</div>
      <aside className="flex flex-col gap-5">{rail}</aside>
    </div>
  );
}

export interface TabItem<T extends string> {
  id: T;
  marker: string;
  label: string;
  done?: boolean;
  disabled?: boolean;
}

export function StepTabs<T extends string>({
  items,
  active,
  onSelect,
  label,
}: {
  items: (TabItem<T> | "arrow")[];
  active: T;
  onSelect: (id: T) => void;
  label: string;
}) {
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-2">
      {items.map((item, index) =>
        item === "arrow" ? (
          <ArrowRight
            key={`arrow-${index}`}
            className="text-db-muted mx-1 size-4"
            aria-hidden="true"
          />
        ) : (
          <button
            key={item.id}
            type="button"
            disabled={item.disabled}
            aria-current={item.id === active ? "step" : undefined}
            onClick={() => onSelect(item.id)}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
              item.id === active
                ? "border-db-ink bg-db-ink text-white"
                : "border-db-line text-db-ink hover:border-db-ink/40 bg-white",
              item.disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {item.done && item.id !== active ? (
              <Check className="size-3.5" aria-hidden="true" />
            ) : (
              <span
                className={cn(
                  item.id === active ? "font-semibold" : "text-db-muted",
                )}
              >
                {item.marker}
              </span>
            )}
            {item.label}
          </button>
        ),
      )}
    </nav>
  );
}

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-db-muted text-xs font-semibold tracking-[0.09em] uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function PageTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
}) {
  return (
    <div className="mt-8 mb-6">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h1 className="mt-1.5 text-[34px] leading-[1.15] font-bold tracking-tight text-balance">
        {title}
      </h1>
      {subtitle && <p className="text-db-muted mt-2 text-[17px]">{subtitle}</p>}
    </div>
  );
}

export function Card({
  children,
  className,
  role,
}: {
  children: ReactNode;
  className?: string;
  role?: string;
}) {
  return (
    <section
      role={role}
      className={cn(
        "border-db-line rounded-2xl border bg-white p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeading({
  title,
  subtitle,
  aside,
}: {
  title: string;
  subtitle?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="text-db-muted mt-0.5 text-sm">{subtitle}</p>}
      </div>
      {aside}
    </div>
  );
}

/** The blue-outlined card that marks a point where a person must decide. */
export function CheckpointCard({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <section className="border-db-blue rounded-2xl border-2 bg-white p-6">
      <Eyebrow className="text-db-blue-ink">{eyebrow}</Eyebrow>
      {children}
    </section>
  );
}

export function CoachCard({
  title = "Coach",
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("bg-db-blue-soft rounded-2xl p-5", className)}>
      <Eyebrow className="text-db-blue-ink">{title}</Eyebrow>
      <div className="mt-2 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

export function DarkCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("bg-db-ink rounded-2xl p-6 text-white", className)}>
      {children}
    </section>
  );
}

type Tone = "blue" | "dark" | "white" | "outline";

const BUTTON_TONES: Record<Tone, string> = {
  blue: "bg-db-blue text-white hover:bg-db-blue/90",
  dark: "bg-db-ink text-white hover:bg-db-ink/90",
  white: "bg-white text-db-ink hover:bg-white/90",
  outline: "border border-db-line bg-white text-db-ink hover:border-db-ink/40",
};

export function ActionButton({
  tone = "blue",
  busy = false,
  arrow = false,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone;
  busy?: boolean;
  arrow?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled || busy}
      className={cn(
        "flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55",
        BUTTON_TONES[tone],
        className,
      )}
      {...props}
    >
      {busy ? "Working…" : children}
      {arrow && !busy && <ArrowRight className="size-4" aria-hidden="true" />}
    </button>
  );
}

type BadgeTone = "ink" | "blue" | "gray" | "orange" | "amber" | "green";

const BADGE_TONES: Record<BadgeTone, string> = {
  ink: "bg-db-ink text-white",
  blue: "bg-db-blue-soft text-db-blue-ink",
  gray: "bg-db-track text-db-ink",
  orange: "bg-db-orange-soft text-db-orange",
  amber: "bg-db-amber-soft text-db-amber",
  green: "bg-db-green-soft text-db-green",
};

export function Badge({
  tone,
  children,
  className,
}: {
  tone: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Label and value on one line, used in the small summary cards on the rail. */
export function Row({
  label,
  value,
  strong = false,
  valueClassName,
}: {
  label: ReactNode;
  value: ReactNode;
  strong?: boolean;
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 py-1.5 text-[15px]",
        strong ? "font-semibold" : "text-db-muted",
      )}
    >
      <span>{label}</span>
      <span
        className={cn("text-db-ink font-semibold tabular-nums", valueClassName)}
      >
        {value}
      </span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("bg-db-track animate-pulse rounded-lg", className)}
    />
  );
}
