import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { GameTimeline } from "../components/GameTimeline";
import { ReviewList } from "../components/ReviewList";
import {
  Badge,
  Button,
  ButtonLink,
  Callout,
  PageContainer,
  PageHeader,
  Skeleton,
  StatTile,
} from "../design-system";
import { reviewEntries, summaryLine } from "../lib/reviewEntries";
import { getToken, takeTokenFromHash } from "../lib/tokens";
import { ReplayPlayer } from "../replay/ReplayPlayer";
import type { EntryState, ReviewResponse } from "../types";

export function ReviewPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  useEffect(() => takeTokenFromHash("review", id), [id]);
  const token = getToken("review", id);
  const { data, error } = useQuery({ queryKey: ["review", id], queryFn: () => api.review(id) });
  const planId = data?.review.plan_id;
  const { data: plan } = useQuery({ queryKey: ["plan", planId], queryFn: () => api.plan(planId!), enabled: Boolean(planId) });
  const entries = useMemo(() => (data ? reviewEntries(data.review, plan?.plan) : []), [data, plan]);
  const [selected, setSelected] = useState<string>();
  const current = entries.find((entry) => entry.id === selected) ?? entries.find((entry) => entry.tone !== "na");
  const save = useMutation({
    mutationFn: ({ entryId, state }: { entryId: string; state: EntryState }) => api.setEntry(id, token ?? "", entryId, state),
    onSuccess: (response) => queryClient.setQueryData<ReviewResponse>(["review", id], (old) => old && { ...old, entries: response.entries }),
  });

  if (error) {
    return (
      <PageContainer size="wide">
        <Callout tone="bad" title="Review not found">
          This post-game review link may be invalid or removed.
        </Callout>
      </PageContainer>
    );
  }
  if (!data) {
    return (
      <PageContainer size="wide" className="space-y-6">
        <Skeleton className="h-32" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-44" />
      </PageContainer>
    );
  }
  const { review } = data;
  const duration = review.gold.length ? review.gold[review.gold.length - 1][0] : 0;
  const enemy = review.us === "blue" ? "red" : "blue";

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/review/${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <PageContainer size="wide" className="space-y-5">
      <PageHeader
        eyebrow={
          <>
            <Badge tone={review.us === "blue" ? "blue" : "red"} dot>
              {review.teams[review.us]} ({review.us})
            </Badge>
            <span className="font-mono text-[11px] text-ink-muted">VS</span>
            <Badge tone={enemy === "blue" ? "blue" : "red"} dot>
              {review.teams[enemy]}
            </Badge>
            {!token && <Badge tone="neutral">Read-only view</Badge>}
          </>
        }
        title={summaryLine(review)}
        description="Select any plan check or detected macro moment to jump the tactical replay directly to its clip window."
        actions={
          <>
            <ButtonLink to={`/plan/${review.plan_id}`} variant="secondary">
              View the plan
            </ButtonLink>
            <ButtonLink to={`/replay/${encodeURIComponent(review.game_id)}`} variant="secondary">
              Full replay
            </ButtonLink>
            {token && (
              <Button variant="accent" onClick={copyShareLink}>
                {copied ? "Copied!" : "Copy link for players"}
              </Button>
            )}
          </>
        }
      />

      {/* 4-Column Adherence Telemetry Strip */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Followed" value={review.summary.followed} meta="Plan calls executed cleanly" tone="good" />
        <StatTile label="Partly Followed" value={review.summary.partly} meta="Partial setup or timing" tone="warn" />
        <StatTile label="Missed" value={review.summary.not_followed} meta="Unmet calls to debrief" tone="bad" />
        <StatTile label="Macro Moments" value={review.moments.length} meta="Auto-detected swings & setups" tone="cyan" />
      </section>

      <GameTimeline
        gold={review.gold}
        duration={duration}
        entries={entries}
        selected={current?.id}
        clipRange={current?.clip}
        onSelect={setSelected}
      />

      {/* Split Workspace: Entries + Sticky Tactical Map */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)]">
        <ReviewList
          entries={entries}
          states={data.entries}
          selected={current?.id}
          editable={Boolean(token)}
          onSelect={setSelected}
          onState={(entryId, state) => save.mutate({ entryId, state })}
        />
        <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          {current && (
            <ReplayPlayer
              key={current.id}
              gameId={review.game_id}
              start={current.clip[0]}
              end={current.clip[1]}
              focusLabel={current.label}
              showRoster
              markers={entries
                .filter((entry) => entry.tone !== "na")
                .map((entry) => ({
                  t: entry.t,
                  label: entry.label,
                  tone: entry.tone === "na" ? "neutral" : entry.tone,
                }))}
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
}
