import type { ReactNode } from "react";
import { cx } from "./tokens";

export type PanelTone = "default" | "raised" | "blue" | "red" | "good" | "bad" | "warn";
export type PanelAccent = "none" | "cyan" | "blue" | "red" | "good" | "warn" | "bad" | "violet" | "orange";

const TONE_CLASS: Record<PanelTone, string> = {
  default: "border-line bg-surface",
  raised: "border-line bg-surface-raised",
  blue: "border-sky-400/25 bg-surface",
  red: "border-rose-400/25 bg-surface",
  good: "border-emerald-400/25 bg-emerald-500/[0.04]",
  bad: "border-rose-400/25 bg-rose-500/[0.04]",
  warn: "border-amber-400/25 bg-amber-500/[0.04]",
};

const ACCENT_CLASS: Record<PanelAccent, string> = {
  none: "",
  cyan: "border-l-[3px] border-l-accent-cyan",
  blue: "border-l-[3px] border-l-side-blue",
  red: "border-l-[3px] border-l-side-red",
  good: "border-l-[3px] border-l-status-good",
  warn: "border-l-[3px] border-l-status-warn",
  bad: "border-l-[3px] border-l-status-bad",
  violet: "border-l-[3px] border-l-status-violet",
  orange: "border-l-[3px] border-l-status-orange",
};

export interface PanelProps {
  as?: "div" | "section" | "aside" | "article" | "figure" | "li";
  tone?: PanelTone;
  accent?: PanelAccent;
  interactive?: boolean;
  className?: string;
  children: ReactNode;
}

export function Panel({
  as: Component = "section",
  tone = "default",
  accent = "none",
  interactive = false,
  className,
  children,
}: PanelProps) {
  return (
    <Component
      className={cx(
        "min-w-0 rounded-ds-lg border shadow-panel",
        TONE_CLASS[tone],
        ACCENT_CLASS[accent],
        interactive && "transition-colors duration-150 hover:border-line-strong",
        className,
      )}
    >
      {children}
    </Component>
  );
}

export interface PanelHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PanelHeader({ title, description, meta, actions, className }: PanelHeaderProps) {
  return (
    <div
      className={cx(
        "flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle px-4 py-3 sm:px-5",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-sm font-semibold tracking-tight text-ink-primary">{title}</h2>
          {meta && <span className="font-mono text-[11px] tabular-nums text-ink-muted">{meta}</span>}
        </div>
        {description && <p className="mt-0.5 text-xs text-ink-secondary">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PanelBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("p-4 sm:p-5", className)}>{children}</div>;
}

export function PanelFooter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cx(
        "flex flex-wrap items-center justify-between gap-3 border-t border-line-subtle bg-surface-raised/50 px-4 py-2.5 sm:px-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
