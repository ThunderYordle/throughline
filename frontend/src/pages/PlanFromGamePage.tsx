import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { saveToken } from "../lib/tokens";
import type { Side } from "../types";

export function PlanFromGamePage() {
  const { gameId = "" } = useParams();
  const [params] = useSearchParams();
  const us = (params.get("us") === "red" ? "red" : "blue") as Side;
  const navigate = useNavigate();
  const { data, error } = useQuery({
    queryKey: ["plan-from-game", gameId, us],
    queryFn: () => api.planFromGame(gameId, us),
    staleTime: Infinity,
  });
  useEffect(() => {
    if (!data) return;
    if (data.edit_token) saveToken("plan", data.id, data.edit_token);
    navigate(`/plan/${data.id}?game=${encodeURIComponent(gameId)}`, { replace: true });
  }, [data, gameId, navigate]);
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 text-zinc-400">
      {error ? <p className="text-rose-400">Could not build the plan: {String(error.message)}</p> : "Building the plan..."}
    </main>
  );
}