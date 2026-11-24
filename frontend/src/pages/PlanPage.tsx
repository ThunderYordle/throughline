import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { DraftStrip } from "../components/DraftStrip";
import { PlanItemCard } from "../components/PlanItemCard";
import { ReviewAGame } from "../components/ReviewAGame";
import { TempoChart } from "../components/TempoChart";
import {
  Badge,
  Button,
  Callout,
  EmptyState,
  PageContainer,
  PageHeader,
  Panel,
  PanelBody,
  PanelHeader,
  SectionHeader,
  Skeleton,
} from "../design-system";
import { planToText } from "../lib/exportPlan";
import { getToken, takeTokenFromHash } from "../lib/tokens";
import type { PlanItem } from "../types";

export function PlanPage() {
  const { id = "" } = useParams();
  const [searchParams] = useSearchParams();
  const game = searchParams.get("game");
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => takeTokenFromHash("plan", id), [id]);
  const token = getToken("plan", id);
  const { data, error } = useQuery({ queryKey: ["plan", id], queryFn: () => api.plan(id) });
  const save = useMutation({
    mutationFn: (items: PlanItem[]) => api.updatePlan(id, token ?? "", items),
    onSuccess: (response) => queryClient.setQueryData(["plan", id], response),
  });

  if (error) {
    return (
      <PageContainer size="default">
        <Callout tone="bad" title="Plan not found">
          Check the link or build a new draft plan from the match ledger.
        </Callout>
      </PageContainer>
    );
  }
  if (!data) {
    return (
      <PageContainer size="wide" className="space-y-6">
        <Skeleton className="h-36" />
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-64 lg:col-span-5" />
          <Skeleton className="h-64 lg:col-span-7" />
        </div>
      </PageContainer>
    );
  }
  const { plan } = data;

  const copy = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <PageContainer size="wide" className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <Badge tone="neutral" mono>
              Patch {plan.draft.patch}
            </Badge>
            <Badge tone="cyan" mono>
              {plan.scope_games} pro games
            </Badge>
            <Badge tone={plan.draft.us === "blue" ? "blue" : "red"} dot>
              Playing as {plan.draft.us}
            </Badge>
          </>
        }
        title="Game plan"
        description="Ranked, checkable macro calls backed by counted pro games with empirical Bayes shrinkage."
        actions={
          <>
            <Button variant="secondary" onClick={() => copy("discord", planToText(plan))}>
              {copied === "discord" ? "Copied!" : "Copy for Discord"}
            </Button>
            <Button variant="secondary" onClick={() => copy("link", `${window.location.origin}/plan/${id}`)}>
              {copied === "link" ? "Copied!" : "Copy read-only link"}
            </Button>
            {token && (
              <Button variant="blue" onClick={() => copy("edit", `${window.location.origin}/plan/${id}#t=${token}`)}>
                {copied === "edit" ? "Copied!" : "Copy edit link"}
              </Button>
            )}
          </>
        }
        aside={<DraftStrip draft={plan.draft} />}
      />

      {/* Structured Top Bento: Lane Matrix (5 cols) + Tempo Chart (7 cols) */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Panel className="flex flex-col lg:col-span-5">
          <PanelHeader
            title="Expected lane priority"
            description="Gold difference @ 10m across the three lanes"
            meta={`${plan.lanes.length} lanes`}
          />
          <PanelBody className="flex-1 space-y-2.5">
            {plan.lanes.length === 0 ? (
              <EmptyState title="No lane priority signal" description="Not enough matchup samples for individual lanes." className="py-6" />
            ) : (
              plan.lanes.map((lane) => {
                const accent = lane.owner === "us" ? "good" : lane.owner === "them" ? "bad" : "none";
                const tone = lane.owner === "us" ? "good" : lane.owner === "them" ? "bad" : "default";
                const badgeTone = lane.owner === "us" ? "good" : lane.owner === "them" ? "bad" : "neutral";
                return (
                  <Panel key={lane.lane} as="div" tone={tone} accent={accent} className="p-3.5 shadow-none">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-ink-primary">
                        {lane.lane} lane
                      </span>
                      <Badge tone={badgeTone}>
                        {lane.owner === "us" ? "Our prio" : lane.owner === "them" ? "Their prio" : "Even"}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <span className="font-mono text-lg font-semibold tabular-nums text-ink-primary">
                        {lane.value >= 0 ? "+" : ""}
                        {Math.round(lane.value)}g
                      </span>
                      <span className="font-mono text-[11px] tabular-nums text-ink-muted">{lane.games} games</span>
                    </div>
                    {lane.detail && <p className="mt-1 text-xs text-ink-secondary">{lane.detail}</p>}
                  </Panel>
                );
              })
            )}
          </PanelBody>
        </Panel>

        <div className="lg:col-span-7">
          <TempoChart plan={plan} />
        </div>
      </div>

      {/* Main Workspace: Game-Plan Checklist (8 cols) + Review Matching Games Dock (4 cols) */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="space-y-4 lg:col-span-8">
          <SectionHeader
            kicker="Pre-game checklist"
            title="Actionable calls"
            description="Each item is automatically checked against the played match during post-game review."
            right={
              <Badge tone="neutral" mono>
                {plan.items.length} calls
              </Badge>
            }
          />
          {plan.items.length === 0 ? (
            <EmptyState
              title="Not enough games behind this draft"
              description="Try an earlier patch or a more common champion matchup to generate calls."
            />
          ) : (
            <ul className="space-y-3">
              {plan.items.map((item) => (
                <PlanItemCard
                  key={item.id}
                  item={item}
                  editable={Boolean(token)}
                  onChange={(next) =>
                    save.mutate(plan.items.map((planItem) => (planItem.id === next.id ? next : planItem)))
                  }
                  onRemove={() => save.mutate(plan.items.filter((planItem) => planItem.id !== item.id))}
                />
              ))}
            </ul>
          )}
        </section>

        <aside className="lg:col-span-4 lg:sticky lg:top-28 lg:self-start">
          <ReviewAGame planId={id} suggestedGameId={game ?? undefined} />
        </aside>
      </div>
    </PageContainer>
  );
}
