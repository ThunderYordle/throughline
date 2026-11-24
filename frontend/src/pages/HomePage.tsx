import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api } from "../api";
import {
  Badge,
  ButtonLink,
  EmptyState,
  PageContainer,
  PageHeader,
  Panel,
  PanelBody,
  PanelHeader,
  SearchInput,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  StatTile,
} from "../design-system";
import { useDdragon } from "../lib/ddragon";
import { ROLES, type GameSummary, type Side } from "../types";

function TeamIcons({
  game,
  side,
  iconFor,
}: {
  game: GameSummary;
  side: Side;
  iconFor: (champion: string) => string | undefined;
}) {
  const ring = side === "blue" ? "ring-side-blue/45" : "ring-side-red/45";
  return (
    <div className="flex items-center gap-1">
      {ROLES.map((role) => {
        const champion = game.champions[side]?.[role] ?? "";
        const icon = champion ? iconFor(champion) : undefined;
        return icon ? (
          <img
            key={role}
            src={icon}
            alt={champion}
            title={`${role.toUpperCase()}: ${champion}`}
            className={`h-7 w-7 rounded-[6px] ring-1 ${ring}`}
          />
        ) : (
          <span
            key={role}
            title={champion}
            className={`flex h-7 w-7 items-center justify-center rounded-[6px] bg-surface-raised font-mono text-[9px] text-ink-muted ring-1 ${ring}`}
          >
            {champion.slice(0, 3)}
          </span>
        );
      })}
    </div>
  );
}

export function HomePage() {
  const [q, setQ] = useState("");
  const [league, setLeague] = useState<string>("all");
  const { data: games = [], isLoading } = useQuery({ queryKey: ["games", q], queryFn: () => api.games(q) });
  const { iconFor } = useDdragon();

  const tournaments = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of games) counts.set(g.tournament, (counts.get(g.tournament) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [games]);

  const latestPatch = useMemo(() => (games.length ? games[0].patch : "--"), [games]);
  const blueWins = useMemo(() => games.filter((g) => g.winner === "blue").length, [games]);
  const blueWr = games.length ? `${Math.round((blueWins / games.length) * 100)}%` : "--";

  const visible = useMemo(
    () => (league === "all" ? games : games.filter((g) => g.tournament === league)),
    [games, league],
  );

  const leagueOptions = useMemo(
    () => [
      { value: "all", label: "All leagues", count: games.length },
      ...tournaments.map(([name, count]) => ({ value: name, label: name, count })),
    ],
    [games.length, tournaments],
  );

  return (
    <PageContainer size="wide" className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <Badge tone="cyan" dot>Scouting Desk</Badge>
            <Badge tone="neutral" mono>Pro Macro Intelligence</Badge>
          </>
        }
        title="Throughline"
        description="Did we play our draft? Turn any 10-champion draft into a counted pro-data game plan, verify every tempo window and objective setup post-game, and inspect every call on the tactical map."
        actions={
          <>
            <ButtonLink to="/plan/new" variant="primary" size="md">
              New draft
            </ButtonLink>
            <ButtonLink to="/validation" variant="secondary" size="md">
              Validation report
            </ButtonLink>
          </>
        }
      />

      {/* Telemetry KPI Strip */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Loaded Matches" value={games.length} meta="Pro VODs ready for debrief" tone="cyan" />
        <StatTile label="Latest Patch" value={latestPatch} meta="Active meta snapshot" tone="default" />
        <StatTile label="Active Leagues" value={tournaments.length || "--"} meta="Top circuits in view" tone="default" />
        <StatTile label="Blue Side Win Rate" value={blueWr} meta={`${blueWins} of ${games.length} in current view`} tone="blue" />
      </section>

      {/* 3-Stage Architecture Rail */}
      <Panel>
        <div className="grid divide-y divide-line-subtle md:grid-cols-3 md:divide-x md:divide-y-0">
          {[
            {
              step: "01",
              title: "Draft to game plan",
              desc: "Compute 0–30 min tempo curve, lane priorities, spike timers, and ranked calls from pro games.",
            },
            {
              step: "02",
              title: "Plan to post-game review",
              desc: "Score every call Followed / Partly / Missed and flag setups, cross-map trades, and gold swings.",
            },
            {
              step: "03",
              title: "Tactical map & clips",
              desc: "Inspect live gold, 22 turrets, pit headcounts, fight zones, and shareable read-only debrief links.",
            },
          ].map((stage) => (
            <div key={stage.step} className="px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="rounded-[5px] border border-cyan-400/30 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-accent-cyan">
                  {stage.step}
                </span>
                <span className="font-display text-sm font-semibold text-ink-primary">{stage.title}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">{stage.desc}</p>
            </div>
          ))}
        </div>
      </Panel>

      {/* Match Ledger Section */}
      <section className="space-y-4">
        <SectionHeader
          kicker="Match Ledger"
          title="Recent pro matches"
          description="Pick any side to generate a pre-game plan from that draft, or open the tactical replay directly."
          right={
            <Badge tone="neutral" mono>
              {visible.length} match{visible.length === 1 ? "" : "es"}
            </Badge>
          }
        />

        {/* Filter Toolbar */}
        <Panel>
          <PanelBody className="space-y-3 py-3.5 sm:py-4">
            <div className="flex flex-wrap items-center gap-3">
              <SearchInput
                value={q}
                onChange={(next) => {
                  setQ(next);
                  setLeague("all");
                }}
                placeholder="Search a team, a tournament or a champion"
                aria-label="Search games"
              />
            </div>
            {tournaments.length > 1 && (
              <SegmentedControl
                ariaLabel="Filter by league"
                size="xs"
                value={league}
                onChange={setLeague}
                options={leagueOptions}
              />
            )}
          </PanelBody>
        </Panel>

        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        )}

        {!isLoading && visible.length === 0 && (
          <EmptyState
            title="No matches found for that filter"
            description="Try clearing the search query or switching back to all leagues."
            action={
              (q || league !== "all") && (
                <ButtonLink
                  to="/"
                  variant="secondary"
                  onClick={() => {
                    setQ("");
                    setLeague("all");
                  }}
                >
                  Reset filters
                </ButtonLink>
              )
            }
          />
        )}

        {!isLoading && visible.length > 0 && (
          <Panel>
            <PanelHeader
              title="Indexed games"
              meta={`${visible.length} shown`}
              actions={
                <span className="hidden font-mono text-[10px] uppercase tracking-[0.09em] text-ink-muted lg:inline">
                  Blue roster · VS · Red roster
                </span>
              }
            />
            <ul className="divide-y divide-line-subtle">
              {visible.map((game) => (
                <li
                  key={game.game_id}
                  className="px-4 py-3.5 transition-colors hover:bg-surface-raised/45 sm:px-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="neutral" pill={false}>
                        {game.tournament}
                      </Badge>
                      <span className="font-mono text-[11px] text-ink-muted">Patch {game.patch}</span>
                      <span className="text-ink-muted/50">·</span>
                      <span className="font-mono text-[11px] tabular-nums text-ink-muted">
                        {new Date(game.started_at).toLocaleDateString()}
                      </span>
                    </div>
                    <Badge tone={game.winner === "blue" ? "blue" : "red"} dot>
                      {game.teams[game.winner]} win
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-col gap-3.5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="min-w-[88px] font-display text-sm font-semibold text-side-blue">
                          {game.teams.blue}
                        </span>
                        <TeamIcons game={game} side="blue" iconFor={iconFor} />
                      </div>
                      <span className="font-mono text-[11px] font-semibold text-ink-muted">VS</span>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <TeamIcons game={game} side="red" iconFor={iconFor} />
                        <span className="min-w-[88px] font-display text-sm font-semibold text-side-red">
                          {game.teams.red}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <ButtonLink
                        to={`/plan/from-game/${encodeURIComponent(game.game_id)}?us=blue`}
                        variant="blue"
                        size="xs"
                      >
                        Plan as {game.teams.blue}
                      </ButtonLink>
                      <ButtonLink
                        to={`/plan/from-game/${encodeURIComponent(game.game_id)}?us=red`}
                        variant="red"
                        size="xs"
                      >
                        Plan as {game.teams.red}
                      </ButtonLink>
                      <ButtonLink
                        to={`/replay/${encodeURIComponent(game.game_id)}`}
                        variant="secondary"
                        size="xs"
                      >
                        Replay
                      </ButtonLink>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </section>
    </PageContainer>
  );
}
