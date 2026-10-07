import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { COUNTRY_ORDER, PROFILES } from "./countries.ts";
import { EVENTS } from "./events/index.ts";
import { SWAN_CHANCE } from "./events/swans.ts";
import { FOCUS, FOCUS_BY_ID } from "./focus.ts";
import { act, createGame, gradeOf, stepWeek } from "./sim.ts";
import type { CountryId, SandboxGame } from "./types.ts";

type Policy = "passive" | "taylor";

/** A reasonable answer to each event, for the "competent governor" bot. */
const SENSIBLE: Record<string, (g: SandboxGame) => string> = {
  bankRun: () => "lolr",
  currencyAttack: (g) => (g.countries[g.player].reserves > 4 ? "defend" : "float"),
  govDemand: () => "negotiate",
  election: () => "silent",
  foreignCrisis: () => "ease",
  oilShock: () => "look",
  foreignHike: () => "absorb",
  techBoom: () => "lean",
  fiscalSplurge: () => "warn",
  housingBoom: () => "hike",
  deflation: () => "cut",
};

function play(id: CountryId, seed: number, policy: Policy): SandboxGame {
  let g = createGame(id, seed);
  const p = PROFILES[id];
  while (!g.over) {
    if (g.event) {
      const allowed = g.event.choices.filter((ch) => !ch.requires || g.focusDone.includes(ch.requires));
      const wanted = policy === "passive" ? allowed.at(-1)!.id : (SENSIBLE[g.event.key]?.(g) ?? allowed[0]!.id);
      const r = act(g, { type: "choose", choice: wanted });
      g = r.ok ? r.game : act(g, { type: "choose", choice: allowed[0]!.id }).game;
      continue;
    }
    if (policy === "taylor" && g.week % 6 === 0) {
      const m = g.countries[id];
      const rule = p.rStar + m.pi + 0.5 * (m.pi - p.piStar) + 0.5 * m.gap;
      const d = Math.max(-1, Math.min(1, Math.round((rule - m.rate) * 4) / 4));
      if (d !== 0) g = act(g, { type: "rate", delta: d }).game;
    }
    g = stepWeek(g);
  }
  return g;
}

const SEEDS = [1, 2, 3];
const avgLoss = (id: CountryId, policy: Policy) =>
  SEEDS.reduce((a, s) => a + gradeOf(play(id, s, policy)).avgLoss, 0) / SEEDS.length;

describe("sandbox economy", () => {
  it("replays exactly from the same seed", () => {
    const a = play("lion", 42, "taylor");
    const b = play("lion", 42, "taylor");
    assert.deepEqual(a.history, b.history);
    assert.equal(a.loss, b.loss);
  });

  it("rewards a competent governor over an idle one in every country", () => {
    for (const id of COUNTRY_ORDER) {
      assert.ok(avgLoss(id, "taylor") < avgLoss(id, "passive"), id);
    }
  });

  it("lets a competent governor finish the term everywhere", () => {
    for (const id of COUNTRY_ORDER) {
      for (const s of SEEDS) assert.equal(play(id, s, "taylor").over, "term", `${id} seed ${s}`);
    }
  });

  it("orders countries by difficulty: the easy start is easier than the hardest", () => {
    assert.ok(avgLoss("velden", "taylor") < avgLoss("ramona", "taylor"));
    assert.equal(gradeOf(play("velden", 1, "taylor")).letter, "S");
  });

  it("keeps the AI central banks out of trouble", () => {
    const g = play("velden", 7, "taylor");
    for (const id of COUNTRY_ORDER) {
      if (id === "velden") continue;
      const m = g.countries[id];
      assert.ok(m.pi > -3 && m.pi < 15, `${id} inflation ${m.pi}`);
      assert.ok(m.rate >= 0 && m.rate <= 30, `${id} rate ${m.rate}`);
    }
  });
});

describe("governor's actions", () => {
  it("moves the rate in quarter points within bounds", () => {
    const g = createGame("lion", 1);
    const up = act(g, { type: "rate", delta: 0.25 });
    assert.ok(up.ok);
    assert.equal(up.game.countries.lion.rate, g.countries.lion.rate + 0.25);
    assert.equal(g.countries.lion.rate, 2.5, "the input game is not mutated");
    const floor = act({ ...g, countries: { ...g.countries, lion: { ...g.countries.lion, rate: 0 } } }, { type: "rate", delta: -0.25 });
    assert.equal(floor.ok, false);
  });

  it("locks tools behind their focus", () => {
    const g = createGame("lion", 1);
    assert.equal(act(g, { type: "qe", pace: 4 }).ok, false);
    assert.equal(act(g, { type: "guidance", kind: "dovish" }).ok, false);
    assert.equal(act(g, { type: "macroCap", on: true }).ok, false);
  });

  it("buys a focus with political capital and finishes it after its weeks", () => {
    let g = createGame("lion", 1);
    g.points = 200;
    const r = act(g, { type: "focus", id: "independence" });
    assert.ok(r.ok);
    assert.equal(r.game.points, 200 - FOCUS_BY_ID.independence.cost);
    assert.equal(act(r.game, { type: "focus", id: "depositInsurance" }).ok, false, "one focus at a time");
    g = r.game;
    for (let i = 0; i < FOCUS_BY_ID.independence.weeks; i++) {
      if (g.event) g = act(g, { type: "choose", choice: g.event.choices.find((ch) => !ch.requires)!.id }).game;
      g = stepWeek(g);
    }
    assert.ok(g.focusDone.includes("independence"));
    assert.equal(act(g, { type: "focus", id: "targeting" }).ok, g.points >= FOCUS_BY_ID.targeting.cost);
  });

  it("refuses a focus whose prerequisites are missing", () => {
    const g = createGame("lion", 1);
    g.points = 500;
    assert.equal(act(g, { type: "focus", id: "guidance" }).ok, false);
  });

  it("punishes a broken dovish pledge", () => {
    const g = createGame("lion", 1);
    g.points = 100;
    g.focusDone.push("independence", "targeting", "guidance");
    const pledged = act(g, { type: "guidance", kind: "dovish" }).game;
    const trust = pledged.countries.lion.trust;
    const broken = act(pledged, { type: "rate", delta: 0.25 }).game;
    assert.equal(broken.guidance, null);
    assert.ok(broken.countries.lion.trust <= trust - 12);
  });

  it("charges for capital controls and spends reserves to defend the currency", () => {
    const g = createGame("serein", 1);
    const on = act(g, { type: "capitalControls", on: true });
    assert.ok(on.ok);
    assert.equal(on.game.points, g.points - 30);
    const buy = act(g, { type: "intervene", side: "buy" }).game;
    assert.equal(buy.countries.serein.reserves, g.countries.serein.reserves - 1);
    assert.ok(buy.countries.serein.fx > g.countries.serein.fx);
  });
});

describe("events", () => {
  it("stop the clock until answered", () => {
    let g = createGame("dawei", 3);
    while (!g.event && !g.over) g = stepWeek(g);
    assert.ok(g.event, "some event fires during a term");
    assert.equal(stepWeek(g), g, "the week does not advance");
    assert.equal(act(g, { type: "rate", delta: 0.25 }).ok, false, "no other actions meanwhile");
    const answered = act(g, { type: "choose", choice: g.event!.choices.find((ch) => !ch.requires)!.id });
    assert.ok(answered.ok);
    assert.equal(answered.game.event, null);
  });

  it("only offer choices that exist and focus ids that exist", () => {
    for (const [key, def] of Object.entries(EVENTS)) {
      assert.ok(def.choices.length >= 2, key);
      for (const ch of def.choices) if (ch.requires) assert.ok(FOCUS_BY_ID[ch.requires], `${key}.${ch.id}`);
    }
  });

  it("refuse a focus-locked option until the focus is done", () => {
    let g = createGame("serein", 5);
    g.countries.serein.fxYoY = -30;
    g.week = 10;
    g = stepWeek(g);
    while (g.event?.key !== "currencyAttack" && !g.over) {
      g = g.event ? act(g, { type: "choose", choice: g.event.choices.find((ch) => !ch.requires)!.id }).game : stepWeek(g);
      g.countries.serein.fxYoY = -30;
    }
    assert.equal(act(g, { type: "choose", choice: "swap" }).ok, false);
  });
});

describe("focus tree", () => {
  it("has unique ids, valid prerequisites and no cycles", () => {
    const ids = new Set(FOCUS.map((f) => f.id));
    assert.equal(ids.size, FOCUS.length);
    const seen = new Set<string>();
    for (const f of FOCUS) {
      for (const r of f.requires) assert.ok(seen.has(r), `${f.id} requires ${r}, listed later or missing`);
      seen.add(f.id);
    }
  });
});

describe("event catalogue", () => {
  const REAL_NOUNS = ["美联储", "沃尔克", "德拉吉", "雷曼", "英镑", "美元", "日元", "欧元", "泰铢", "挪威", "巴西", "阿根廷", "德国", "日本", "英国", "美国", "索罗斯", "伦敦", "纽约", "尼克松", "北海", "LIBOR", "Fed", "Volcker", "Draghi", "Lehman", "dollar", "sterling", "Norway", "Germany", "Japan", "Britain", "London"];

  it("keeps real names out of every playable line", () => {
    for (const id of COUNTRY_ORDER) {
      const g = createGame(id, 1);
      for (const [key, def] of Object.entries(EVENTS)) {
        const body = def.body(g);
        const text = [def.title.zh, def.title.en, body.zh, body.en, ...def.choices.flatMap((ch) => [ch.label.zh, ch.label.en, ch.hint.zh, ch.hint.en])].join(" ");
        for (const noun of REAL_NOUNS) assert.ok(!text.includes(noun), `${key} mentions ${noun}`);
      }
    }
  });

  it("gives every history event a real-history note", () => {
    for (const [key, def] of Object.entries(EVENTS)) {
      if (def.kind === "history") assert.ok(def.history, key);
      if (def.history) assert.ok(def.history.zh.startsWith("史实原型："), key);
    }
  });

  it("keeps black swans ultra-rare: under about one per term", () => {
    const swans = Object.values(EVENTS).filter((d) => d.kind === "swan");
    assert.ok(swans.length >= 4);
    for (const d of swans) assert.ok(d.chance(createGame("lion", 1)) <= 0.0005);
    assert.ok(swans.length * SWAN_CHANCE * 520 < 1.2);
  });

  it("only fires national events in their own country", () => {
    const national = Object.entries(EVENTS).filter(([, d]) => d.kind === "national");
    assert.ok(national.length >= COUNTRY_ORDER.length);
    for (const id of COUNTRY_ORDER) assert.ok(national.some(([, d]) => d.only?.includes(id)), `${id} has a national event`);
    for (let s = 1; s <= 4; s++) {
      const g = play("velden", s, "taylor");
      for (const [key, d] of national) if (!d.only!.includes("velden")) assert.equal(g.cooldown[key], undefined, key);
    }
  });

  it("keeps a term busy but not swamped with events", () => {
    for (const id of COUNTRY_ORDER) {
      const fired = Object.keys(play(id, 11, "taylor").cooldown).filter((k) => k in EVENTS).length;
      assert.ok(fired >= 3 && fired <= 30, `${id}: ${fired} distinct events`);
    }
  });
});

describe("foreign relations", () => {
  it("coordinates a joint cut once the cooperation reform is done", () => {
    const g = createGame("lion", 1);
    assert.equal(act(g, { type: "coordinate", dir: "cut" }).ok, false);
    g.focusDone.push("reserveBuild", "swapLines", "intlCoop");
    g.points = 100;
    const r = act(g, { type: "coordinate", dir: "cut" });
    assert.ok(r.ok);
    assert.equal(r.game.countries.lion.rate, g.countries.lion.rate - 0.5);
    assert.equal(r.game.points, 60);
    assert.equal(act(r.game, { type: "coordinate", dir: "cut" }).ok, false, "not again so soon");
  });

  it("draws on swap lines once a year", () => {
    const g = createGame("serein", 1);
    g.focusDone.push("reserveBuild", "swapLines");
    g.points = 100;
    const r = act(g, { type: "requestSwap" });
    assert.ok(r.ok);
    assert.equal(r.game.countries.serein.reserves, g.countries.serein.reserves + 5);
    assert.equal(act(r.game, { type: "requestSwap" }).ok, false);
  });
});

describe("historical comparison", () => {
  it("matches a hot, high-inflation term to the 1970s and a tight one to a later governor", async () => {
    const { closestGovernor } = await import("./governors.ts");
    const g = createGame("lion", 1);
    g.history = [{ w: 0, rate: 3, pi: 7, u: 6, growth: 2, fx: 100, trust: 50 }];
    assert.match(closestGovernor(g).years, /^19[67]/);
    g.history = [{ w: 0, rate: 2, pi: 2.4, u: 5.3, growth: 2, fx: 100, trust: 80 }];
    assert.ok(Number(closestGovernor(g).years.slice(0, 4)) >= 1987);
  });
});
