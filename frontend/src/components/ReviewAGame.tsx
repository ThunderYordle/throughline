import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Badge, Button, Callout, EmptyState, Panel, PanelBody, PanelHeader } from "../design-system";
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
    <Panel>
      <PanelHeader
        title="Review a game"
        description="Score execution against this plan and inspect clips on the tactical map."
        meta={`${sorted.length} matching`}
      />
      <PanelBody className="p-0 sm:p-0">
        {sorted.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No matching played games yet"
              description="This draft has not been played in the loaded match dataset."
              className="py-6"
            />
          </div>
        ) : (
          <ul className="divide-y divide-line-subtle">
            {sorted.map((game) => (
              <li
                key={game.game_id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-raised/45"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-display font-semibold text-side-blue">{game.teams.blue}</span>
                    <span className="font-mono text-[11px] text-ink-muted">vs</span>
                    <span className="font-display font-semibold text-side-red">{game.teams.red}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
                    <Badge tone="neutral" pill={false}>
                      {game.tournament}
                    </Badge>
                    <span className="font-mono tabular-nums">{new Date(game.started_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="xs"
                  disabled={create.isPending}
                  onClick={() => create.mutate(game.game_id)}
                >
                  {create.isPending ? "Reviewing..." : "Review"}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {create.error && (
          <div className="p-4 pt-2">
            <Callout tone="bad">{String(create.error.message)}</Callout>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
