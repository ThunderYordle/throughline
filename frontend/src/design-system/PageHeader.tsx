import type { ReactNode } from "react";
import { cx } from "./tokens";

export interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, meta, actions, aside, className }: PageHeaderProps) {
  return (
    <section
      className={cx(
        "relative overflow-hidden rounded-ds-xl border border-line bg-surface p-5 shadow-panel sm:p-6",
        className,
      )}
    >
      <div className="tl-grid-bg pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-cyan-500/[0.08] blur-3xl"
        aria-hidden="true"
      />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          {eyebrow && <div className="flex flex-wrap items-center gap-2">{eyebrow}</div>}
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink-primary sm:text-3xl">
            {title}
          </h1>
          {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-secondary">{description}</p>}
          {meta && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-muted">{meta}</div>}
          {actions && <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
    </section>
  );
}
