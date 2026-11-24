import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { saveToken } from "../lib/tokens";

interface Props {
  planId: string;
  suggestedGameId?: string;
}

export function ReviewAGame({ planId, suggestedGameId }: Props) {
  const navigate = useNavigate();
  const { data: games = [] } = useQuery({ queryKey: ["plan-games", planId], queryFn: () => api.planGames(planId) });
  const create = useMutation({
    mutationFn: (gameId: string) => api.createReview(planId, gameId),
    onSuccess: (response) => {
      if (response.edit_token) saveToken("review", response.id, response.edit_token);
      navigate(`/review/${response.id}`);
    },
  });
  const sorted = [...games].sort((a, b) => Number(b.game_id === suggestedGameId) - Number(a.game_id === suggestedGameId));

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold">Review a game</h2>
      {sorted.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-400">No game in the dataset was played with this draft yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-800">
          {sorted.map((game) => (
            <li key={game.game_id} className="flex items-center justify-between gap-4 py-2 text-sm">
              <span>{game.teams.blue} vs {game.teams.red} · {game.tournament} · {new Date(game.started_at).toLocaleDateString()}</span>
              <button
                type="button"
                disabled={create.isPending}
                onClick={() => create.mutate(game.game_id)}
                className="rounded bg-emerald-500 px-3 py-1 font-medium text-zinc-950 disabled:opacity-40"
              >
                Review
              </button>
            </li>
          ))}
        </ul>
      )}
      {create.error && <p className="mt-2 text-rose-400">{String(create.error.message)}</p>}
    </section>
  );
}