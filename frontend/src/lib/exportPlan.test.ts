import { describe, expect, it } from "vitest";
import type { Plan } from "../types";
import { planToText } from "./exportPlan";

const plan: Plan = {
  draft: {
    blue: { top: "Aatrox", jungle: "Vi", mid: "Ahri", bot: "Ezreal", support: "Rakan" },
    red: { top: "Gnar", jungle: "Sejuani", mid: "Orianna", bot: "Kaisa", support: "Nautilus" },
    us: "blue",
    patch: "15.23",
  },
  items: [
    {
      type: "lane",
      id: "lane-bot",
      text: "Bot has priority to 8:00: play for plates.",
      lane: "bot",
      until: 480,
      evidence: [{ text: "x", games: 37 }],
      score: 1,
      origin: "generated",
    },
  ],
  tempo: [],
  windows: [],
  lanes: [],
  scope_games: 600,
};

describe("planToText", () => {
  it("lists the draft and every item with its sample", () => {
    expect(planToText(plan)).toBe(
      [
        "**Game plan** (patch 15.23, 600 games)",
        "Us: Aatrox, Vi, Ahri, Ezreal, Rakan",
        "Them: Gnar, Sejuani, Orianna, Kaisa, Nautilus",
        "",
        "- Bot has priority to 8:00: play for plates. (37 games)",
      ].join("\n"),
    );
  });
});