import { describe, expect, it } from "vitest";
import { fmtTime } from "./time";

describe("fmtTime", () => {
  it("formats minutes and seconds", () => {
    expect(fmtTime(0)).toBe("0:00");
    expect(fmtTime(280)).toBe("4:40");
    expect(fmtTime(1325.9)).toBe("22:05");
  });
});