import type { Lane, ReplayPlate, Side } from "../types";

export const PITS: Record<"dragon" | "baron", [number, number]> = {
  dragon: [9866, 4414],
  baron: [5007, 10471],
};

export const PIT_RADIUS = 2500;
export const STRUCTURE_FLASH_SECONDS = 10;
export const PLATES_FALL_SECONDS = 840;
export const MAX_PLATES = 5;

export interface MapStructure {
  id: string;
  side: Side;
  kind: "turret" | "inhibitor" | "nexus";
  lane: Lane | null;
  tier: number;
  x: number;
  y: number;
  label: string;
}

export interface StructureState extends MapStructure {
  alive: boolean;
  destroyedAt: number | null;
  justDestroyed: boolean;
  platesTaken: number;
}

export interface MapZoneLabel {
  label: string;
  x: number;
  y: number;
}

export const MAP_LABELS: MapZoneLabel[] = [
  { label: "TOP", x: 1650, y: 13350 },
  { label: "MID", x: 7450, y: 7450 },
  { label: "BOT", x: 13350, y: 1650 },
  { label: "BARON", x: 5007, y: 10471 },
  { label: "DRAGON", x: 9866, y: 4414 },
];

export const MAP_STRUCTURES: MapStructure[] = [
  // Blue Top
  { id: "blue-top-t1", side: "blue", kind: "turret", lane: "top", tier: 1, x: 981, y: 10441, label: "Blue Top T1" },
  { id: "blue-top-t2", side: "blue", kind: "turret", lane: "top", tier: 2, x: 1512, y: 6699, label: "Blue Top T2" },
  { id: "blue-top-t3", side: "blue", kind: "turret", lane: "top", tier: 3, x: 1169, y: 4287, label: "Blue Top T3" },
  { id: "blue-top-inhib", side: "blue", kind: "inhibitor", lane: "top", tier: 4, x: 1171, y: 3571, label: "Blue Top Inhib" },
  // Blue Mid
  { id: "blue-mid-t1", side: "blue", kind: "turret", lane: "mid", tier: 1, x: 5846, y: 6396, label: "Blue Mid T1" },
  { id: "blue-mid-t2", side: "blue", kind: "turret", lane: "mid", tier: 2, x: 5048, y: 4812, label: "Blue Mid T2" },
  { id: "blue-mid-t3", side: "blue", kind: "turret", lane: "mid", tier: 3, x: 3651, y: 3696, label: "Blue Mid T3" },
  { id: "blue-mid-inhib", side: "blue", kind: "inhibitor", lane: "mid", tier: 4, x: 3203, y: 3208, label: "Blue Mid Inhib" },
  // Blue Bot
  { id: "blue-bot-t1", side: "blue", kind: "turret", lane: "bot", tier: 1, x: 10504, y: 1029, label: "Blue Bot T1" },
  { id: "blue-bot-t2", side: "blue", kind: "turret", lane: "bot", tier: 2, x: 6919, y: 1483, label: "Blue Bot T2" },
  { id: "blue-bot-t3", side: "blue", kind: "turret", lane: "bot", tier: 3, x: 4281, y: 1253, label: "Blue Bot T3" },
  { id: "blue-bot-inhib", side: "blue", kind: "inhibitor", lane: "bot", tier: 4, x: 3452, y: 1236, label: "Blue Bot Inhib" },
  // Blue Base
  { id: "blue-nexus-t1", side: "blue", kind: "turret", lane: null, tier: 4, x: 1748, y: 2270, label: "Blue Nexus T1" },
  { id: "blue-nexus-t2", side: "blue", kind: "turret", lane: null, tier: 4, x: 2177, y: 1807, label: "Blue Nexus T2" },
  { id: "blue-nexus", side: "blue", kind: "nexus", lane: null, tier: 5, x: 1540, y: 1650, label: "Blue Nexus" },

  // Red Top
  { id: "red-top-t1", side: "red", kind: "turret", lane: "top", tier: 1, x: 4318, y: 13875, label: "Red Top T1" },
  { id: "red-top-t2", side: "red", kind: "turret", lane: "top", tier: 2, x: 7943, y: 13411, label: "Red Top T2" },
  { id: "red-top-t3", side: "red", kind: "turret", lane: "top", tier: 3, x: 10481, y: 13650, label: "Red Top T3" },
  { id: "red-top-inhib", side: "red", kind: "inhibitor", lane: "top", tier: 4, x: 11261, y: 13676, label: "Red Top Inhib" },
  // Red Mid
  { id: "red-mid-t1", side: "red", kind: "turret", lane: "mid", tier: 1, x: 8955, y: 8510, label: "Red Mid T1" },
  { id: "red-mid-t2", side: "red", kind: "turret", lane: "mid", tier: 2, x: 9767, y: 10113, label: "Red Mid T2" },
  { id: "red-mid-t3", side: "red", kind: "turret", lane: "mid", tier: 3, x: 11134, y: 11207, label: "Red Mid T3" },
  { id: "red-mid-inhib", side: "red", kind: "inhibitor", lane: "mid", tier: 4, x: 11598, y: 11667, label: "Red Mid Inhib" },
  // Red Bot
  { id: "red-bot-t1", side: "red", kind: "turret", lane: "bot", tier: 1, x: 13866, y: 4505, label: "Red Bot T1" },
  { id: "red-bot-t2", side: "red", kind: "turret", lane: "bot", tier: 2, x: 13327, y: 8226, label: "Red Bot T2" },
  { id: "red-bot-t3", side: "red", kind: "turret", lane: "bot", tier: 3, x: 13624, y: 10572, label: "Red Bot T3" },
  { id: "red-bot-inhib", side: "red", kind: "inhibitor", lane: "bot", tier: 4, x: 13604, y: 11316, label: "Red Bot Inhib" },
  // Red Base
  { id: "red-nexus-t1", side: "red", kind: "turret", lane: null, tier: 4, x: 12611, y: 13084, label: "Red Nexus T1" },
  { id: "red-nexus-t2", side: "red", kind: "turret", lane: null, tier: 4, x: 13052, y: 12612, label: "Red Nexus T2" },
  { id: "red-nexus", side: "red", kind: "nexus", lane: null, tier: 5, x: 13250, y: 13200, label: "Red Nexus" },
];

const otherSide = (side: Side): Side => (side === "blue" ? "red" : "blue");

export function structureStatesAt(
  structures: { t: number; kind: string; lane: string | null; by: Side }[],
  plates: ReplayPlate[] | undefined,
  t: number,
): StructureState[] {
  const destroyedTimes = new Map<string, number>();
  const laneCounts = new Map<string, number>();
  const ordered = [...structures].filter((s) => s.t <= t).sort((a, b) => a.t - b.t);

  for (const s of ordered) {
    const owner = otherSide(s.by);
    if (s.kind === "turret") {
      if (s.lane === "top" || s.lane === "mid" || s.lane === "bot") {
        const key = `${owner}-${s.lane}-turret`;
        const nextTier = (laneCounts.get(key) ?? 0) + 1;
        laneCounts.set(key, nextTier);
        if (nextTier <= 3) {
          destroyedTimes.set(`${owner}-${s.lane}-t${nextTier}`, s.t);
        } else {
          const baseKey = `${owner}-nexus-turret`;
          const n = (laneCounts.get(baseKey) ?? 0) + 1;
          laneCounts.set(baseKey, n);
          if (n <= 2) destroyedTimes.set(`${owner}-nexus-t${n}`, s.t);
        }
      } else {
        const baseKey = `${owner}-nexus-turret`;
        const n = (laneCounts.get(baseKey) ?? 0) + 1;
        laneCounts.set(baseKey, n);
        if (n <= 2) destroyedTimes.set(`${owner}-nexus-t${n}`, s.t);
      }
    } else if (s.kind === "inhibitor" && (s.lane === "top" || s.lane === "mid" || s.lane === "bot")) {
      destroyedTimes.set(`${owner}-${s.lane}-inhib`, s.t);
    } else if (s.kind === "nexus") {
      destroyedTimes.set(`${owner}-nexus`, s.t);
    }
  }

  const plateCounts = new Map<string, number>();
  for (const plate of plates ?? []) {
    if (plate.t > t) continue;
    const owner = otherSide(plate.by);
    const id = `${owner}-${plate.lane}-t1`;
    plateCounts.set(id, Math.min(MAX_PLATES, (plateCounts.get(id) ?? 0) + 1));
  }

  return MAP_STRUCTURES.map((structure) => {
    const destroyedAt = destroyedTimes.get(structure.id) ?? null;
    const alive = destroyedAt === null;
    return {
      ...structure,
      alive,
      destroyedAt,
      justDestroyed: destroyedAt !== null && t - destroyedAt <= STRUCTURE_FLASH_SECONDS,
      platesTaken: structure.kind === "turret" && structure.tier === 1 ? (plateCounts.get(structure.id) ?? 0) : 0,
    };
  });
}
