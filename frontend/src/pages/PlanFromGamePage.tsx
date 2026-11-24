import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { Callout, PageContainer, Panel, PanelBody } from "../design-system";
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
    <PageContainer size="narrow" className="py-12">
      {error ? (
        <Callout tone="bad" title="Could not build the plan">
          {String(error.message)}
        </Callout>
      ) : (
        <Panel>
          <PanelBody className="flex items-center gap-3 text-sm text-ink-secondary">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent-cyan" />
            <span>Building the game plan from historical pro matches...</span>
          </PanelBody>
        </Panel>
      )}
    </PageContainer>
  );
}
