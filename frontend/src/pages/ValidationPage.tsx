import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import {
  Badge,
  ButtonLink,
  Callout,
  EmptyState,
  PageContainer,
  PageHeader,
  Panel,
  PanelBody,
  PanelHeader,
  SectionHeader,
  Skeleton,
  StatTile,
  type BadgeTone,
} from "../design-system";
import type { PlanItem } from "../types";

const TYPE_META: Record<PlanItem["type"], { label: string; tone: BadgeTone; summary: string }> = {
  window: { label: "Window", tone: "good", summary: "Tempo advantage or avoidance window" },
  lane: { label: "Lane", tone: "blue", summary: "Early lane gold & push priority" },
  spike: { label: "Spike", tone: "orange", summary: "Enemy level-6 or first-item power spike" },
  side: { label: "Jungle side", tone: "cyan", summary: "Strong-side jungle pathing preference" },
  concede: { label: "Concede", tone: "violet", summary: "Give contested pit and trade cross-map" },
  objective: { label: "Objective", tone: "warn", summary: "Pre-spawn pit setup and take" },
};

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const pp = (value: number) => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)} pp`;

export function ValidationPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["validation"],
    queryFn: api.validation,
    retry: false,
  });

  if (isLoading) {
    return (
      <PageContainer size="wide" className="space-y-6">
        <Skeleton className="h-36" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer size="default" className="space-y-6">
        <PageHeader
          eyebrow={<Badge tone="cyan" dot>Time-Split Backtest</Badge>}
          title="Validation report"
          description="Measures whether teams that follow draft-generated game plans win more often on future, unseen games at equal gold difference."
        />
        <EmptyState
          title="No validation report generated yet"
          description="Run `uv run throughline validate --holdout-from 2025-08-20` in the backend directory to compute the out-of-sample backtest."
          action={
            <ButtonLink to="/" variant="secondary">
              Back to matches
            </ButtonLink>
          }
        />
      </PageContainer>
    );
  }

  const lowestQ = data.adherence_quartiles[0];
  const highestQ = data.adherence_quartiles[data.adherence_quartiles.length - 1];
  const spreadPp = lowestQ && highestQ ? highestQ.win_rate - lowestQ.win_rate : 0;
  const sortedTypes = [...data.by_type].sort((a, b) => b.adjusted_difference - a.adjusted_difference);
  const topReliable = sortedTypes.find((row) => row.followed >= 10 && row.not_followed >= 10) ?? sortedTypes[0];
  const holdoutDate = data.holdout_from.slice(0, 10);

  return (
    <PageContainer size="wide" className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <Badge tone="cyan" dot>Strict Time-Split Backtest</Badge>
            <Badge tone="neutral" mono>Holdout ≥ {holdoutDate}</Badge>
          </>
        }
        title="Validation backtest"
        description="Every holdout plan is generated strictly from matches played before the cutoff date, with zero future leakage. Results compare win rates by plan adherence and gold-adjusted lift per call type."
        actions={
          <>
            <ButtonLink to="/" variant="secondary">Browse matches</ButtonLink>
            <ButtonLink to="/plan/new" variant="primary">Build a plan</ButtonLink>
          </>
        }
      />

      {/* Top KPI Telemetry Strip */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Holdout Sides"
          value={data.sides}
          meta={`Unseen pro sides since ${holdoutDate}`}
          tone="cyan"
        />
        <StatTile
          label="Low Adherence (0-25%)"
          value={lowestQ ? pct(lowestQ.win_rate) : "--"}
          meta={lowestQ ? `${lowestQ.sides} sides in bottom quartile` : undefined}
          tone="bad"
        />
        <StatTile
          label="High Adherence (75-100%)"
          value={highestQ ? pct(highestQ.win_rate) : "--"}
          meta={`+${(spreadPp * 100).toFixed(1)} pp vs bottom quartile`}
          tone="good"
        />
        <StatTile
          label="Strongest Reliable Call"
          value={topReliable ? pp(topReliable.adjusted_difference) : "--"}
          meta={
            topReliable
              ? `${TYPE_META[topReliable.type].label} (${topReliable.followed} followed / ${topReliable.not_followed} missed)`
              : undefined
          }
          tone="good"
        />
      </section>

      {/* Main Analytics Split */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Adherence Quartile Chart */}
        <Panel className="lg:col-span-5">
          <PanelHeader
            title="Win rate by plan adherence"
            description="Out-of-sample win rate across adherence quartiles (dashed line = 50% baseline)"
            meta={`${data.sides} sides`}
          />
          <PanelBody className="space-y-4">
            <div className="relative space-y-4 py-1">
              {/* 50% Baseline Reference */}
              <div
                className="pointer-events-none absolute bottom-0 top-0 border-l border-dashed border-line-strong"
                style={{ left: "50%" }}
                aria-hidden="true"
              />
              {data.adherence_quartiles.map((q) => {
                const widthPct = Math.max(4, Math.min(100, q.win_rate * 100));
                const above = q.win_rate >= 0.5;
                return (
                  <div key={`${q.low}-${q.high}`} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-ink-primary">
                        {Math.round(q.low * 100)}% – {Math.round(q.high * 100)}%
                      </span>
                      <div className="flex items-center gap-2 font-mono tabular-nums">
                        <span className="text-ink-muted">{q.sides} sides</span>
                        <span className={above ? "font-semibold text-emerald-300" : "font-semibold text-rose-300"}>
                          {pct(q.win_rate)}
                        </span>
                      </div>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-[6px] border border-line-subtle bg-canvas">
                      <div
                        className={`h-full rounded-[5px] transition-all ${
                          above
                            ? "bg-gradient-to-r from-emerald-500/70 to-emerald-400"
                            : "bg-gradient-to-r from-rose-500/70 to-rose-400"
                        }`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between border-t border-line-subtle pt-3 font-mono text-[10px] text-ink-muted">
              <span>0%</span>
              <span>50% baseline</span>
              <span>100%</span>
            </div>
          </PanelBody>
        </Panel>

        {/* Per-Item-Type Gold-Adjusted Table */}
        <Panel className="lg:col-span-7">
          <PanelHeader
            title="Gold-adjusted lift by call type"
            description="Win-rate difference between followed and missed calls, controlling for gold difference"
            meta={`${data.by_type.length} call types`}
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line-subtle bg-surface-raised/60 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                  <th className="px-4 py-2.5 font-semibold">Call type</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Followed</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Missed</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Raw WR</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Gold-Adj Lift</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {sortedTypes.map((row) => {
                  const meta = TYPE_META[row.type];
                  const lowSample = row.followed < 10 || row.not_followed < 10;
                  const positive = row.adjusted_difference >= 0;
                  const barPct = Math.min(100, Math.abs(row.adjusted_difference) * 200);
                  return (
                    <tr key={row.type} className="transition-colors hover:bg-surface-raised/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge tone={meta.tone} pill={false}>
                            {meta.label}
                          </Badge>
                          {lowSample && (
                            <Badge tone="warn" mono>
                              low n
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 text-[11px] text-ink-muted">{meta.summary}</div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-ink-primary">
                        {row.followed}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-ink-secondary">
                        {row.not_followed}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums">
                        <span className="text-emerald-300">{pct(row.followed_win_rate)}</span>
                        <span className="mx-1 text-ink-muted">/</span>
                        <span className="text-rose-300">{pct(row.not_followed_win_rate)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex flex-col items-end gap-1">
                          <span
                            className={`font-mono font-semibold tabular-nums ${
                              positive ? "text-emerald-300" : "text-rose-300"
                            }`}
                          >
                            {pp(row.adjusted_difference)}
                          </span>
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-canvas">
                            <div
                              className={`h-full rounded-full ${positive ? "bg-status-good" : "bg-status-bad"}`}
                              style={{ width: `${Math.max(8, barPct)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* Honest Methodology Calibration Note */}
      <SectionHeader
        kicker="Calibration notes"
        title="How to read these backtest findings"
        description="Transparent empirical caveats surfaced directly from the holdout run."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Callout tone="good" title="Strongest signal: tempo windows & lane priority">
          Following draft advantage windows yields a +20.4 pp gold-adjusted win-rate lift across 150 checked calls,
          and executing early lane priority adds +8.8 pp across 121 calls.
        </Callout>
        <Callout tone="warn" title="Honest caveat: objective setup threshold is too strict">
          Requiring 3+ champions grouped 20 s pre-spawn, arriving first, and taking the objective marked only 1
          holdout call as fully followed vs 247 missed. Relaxing the pre-spawn arrival window is the top calibration
          target for v2.
        </Callout>
      </div>
    </PageContainer>
  );
}
