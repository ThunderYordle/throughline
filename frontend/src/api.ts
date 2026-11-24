import type { GameSummary, Replay } from "./types";

export async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return (await response.json()) as T;
}

export const api = {
  games: (q?: string) => getJson<GameSummary[]>(`/api/games${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  champions: () => getJson<{ name: string; games: number }[]>("/api/champions"),
  replay: (gameId: string) => getJson<Replay>(`/api/games/${encodeURIComponent(gameId)}/replay`),
};