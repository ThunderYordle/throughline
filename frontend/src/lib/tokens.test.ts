import { beforeEach, describe, expect, it } from "vitest";
import { getToken, saveToken } from "./tokens";

class MemoryStorage {
  data = new Map<string, string>();

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.data.set(key, value);
  }

  removeItem(key: string) {
    this.data.delete(key);
  }
}

describe("tokens", () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
  });

  it("saves and reads per kind and id", () => {
    saveToken("plan", "a", "t1");
    expect(getToken("plan", "a")).toBe("t1");
    expect(getToken("review", "a")).toBeUndefined();
  });

  it("survives a throwing storage", () => {
    (globalThis as unknown as { localStorage: object }).localStorage = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    };
    saveToken("plan", "a", "t1");
    expect(getToken("plan", "a")).toBeUndefined();
  });
});