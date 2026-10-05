import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  WORLD_COUNTRIES,
  WORLD_PROVINCES,
  atlasToWorld,
  countryOf,
  provinceAt,
  worldToAtlas,
} from "./world.ts";
import { WORLD_DATA } from "./world.data.ts";

describe("world map data", () => {
  it("numbers provinces by their index and gives each country one capital", () => {
    WORLD_PROVINCES.forEach((p, i) => assert.equal(p.id, i));
    for (const c of WORLD_COUNTRIES) {
      const capitals = WORLD_PROVINCES.filter((p) => p.country === c.id && p.capital);
      assert.equal(capitals.length, 1, c.id);
      assert.equal(capitals[0]!.id, c.capital);
    }
  });

  it("ships a pick grid of the declared size that covers every province", () => {
    const bytes = Buffer.from(WORLD_DATA.pick.u8, "base64");
    assert.equal(bytes.length, WORLD_DATA.pick.w * WORLD_DATA.pick.h);
    const seen = new Set(bytes);
    for (const p of WORLD_PROVINCES) assert.ok(seen.has(p.id), p.zh);
  });

  it("finds sea at the sheet corner and nothing off the sheet", () => {
    assert.equal(provinceAt(6, 6), null);
    assert.equal(provinceAt(-500, 300), null);
    assert.equal(provinceAt(9000, 300), null);
  });

  it("finds each capital at its own centre", () => {
    for (const c of WORLD_COUNTRIES) {
      const cap = WORLD_PROVINCES[c.capital]!;
      assert.equal(provinceAt(cap.center[0], cap.center[1])?.id, cap.id, cap.zh);
      assert.equal(countryOf(c.id).zh, c.zh);
    }
  });

  it("round-trips atlas and world coordinates", () => {
    const [x, , z] = atlasToWorld(733, 1201, 0.2);
    assert.deepEqual(worldToAtlas(x, z).map((v) => Math.round(v * 1000) / 1000), [733, 1201]);
  });
});
