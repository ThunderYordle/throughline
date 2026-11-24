import { describe, expect, it } from "vitest";
import { tempoScale } from "./tempoScale";

describe("tempoScale", () => {
  it("maps 0-30 minutes across the width and centres zero", () => {
    const scale = tempoScale(
      [
        { minute: 5, value: 450, games: 10 },
        { minute: 30, value: -200, games: 10 },
      ],
      600,
      200,
    );
    expect(scale.x(0)).toBe(0);
    expect(scale.x(1800)).toBe(600);
    expect(scale.y(0)).toBe(100);
    expect(scale.maxGold).toBe(500);
    expect(scale.y(500)).toBe(0);
    expect(scale.y(-500)).toBe(200);
  });
});