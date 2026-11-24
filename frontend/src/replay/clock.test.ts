import { describe, expect, it } from "vitest";
import { advance, seek, type ClockState } from "./clock";

const base: ClockState = { t: 10, playing: true, speed: 4, start: 10, end: 20, loop: false };

describe("clock", () => {
  it("advances by speed", () => {
    expect(advance(base, 1000).t).toBe(14);
  });
  it("stops at the end without loop", () => {
    const s = advance(base, 5000);
    expect(s.t).toBe(20);
    expect(s.playing).toBe(false);
  });
  it("loops back to the start", () => {
    expect(advance({ ...base, loop: true }, 5000).t).toBe(10);
  });
  it("does nothing when paused", () => {
    expect(advance({ ...base, playing: false }, 1000)).toEqual({ ...base, playing: false });
  });
  it("seeks within bounds", () => {
    expect(seek(base, 5).t).toBe(10);
    expect(seek(base, 15).t).toBe(15);
    expect(seek(base, 25).t).toBe(20);
  });
});