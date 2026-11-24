import type { ReactNode } from "react";
import { cx } from "./tokens";

export interface SectionHeaderProps {
  kicker?: string;
  title: ReactNode;
  description?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export function SectionHeader({ kicker, title, description, right, className }: SectionHeaderProps) {
  return (
    <div className={cx("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        {kicker && (
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.11em] text-accent-cyan">
            {kicker}
          </div>
        )}
        <h2 className="mt-0.5 font-display text-lg font-semibold text-ink-primary">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-ink-secondary">{description}</p>}
      </div>
      {right && <div className="flex shrink-0 flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}
