import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { DraftStrip } from "../components/DraftStrip";
import { PlanItemCard } from "../components/PlanItemCard";
import { ReviewAGame } from "../components/ReviewAGame";
import { TempoChart } from "../components/TempoChart";
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

  if (error) return <main className="mx-auto max-w-4xl px-4 py-8 text-rose-400">Plan not found.</main>;
  if (!data) return <main className="mx-auto max-w-4xl px-4 py-8 text-zinc-500">Loading the plan...</main>;
  const { plan } = data;

  const copy = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Game plan</h1>
          <p className="mt-1 text-sm text-zinc-500">Patch {plan.draft.patch} · built from {plan.scope_games} pro games</p>
        </div>
        <DraftStrip draft={plan.draft} />
      </div>
      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        <button type="button" className="rounded bg-zinc-800 px-3 py-1" onClick={() => copy("discord", planToText(plan))}>
          {copied === "discord" ? "Copied" : "Copy for Discord"}
        </button>
        <button
          type="button"
          className="rounded bg-zinc-800 px-3 py-1"
          onClick={() => copy("link", `${window.location.origin}/plan/${id}`)}
        >
          {copied === "link" ? "Copied" : "Copy read-only link"}
        </button>
        {token && (
          <button
            type="button"
            className="rounded bg-zinc-800 px-3 py-1"
            onClick={() => copy("edit", `${window.location.origin}/plan/${id}#t=${token}`)}
          >
            {copied === "edit" ? "Copied" : "Copy edit link"}
          </button>
        )}
      </div>
      <section className="mt-8">
        <TempoChart plan={plan} />
      </section>
      {plan.items.length === 0 ? (
        <p className="mt-8 text-zinc-400">
          Not enough games behind this draft for a plan. Try an earlier patch or a more common draft.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {plan.items.map((item) => (
            <PlanItemCard
              key={item.id}
              item={item}
              editable={Boolean(token)}
              onChange={(next) => save.mutate(plan.items.map((planItem) => (planItem.id === next.id ? next : planItem)))}
              onRemove={() => save.mutate(plan.items.filter((planItem) => planItem.id !== item.id))}
            />
          ))}
        </ul>
      )}
      <ReviewAGame planId={id} suggestedGameId={game ?? undefined} />
    </main>
  );
}