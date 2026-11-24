import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Badge } from "./Badge";
import { ButtonLink } from "./Button";
import { PRIMARY_NAV_ITEMS, resolveNavContext, WORKFLOW_STAGES, type WorkflowStageId } from "./nav";
import { cx } from "./tokens";

export function WorkflowStepper({ activeStage }: { activeStage: WorkflowStageId | null }) {
  const activeIdx = activeStage ? WORKFLOW_STAGES.findIndex((s) => s.id === activeStage) : -1;

  return (
    <ol className="flex items-center gap-1" aria-label="Coaching workflow stages">
      {WORKFLOW_STAGES.map((stage, idx) => {
        const isCurrent = stage.id === activeStage;
        const isPast = activeIdx > idx;
        return (
          <li key={stage.id} className="flex items-center gap-1">
            {idx > 0 && <span className="h-px w-3 bg-line" aria-hidden="true" />}
            <span
              className={cx(
                "inline-flex items-center gap-1.5 rounded-[6px] border px-2 py-0.5 font-mono text-[10px] font-medium transition-colors",
                isCurrent
                  ? "border-cyan-400/45 bg-cyan-500/12 text-cyan-200"
                  : isPast
                    ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
                    : "border-line-subtle bg-canvas/60 text-ink-muted",
              )}
            >
              <span className={cx("text-[9px]", isCurrent ? "text-accent-cyan" : "opacity-70")}>{stage.step}</span>
              <span>{stage.label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function PageContainer({
  size = "default",
  className,
  children,
}: {
  size?: "narrow" | "default" | "wide";
  className?: string;
  children: ReactNode;
}) {
  const width =
    size === "narrow" ? "max-w-5xl" : size === "wide" ? "max-w-[1360px]" : "max-w-6xl";
  return (
    <main className={cx("mx-auto w-full px-4 py-6 sm:px-6 lg:px-8", width, className)}>
      {children}
    </main>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = resolveNavContext(pathname);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Primary Sticky Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1360px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Left: Brand Lockup */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className="group flex items-center gap-2.5 focus-visible:outline-none"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-ds border border-cyan-400/35 bg-cyan-500/10 shadow-sm transition-colors group-hover:border-cyan-400/65 group-hover:bg-cyan-500/15">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                  <path
                    d="M3.5 17.5L9.5 11.5L13.5 14.5L20.5 6.5"
                    stroke="#22d3ee"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="20.5" cy="6.5" r="2.2" fill="#10b981" />
                </svg>
              </span>
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-bold tracking-tight text-ink-primary">
                  Throughline
                </span>
                <span className="hidden rounded-[5px] border border-line bg-surface-raised px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-muted sm:inline-block">
                  Warroom
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Primary Section Links (Desktop) */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const active = nav.activeNav === item.id;
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  className={cx(
                    "relative rounded-ds px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-surface-raised text-ink-primary ring-1 ring-line"
                      : "text-ink-secondary hover:bg-surface-raised/60 hover:text-ink-primary",
                  )}
                >
                  {item.label}
                  {active && (
                    <span
                      className="absolute inset-x-3 -bottom-[11px] h-[2px] rounded-full bg-accent-cyan"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right: Quick Action + Mobile Toggle */}
          <div className="flex items-center gap-2">
            <ButtonLink to="/plan/new" variant={nav.activeNav === "draft" ? "accent" : "primary"} size="sm">
              New draft
            </ButtonLink>
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-ds border border-line bg-surface-raised text-ink-secondary hover:text-ink-primary md:hidden"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileOpen}
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
                {mobileOpen ? (
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                ) : (
                  <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Drawer Navigation */}
        {mobileOpen && (
          <nav
            className="border-t border-line-subtle bg-surface px-4 py-3 md:hidden"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col gap-1">
              {PRIMARY_NAV_ITEMS.map((item) => {
                const active = nav.activeNav === item.id;
                return (
                  <Link
                    key={item.id}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={cx(
                      "flex items-center justify-between rounded-ds px-3 py-2 text-sm font-medium",
                      active
                        ? "bg-surface-raised text-ink-primary ring-1 ring-cyan-400/30"
                        : "text-ink-secondary hover:bg-surface-raised/60 hover:text-ink-primary",
                    )}
                  >
                    <span>{item.label}</span>
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-accent-cyan" />}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}

        {/* Contextual Sub-Bar: Breadcrumbs + Coaching Pipeline Stepper */}
        <div className="border-t border-line-subtle bg-surface/90">
          <div className="mx-auto flex min-h-10 max-w-[1360px] flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-1.5 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2 text-xs">
              <ol className="flex items-center gap-1.5 font-mono text-[11px]" aria-label="Breadcrumb">
                {nav.crumbs.map((crumb, idx) => (
                  <li key={crumb.label} className="flex items-center gap-1.5">
                    {idx > 0 && <span className="text-ink-muted/60">/</span>}
                    {crumb.to ? (
                      <Link to={crumb.to} className="text-ink-muted transition-colors hover:text-ink-primary">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="font-semibold text-ink-primary">{crumb.label}</span>
                    )}
                  </li>
                ))}
              </ol>
              <span className="hidden text-ink-muted/40 lg:inline">·</span>
              <span className="hidden truncate text-xs text-ink-muted lg:inline">{nav.subtitle}</span>
            </div>

            <div className="hidden sm:block">
              {nav.stage ? (
                <WorkflowStepper activeStage={nav.stage} />
              ) : (
                <div className="flex items-center gap-2">
                  <Badge tone="cyan" mono pill={false}>
                    DS v1.0
                  </Badge>
                  <span className="font-mono text-[10px] uppercase tracking-[0.09em] text-ink-muted">
                    Empirical Pro Macro Engine
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <Footer />
    </div>
  );
}
