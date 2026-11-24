import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export function HomePage() {
  const [q, setQ] = useState("");
  const { data: games = [], isLoading } = useQuery({ queryKey: ["games", q], queryFn: () => api.games(q) });
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Throughline</h1>
      <p className="mt-1 text-zinc-400">Did we play our draft?</p>
      <div className="mt-6 flex gap-3">
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search a team, a tournament or a champion"
          className="flex-1 rounded bg-zinc-900 px-3 py-2"
          aria-label="Search games"
        />
        <Link to="/plan/new" className="rounded bg-zinc-100 px-4 py-2 font-medium text-zinc-900">New draft</Link>
      </div>
      {isLoading && <p className="mt-6 text-zinc-500">Loading games...</p>}
      <ul className="mt-6 divide-y divide-zinc-800">
        {games.map((game) => (
          <li key={game.game_id} className="flex items-center justify-between gap-4 py-3">
            <div>
              <div className="font-medium">
                <span className="text-blue-side">{game.teams.blue}</span> vs <span className="text-red-side">{game.teams.red}</span>
              </div>
              <div className="text-xs text-zinc-500">
                {game.tournament} · patch {game.patch} · {new Date(game.started_at).toLocaleDateString()}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              {(["blue", "red"] as const).map((side) => (
                <Link
                  key={side}
                  to={`/plan/from-game/${encodeURIComponent(game.game_id)}?us=${side}`}
                  className="rounded bg-zinc-800 px-3 py-1"
                >
                  Plan as {game.teams[side]}
                </Link>
              ))}
              <Link to={`/replay/${encodeURIComponent(game.game_id)}`} className="rounded bg-zinc-800 px-3 py-1">Replay</Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}