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

export type Lane = "top" | "mid" | "bot";
export type Owner = "us" | "them";

export interface Draft {
  blue: Record<Role, string>;
  red: Record<Role, string>;
  us: Side;
  patch?: string | null;
}

export interface Evidence {
  text: string;
  games: number;
}

interface ItemBase {
  id: string;
  text: string;
  evidence: Evidence[];
  score: number;
  origin: "generated" | "edited" | "manual";
}

export type PlanItem =
  | (ItemBase & { type: "objective"; objective: string; spawn_at: number; by: number; min_players: number })
  | (ItemBase & { type: "concede"; objective: string; spawn_at: number; trade_lanes: Lane[] })
  | (ItemBase & { type: "lane"; lane: Lane; until: number })
  | (ItemBase & { type: "window"; stance: "force" | "avoid"; start: number; end: number })
  | (ItemBase & { type: "spike"; enemy_champion: string; role: Role; kind: "level6" | "item1"; at: number })
  | (ItemBase & { type: "side"; half: "top" | "bot"; until: number });

export interface TempoPoint {
  minute: number;
  value: number;
  games: number;
}

export interface Window {
  start: number;
  end: number;
  owner: Owner;
  peak: number;
  games: number;
}

export interface LanePriority {
  lane: Lane;
  owner: Owner | null;
  value: number;
  games: number;
  detail: string;
}

export interface Plan {
  draft: Draft;
  items: PlanItem[];
  tempo: TempoPoint[];
  windows: Window[];
  lanes: LanePriority[];
  scope_games: number;
}

export interface PlanResponse {
  id: string;
  plan: Plan;
  edit_token?: string;
  game_id?: string;
}

export type CheckStatus = "followed" | "partly" | "not_followed" | "not_applicable";

export interface ItemCheck {
  item_id: string;
  status: CheckStatus;
  numbers: string;
  at: number;
  clip: [number, number];
}

export interface Moment {
  id: string;
  kind: "objective_setup" | "unused_advantage" | "cross_map_trade" | "caught" | "gold_swing";
  t: number;
  verdict: "good" | "bad" | "neutral";
  text: string;
  impact: number;
  clip: [number, number];
}

export interface ReviewBody {
  plan_id: string;
  game_id: string;
  us: Side;
  teams: Record<Side, string>;
  checks: ItemCheck[];
  moments: Moment[];
  summary: { followed: number; partly: number; not_followed: number; not_applicable: number };
  gold: [number, number][];
}

export interface EntryState {
  status: "confirmed" | "dismissed" | null;
  note: string;
}

export interface ReviewResponse {
  id: string;
  review: ReviewBody;
  entries: Record<string, EntryState>;
  edit_token?: string;
}