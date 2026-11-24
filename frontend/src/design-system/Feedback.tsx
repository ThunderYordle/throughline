import type { ReactNode } from "react";
import { cx } from "./tokens";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-ds-lg border border-line-subtle bg-surface-raised/70", className)} />;
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center rounded-ds-lg border border-dashed border-line bg-surface/60 px-6 py-10 text-center",
        className,
      )}
    >
      <div className="font-display text-sm font-semibold text-ink-primary">{title}</div>
      {description && <p className="mt-1 max-w-md text-xs leading-relaxed text-ink-secondary">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export type CalloutTone = "info" | "warn" | "bad" | "good";

const CALLOUT_TONE: Record<CalloutTone, string> = {
  info: "border-cyan-400/30 bg-cyan-500/[0.07] text-cyan-100",
  warn: "border-amber-400/30 bg-amber-500/[0.08] text-amber-100",
  bad: "border-rose-400/35 bg-rose-500/[0.08] text-rose-200",
  good: "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-100",
};

export function Callout({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: CalloutTone;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("rounded-ds-lg border px-4 py-3 text-xs leading-relaxed", CALLOUT_TONE[tone], className)}>
      {title && <div className="mb-1 font-display text-sm font-semibold">{title}</div>}
      <div>{children}</div>
    </div>
  );
}
