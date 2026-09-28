import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRun, applyImmediateOrders, stepDay } from "./engine.ts";
import { createCabinet } from "./realtime.ts";
import { advanceEconomy, applyEconomyOrders, buildProject, cancelProject, createEconomy, economicEnvironment, methodCost, normalizeEconomy, normalizeEconomyOrders } from "./economy.ts";
import { scenarioOf } from "./scenarios.ts";
import { useStory, readActiveRun } from "./store.ts";
import type { EconomyOrders } from "./economy.ts";
import { PETITIONS } from "./civic.ts";
import { usableReserves } from "./scenarios.ts";

describe("continuous economy", () => {
  it("operates before a historical deadline, with conserved input and goods flows", () => {
    const r = createRun("baht", "governor", "solo"); const e = createEconomy();
    const opening = r.reserves;
    advanceEconomy(r, e, createCabinet(), 5);
    assert.equal(r.day, 1); assert.equal(e.ticks, 1);
    const produced = e.output / 100 * 6;
    assert.ok(Math.abs(e.materials - (12 + 8 * e.utilization.materials - produced * 1.2)) < 1e-8);
    assert.ok(Math.abs(e.goods - (6 + produced - e.sales)) < 1e-8);
    assert.ok(e.sales <= e.demand); assert.equal(r.reserves, opening + e.revenue);
  });
  it("reallocates a finite pool and causes crowding out", () => {
    const r = createRun("baht", "governor", "solo"); const a = createEconomy(); const b = createEconomy();
    b.orders.priorities.industry = 4;
    advanceEconomy(structuredClone(r), a, createCabinet(), 5); advanceEconomy(r, b, createCabinet(), 5);
    assert.equal(Object.values(b.credit).reduce((x, y) => x + y, 0), 1);
    assert.ok(b.credit.materials < a.credit.materials); assert.ok(b.output > a.output);
    assert.ok(b.utilization.materials < a.utilization.materials);
  });
  it("forecasts a deterministic 90-second operating cycle separately from historical time", () => {
    assert.equal(economicEnvironment({ ticks: 17, remainder: 4.5 }).current.id, "steady");
    assert.equal(economicEnvironment({ ticks: 17, remainder: 4.5 }).secondsLeft, 0.5);
    assert.equal(economicEnvironment({ ticks: 18, remainder: 0 }).current.id, "demand");
    assert.equal(economicEnvironment({ ticks: 18, remainder: 0 }).next.id, "supply");
    assert.equal(economicEnvironment({ ticks: 90, remainder: 0 }).current.id, "steady");
    const r = createRun("baht", "governor", "solo"); const e = createEconomy(); e.ticks = 17;
    advanceEconomy(r, e, createCabinet(), 5);
    assert.ok(Math.abs(e.materialOutput - 8 * e.utilization.materials) < 1e-8);
    const expected = 6.2 * (1 + Math.sin(18 / 24 + r.seed % 11) * 0.1);
    assert.ok(Math.abs(e.demand - expected) < 1e-8); assert.equal(r.day, 1);
  });
  it("changes physical bottlenecks and makes targeted credit useful during supply and freight disruptions", () => {
    const r = createRun("baht", "governor", "solo"); const idle = createEconomy(); idle.ticks = 36; idle.materials = 0;
    const adapted = structuredClone(idle); adapted.orders.priorities.materials = 4;
    advanceEconomy(structuredClone(r), idle, createCabinet(), 5); advanceEconomy(structuredClone(r), adapted, createCabinet(), 5);
    assert.ok(Math.abs(idle.materialOutput - 8 * idle.utilization.materials * 0.8) < 1e-8);
    assert.ok(adapted.materialOutput > idle.materialOutput); assert.ok(adapted.materials > idle.materials);
    const port = createEconomy(); port.ticks = 54; port.goods = 30;
    const redirected = structuredClone(port); redirected.orders.priorities.transport = 4;
    advanceEconomy(structuredClone(r), port, createCabinet(), 5); advanceEconomy(r, redirected, createCabinet(), 5);
    assert.ok(redirected.sales > port.sales); assert.ok(redirected.price < port.price);
    assert.ok(redirected.credit.industry < port.credit.industry);
  });
  it("preserves trade cash and physical conservation during a supply disruption", () => {
    const r = createRun("baht", "governor", "solo"); const e = createEconomy(); e.ticks = 36; e.materials = 0; e.orders.trade = "imports";
    const opening = r.reserves;
    advanceEconomy(r, e, createCabinet(), 5);
    assert.ok(e.lastTrade.materials > 0);
    assert.ok(Math.abs(e.materials - (e.materialOutput + e.lastTrade.materials - e.materialUse)) < 1e-8);
    assert.ok(Math.abs(r.reserves - (opening + e.revenue + e.tradeCash)) < 1e-8);
  });
  it("tax decisions trade public cash for household purchasing power", () => {
    const r = createRun("baht", "governor", "solo"); const low = createEconomy(); const high = createEconomy();
    low.orders.tax = 0; high.orders.tax = 2;
    advanceEconomy(structuredClone(r), low, createCabinet(), 120);
    advanceEconomy(r, high, createCabinet(), 120);
    assert.ok(low.income > high.income); assert.ok(high.revenue > low.revenue);
  });
  it("preserves exact simulation results across different elapsed-time chunks", () => {
    const a = createRun("baht", "governor", "solo"); const b = structuredClone(a);
    const ea = createEconomy(); const eb = createEconomy(); const ca = createCabinet(); const cb = createCabinet();
    advanceEconomy(a, ea, ca, 150);
    for (let i = 0; i < 750; i++) advanceEconomy(b, eb, cb, 0.2);
    assert.deepEqual(a, b); assert.deepEqual(ea, eb); assert.deepEqual(ca, cb);
  });
  it("funds construction once, queues one crew, refunds only unfinished work", () => {
    const r = createRun("baht", "governor", "solo"); const e = createEconomy(); const initial = r.reserves;
    assert.ok(buildProject(r, e, "industry")); assert.ok(buildProject(r, e, "transport"));
    const firstCost = e.projects[0]!.cost; const secondCost = e.projects[1]!.cost;
    assert.equal(r.reserves, initial - firstCost - secondCost);
    advanceEconomy(r, e, createCabinet(), 45);
    assert.equal(e.capacity.industry, 1.25); assert.equal(e.projects.length, 1); assert.equal(e.projects[0]!.left, 45);
    advanceEconomy(r, e, createCabinet(), 15);
    const refund = cancelProject(r, e, e.projects[0]!.id);
    assert.equal(refund, secondCost * 30 / 45 * 0.8);
    assert.equal(cancelProject(r, e, 999), 0);
    assert.ok(Math.abs(r.reserves - (initial - firstCost - secondCost + refund + e.revenue)) < 1e-8);
  });
  it("rejects unfunded construction without debt or a project", () => {
    const r = createRun("baht", "governor", "solo"); const e = createEconomy(); r.reserves = 0;
    assert.equal(buildProject(r, e, "industry"), false); assert.equal(e.projects.length, 0); assert.equal(r.spent, 0);
  });
  it("pays for a production conversion once and blocks unaffordable or rapid switches", () => {
    const r = createRun("baht", "governor", "solo"); const e = createEconomy(); const opening = r.reserves;
    const cost = methodCost(r, e, "industry");
    applyEconomyOrders(r, e, { ...e.orders, methods: { ...e.orders.methods, industry: "intensive" } });
    assert.equal(e.orders.methods.industry, "intensive"); assert.equal(e.methodCooldowns.industry, 30);
    assert.equal(r.reserves, opening - cost); assert.equal(e.methodCosts, cost); assert.equal(r.spent, cost);
    applyEconomyOrders(r, e, { ...e.orders, methods: { ...e.orders.methods, industry: "labor" } });
    assert.equal(e.orders.methods.industry, "intensive"); assert.equal(r.reserves, opening - cost);
    advanceEconomy(r, e, createCabinet(), 30);
    applyEconomyOrders(r, e, { ...e.orders, methods: { ...e.orders.methods, industry: "labor" } });
    assert.equal(e.orders.methods.industry, "labor"); assert.equal(e.methodCosts, cost * 2);
    r.reserves = 0;
    applyEconomyOrders(r, e, { ...e.orders, methods: { ...e.orders.methods, materials: "intensive" } });
    assert.equal(e.orders.methods.materials, "balanced"); assert.equal(r.reserves, 0);
  });
  it("never mutates caller selections when rejecting a blocked conversion", () => {
    const r = createRun("baht", "governor", "solo"); const e = createEconomy();
    e.methodCooldowns.industry = 20;
    const request: EconomyOrders = { ...e.orders, methods: { ...e.orders.methods, industry: "intensive" } };
    const before = structuredClone(request);
    applyEconomyOrders(r, e, request);
    assert.deepEqual(request, before); assert.equal(e.orders.methods.industry, "balanced");
    const migrated = normalizeEconomyOrders(request); migrated.methods.industry = "labor"; migrated.priorities.industry = 1;
    assert.deepEqual(request, before);
  });
  it("rejects malformed method orders atomically without spending or crashing", () => {
    const r = createRun("baht", "governor", "solo"); const e = createEconomy();
    const originalRun = structuredClone(r); const originalEconomy = structuredClone(e);
    for (const bad of [null, {}, { ...e.orders, methods: null }, { ...e.orders, methods: { ...e.orders.methods, industry: "magic" } }, { ...e.orders, priorities: null }, { ...e.orders, trade: "infinitecash" }]) {
      assert.doesNotThrow(() => applyEconomyOrders(r, e, bad as unknown as EconomyOrders));
      assert.deepEqual(r, originalRun); assert.deepEqual(e, originalEconomy);
    }
  });
  it("mechanization increases output and material demand while reducing jobs; workshops conserve inputs", () => {
    const r = createRun("baht", "governor", "solo");
    const baseline = createEconomy(); const machine = createEconomy(); const workshop = createEconomy();
    machine.orders.methods.industry = "intensive"; workshop.orders.methods.industry = "labor";
    advanceEconomy(structuredClone(r), baseline, createCabinet(), 5);
    advanceEconomy(structuredClone(r), machine, createCabinet(), 5);
    advanceEconomy(r, workshop, createCabinet(), 5);
    assert.ok(machine.output > baseline.output); assert.ok(machine.materialUse > baseline.materialUse);
    assert.ok(machine.employment < baseline.employment);
    assert.ok(workshop.output < baseline.output); assert.ok(workshop.materialUse < baseline.materialUse);
    assert.ok(workshop.employment > baseline.employment);
  });
  it("imports settle affordable physical inputs against reserves and compete with home freight", () => {
    const r = createRun("baht", "governor", "solo"); const e = createEconomy(); e.materials = 0;
    e.orders.trade = "imports"; const opening = r.reserves;
    advanceEconomy(r, e, createCabinet(), 5);
    assert.ok(e.lastTrade.materials > 0 && e.lastTrade.materials <= 2.5); assert.ok(e.lastTrade.cash < 0);
    assert.ok(Math.abs(e.materials - (e.materialOutput + e.lastTrade.materials - e.materialUse)) < 1e-8);
    assert.ok(e.sales <= e.freight * 0.75); assert.equal(r.spent, -e.tradeCash);
    assert.ok(Math.abs(r.reserves - (opening + e.revenue + e.tradeCash)) < 1e-8);
    const dry = createEconomy(); dry.materials = 0; dry.orders.trade = "imports"; r.reserves = 0;
    advanceEconomy(r, dry, createCabinet(), 5);
    assert.equal(dry.lastTrade.materials, 0); assert.equal(dry.lastTrade.cash, 0); assert.ok(r.reserves >= 0);
  });
  it("exports cannot sell nonexistent goods and trade choices preserve the stock and cash ledger", () => {
    const r = createRun("baht", "governor", "solo"); const e = createEconomy(); const opening = r.reserves;
    e.goods = 0; e.orders.trade = "exports";
    advanceEconomy(r, e, createCabinet(), 5);
    assert.ok(e.lastTrade.goods > 0 && e.lastTrade.goods <= e.freight * 0.25);
    assert.ok(Math.abs(e.goods - (e.output / 100 * 6 - e.lastTrade.goods - e.sales)) < 1e-8);
    assert.ok(Math.abs(r.reserves - (opening + e.revenue + e.tradeCash)) < 1e-8);
    assert.equal(e.exported, e.lastTrade.goods); assert.equal(e.lastTrade.materials, 0);
  });
  it("keeps method and trade results identical across elapsed-time chunks", () => {
    const a = createRun("baht", "governor", "solo"); const b = structuredClone(a);
    const ea = createEconomy(); ea.orders.trade = "exports";
    applyEconomyOrders(a, ea, { ...ea.orders, methods: { ...ea.orders.methods, transport: "intensive" } });
    applyEconomyOrders(b, createEconomy(), { ...ea.orders });
    const eb = structuredClone(ea); const ca = createCabinet(); const cb = createCabinet();
    advanceEconomy(a, ea, ca, 65);
    for (let i = 0; i < 325; i++) advanceEconomy(b, eb, cb, 0.2);
    assert.deepEqual(a, b); assert.deepEqual(ea, eb); assert.deepEqual(ca, cb);
  });
  it("migrates existing stocks, construction and priorities without granting cash or hiding corrupt fields", () => {
    const original = createEconomy(); original.materials = 2; original.capacity.industry = 1.25;
    original.orders.priorities.industry = 4;
    const legacy = JSON.parse(JSON.stringify(original));
    delete legacy.orders.methods; delete legacy.orders.trade; delete legacy.methodCosts; delete legacy.methodCooldowns;
    delete legacy.lastTrade; delete legacy.tradeCash; delete legacy.imported; delete legacy.exported;
    const migrated = normalizeEconomy(legacy);
    assert.equal(migrated.materials, 2); assert.equal(migrated.capacity.industry, 1.25);
    assert.equal(migrated.orders.priorities.industry, 4); assert.equal(migrated.orders.methods.industry, "balanced");
    assert.equal(migrated.orders.trade, "domestic"); assert.equal(migrated.tradeCash, 0);
    assert.equal(normalizeEconomyOrders(legacy.orders).methods.transport, "balanced");
    legacy.remainder = 1e100; assert.equal(normalizeEconomy(legacy).remainder, 1e100);
  });
  it("does not charge a live halt again when its historical wave settles", () => {
    const r = createRun("crash29", "governor", "solo");
    assert.ok(scenarioOf("crash29").allowHalt);
    applyImmediateOrders(r, { halt: true });
    assert.equal(r.halts, 1); assert.equal(r.marketHalted, true);
    applyImmediateOrders(r, { halt: true }); assert.equal(r.halts, 1);
    stepDay(r, {}, 1); assert.equal(r.halts, 1); assert.equal(r.marketHalted, false);
  });
  it("does not turn private operating clicks or construction into a public response", () => {
    const st = useStory.getState(); st.brief("baht", "governor", "solo", "standard", 1); st.begin(); st.keepSilent();
    st.setEconomy({ tax: useStory.getState().economy.orders.tax });
    assert.equal(useStory.getState().submitted, "silence");
    st.setEconomy({ trade: "exports" }); st.construct("materials");
    assert.equal(useStory.getState().submitted, "silence");
    st.advanceTime(useStory.getState().secondsLeft);
    assert.equal(useStory.getState().cabinet.silences, 1); st.exit();
  });
  it("interleaves economy, civic settlements and historical deadlines independently of frame chunks", () => {
    const simulate = (chunks: number[]) => {
      const st = useStory.getState(); st.brief("baht", "governor", "solo", "standard", 31); st.begin();
      st.setEconomy({ trade: "imports", methods: { ...useStory.getState().economicDraft.methods, industry: "intensive" } });
      st.construct("materials"); st.civicAction({ type: "reform", id: "sharedWarehouses" });
      for (const seconds of chunks) st.advanceTime(seconds);
      const final = useStory.getState();
      return structuredClone({ run: { ...final.run!, startedAt: 0 }, economy: final.economy,
        cabinet: final.cabinet, civic: final.civic, rng: final.rngState, left: final.secondsLeft, elapsed: final.elapsedSeconds });
    };
    const lump = simulate([245]); const frames = simulate(Array.from({ length: 1225 }, () => 0.2));
    assert.equal(lump.economy.ticks, 49); assert.equal(lump.civic.ticks, 49); assert.equal(lump.run.day, 3);
    assert.deepEqual(lump.run, frames.run); assert.deepEqual(lump.economy, frames.economy);
    assert.deepEqual(lump.civic, frames.civic); assert.deepEqual(lump.cabinet, frames.cabinet); assert.equal(lump.rng, frames.rng);
    assert.ok(Math.abs(lump.left - frames.left) < 1e-8); assert.ok(Math.abs(lump.elapsed - frames.elapsed) < 1e-8);
    useStory.getState().exit();
  });
  it("restores paused civic intentions without effects and funds each on resume only once", () => {
    const memory = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => memory.set(k, v), removeItem: (k: string) => memory.delete(k) } });
    const st = useStory.getState(); st.brief("baht", "governor", "solo", "standard", 31); st.begin(); st.advanceTime(15); st.togglePause();
    const before = structuredClone({ run: useStory.getState().run!, economy: useStory.getState().economy, civic: useStory.getState().civic });
    const petition = before.civic.petition!;
    st.civicAction({ type: "reform", id: "sharedWarehouses" }); st.civicAction({ type: "caucus", faction: "workers" });
    st.civicAction({ type: "petition", id: petition.id, choice: "support" }); st.civicAction({ type: "petition", id: petition.id, choice: "support" });
    st.advanceTime(90); st.persistRun(); assert.equal(st.resumeRun(), true);
    assert.deepEqual(useStory.getState().run, JSON.parse(JSON.stringify(before.run))); assert.deepEqual(useStory.getState().economy, before.economy); assert.deepEqual(useStory.getState().civic, before.civic);
    assert.equal(useStory.getState().pendingCivic.length, 3);
    st.togglePause();
    const pot = usableReserves(scenarioOf("baht")); const aid = PETITIONS.find(p => p.id === petition.template)!;
    assert.ok(Math.abs(useStory.getState().run!.spent - before.run.spent - pot * (0.02 + aid.cost)) < 1e-8);
    assert.equal(useStory.getState().civic.resolved, 1); assert.equal(useStory.getState().civic.reform?.id, "sharedWarehouses");
    assert.equal(useStory.getState().pendingCivic.length, 0);
    const spent = useStory.getState().run!.spent; st.togglePause(); st.persistRun(); st.resumeRun(); st.togglePause();
    assert.equal(useStory.getState().run!.spent, spent); assert.equal(useStory.getState().civic.resolved, 1); st.exit();
  });
  it("rejects malformed saved methods and incomplete cooldown maps before restoring", () => {
    const memory = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => memory.set(k, v), removeItem: (k: string) => memory.delete(k) } });
    const st = useStory.getState(); st.brief("baht", "governor", "solo", "standard", 1); st.begin(); st.togglePause();
    st.persistRun(); const valid = memory.get("leo-street-active-story-v1")!;
    const mutations = [
      (saved: ReturnType<typeof JSON.parse>) => { saved.economy.orders.methods.industry = "magic"; },
      (saved: ReturnType<typeof JSON.parse>) => { saved.economy.orders.methods = {}; },
      (saved: ReturnType<typeof JSON.parse>) => { saved.economy.orders.trade = "infinitecash"; },
      (saved: ReturnType<typeof JSON.parse>) => { saved.economicDraft.methods = null; },
      (saved: ReturnType<typeof JSON.parse>) => { saved.economy.methodCooldowns = {}; },
      (saved: ReturnType<typeof JSON.parse>) => { saved.economy.methodCooldowns.industry = -1; },
    ];
    for (const mutate of mutations) {
      const saved = JSON.parse(valid); mutate(saved); memory.set("leo-street-active-story-v1", JSON.stringify(saved));
      assert.equal(Boolean(readActiveRun()), false, "Malformed method/trade/cooldown save must not restore");
    }
    st.exit();
  });
  it("queues operating decisions during pause without observations or effects, and restores them", () => {
    const memory = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => memory.set(k, v), removeItem: (k: string) => memory.delete(k) } });
    const st = useStory.getState(); st.brief("baht", "governor", "solo", "standard", 1); st.begin(); st.togglePause();
    const original = structuredClone(useStory.getState().economy); const reserves = useStory.getState().run!.reserves;
    st.setEconomy({ tax: 0, trade: "imports", methods: { ...original.orders.methods, industry: "intensive" } }); st.construct("industry"); st.setDraft({ spend: 100 }); st.commitDay(); st.advanceTime(60);
    assert.deepEqual(useStory.getState().economy, original); assert.equal(useStory.getState().run!.reserves, reserves);
    st.persistRun(); assert.ok(readActiveRun()); st.resumeRun(); st.togglePause();
    assert.equal(useStory.getState().economy.orders.tax, 0); assert.equal(useStory.getState().economy.projects.length, 1);
    assert.equal(useStory.getState().economy.orders.methods.industry, "intensive"); assert.equal(useStory.getState().economy.orders.trade, "imports");
    assert.ok(useStory.getState().economy.methodCosts > 0);
    const spent = useStory.getState().run!.spent; assert.ok(spent > 100);
    st.persistRun(); st.resumeRun(); assert.equal(useStory.getState().run!.spent, spent);
    const saved = JSON.parse(memory.get("leo-street-active-story-v1")!);
    delete saved.economy; delete saved.economicDraft; delete saved.pendingBuilds; delete saved.pendingOrders;
    memory.set("leo-street-active-story-v1", JSON.stringify(saved)); assert.ok(readActiveRun()?.economy);
    saved.economy = { ...original, remainder: 1e100 }; memory.set("leo-street-active-story-v1", JSON.stringify(saved));
    assert.equal(readActiveRun(), null); st.exit();
  });
});
