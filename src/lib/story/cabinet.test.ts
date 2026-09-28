import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { useStory, readActiveRun } from "./store.ts";
import { createCivic, PETITIONS } from "./civic.ts";
import { methodCost } from "./economy.ts";
import { scenarioOf, usableReserves } from "./scenarios.ts";

const key = "leo-street-active-story-v1";
const memory = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => memory.set(k, v),
  removeItem: (k: string) => memory.delete(k),
} });
beforeEach(() => { useStory.getState().exit(); memory.clear(); });
function begin() {
  useStory.getState().brief("baht", "governor", "solo", "standard", 31);
  useStory.getState().begin();
}
function snapshot() {
  const s = useStory.getState();
  const state = { run: { ...s.run!, startedAt: 0, finishedAt: 0 },
    economy: s.economy, civic: s.civic, cabinet: s.cabinet, rng: s.rngState,
    pendingCivic: s.pendingCivic, submitted: s.submitted, secondsLeft: s.secondsLeft, elapsed: s.elapsedSeconds };
  // Persistence omits optional undefined properties; compare the actual save format.
  return JSON.parse(JSON.stringify(state)) as typeof state;
}
function answerPhones() {
  for (let guard = 0; guard < 30 && useStory.getState().phone; guard++) {
    let s = useStory.getState();
    if (s.phone?.status === "ringing") s.pickUp();
    s = useStory.getState(); if (s.phone?.status === "connecting") s.connected();
    s = useStory.getState();
    if (s.phone?.status === "live") s.say((s.phone.script.options.find(o => o.tone === "good") ?? s.phone.script.options[0]!).id);
    s = useStory.getState(); if (s.phone?.status === "reply") s.hangUp();
  }
  assert.equal(useStory.getState().phone, null);
}

describe("integrated cabinet campaign", () => {
  it("preserves the same economy, politics and historical outcomes across frame chunks with intervening actions", () => {
    const simulate = (frame: number) => {
      begin();
      const timeline = [7, 15, 40, 76, 121, 245];
      let current = 0;
      for (const until of timeline) {
        let remaining = until - current;
        while (remaining > 1e-9) { const delta = Math.min(frame, remaining); useStory.getState().advanceTime(delta); remaining -= delta; }
        current = until;
        const s = useStory.getState();
        if (until === 7) s.setEconomy({ methods: { ...s.economicDraft.methods, industry: "labor" }, tax: 0 });
        if (until === 15 && s.civic.petition) s.civicAction({ type: "petition", id: s.civic.petition.id, choice: "compromise" });
        if (until === 40) { s.construct("transport"); s.setEconomy({ trade: "exports" }); }
        if (until === 76) s.civicAction({ type: "reform", id: "sharedWarehouses" });
        if (until === 121) s.acknowledge();
      }
      return snapshot();
    };
    const lump = simulate(9999), frames = simulate(0.2);
    assert.deepEqual(lump.run, frames.run); assert.deepEqual(lump.economy, frames.economy);
    assert.deepEqual(lump.civic, frames.civic); assert.deepEqual(lump.cabinet, frames.cabinet);
    assert.equal(lump.rng, frames.rng); assert.equal(lump.submitted, frames.submitted);
    assert.ok(Math.abs(lump.secondsLeft - frames.secondsLeft) < 1e-8);
    assert.ok(Math.abs(lump.elapsed - frames.elapsed) < 1e-8);
    assert.equal(lump.economy.ticks, lump.civic.ticks);
  });
  it("keeps paid conversions and civic decisions inert while paused, and executes them once across restoration", () => {
    begin(); useStory.getState().advanceTime(15); useStory.getState().togglePause();
    const original = snapshot(); const s = useStory.getState();
    const conversion = methodCost(s.run!, s.economy, "industry");
    const petition = s.civic.petition!;
    const aid = usableReserves(scenarioOf("baht")) * PETITIONS.find(p => p.id === petition.template)!.cost;
    s.setEconomy({ methods: { ...s.economicDraft.methods, industry: "intensive" } });
    s.civicAction({ type: "caucus", faction: "workers" });
    s.civicAction({ type: "petition", id: petition.id, choice: "support" });
    s.civicAction({ type: "petition", id: petition.id, choice: "support" });
    s.advanceTime(500);
    assert.deepEqual(snapshot().run, original.run); assert.deepEqual(snapshot().economy, original.economy);
    assert.deepEqual(snapshot().civic, original.civic); assert.equal(useStory.getState().pendingCivic.length, 2);
    s.persistRun(); assert.ok(s.resumeRun()); assert.equal(useStory.getState().paused, true);
    assert.deepEqual(snapshot().run, original.run); assert.deepEqual(snapshot().civic, original.civic);
    s.togglePause();
    const applied = useStory.getState();
    assert.ok(Math.abs(applied.run!.spent - original.run.spent - conversion - aid) < 1e-8);
    assert.equal(applied.economy.orders.methods.industry, "intensive"); assert.equal(applied.economy.methodCooldowns.industry, 30);
    assert.equal(applied.civic.resolved, 1); assert.equal(applied.pendingCivic.length, 0);
    const spent = applied.run!.spent;
    applied.togglePause(); applied.persistRun(); assert.ok(applied.resumeRun()); applied.togglePause();
    assert.equal(useStory.getState().run!.spent, spent);
    assert.equal(useStory.getState().civic.resolved, 1); assert.equal(useStory.getState().economy.methodCosts, conversion);
  });
  it("does not let operating actions or private meetings manufacture a public response", () => {
    begin(); answerPhones();
    useStory.getState().advanceTime(15);
    const s = useStory.getState();
    s.keepSilent(); s.setEconomy({ tax: 0, trade: "exports" }); s.construct("materials");
    s.civicAction({ type: "caucus", faction: "workers" });
    s.civicAction({ type: "petition", id: s.civic.petition!.id, choice: "decline" });
    assert.equal(useStory.getState().submitted, "silence");
    s.advanceTime(useStory.getState().secondsLeft);
    assert.equal(useStory.getState().cabinet.silences, 1);
  });
  it("accepts an explicit public response without purchasing a policy and preserves later phone silence", () => {
    begin(); answerPhones();
    const s = useStory.getState(); const spent = s.run!.spent;
    s.acknowledge();
    assert.equal(useStory.getState().submitted, "orders"); assert.equal(useStory.getState().run!.spent, spent);
    s.advanceTime(s.secondsLeft);
    assert.equal(useStory.getState().cabinet.silences, 0);
    const current = useStory.getState();
    const call = current.run!.calls.find(c => !current.run!.callsDone.includes(c.id))!;
    assert.ok(call);
    useStory.setState({ phone: { script: call, status: "live", picked: null, delay: 0 } });
    current.decline(); current.acknowledge(); current.advanceTime(useStory.getState().secondsLeft);
    assert.equal(useStory.getState().cabinet.silences, 1);
  });
  it("migrates a pre-cabinet save without erasing inventories, construction, public decisions or cash", () => {
    begin(); const s = useStory.getState(); s.construct("industry"); s.advanceTime(20); s.togglePause();
    s.setDraft({ spend: 321 }); s.commitDay(); s.persistRun();
    const saved = JSON.parse(memory.get(key)!);
    const originalRun = structuredClone(saved.run); const project = structuredClone(saved.economy.projects);
    delete saved.civic; delete saved.pendingCivic;
    delete saved.economy.orders.methods; delete saved.economy.orders.trade;
    delete saved.economicDraft.methods; delete saved.economicDraft.trade;
    for (const field of ["methodCosts", "methodCooldowns", "materialOutput", "materialUse", "freight", "lastTrade", "tradeCash", "imported", "exported"]) delete saved.economy[field];
    memory.set(key, JSON.stringify(saved));
    const restored = readActiveRun()!;
    assert.ok(restored); assert.deepEqual(restored.run, originalRun);
    assert.deepEqual(restored.economy.projects, project); assert.deepEqual(restored.civic, createCivic(originalRun));
    assert.equal(restored.economy.orders.methods.industry, "balanced"); assert.equal(restored.economicDraft.trade, "domestic");
    assert.equal(restored.pendingOrders, true);
    assert.ok(s.resumeRun()); s.togglePause();
    assert.equal(useStory.getState().run!.spent, originalRun.spent + 321);
    s.togglePause(); s.persistRun(); s.resumeRun(); s.togglePause();
    assert.equal(useStory.getState().run!.spent, originalRun.spent + 321);
  });
  it("completes all thirty minutes with active operations and petitions, retaining the historic win contract", () => {
    useStory.getState().brief("panic07", "governor", "solo", "sprint", 1); useStory.getState().begin();
    let lastDay = 0;
    let iterations = 0;
    while (useStory.getState().screen === "playing" && iterations++ < 361) {
      answerPhones();
      let s = useStory.getState();
      if (s.run!.day !== lastDay) {
        lastDay = s.run!.day;
        s.setDraft({ rate: scenarioOf("panic07").maxRate, spend: s.run!.reserves * 0.25 }); s.commitDay();
      }
      s = useStory.getState();
      if (iterations === 1) {
        s.setEconomy({ tax: 0, methods: { materials: "labor", industry: "labor", transport: "labor" } });
        s.construct("materials"); s.construct("industry"); s.construct("transport");
      }
      if (s.civic.petition) {
        s.civicAction({ type: "petition", id: s.civic.petition.id, choice: s.civic.capital >= 4 ? "compromise" : "decline" });
      }
      s.advanceTime(5);
    }
    const end = useStory.getState();
    assert.equal(end.screen, "debrief"); assert.equal(end.elapsedSeconds, 1800);
    assert.equal(end.economy.ticks, 360); assert.equal(end.civic.ticks, 360);
    assert.equal(end.economy.completed, 3); assert.ok(end.civic.resolved > 10);
    assert.equal(end.cabinet.silences, 0); assert.equal(end.civic.silences, 0);
    assert.ok(end.run!.reserves >= 0);
    assert.equal(end.run!.won, true, JSON.stringify({ pressure: end.run!.pressure, reserves: end.run!.reserves, equity: end.run!.equity, income: end.economy.income, bankHealth: end.economy.bankHealth }));
    assert.equal(readActiveRun(), null);
  });
});
