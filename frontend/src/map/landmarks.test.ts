import { describe, expect, it } from "vitest";
import { MAP_STRUCTURES, PIT_RADIUS, PITS, structureStatesAt } from "./landmarks";

describe("map landmarks and structure state", () => {
  it("defines 22 turrets, 6 inhibitors, and 2 nexuses across blue and red", () => {
    const turrets = MAP_STRUCTURES.filter((s) => s.kind === "turret");
    const inhibs = MAP_STRUCTURES.filter((s) => s.kind === "inhibitor");
    const nexuses = MAP_STRUCTURES.filter((s) => s.kind === "nexus");
    expect(turrets).toHaveLength(22);
    expect(inhibs).toHaveLength(6);
    expect(nexuses).toHaveLength(2);
    expect(PITS.dragon).toEqual([9866, 4414]);
    expect(PITS.baron).toEqual([5007, 10471]);
    expect(PIT_RADIUS).toBe(2500);
  });

  it("marks enemy lane turrets destroyed in outer-to-inner order and counts plates", () => {
    const structures = [
      { t: 620, kind: "turret", lane: "bot", by: "blue" as const },
      { t: 980, kind: "turret", lane: "bot", by: "blue" as const },
      { t: 1400, kind: "inhibitor", lane: "bot", by: "blue" as const },
    ];
    const plates = [
      { t: 310, lane: "bot" as const, by: "blue" as const, tier: 1 },
      { t: 420, lane: "bot" as const, by: "blue" as const, tier: 1 },
    ];

    const at500 = structureStatesAt(structures, plates, 500);
    const redBotT1Before = at500.find((s) => s.id === "red-bot-t1")!;
    expect(redBotT1Before.alive).toBe(true);
    expect(redBotT1Before.platesTaken).toBe(2);

    const at625 = structureStatesAt(structures, plates, 625);
    const redBotT1After = at625.find((s) => s.id === "red-bot-t1")!;
    const redBotT2After = at625.find((s) => s.id === "red-bot-t2")!;
    expect(redBotT1After.alive).toBe(false);
    expect(redBotT1After.justDestroyed).toBe(true);
    expect(redBotT2After.alive).toBe(true);

    const at1405 = structureStatesAt(structures, plates, 1405);
    expect(at1405.find((s) => s.id === "red-bot-t2")!.alive).toBe(false);
    expect(at1405.find((s) => s.id === "red-bot-inhib")!.alive).toBe(false);
    expect(at1405.find((s) => s.id === "blue-bot-t1")!.alive).toBe(true);
  });
});
