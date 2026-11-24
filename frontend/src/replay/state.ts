import type { Replay, Side } from "../types";

export interface PlayerLiveStat {
  gold: number;
  level: number;
  kills: number;
  deaths: number;
  assists: number;
}

export interface LiveScoreboard {
  kills: Record<Side, number>;
  towers: Record<Side, number>;
  dragons: Record<Side, number>;
  grubs: Record<Side, number>;
  heralds: Record<Side, number>;
  barons: Record<Side, number>;
  plates: Record<Side, number>;
  gold: { blue: number; red: number; diff: number };
  players: Record<number, PlayerLiveStat>;
}

export interface FeedEvent {
  id: string;
  t: number;
  kind: "kill" | "objective" | "structure" | "plate";
  side: Side;
  label: string;
  detail?: string;
}

const OBJECTIVE_LABELS: Record<string, string> = {
  dragon: "Dragon",
  elder: "Elder Dragon",
  grubs: "Void Grubs",
  herald: "Rift Herald",
  baron: "Baron Nashor",
  atakhan: "Atakhan",
};

export function objectiveLabel(kind: string): string {
  return OBJECTIVE_LABELS[kind] ?? kind;
}

export function fmtGold(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}k`;
  return `${sign}${Math.round(abs)}`;
}

export function fmtGoldSigned(value: number): string {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : ""}${fmtGold(value)}`;
}

export function scoreboardAt(replay: Replay, t: number): LiveScoreboard {
  const sec = Math.max(0, Math.min(Math.max(replay.times.length - 1, 0), Math.floor(t)));
  const kills: Record<Side, number> = { blue: 0, red: 0 };
  const towers: Record<Side, number> = { blue: 0, red: 0 };
  const dragons: Record<Side, number> = { blue: 0, red: 0 };
  const grubs: Record<Side, number> = { blue: 0, red: 0 };
  const heralds: Record<Side, number> = { blue: 0, red: 0 };
  const barons: Record<Side, number> = { blue: 0, red: 0 };
  const plates: Record<Side, number> = { blue: 0, red: 0 };

  const players: Record<number, PlayerLiveStat> = {};
  for (const p of replay.participants) {
    const stat = replay.player_stats?.[String(p.pid)]?.[sec];
    players[p.pid] = {
      gold: stat ? stat[0] : 0,
      level: stat ? stat[1] : 1,
      kills: 0,
      deaths: 0,
      assists: 0,
    };
  }

  for (const k of replay.kills) {
    if (k.t > t) continue;
    kills[k.side] += 1;
    if (k.killer !== null && players[k.killer]) players[k.killer].kills += 1;
    if (players[k.victim]) players[k.victim].deaths += 1;
    for (const assist of k.assists ?? []) {
      if (players[assist]) players[assist].assists += 1;
    }
  }

  for (const s of replay.structures) {
    if (s.t > t) continue;
    if (s.kind === "turret") towers[s.by] += 1;
  }

  for (const o of replay.objectives) {
    if (o.t > t) continue;
    if (o.kind === "dragon" || o.kind === "elder") dragons[o.by] += 1;
    else if (o.kind === "grubs") grubs[o.by] += 1;
    else if (o.kind === "herald") heralds[o.by] += 1;
    else if (o.kind === "baron") barons[o.by] += 1;
  }

  for (const p of replay.plates ?? []) {
    if (p.t > t) continue;
    plates[p.by] += 1;
  }

  const blueGold =
    replay.team_gold?.blue?.[sec] ??
    replay.participants
      .filter((p) => p.side === "blue")
      .reduce((acc, p) => acc + (players[p.pid]?.gold ?? 0), 0);
  const redGold =
    replay.team_gold?.red?.[sec] ??
    replay.participants
      .filter((p) => p.side === "red")
      .reduce((acc, p) => acc + (players[p.pid]?.gold ?? 0), 0);
  const diff = replay.gold?.[sec] ?? blueGold - redGold;

  return {
    kills,
    towers,
    dragons,
    grubs,
    heralds,
    barons,
    plates,
    gold: { blue: blueGold, red: redGold, diff },
    players,
  };
}

export function allFeedEvents(replay: Replay): FeedEvent[] {
  const byPid = new Map(replay.participants.map((p) => [p.pid, p]));
  const events: FeedEvent[] = [];

  replay.kills.forEach((k, idx) => {
    const killer = k.killer !== null ? byPid.get(k.killer) : undefined;
    const victim = byPid.get(k.victim);
    const killerLabel = killer ? killer.champion : "Executed";
    const victimLabel = victim ? victim.champion : `#${k.victim}`;
    const assistCount = k.assists?.length ?? 0;
    events.push({
      id: `kill-${idx}`,
      t: k.t,
      kind: "kill",
      side: k.side,
      label: `${killerLabel} killed ${victimLabel}`,
      detail: assistCount > 0 ? `+${assistCount} assist${assistCount > 1 ? "s" : ""}` : "Solo kill",
    });
  });

  replay.objectives.forEach((o, idx) => {
    events.push({
      id: `obj-${idx}`,
      t: o.t,
      kind: "objective",
      side: o.by,
      label: `${replay.game.teams[o.by]} secured ${objectiveLabel(o.kind)}`,
    });
  });

  replay.structures.forEach((s, idx) => {
    const laneText = s.lane ? `${s.lane.toUpperCase()} ` : "";
    events.push({
      id: `str-${idx}`,
      t: s.t,
      kind: "structure",
      side: s.by,
      label: `${replay.game.teams[s.by]} destroyed ${laneText}${s.kind}`,
    });
  });

  (replay.plates ?? []).forEach((p, idx) => {
    events.push({
      id: `plate-${idx}`,
      t: p.t,
      kind: "plate",
      side: p.by,
      label: `${replay.game.teams[p.by]} took ${p.lane.toUpperCase()} plate`,
    });
  });

  return events.sort((a, b) => a.t - b.t);
}

export function recentEventsAt(replay: Replay, t: number, windowSeconds = 10): FeedEvent[] {
  return allFeedEvents(replay)
    .filter((event) => event.t <= t && t - event.t <= windowSeconds)
    .sort((a, b) => b.t - a.t);
}
