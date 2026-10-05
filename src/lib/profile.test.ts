import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { PROFILE_KEY, normalizeProfile, readProfile, writeProfile } from "./profile.ts";

const data = new Map<string, string>();
beforeEach(() => {
  data.clear();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    },
  });
});

describe("governor profile", () => {
  it("round-trips through storage", () => {
    writeProfile({ name: "Ada", playerId: "abc123", gender: "female" });
    assert.deepEqual(readProfile(), { name: "Ada", playerId: "abc123", gender: "female" });
  });

  it("defaults a blank name and an unknown gender", () => {
    assert.deepEqual(normalizeProfile({ name: "  ", playerId: "X1", gender: "?" }), {
      name: "LEO",
      playerId: "X1",
      gender: "male",
    });
  });

  it("strips illegal id characters and rejects an empty id", () => {
    assert.equal(normalizeProfile({ name: "A", playerId: "a-b_c!", gender: "male" })?.playerId, "abc");
    assert.equal(normalizeProfile({ name: "A", playerId: "--", gender: "male" }), null);
  });

  it("treats corrupt storage as no profile", () => {
    data.set(PROFILE_KEY, "{not json");
    assert.equal(readProfile(), null);
  });
});
