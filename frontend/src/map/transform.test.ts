import { describe, expect, it } from "vitest";
import { toCanvas } from "./transform";

describe("toCanvas", () => {
  it("puts the blue base bottom left and flips y", () => {
    expect(toCanvas(0, 0, 600)).toEqual([0, 600]);
    expect(toCanvas(15000, 15000, 600)).toEqual([600, 0]);
    expect(toCanvas(7500, 3750, 600)).toEqual([300, 450]);
  });
});