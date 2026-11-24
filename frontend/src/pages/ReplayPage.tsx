import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { Badge, ButtonLink, PageContainer, PageHeader } from "../design-system";
import { fmtTime } from "../lib/time";
import { ReplayPlayer } from "../replay/ReplayPlayer";

export function ReplayPage() {
  const { gameId = "" } = useParams();
  const [params] = useSearchParams();
  const num = (key: string) => (params.get(key) !== null ? Number(params.get(key)) : undefined);
  const { data: replay } = useQuery({ queryKey: ["replay", gameId], queryFn: () => api.replay(gameId) });

  return (
    <PageContainer size="wide" className="space-y-6">
      {replay && (
        <PageHeader
          eyebrow={
            <>
              <Badge tone="neutral" pill={false}>
                {replay.game.tournament}
              </Badge>
              <Badge tone="cyan" mono>
                Patch {replay.game.patch}
              </Badge>
              <Badge tone="neutral" mono>
                {fmtTime(replay.game.duration)}
              </Badge>
              <Badge tone={replay.game.winner === "blue" ? "blue" : "red"} dot>
                {replay.game.teams[replay.game.winner]} win
              </Badge>
            </>
          }
          title={
            <span>
              <span className="text-side-blue">{replay.game.teams.blue}</span>
              <span className="mx-2.5 font-mono text-lg font-normal text-ink-muted">vs</span>
              <span className="text-side-red">{replay.game.teams.red}</span>
            </span>
          }
          description="Interactive tactical minimap with 22 turrets, plate progress, pit setup zones, teamfight clusters, live lane matchups, and jumpable match event feed."
          actions={
            <>
              <ButtonLink to={`/plan/from-game/${encodeURIComponent(gameId)}?us=blue`} variant="blue">
                Plan as {replay.game.teams.blue}
              </ButtonLink>
              <ButtonLink to={`/plan/from-game/${encodeURIComponent(gameId)}?us=red`} variant="red">
                Plan as {replay.game.teams.red}
              </ButtonLink>
            </>
          }
        />
      )}
      <ReplayPlayer gameId={gameId} start={num("start")} end={num("end")} showRoster showEventLog />
    </PageContainer>
  );
}
