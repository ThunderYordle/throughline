import { describe, expect, it } from "vitest";
import type { Replay } from "../types";
import { recentEventsAt, scoreboardAt } from "./state";

const sampleReplay: Replay = {
  game: {
    id: "g1",
    duration: 120,
    patch: "15.10",
    teams: { blue: "Blue", red: "Red" },
    winner: "blue",
    tournament: "LCK",
  },
  participants: [
    { pid: 1, side: "blue", role: "top", champion: "Jayce", player: "BTop" },
    { pid: 2, side: "blue", role: "jungle", champion: "Vi", player: "BJgl" },
    { pid: 3, side: "blue", role: "mid", champion: "Ahri", player: "BMid" },
    { pid: 4, side: "blue", role: "bot", champion: "Jinx", player: "BBot" },
    { pid: 5, side: "blue", role: "support", champion: "Rakan", player: "BSup" },
    { pid: 6, side: "red", role: "top", champion: "Gnar", player: "RTop" },
    { pid: 7, side: "red", role: "jungle", champion: "Sejuani", player: "RJgl" },
    { pid: 8, side: "red", role: "mid", champion: "Orianna", player: "RMid" },
    { pid: 9, side: "red", role: "bot", champion: "Aphelios", player: "RBot" },
    { pid: 10, side: "red", role: "support", champion: "Thresh", player: "RSup" },
  ],
  times: [0, 1, 2, 3, 4, 5],
  positions: {
    "1": [[1000, 1000, 1, 1], [1000, 1000, 1, 1], [1000, 1000, 1, 1], [1000, 1000, 1, 1], [1000, 1000, 1, 1], [1000, 1000, 1, 1]],
  },
  player_stats: {
    "1": [[500, 1], [500, 1], [900, 2], [900, 2], [900, 2], [900, 2]],
    "6": [[500, 1], [500, 1], [600, 1], [600, 1], [600, 1], [600, 1]],
  },
  team_gold: {
    blue: [2500, 2500, 2900, 2900, 2900, 2900],
    red: [2500, 2500, 2600, 2600, 2600, 2600],
  },
  gold: [0, 0, 300, 300, 300, 300],
  spawns: [],
  kills: [{ t: 2, killer: 1, victim: 6, assists: [2], x: 2000, y: 12000, side: "blue" }],
  objectives: [{ t: 4, kind: "dragon", by: "blue" }],
  structures: [{ t: 5, kind: "turret", lane: "top", by: "blue" }],
  plates: [{ t: 3, lane: "top", by: "blue", tier: 1 }],
};

describe("replay state helpers", () => {
  it("computes live scoreboard counts and gold at time t", () => {
    const sb = scoreboardAt(sampleReplay, 4.2);
    expect(sb.kills).toEqual({ blue: 1, red: 0 });
    expect(sb.dragons).toEqual({ blue: 1, red: 0 });
    expect(sb.towers).toEqual({ blue: 0, red: 0 });
    expect(sb.gold).toEqual({ blue: 2900, red: 2600, diff: 300 });
    expect(sb.players[1]).toEqual({ gold: 900, level: 2, kills: 1, deaths: 0, assists: 0 });
    expect(sb.players[2]).toEqual({ gold: 0, level: 1, kills: 0, deaths: 0, assists: 1 });
    expect(sb.players[6]).toEqual({ gold: 600, level: 1, kills: 0, deaths: 1, assists: 0 });
  });

  it("collects recent feed events inside the window around t", () => {
    const events = recentEventsAt(sampleReplay, 5, 4);
    expect(events.map((e) => e.kind)).toEqual(["structure", "objective", "plate", "kill"]);
  });
});
