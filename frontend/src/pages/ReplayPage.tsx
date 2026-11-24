import { useParams, useSearchParams } from "react-router-dom";
import { ReplayPlayer } from "../replay/ReplayPlayer";

export function ReplayPage() {
  const { gameId = "" } = useParams();
  const [params] = useSearchParams();
  const num = (key: string) => (params.get(key) !== null ? Number(params.get(key)) : undefined);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <ReplayPlayer gameId={gameId} start={num("start")} end={num("end")} />
    </main>
  );
}