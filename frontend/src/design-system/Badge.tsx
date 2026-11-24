import type { ReactNode } from "react";
import { cx } from "./tokens";

export type BadgeTone = "neutral" | "cyan" | "good" | "warn" | "bad" | "blue" | "red" | "violet" | "orange";

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: "border-line bg-surface-raised text-ink-secondary",
  cyan: "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
  good: "border-emerald-400/30 bg-emerald-500/12 text-emerald-300",
  warn: "border-amber-400/30 bg-amber-500/12 text-amber-200",
  bad: "border-rose-400/30 bg-rose-500/12 text-rose-300",
  blue: "border-sky-400/30 bg-sky-500/12 text-sky-300",
  red: "border-rose-400/30 bg-rose-500/12 text-rose-300",
  violet: "border-violet-400/30 bg-violet-500/12 text-violet-300",
  orange: "border-orange-400/30 bg-orange-500/12 text-orange-300",
};

const DOT_CLASS: Record<BadgeTone, string> = {
  neutral: "bg-ink-muted",
  cyan: "bg-accent-cyan",
  good: "bg-status-good",
  warn: "bg-status-warn",
  bad: "bg-status-bad",
  blue: "bg-side-blue",
  red: "bg-side-red",
  violet: "bg-status-violet",
  orange: "bg-status-orange",
};

export interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  mono?: boolean;
  pill?: boolean;
  className?: string;
  children: ReactNode;
}

export function Badge({
  tone = "neutral",
  dot = false,
  mono = false,
  pill = true,
  className,
  children,
}: BadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 text-[11px] font-medium leading-4",
        pill ? "rounded-full" : "rounded-[6px]",
        mono && "font-mono tabular-nums",
        TONE_CLASS[tone],
        className,
      )}
    >
      {dot && <span className={cx("h-1.5 w-1.5 shrink-0 rounded-full", DOT_CLASS[tone])} aria-hidden="true" />}
      {children}
    </span>
  );
}
