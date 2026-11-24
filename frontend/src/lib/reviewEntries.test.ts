import { describe, expect, it } from "vitest";
import type { Plan, ReviewBody } from "../types";
import { reviewEntries, summaryLine } from "./reviewEntries";

const review: ReviewBody = {
  plan_id: "p", game_id: "g", us: "blue", teams: { blue: "A", red: "B" }, gold: [],
  summary: { followed: 4, partly: 2, not_followed: 0, not_applicable: 1 },
  checks: [
    { item_id: "objective-dragon", status: "partly", numbers: "2 of 5 near the pit at 4:40", at: 280, clip: [265, 330] },
    { item_id: "lane-bot", status: "not_applicable", numbers: "ended", at: 0, clip: [0, 0] },
  ],
  moments: [
    { id: "swing-600", kind: "gold_swing", t: 600, verdict: "bad", text: "Gold swing -2,000", impact: 2000, clip: [590, 660] },
  ],
};

const plan = { items: [{ id: "objective-dragon", text: "Contest first dragon" }] } as unknown as Plan;

describe("reviewEntries", () => {
  it("merges checks and moments in time order, not-applicable last", () => {
    const entries = reviewEntries(review, plan);
    expect(entries.map((e) => e.id)).toEqual(["objective-dragon", "swing-600", "lane-bot"]);
    expect(entries[0]).toMatchObject({ kind: "check", label: "Contest first dragon", tone: "neutral", t: 280 });
    expect(entries[1]).toMatchObject({ kind: "moment", tone: "bad" });
    expect(entries[2].tone).toBe("na");
  });
  it("summarises the plan check", () => {
    expect(summaryLine(review)).toBe("Plan followed 4 of 6 (2 partly)");
  });
});