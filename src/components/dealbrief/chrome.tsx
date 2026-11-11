/**
 * Shared layout pieces for the DealBrief screens.
 *
 * Visual rules, so every screen reads as one product:
 * - Ink on white. One accent (selection, links, the screen's key number) and
 *   one risk tone (amounts that reduce value, high-severity flags).
 * - 14px body, 13px secondary, 11px uppercase labels. Semibold, never bold.
 * - Cards are white with a hairline border. No fills, shadows or dark panels.
 */
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Role = "analyst" | "ceo" | "cfo";

const ROLE_LABEL: Record<Role, string> = {
  analyst: "Analyst",
  ceo: "CEO",
  cfo: "CFO",
};

export function AppHeader({
  section,
  title,
  role,
  initials,
  dataLabel = "Sample data (fictional)",
  link,
}: {
  section: string;
  title: string;
  role?: Role;
  initials?: string;
  /** Says where the numbers on screen come from. */
  dataLabel?: string;
  link?: { href: string; label: string };
}) {
  return (
    <header className="border-db-line border-b bg-white">
      <div className="flex h-14 items-center gap-3 px-5">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="bg-db-ink flex size-6 items-center justify-center rounded-md text-[11px] font-semibold text-white"
          >
            D
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            DealBrief
          </span>
        </Link>
        <nav
          aria-label="Breadcrumb"
          className="text-db-muted ml-1 min-w-0 truncate text-[13px]"
        >
          <span className="mr-2 opacity-40">/</span>
          {section}
          <span className="mx-2 opacity-40">/</span>
          <span className="text-db-ink">{title}</span>
        </nav>
        <span className="border-db-line text-db-muted ml-auto hidden h-6 shrink-0 items-center rounded-full border px-2.5 text-[11px] sm:flex">
          {dataLabel}
        </span>
        {link && (
          <Link
            href={link.href}
            className="text-db-muted hover:text-db-ink hidden shrink-0 text-[13px] md:inline"
          >
            {link.label}
          </Link>
        )}
        {role && (
          <span className="text-db-muted hidden shrink-0 text-[13px] md:inline">
            {ROLE_LABEL[role]} view
          </span>
        )}
        {initials && (
          <span className="border-db-line bg-db-subtle flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium">
            {initials}
          </span>
        )}
      </div>
    </header>
  );
}

export interface StepItem<T extends string> {
  id: T;
  label: string;
  done?: boolean;
  disabled?: boolean;
}

/** One continuous stepper for the whole flow, split into named groups. */
export function Stepper<T extends string>({
  groups,
  active,
  onSelect,
}: {
  groups: { label: string; items: StepItem<T>[] }[];
  active: T;
  onSelect: (id: T) => void;
}) {
  // Steps are numbered continuously across groups.
  const offsets = groups.map((_, index) =>
    groups.slice(0, index).reduce((sum, group) => sum + group.items.length, 0),
  );
  return (
    <nav aria-label="Steps" className="border-db-line border-b bg-white">
      <div className="mx-auto flex h-12 w-full max-w-[1152px] items-center gap-1 overflow-x-auto px-6">
        {groups.map((group, groupIndex) => (
          <div key={group.label} className="flex shrink-0 items-center gap-1">
            {groupIndex > 0 && (
              <span aria-hidden="true" className="bg-db-line mx-3 h-4 w-px" />
            )}
            <span className="text-db-muted mr-2 hidden text-[11px] font-medium tracking-[0.08em] uppercase lg:inline">
              {group.label}
            </span>
            {group.items.map((item, itemIndex) => {
              const number = offsets[groupIndex] + itemIndex + 1;
              const isActive = item.id === active;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.disabled}
                  aria-current={isActive ? "step" : undefined}
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    "flex h-8 shrink-0 items-center gap-2 rounded-md px-2 text-[13px] transition-colors",
                    isActive
                      ? "text-db-ink font-medium"
                      : "text-db-muted hover:text-db-ink",
                    item.disabled && "cursor-not-allowed opacity-45",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full text-[11px] font-medium tabular-nums",
                      isActive
                        ? "bg-db-ink text-white"
                        : item.done
                          ? "bg-db-subtle text-db-ink"
                          : "border-db-line border",
                    )}
                  >
                    {item.done && !isActive ? (
                      <Check className="size-3" aria-label="Done" />
                    ) : (
                      number
                    )}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[1152px] px-6 pt-8 pb-24">
      {children}
    </main>
  );
}

export function PageTitle({
  title,
  subtitle,
  aside,
}: {
  title: string;
  subtitle?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {title}
        </h1>
        {subtitle && <p className="text-db-muted mt-1 text-sm">{subtitle}</p>}
      </div>
      {aside}
    </div>
  );
}

/** Main column plus a narrow rail that drops below on small screens. */
export function Columns({
  children,
  rail,
}: {
  children: ReactNode;
  rail: ReactNode;
}) {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_304px]">
      <div className="flex min-w-0 flex-col gap-5">{children}</div>
      <aside className="flex flex-col gap-5 print:hidden">{rail}</aside>
    </div>
  );
}

export function Card({
  title,
  description,
  aside,
  children,
  className,
  role,
}: {
  title?: string;
  description?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  role?: string;
}) {
  return (
    <section
      role={role}
      className={cn("border-db-line rounded-xl border bg-white p-5", className)}
    >
      {(title || aside) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {description && (
              <p className="text-db-muted mt-0.5 text-[13px]">{description}</p>
            )}
          </div>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Label({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-db-muted text-[11px] font-medium tracking-[0.08em] uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Expert context in a quiet block. The only decorative element on a screen. */
export function Coach({
  title = "Coach",
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-db-subtle rounded-lg px-4 py-3", className)}>
      <Label>{title}</Label>
      <div className="mt-1 text-[13px] leading-relaxed">{children}</div>
    </div>
  );
}

type Variant = "primary" | "secondary" | "ghost";

const BUTTON_VARIANTS: Record<Variant, string> = {
  primary: "bg-db-ink text-white hover:bg-db-ink/85",
  secondary: "border border-db-line bg-white text-db-ink hover:bg-db-subtle",
  ghost: "text-db-muted hover:text-db-ink",
};

export function Button({
  variant = "primary",
  busy = false,
  arrow = false,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  busy?: boolean;
  arrow?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled || busy}
      className={cn(
        "flex h-9 items-center justify-center gap-1.5 rounded-lg px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {busy ? "Working…" : children}
      {arrow && !busy && <ArrowRight className="size-3.5" aria-hidden="true" />}
    </button>
  );
}

type Tone = "solid" | "outline" | "accent" | "risk" | "muted";

const BADGE_TONES: Record<Tone, string> = {
  solid: "bg-db-ink text-white",
  outline: "border border-db-line text-db-ink",
  accent: "bg-db-accent-soft text-db-accent",
  risk: "bg-db-risk-soft text-db-risk",
  muted: "bg-db-subtle text-db-muted",
};

export function Badge({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-md px-1.5 text-[11px] font-medium whitespace-nowrap",
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Small colored dot: risk for high severity, neutral otherwise. */
export function Dot({ high }: { high: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        high ? "bg-db-risk" : "bg-db-muted/45",
      )}
    />
  );
}

/** Label and value on one line. */
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
        "flex items-baseline justify-between gap-4 py-1.5 text-[13px]",
        strong ? "text-db-ink font-medium" : "text-db-muted",
      )}
    >
      <span>{label}</span>
      <span
        className={cn("text-db-ink font-medium tabular-nums", valueClassName)}
      >
        {value}
      </span>
    </div>
  );
}

/** A row of headline figures separated by hairlines. */
export function Stats({
  items,
}: {
  items: { label: string; value: ReactNode; note?: ReactNode }[];
}) {
  return (
    <dl className="border-db-line divide-db-line mb-5 grid divide-y rounded-xl border bg-white sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none">
      {items.map((item) => (
        <div key={item.label} className="px-5 py-4">
          <dt className="text-db-muted text-[13px]">{item.label}</dt>
          <dd className="mt-1 flex items-baseline gap-2 text-xl font-semibold tracking-tight tabular-nums">
            {item.value}
            {item.note && (
              <span className="text-[13px] font-medium">{item.note}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("bg-db-subtle animate-pulse rounded-md", className)}
    />
  );
}

export const inputClass =
  "border-db-line focus:border-db-ink w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-db-muted/70 disabled:bg-db-subtle disabled:text-db-muted";

export const tableHeadClass =
  "text-db-muted border-db-line border-b text-left text-[11px] font-medium tracking-[0.08em] uppercase";
