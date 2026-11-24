import { useState } from "react";
import {
  Badge,
  Button,
  Callout,
  COLOR_GROUPS,
  EmptyState,
  PageContainer,
  PageHeader,
  Panel,
  PanelBody,
  PanelFooter,
  PanelHeader,
  SearchInput,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  StatTile,
  TextInput,
  WorkflowStepper,
  type WorkflowStageId,
} from "../design-system";

export function DesignSystemPage() {
  const [segment, setSegment] = useState<"all" | "checks" | "moments">("all");
  const [stage, setStage] = useState<WorkflowStageId>("plan");
  const [search, setSearch] = useState("");
  const [note, setNote] = useState("Group 25s before third dragon");

  return (
    <PageContainer size="wide" className="space-y-8">
      <PageHeader
        eyebrow={
          <>
            <Badge tone="cyan" dot>Design System v1.0</Badge>
            <Badge tone="neutral" mono>Tactical Warroom</Badge>
          </>
        }
        title="Throughline Design System"
        description="Fixed obsidian surfaces, hairline borders, high-density monospace telemetry, and disciplined semantic primitives powering every scouting, planning, debrief, and replay screen."
      />

      {/* 1. Color & Surface Tokens */}
      <section className="space-y-4">
        <SectionHeader
          kicker="01 / Tokens"
          title="Color & surface architecture"
          description="All surfaces, hairlines, typography ink levels, and semantic statuses resolve from CSS custom properties in tokens.css."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {COLOR_GROUPS.map((group) => (
            <Panel key={group.title}>
              <PanelHeader title={group.title} description={group.description} meta={`${group.tokens.length} tokens`} />
              <div className="divide-y divide-line-subtle">
                {group.tokens.map((token) => (
                  <div key={token.cssVar} className="flex items-center gap-3.5 px-4 py-2.5 sm:px-5">
                    <span
                      className="h-9 w-9 shrink-0 rounded-ds border border-line-strong shadow-inner"
                      style={{ backgroundColor: token.value }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-sm font-semibold text-ink-primary">{token.name}</span>
                        <code className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[10px] text-accent-cyan">
                          {token.cssVar}
                        </code>
                      </div>
                      <p className="mt-0.5 text-xs text-ink-muted">{token.usage}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-ink-secondary">
                      {token.value}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      </section>

      {/* 2. Typography Scale */}
      <section className="space-y-4">
        <SectionHeader
          kicker="02 / Typography"
          title="Type hierarchy & telemetry numerals"
          description="Space Grotesk for structural headings, Inter for UI copy, and JetBrains Mono with tabular numerals for all clocks, gold diffs, and counts."
        />
        <Panel>
          <div className="divide-y divide-line-subtle">
            <div className="grid gap-2 px-5 py-4 sm:grid-cols-[180px_1fr] sm:items-baseline">
              <span className="font-mono text-[11px] text-ink-muted">Display / H1 · 30px</span>
              <div className="font-display text-3xl font-bold tracking-tight text-ink-primary">
                Did we play our draft?
              </div>
            </div>
            <div className="grid gap-2 px-5 py-4 sm:grid-cols-[180px_1fr] sm:items-baseline">
              <span className="font-mono text-[11px] text-ink-muted">Section / H2 · 18px</span>
              <div className="font-display text-lg font-semibold text-ink-primary">
                Expected draft tempo and objective setup windows
              </div>
            </div>
            <div className="grid gap-2 px-5 py-4 sm:grid-cols-[180px_1fr] sm:items-baseline">
              <span className="font-mono text-[11px] text-ink-muted">Body / UI · 14px</span>
              <div className="text-sm leading-relaxed text-ink-secondary">
                Every call is computed strictly from counted pro-game statistics with empirical Bayes shrinkage toward
                zero for small samples.
              </div>
            </div>
            <div className="grid gap-2 px-5 py-4 sm:grid-cols-[180px_1fr] sm:items-baseline">
              <span className="font-mono text-[11px] text-ink-muted">Telemetry / Mono · 13px</span>
              <div className="flex flex-wrap items-center gap-4 font-mono text-sm tabular-nums">
                <span className="text-ink-primary">14:22 / 31:08</span>
                <span className="text-emerald-300">+2.4k gold</span>
                <span className="text-rose-300">-850g @ 10m</span>
                <span className="text-accent-cyan">587 holdout sides</span>
              </div>
            </div>
          </div>
        </Panel>
      </section>

      {/* 3. Interactive Primitives */}
      <section className="space-y-4">
        <SectionHeader
          kicker="03 / Primitives"
          title="Buttons, badges, controls & inputs"
          description="Standardized interactive elements with fixed heights, borders, and focus-visible rings."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Buttons" description="Variants & sizes" />
            <PanelBody className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="primary">Primary CTA</Button>
                <Button variant="accent">Command Cyan</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="blue">Plan as Blue</Button>
                <Button variant="red">Plan as Red</Button>
                <Button variant="danger">Remove</Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-line-subtle pt-3">
                <Button variant="secondary" size="xs" mono>-10s</Button>
                <Button variant="secondary" size="sm">Default sm</Button>
                <Button variant="primary" size="md">Action md</Button>
                <Button variant="primary" size="sm" disabled>Disabled</Button>
              </div>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Badges & status indicators" description="Pills and square telemetry tags" />
            <PanelBody className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">Neutral</Badge>
                <Badge tone="cyan" dot>Warroom</Badge>
                <Badge tone="good" dot>Followed</Badge>
                <Badge tone="warn" dot>Partly</Badge>
                <Badge tone="bad" dot>Missed</Badge>
                <Badge tone="blue" dot>Blue side</Badge>
                <Badge tone="red" dot>Red side</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-line-subtle pt-3">
                <Badge tone="warn" pill={false}>Objective</Badge>
                <Badge tone="violet" pill={false}>Concede</Badge>
                <Badge tone="blue" pill={false}>Lane</Badge>
                <Badge tone="good" pill={false}>Window</Badge>
                <Badge tone="orange" pill={false}>Spike</Badge>
                <Badge tone="cyan" pill={false}>Jungle side</Badge>
                <Badge tone="neutral" mono>142 games</Badge>
              </div>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Segmented controls & pipeline stepper" description="Interactive tabs and workflow state" />
            <PanelBody className="space-y-4">
              <SegmentedControl
                ariaLabel="Sample filter"
                value={segment}
                onChange={setSegment}
                options={[
                  { value: "all", label: "All entries", count: 12 },
                  { value: "checks", label: "Plan checks", count: 6 },
                  { value: "moments", label: "Moments", count: 6 },
                ]}
              />
              <div className="space-y-2 border-t border-line-subtle pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    Workflow Stepper Preview
                  </span>
                  <SegmentedControl
                    size="xs"
                    value={stage}
                    onChange={setStage}
                    options={[
                      { value: "draft", label: "01" },
                      { value: "plan", label: "02" },
                      { value: "review", label: "03" },
                      { value: "replay", label: "04" },
                    ]}
                  />
                </div>
                <WorkflowStepper activeStage={stage} />
              </div>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Inputs & search" description="Fixed 36px height with cyan focus treatment" />
            <PanelBody className="space-y-3">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search a team, tournament, or champion..."
                aria-label="Sample search"
              />
              <TextInput
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Coach note for players..."
                aria-label="Sample note"
              />
            </PanelBody>
          </Panel>
        </div>
      </section>

      {/* 4. Data Surfaces, Stat Tiles & Feedback */}
      <section className="space-y-4">
        <SectionHeader
          kicker="04 / Structure"
          title="Telemetry tiles, panels & feedback states"
          description="Standardized containers for KPIs, checklists, loading skeletons, callouts, and empty states."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Dataset" value="1,738" meta="Pro games indexed" tone="cyan" />
          <StatTile label="Adherence" value="5 / 6" meta="83% calls followed" tone="good" />
          <StatTile label="Blue Lead" value="+3.2k" meta="At 20:00 mark" tone="blue" />
          <StatTile label="Issues" value="2" meta="Flagged macro swings" tone="bad" />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel accent="good">
            <PanelHeader title="Accented Call Panel" meta="84 games" />
            <PanelBody className="text-xs leading-relaxed text-ink-secondary">
              Left 3px semantic border highlights call category or verdict without overwhelming dense lists.
            </PanelBody>
            <PanelFooter>
              <span className="font-mono text-[11px] text-ink-muted">Edited by coach</span>
              <Button size="xs" variant="ghost">Inspect</Button>
            </PanelFooter>
          </Panel>

          <div className="space-y-3">
            <Callout tone="info" title="Info callout">
              Empirical shrinkage pulls low-sample matchups smoothly toward zero.
            </Callout>
            <Callout tone="warn" title="Warning callout">
              Positions arrive every few seconds; unknown intervals render dashed fog rings.
            </Callout>
          </div>

          <div className="space-y-3">
            <EmptyState
              title="Empty state container"
              description="Clear next-step guidance whenever a query or filter yields zero records."
              className="py-5"
            />
            <Skeleton className="h-10" />
          </div>
        </div>
      </section>
    </PageContainer>
  );
}
