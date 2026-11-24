export type Side = "blue" | "red";
export type Role = "top" | "jungle" | "mid" | "bot" | "support";
export const ROLES: Role[] = ["top", "jungle", "mid", "bot", "support"];

export interface GameSummary {
  game_id: string;
  tournament: string;
  started_at: string;
  patch: string;
  teams: Record<Side, string>;
  winner: Side;
  champions: Record<Side, Record<Role, string>>;
}

export interface ReplayParticipant {
  pid: number;
  side: Side;
  role: Role;
  champion: string;
  player: string;
}

export interface Replay {
  game: { id: string; duration: number; patch: string; teams: Record<Side, string>; winner: Side; tournament: string };
  participants: ReplayParticipant[];
  times: number[];
  positions: Record<string, [number, number, number, number][]>;
  spawns: { t: number; kind: string; x: number | null; y: number | null }[];
  kills: { t: number; killer: number | null; victim: number; x: number; y: number; side: Side }[];
  objectives: { t: number; kind: string; by: Side }[];
  structures: { t: number; kind: string; lane: string | null; by: Side }[];
}

export interface Marker {
  t: number;
  label: string;
  tone: "good" | "bad" | "neutral";
}