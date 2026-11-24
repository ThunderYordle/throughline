import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { GameTimeline } from "../components/GameTimeline";
import { ReviewList } from "../components/ReviewList";
import { reviewEntries, summaryLine } from "../lib/reviewEntries";
import { getToken, takeTokenFromHash } from "../lib/tokens";
import { ReplayPlayer } from "../replay/ReplayPlayer";
import type { EntryState, ReviewResponse } from "../types";

export function ReviewPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
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

  if (error) return <main className="mx-auto max-w-6xl px-4 py-8 text-rose-400">Review not found.</main>;
  if (!data) return <main className="mx-auto max-w-6xl px-4 py-8 text-zinc-500">Loading the review...</main>;
  const { review } = data;
  const duration = review.gold.length ? review.gold[review.gold.length - 1][0] : 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{summaryLine(review)}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {review.teams[review.us]} ({review.us}) vs {review.teams[review.us === "blue" ? "red" : "blue"]} ·{" "}
            <Link to={`/plan/${review.plan_id}`} className="underline">the plan</Link>
          </p>
        </div>
        {token && (
          <button
            type="button"
            className="rounded bg-zinc-800 px-3 py-1 text-sm"
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/review/${id}`)}
          >
            Copy link for players
          </button>
        )}
      </div>
      <section className="mt-6">
        <GameTimeline gold={review.gold} duration={duration} entries={entries} selected={current?.id} onSelect={setSelected} />
      </section>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,640px)]">
        <ReviewList
          entries={entries}
          states={data.entries}
          selected={current?.id}
          editable={Boolean(token)}
          onSelect={setSelected}
          onState={(entryId, state) => save.mutate({ entryId, state })}
        />
        <div className="lg:sticky lg:top-4 lg:self-start">
          {current && (
            <ReplayPlayer
              key={current.id}
              gameId={review.game_id}
              start={current.clip[0]}
              end={current.clip[1]}
              markers={entries.filter((entry) => entry.tone !== "na").map((entry) => ({
                t: entry.t,
                label: entry.label,
                tone: entry.tone === "na" ? "neutral" : entry.tone,
              }))}
            />
          )}
        </div>
      </div>
    </main>
  );
}