import type { Draft, GameSummary, PlanItem, PlanResponse, Replay, Side } from "./types";

const JSON_HEADERS = { "Content-Type": "application/json" };

export async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return (await response.json()) as T;
}

export const api = {
  games: (q?: string) => getJson<GameSummary[]>(`/api/games${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  champions: () => getJson<{ name: string; games: number }[]>("/api/champions"),
  replay: (gameId: string) => getJson<Replay>(`/api/games/${encodeURIComponent(gameId)}/replay`),
  createPlan: (draft: Draft) =>
    getJson<PlanResponse>("/api/plans", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ draft }) }),
  planFromGame: (gameId: string, us: Side) =>
    getJson<PlanResponse>("/api/plans/from-game", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ game_id: gameId, us }),
    }),
  plan: (id: string) => getJson<PlanResponse>(`/api/plans/${encodeURIComponent(id)}`),
  updatePlan: (id: string, token: string, items: PlanItem[]) =>
    getJson<PlanResponse>(`/api/plans/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { ...JSON_HEADERS, "X-Edit-Token": token },
      body: JSON.stringify({ items }),
    }),
  planGames: (id: string) => getJson<GameSummary[]>(`/api/plans/${encodeURIComponent(id)}/games`),
};