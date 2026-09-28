import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRun } from "./engine.ts";
import { createEconomy } from "./economy.ts";
import { createCabinet } from "./realtime.ts";
import { scenarioOf, usableReserves } from "./scenarios.ts";
import { applyCivicAction, createCivic, normalizeCivic, tickCivic, getRecoveryRating, PETITIONS, type CivicState } from "./civic.ts";

function fixture() {
  const run = createRun("panic07", "governor", "solo", "sprint", 17);
  return { run, economy: createEconomy(), cabinet: createCabinet(), civic: createCivic(run) };
}
function spawn(c: CivicState, template: typeof PETITIONS[number]["id"]) {
  c.serial++; c.petition = { id: c.serial, template, expires: c.ticks + 9 };
  return c.serial;
}
describe("civic coordination", () => {
  it("starts with an original, contextual petition within fifteen seconds", () => {
    const f = fixture(); f.economy.materials = 0;
    tickCivic(f.run, f.economy, f.cabinet, f.civic); tickCivic(f.run, f.economy, f.cabinet, f.civic);
    assert.equal(f.civic.petition, null);
    tickCivic(f.run, f.economy, f.cabinet, f.civic);
    assert.equal(f.civic.petition!.template, "inputs"); assert.equal(f.civic.petition!.expires, 12);
    const id = f.civic.petition!.id;
    tickCivic(f.run, f.economy, f.cabinet, f.civic);
    assert.equal(f.civic.petition!.id, id);
  });
  it("charges actual aid exactly once, changes the economy, and refuses unfunded requests", () => {
    const f = fixture(); const id = spawn(f.civic, "inputs"); const start = f.run.reserves;
    const result = applyCivicAction(f.run, f.economy, f.cabinet, f.civic, { type: "petition", id, choice: "support" });
    const cost = usableReserves(scenarioOf(f.run.scenarioId)) * 0.004;
    assert.ok(result.ok); assert.equal(f.run.reserves, start - cost); assert.equal(f.run.spent, cost);
    assert.equal(f.economy.materials, 24); assert.equal(f.civic.resolved, 1);
    assert.equal(applyCivicAction(f.run, f.economy, f.cabinet, f.civic, { type: "petition", id, choice: "support" }).ok, false);
    assert.equal(f.run.reserves, start - cost); assert.equal(f.economy.materials, 24);
    const next = spawn(f.civic, "bread"); f.run.reserves = 0;
    const before = structuredClone(f);
    assert.equal(applyCivicAction(f.run, f.economy, f.cabinet, f.civic, { type: "petition", id: next, choice: "support" }).ok, false);
    assert.deepEqual(f, before);
  });
  it("keeps explicit refusals separate from silence and applies expiry once", () => {
    const f = fixture(); const id = spawn(f.civic, "credit"); const pressure = f.run.pressure;
    assert.ok(applyCivicAction(f.run, f.economy, f.cabinet, f.civic, { type: "petition", id, choice: "decline" }).ok);
    assert.equal(f.run.pressure, pressure); assert.equal(f.civic.silences, 0);
    spawn(f.civic, "credit");
    for (let i = 0; i < 9; i++) tickCivic(f.run, f.economy, f.cabinet, f.civic);
    assert.equal(f.civic.silences, 1); assert.equal(f.civic.petition, null);
    assert.ok(f.run.pressure > pressure);
    const after = f.run.pressure;
    tickCivic(f.run, f.economy, f.cabinet, f.civic);
    assert.equal(f.run.pressure, after); assert.equal(f.civic.silences, 1);
  });
  it("makes reforms funded negotiations that stall, advance and pay no duplicate costs", () => {
    const f = fixture(); const start = f.run.reserves;
    f.civic.factions.workers = 40; f.civic.factions.merchants = 40;
    assert.ok(applyCivicAction(f.run, f.economy, f.cabinet, f.civic, { type: "reform", id: "sharedWarehouses" }).ok);
    const spent = usableReserves(scenarioOf(f.run.scenarioId)) * 0.02;
    assert.equal(f.run.reserves, start - spent);
    for (let i = 0; i < 4; i++) tickCivic(f.run, f.economy, f.cabinet, f.civic);
    assert.equal(f.civic.reform!.progress, 0); assert.deepEqual(f.civic.enacted, []);
    f.civic.factions.workers = 90; f.civic.factions.merchants = 90;
    for (let i = 0; i < 14; i++) tickCivic(f.run, f.economy, f.cabinet, f.civic);
    assert.equal(f.civic.reform!.progress, 98);
    tickCivic(f.run, f.economy, f.cabinet, f.civic);
    assert.equal(f.civic.reform, null); assert.deepEqual(f.civic.enacted, ["sharedWarehouses"]);
    assert.equal(f.run.spent, spent); assert.equal(f.economy.materials, 12.45);
    assert.equal(applyCivicAction(f.run, f.economy, f.cabinet, f.civic, { type: "reform", id: "sharedWarehouses" }).ok, false);
    assert.equal(f.run.spent, spent);
  });
  it("cannot fund a reform or a meeting with nonexistent resources", () => {
    const f = fixture(); f.run.reserves = 0;
    assert.equal(applyCivicAction(f.run, f.economy, f.cabinet, f.civic, { type: "reform", id: "openBooks" }).ok, false);
    assert.equal(f.civic.capital, 40); assert.equal(f.civic.reform, null);
    f.civic.capital = 4;
    assert.equal(applyCivicAction(f.run, f.economy, f.cabinet, f.civic, { type: "caucus", faction: "workers" }).ok, false);
    f.civic.capital = 5;
    assert.ok(applyCivicAction(f.run, f.economy, f.cabinet, f.civic, { type: "caucus", faction: "workers" }).ok);
    assert.equal(f.civic.capital, 0); assert.equal(f.civic.factions.workers, 69);
    f.civic.capital = 5;
    assert.equal(applyCivicAction(f.run, f.economy, f.cabinet, f.civic, { type: "caucus", faction: "workers" }).ok, false);
    assert.equal(f.civic.capital, 5);
  });
  it("reacts to real economic conditions and rewards sustained wellbeing only once", () => {
    const low = fixture(); const good = fixture();
    low.economy.income = 40; low.economy.employment = 40; low.economy.price = 150;
    good.economy.income = 90; good.economy.sales = 6; good.economy.employment = 95; good.economy.price = 90;
    for (let i = 0; i < 5; i++) { tickCivic(low.run, low.economy, low.cabinet, low.civic); tickCivic(good.run, good.economy, good.cabinet, good.civic); }
    assert.deepEqual(good.civic.achievements, []);
    assert.ok(good.civic.factions.workers > low.civic.factions.workers);
    const capital = good.civic.capital;
    tickCivic(good.run, good.economy, good.cabinet, good.civic);
    assert.deepEqual(good.civic.achievements, ["livelihoods", "supply"]);
    assert.ok(Math.abs(good.civic.capital - capital - 12.42) < 1e-8);
    const once = good.civic.capital;
    tickCivic(good.run, good.economy, good.cabinet, good.civic);
    assert.ok(Math.abs(good.civic.capital - once - 0.42) < 1e-8);
    good.economy.income = 40; tickCivic(good.run, good.economy, good.cabinet, good.civic);
    assert.equal(good.civic.streaks.livelihoods, 0); assert.equal(good.civic.achievements.length, 2);
  });
  it("replays deterministic petition sequences and effects, bounded to one active letter", () => {
    const a = fixture(); const b = fixture();
    for (let tick = 0; tick < 150; tick++) {
      for (const f of [a, b]) {
        tickCivic(f.run, f.economy, f.cabinet, f.civic);
        if (f.civic.petition && tick % 4 === 0) applyCivicAction(f.run, f.economy, f.cabinet, f.civic, { type: "petition", id: f.civic.petition.id, choice: "decline" });
      }
    }
    assert.deepEqual(a, b); assert.ok(a.civic.serial >= 6); assert.ok(a.civic.serial <= 25);
  });
  it("uses bounded, time-scaled running costs and stops wage benefits when unfunded", () => {
    const f = fixture(); f.civic.enacted = ["wageCompact"];
    f.run.reserves = 0; const income = f.economy.income;
    tickCivic(f.run, f.economy, f.cabinet, f.civic);
    assert.equal(f.economy.income, income); assert.equal(f.run.reserves, 0);
    f.run.reserves = 100000;
    const cost = usableReserves(scenarioOf(f.run.scenarioId)) * 5 / 1800 * 0.025;
    tickCivic(f.run, f.economy, f.cabinet, f.civic);
    assert.equal(f.run.reserves, 100000 - cost); assert.equal(f.run.spent, cost);
  });
  it("roundtrips healthy saves, restores old saves safely and rejects malformed state", () => {
    const f = fixture(); tickCivic(f.run, f.economy, f.cabinet, f.civic);
    const restored = normalizeCivic(JSON.parse(JSON.stringify(f.civic)), f.run);
    assert.deepEqual(restored, f.civic); assert.notEqual(restored, f.civic);
    assert.deepEqual(normalizeCivic(undefined, f.run), createCivic(f.run));
    assert.deepEqual(normalizeCivic({ ...f.civic, factions: { ...f.civic.factions, workers: Infinity } }, f.run), createCivic(f.run));
    assert.deepEqual(normalizeCivic({ ...f.civic, reform: { id: "unknown", progress: 3 } }, f.run), createCivic(f.run));
    assert.deepEqual(normalizeCivic({ ...f.civic, achievements: ["supply", "supply"] }, f.run), createCivic(f.run));
    assert.deepEqual(normalizeCivic({ ...f.civic, streaks: { supply: 1e9, livelihoods: 0 } }, f.run), createCivic(f.run));
  });
  it("does not change a settled run", () => {
    const f = fixture(); f.run.done = true; const before = structuredClone(f);
    tickCivic(f.run, f.economy, f.cabinet, f.civic);
    assert.equal(applyCivicAction(f.run, f.economy, f.cabinet, f.civic, { type: "reform", id: "openBooks" }).ok, false);
    assert.deepEqual(f, before);
  });
  it("waits for twelve settlements and rates averaged living conditions with enacted accords", () => {
    const f = fixture(); const c = f.civic;
    assert.equal(getRecoveryRating(c).ready, false);
    c.recentLiving = Array.from({ length: 11 }, () => ({ income: 90, employment: 90 }));
    c.enacted = ["sharedWarehouses", "openBooks"];
    assert.equal(getRecoveryRating(c).ready, false);
    c.recentLiving.push({ income: 90, employment: 90 });
    assert.equal(getRecoveryRating(c).stars, 3);
    c.enacted = ["sharedWarehouses"]; assert.equal(getRecoveryRating(c).stars, 2);
    c.enacted = []; assert.equal(getRecoveryRating(c).stars, 1);
    c.recentLiving = Array.from({ length: 12 }, () => ({ income: 65, employment: 65 }));
    assert.equal(getRecoveryRating(c).stars, 1);
    c.recentLiving[11]!.employment = 64; assert.equal(getRecoveryRating(c).stars, 0);
    c.recentLiving = Array.from({ length: 12 }, () => ({ income: 75, employment: 75 }));
    c.enacted = ["sharedWarehouses"]; assert.equal(getRecoveryRating(c).stars, 2);
    c.recentLiving = Array.from({ length: 12 }, () => ({ income: 85, employment: 80 }));
    c.enacted.push("openBooks"); assert.equal(getRecoveryRating(c).stars, 3);
  });
  it("does not turn a last-minute wage payment into a higher recovery grade", () => {
    for (const base of [64, 74]) {
      const f = fixture();
      f.civic.enacted = ["sharedWarehouses"];
      f.economy.income = base; f.economy.employment = 80;
      for (let i = 0; i < 12; i++) tickCivic(f.run, f.economy, f.cabinet, f.civic);
      const prior = getRecoveryRating(f.civic);
      const id = spawn(f.civic, "payday");
      assert.ok(applyCivicAction(f.run, f.economy, f.cabinet, f.civic, { type: "petition", id, choice: "support" }).ok);
      assert.equal(f.economy.income, base + 4);
      assert.deepEqual(getRecoveryRating(f.civic), prior, "A clicked payment is not a settled observation");
      tickCivic(f.run, f.economy, f.cabinet, f.civic);
      assert.equal(getRecoveryRating(f.civic).stars, prior.stars);
      assert.ok(Math.abs(getRecoveryRating(f.civic).income - (base + 4 / 12)) < 1e-8);
    }
  });
  it("retains only the latest minute and collects equivalent samples across restored tick sequences", () => {
    const a = fixture(), b = fixture();
    for (let i = 0; i < 25; i++) {
      for (const f of [a, b]) {
        f.economy.income = 55 + i; f.economy.employment = 65 + i;
        tickCivic(f.run, f.economy, f.cabinet, f.civic);
      }
      if (i === 9) b.civic = normalizeCivic(JSON.parse(JSON.stringify(b.civic)), b.run);
    }
    assert.deepEqual(a.civic.recentLiving, b.civic.recentLiving);
    assert.deepEqual(getRecoveryRating(a.civic), getRecoveryRating(b.civic));
    assert.equal(a.civic.recentLiving.length, 12);
    assert.equal(a.civic.recentLiving[0]!.income, 68);
    assert.equal(a.civic.recentLiving[11]!.income, 79);
    assert.equal(getRecoveryRating(a.civic).income, 73.5);
  });
  it("adds missing recovery samples to old saves without resetting funded civic progress", () => {
    const f = fixture();
    f.civic.capital = 13; f.civic.enacted = ["openBooks"];
    f.civic.reform = { id: "wageCompact", progress: 42 }; f.civic.achievements = ["reformer"];
    f.civic.factions.workers = 73;
    const legacy = JSON.parse(JSON.stringify(f.civic)); delete legacy.recentLiving;
    const restored = normalizeCivic(legacy, f.run);
    assert.deepEqual(restored, { ...legacy, recentLiving: [] });
    assert.equal(getRecoveryRating(restored).ready, false);
    assert.equal("recentLiving" in legacy, false, "Migration must not mutate caller data");
    for (const samples of [null, Array.from({ length: 13 }, () => ({ income: 90, employment: 90 })), [{ income: Infinity, employment: 90 }], [{ income: 90, employment: -1 }]]) {
      assert.deepEqual(normalizeCivic({ ...f.civic, recentLiving: samples }, f.run), createCivic(f.run));
    }
  });
});
