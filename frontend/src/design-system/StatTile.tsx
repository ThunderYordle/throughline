import type { ReactNode } from "react";
import { cx } from "./tokens";

export type StatTone = "default" | "cyan" | "good" | "warn" | "bad" | "blue" | "red";

const VALUE_TONE: Record<StatTone, string> = {
  default: "text-ink-primary",
  cyan: "text-accent-cyan",
  good: "text-emerald-300",
  warn: "text-amber-200",
  bad: "text-rose-300",
  blue: "text-side-blue",
  red: "text-side-red",
};

const BORDER_TONE: Record<StatTone, string> = {
  default: "border-line",
  cyan: "border-cyan-400/25",
  good: "border-emerald-400/25",
  warn: "border-amber-400/25",
  bad: "border-rose-400/25",
  blue: "border-sky-400/25",
  red: "border-rose-400/25",
};

export interface StatTileProps {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  badge?: ReactNode;
  tone?: StatTone;
  className?: string;
}

export function StatTile({ label, value, meta, badge, tone = "default", className }: StatTileProps) {
  return (
    <div
      className={cx(
        "rounded-ds-lg border bg-surface px-4 py-3.5 shadow-panel",
        BORDER_TONE[tone],
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-muted">
          {label}
        </span>
        {badge}
      </div>
      <div className={cx("mt-1.5 font-mono text-2xl font-semibold leading-none tabular-nums", VALUE_TONE[tone])}>
        {value}
      </div>
      {meta && <div className="mt-1.5 text-xs text-ink-secondary">{meta}</div>}
    </div>
  );
}
