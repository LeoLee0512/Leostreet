/**
 * Story-mode tests.
 *
 * Beyond the usual correctness checks, these pin the *teaching*: if a scenario
 * stops being winnable from the seat it is meant to be winnable from, or the
 * double play stops punishing a one-legged defence, the lesson is gone and the
 * scenario is just a slider.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BREAK_AT,
  applyCall,
  finish as finishRun,
  calendarDayOf,
  createRun,
  daysLeft,
  pegHealth,
  rateDefence,
  rateEquityDrag,
  sessionOf,
  stepDay,
  type DayOrders,
} from "./engine.ts";
import { ROLE_LABEL, SCENARIOS, STORY_ROLES, scenarioOf, seatLabelOf, usableReserves } from "./scenarios.ts";
import { GRADES, LADDER, TITLES, gradeOf, isUnlocked, nextStage, nextTitle, titlesFor } from "./difficulty.ts";
import { escalationAt } from "./engine.ts";
import {
  ACHIEVEMENTS,
  LENGTHS,
  estimateMinutes,
  lengthOf,
  lengthsFor,
  totalSteps,
} from "./lengths.ts";
import { CONNECT_MAX_MS, CONNECT_MIN_MS, connectDelayMs, eligibleCalls, ringingCalls } from "./calls.ts";
import { heldAchievements, recordClear, topTitle } from "./progress.ts";
import type { StoryId, StoryLength, StoryRole, StoryRun } from "./types.ts";

/**
 * Play a whole scenario with the same orders every step, at seed 1.
 *
 * Seed 1 is a telling like any other, which is why the balance assertions that
 * matter go through `robust` instead. This one is for the mechanical checks,
 * where any single history will do.
 */
function play(
  id: StoryId,
  role: StoryRole,
  orders: DayOrders | ((run: StoryRun) => DayOrders),
  length: StoryLength = "sprint",
  seed = 1,
): StoryRun {
  return playSeeded(id, role, orders, length, seed);
}

/** Play a scenario at a given seed. */
function playSeeded(
  id: StoryId,
  role: StoryRole,
  orders: DayOrders | ((run: StoryRun) => DayOrders),
  length: StoryLength,
  seed: number,
): StoryRun {
  let run = createRun(id, role, "solo", length, seed);
  let rng = seed * 7919 + 13;
  let guard = 0;
  while (!run.done && guard++ < 900) {
    const today = typeof orders === "function" ? orders(run) : orders;
    const out = stepDay(run, today, rng);
    run = out.run;
    rng = out.rngState;
  }
  return run;
}

/**
 * How a policy does across a spread of histories.
 *
 * Every assertion about balance uses this rather than one seed. A run is a
 * retelling now, not a recording, so "this line wins" has to mean "this line
 * wins against the crisis however it comes out this time" — and a test that
 * pins a single seed would be pinning one lucky afternoon.
 */
const SEEDS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233];
function robust(
  id: StoryId,
  role: StoryRole,
  orders: DayOrders | ((run: StoryRun) => DayOrders),
  length: StoryLength = "sprint",
): { wins: number; equity: number; pressure: number } {
  let wins = 0;
  let equity = 0;
  let pressure = 0;
  for (const seed of SEEDS) {
    const run = playSeeded(id, role, orders, length, seed);
    if (run.won) wins++;
    equity += run.equity;
    pressure += run.pressure;
  }
  return { wins, equity: equity / SEEDS.length, pressure: pressure / SEEDS.length };
}

/** The depression's defending seat, which is scored unlike any other. */
function dep_gov() {
  return scenarioOf("depression").objectives.governor;
}

describe("scenario content", () => {
  it("ships the whole ladder, each with all four seats briefed", () => {
    assert.equal(SCENARIOS.length, LADDER.length);
    assert.deepEqual(SCENARIOS.map((s) => s.id), LADDER);
    for (const s of SCENARIOS) {
      for (const role of STORY_ROLES) {
        const o = s.objectives[role];
        assert.ok(o, `${s.id} is missing ${role}`);
        // Every seat has to answer all three questions the player will ask.
        assert.ok(o.howZh.length > 20 && o.howEn.length > 20, `${s.id}/${role}: 你要做什么`);
        assert.ok(o.winZh.length > 8 && o.winEn.length > 8, `${s.id}/${role}: 怎么赢`);
        assert.ok(o.trapZh.length > 10 && o.trapEn.length > 10, `${s.id}/${role}: the trap`);
      }
      assert.ok(s.briefZh.length > 80, `${s.id}: 前情提要 too thin`);
      assert.ok(s.historyZh.includes("史实"), `${s.id}: history must be labelled as fact`);
      assert.ok(s.lessonZh.length > 30, `${s.id}: no lesson`);
    }
  });

  it("names every seat in both languages", () => {
    for (const role of STORY_ROLES) {
      assert.ok(ROLE_LABEL[role].zh.length > 0);
      assert.ok(ROLE_LABEL[role].en.length > 0);
    }
  });

  it("records which way each one actually went", () => {
    // Not a balance assertion — a factual one. These are what the record says,
    // and the debrief tells the player whether they repeated it or stepped off
    // it, so getting one wrong would have the game teaching a falsehood.
    const outcome = Object.fromEntries(SCENARIOS.map((s) => [s.id, s.historicalOutcome]));
    assert.deepEqual(outcome, {
      panic07: "held",
      southsea: "broke",
      railway: "broke",
      baht: "broke",
      panic73: "broke",
      crash29: "broke",
      blackmon: "held",
      pound: "broke",
      baring: "held",
      ltcm: "broke",
      euro: "held",
      hkd: "held",
      depression: "broke",
      lehman: "broke",
    });
  });

  it("gives every crisis its own vocabulary, so the HUD never lies", () => {
    for (const s of SCENARIOS) {
      const lx = s.lexicon;
      for (const [k, v] of Object.entries(lx)) {
        if (typeof v === "string") assert.ok(v.length > 0, `${s.id}: empty lexicon.${k}`);
      }
      // A 1907 clearing-house chairman is not a central bank governor, and the
      // whole point of 1907 is that there was no central bank.
      assert.ok(seatLabelOf(s, "governor").zh.length > 0);
    }
    assert.notEqual(seatLabelOf(scenarioOf("panic07"), "governor").zh, ROLE_LABEL.governor.zh);
  });

  it("only offers the four tellings on the large set-pieces", () => {
    for (const s of SCENARIOS) {
      const offered = lengthsFor(s);
      assert.equal(offered.length, s.major ? LENGTHS.length : 1);
      assert.equal(offered[0]!.id, "sprint");
    }
    // The three the player asked for by name have to be among them.
    for (const id of ["baht", "pound", "hkd"] as const) {
      assert.equal(scenarioOf(id).major, true);
    }
  });

  it("hides most of Thailand's reserves in the forward book, and nobody else's", () => {
    // This single number is the whole baht lesson.
    const baht = scenarioOf("baht");
    assert.ok(baht.committedForward > 0);
    assert.ok(usableReserves(baht) < baht.reserves * 0.3, "usable reserves must be a fraction of the headline");
    for (const id of ["pound", "hkd"] as const) {
      assert.equal(scenarioOf(id).committedForward, 0);
    }
  });

  it("only lets Hong Kong buy equities", () => {
    assert.equal(scenarioOf("hkd").allowEquityDefence, true);
    assert.equal(scenarioOf("baht").allowEquityDefence, false);
    assert.equal(scenarioOf("pound").allowEquityDefence, false);
  });
});

describe("the rate is a double-edged card", () => {
  it("defends the currency and sells the stock market at the same time", () => {
    // If these ever stop moving together, the double play stops existing.
    for (const s of SCENARIOS) {
      const low = s.startRate;
      const high = s.maxRate;
      assert.ok(rateDefence(s, high) > rateDefence(s, low), `${s.id}: hiking must defend`);
      assert.ok(rateEquityDrag(s, high) > rateEquityDrag(s, low), `${s.id}: hiking must hurt equities`);
      assert.equal(rateEquityDrag(s, low), 0, `${s.id}: the starting rate should not drag`);
    }
  });

  it("cannot be pushed past the ceiling the politics allow", () => {
    const s = scenarioOf("pound");
    const run = createRun("pound", "governor", "solo");
    const out = stepDay(run, { rate: 0.95 }, 1);
    assert.equal(out.run.rate, s.maxRate, "the governor must not be able to hike past the ceiling");
  });
});

describe("the baht: you cannot spend reserves you already promised away", () => {
  it("starts the governor with only the usable pot", () => {
    const run = createRun("baht", "governor", "solo");
    const s = scenarioOf("baht");
    assert.equal(run.reserves, usableReserves(s));
    assert.ok(run.reserves < s.reserves, "the headline figure must not be spendable");
  });

  it("breaks when the governor defends on reserves alone", () => {
    // The historical mistake, reproduced: spend hard, hike late, lose the peg.
    const run = play("baht", "governor", (r) => ({ spend: r.reserves * 0.3 }));
    assert.equal(run.pegBroken, true);
    assert.equal(run.won, false);
    assert.ok(run.reserves < usableReserves(scenarioOf("baht")) * 0.5);
  });

  it("is still winnable by a governor who hikes early", () => {
    const s = scenarioOf("baht");
    const run = play("baht", "governor", (r) => ({
      rate: s.maxRate,
      spend: r.day <= 8 ? r.reserves * 0.22 : 0,
    }));
    assert.equal(run.won, true, "a governor who uses both cards early has to have a path");
  });

  it("lets the attacker take it by simply waiting", () => {
    // Across a spread of histories rather than one: the peg goes in nearly
    // every telling, and how well the short is paid depends on which session
    // it goes in — which is exactly what the perturbation is for.
    const out = robust("baht", "fund", { shortCcy: 1.2 });
    assert.ok(out.wins >= SEEDS.length * 0.75, `the short should usually take this one (${out.wins}/${SEEDS.length})`);
    const oneLeg = SEEDS.map((seed) => playSeeded("baht", "fund", { shortCcy: 1.2 }, "sprint", seed));
    assert.ok(oneLeg.filter((r) => r.pegBroken).length >= SEEDS.length * 0.75, "the peg usually goes");
    // Taking the peg out and getting paid for it are two different things.
    // The currency leg pays once, on the session it goes; the equity book
    // bleeds every session until then, and the defence is what bleeds it.
    // This is the trader seat's whole briefing, pinned from the other chair.
    const bothLegs = SEEDS.map((seed) =>
      playSeeded("baht", "fund", { shortCcy: 1.2, shortEquity: 0.9 }, "sprint", seed),
    );
    const avg = (rs: StoryRun[]) => rs.reduce((a, r) => a + r.book, 0) / rs.length;
    assert.ok(
      avg(bothLegs) > avg(oneLeg) * 1.2,
      `hedging the other leg has to matter (${avg(oneLeg).toFixed(0)} → ${avg(bothLegs).toFixed(0)})`,
    );
  });
});

describe("sterling: the ceiling, not the money, is what runs out", () => {
  it("leaves the governor plenty of reserves and still loses on a passive defence", () => {
    const run = play("pound", "governor", { spend: 0 });
    assert.equal(run.pegBroken, true);
    assert.ok(run.reserves > 0, "sterling never ran out of money — it ran out of room");
  });

  it("can be held by a governor who goes to the ceiling in time", () => {
    const s = scenarioOf("pound");
    const run = play("pound", "governor", (r) => ({
      rate: s.maxRate,
      spend: r.reserves * 0.16,
    }));
    assert.equal(run.won, true);
  });
});

describe("hong kong: defending one leg is a donation", () => {
  it("holds the peg but wrecks the index when the governor only hikes", () => {
    const s = scenarioOf("hkd");
    const run = play("hkd", "governor", { rate: s.maxRate });
    assert.equal(run.pegBroken, false, "a currency board should hold");
    assert.ok(run.equity < 55, `the index should be wrecked by the defence, got ${run.equity.toFixed(1)}`);
  });

  it("saves the index when the Exchange Fund buys equities too", () => {
    const s = scenarioOf("hkd");
    const onlyRates = play("hkd", "governor", { rate: s.maxRate });
    const bothLegs = play("hkd", "governor", (r) => ({
      rate: s.maxRate,
      buyEquity: r.day >= 5 ? r.reserves * 0.16 : 0,
    }));
    assert.equal(bothLegs.pegBroken, false);
    assert.ok(
      bothLegs.equity > onlyRates.equity * 1.3,
      `buying the index has to visibly beat not buying it (${bothLegs.equity.toFixed(1)} vs ${onlyRates.equity.toFixed(1)})`,
    );
  });

  it("fails the governor who holds the peg and lets the market burn", () => {
    // The scenario's own briefing promises the index has to survive too, so
    // holding the rate and nothing else must be scored as a loss.
    const s = scenarioOf("hkd");
    const run = play("hkd", "governor", { rate: s.maxRate });
    assert.equal(run.pegBroken, false, "the peg should still hold");
    assert.equal(run.won, false, "but holding one leg is not the objective");
  });

  it("is winnable — but only by a governor who plays both legs", () => {
    const s = scenarioOf("hkd");
    const bothLegs = play("hkd", "governor", (r) => ({
      rate: s.maxRate,
      buyEquity: r.day >= 5 ? r.reserves * 0.2 : 0,
    }));
    assert.equal(bothLegs.won, true, "history held this one; the player must be able to as well");
    assert.equal(bothLegs.pegBroken, false);
    assert.ok(bothLegs.equity >= (s.objectives.governor.equityFloor ?? 0));
  });

  it("loses the peg if the governor protects the market by going soft on rates", () => {
    // The other half of the trap: cutting the rate to save the index gives the
    // currency away. Both legs, or neither.
    const run = play("hkd", "governor", (r) => ({
      rate: 0.15,
      buyEquity: r.day >= 3 ? r.reserves * 0.15 : 0,
    }));
    assert.equal(run.pegBroken, true);
    assert.equal(run.won, false);
  });

  it("refuses the equity defence in the scenarios where history did not have it", () => {
    const run = createRun("baht", "governor", "solo");
    const before = run.reserves;
    const out = stepDay(run, { buyEquity: 5_000 }, 7);
    assert.equal(out.run.reserves, before, "the baht governor must not be able to buy equities");
  });

  it("does not pay the short side when the peg holds", () => {
    const run = play("hkd", "fund", { shortCcy: 1.5 });
    assert.equal(run.pegBroken, false);
    assert.equal(run.won, false, "history records the short side losing this one");
  });
});

describe("the other two seats", () => {
  it("wrecks an unhedged retail book and rewards one that de-risks", () => {
    const exposed = play("pound", "retail", { shortEquity: 0 });
    const careful = play("pound", "retail", { shortEquity: 0.6 });
    assert.ok(careful.book > exposed.book, "cutting exposure into the defence has to help");
  });

  it("only pays the trader who gets BOTH legs right", () => {
    // Shorting the currency alone nets out to roughly nothing: what the
    // devaluation pays, the hikes already took off the equity book. That is
    // the trader briefing's whole point, so it is pinned here.
    const nothing = play("baht", "trader", {});
    const oneLeg = play("baht", "trader", { shortCcy: 1.1 });
    const bothLegs = play("baht", "trader", { shortCcy: 1.1, shortEquity: 0.8 });

    assert.ok(oneLeg.book > nothing.book, "the currency leg still has to be worth something");
    assert.equal(oneLeg.won, false, "one leg should not clear the target");
    assert.ok(bothLegs.book > oneLeg.book * 1.2, "hedging the equity leg has to matter");
    assert.equal(bothLegs.won, true);
  });
});

describe("run mechanics", () => {
  it("replays identically from the same seed", () => {
    const a = play("hkd", "governor", { rate: 0.12 });
    const b = play("hkd", "governor", { rate: 0.12 });
    assert.deepEqual([a.pressure, a.equity, a.book, a.day], [b.pressure, b.equity, b.book, b.day]);
  });

  it("ends on the scenario's own clock and never runs past it", () => {
    const s = scenarioOf("hkd");
    const run = play("hkd", "governor", { rate: s.maxRate, buyEquity: 0 });
    assert.equal(run.done, true);
    assert.ok(run.day <= s.days + 1);
    assert.equal(daysLeft(run), 0);
  });

  it("ignores orders once the run is over", () => {
    const run = play("baht", "fund", { shortCcy: 1.2 });
    const frozen = { ...run };
    const out = stepDay(run, { spend: 9_999, rate: 0.9 }, 3);
    assert.equal(out.run.day, frozen.day);
    assert.equal(out.run.rate, frozen.rate);
  });

  it("reports peg health between one and zero", () => {
    const run = createRun("baht", "governor", "solo");
    assert.equal(pegHealth(run), 1);
    run.pressure = BREAK_AT;
    assert.equal(pegHealth(run), 0);
    run.pressure = BREAK_AT * 5;
    assert.equal(pegHealth(run), 0, "health must not go negative");
  });

  it("keeps a log the player can read afterwards", () => {
    const run = play("baht", "governor", (r) => ({ spend: r.reserves * 0.3 }));
    assert.ok(run.log.length > 3);
    assert.ok(run.log.every((l) => l.zh.length > 0 && l.en.length > 0));
    assert.ok(run.log.some((l) => l.tone === "bad"));
  });
});

/* ------------------------------------------------------------------ */
/* The ladder                                                          */
/* ------------------------------------------------------------------ */

describe("the ladder", () => {
  it("grades every crisis on the ten-rung scale and never goes backwards", () => {
    assert.equal(GRADES.length, 10);
    let last = 0;
    for (const s of SCENARIOS) {
      assert.ok(s.grade >= 1 && s.grade <= 10, `${s.id}: grade out of range`);
      assert.ok(s.grade >= last, `${s.id}: the ladder must not get easier going up`);
      last = s.grade;
      assert.ok(gradeOf(s.grade).nameZh.length > 0);
    }
    // The finale sits on the top rung; the opener on the bottom one.
    assert.equal(SCENARIOS[0]!.grade, 1);
    assert.equal(SCENARIOS[SCENARIOS.length - 1]!.grade, 10);
  });

  it("lets two crises share a grade", () => {
    // Ties are allowed on purpose: 1987 and 1992 are the same weight of
    // problem approached from opposite directions, and forcing a strict order
    // would invent a difference that is not there.
    const counts = new Map<number, number>();
    for (const s of SCENARIOS) counts.set(s.grade, (counts.get(s.grade) ?? 0) + 1);
    assert.ok([...counts.values()].some((n) => n > 1), "at least one grade should be shared");
  });

  it("keeps each scenario's order field in step with the ladder", () => {
    SCENARIOS.forEach((s, i) => assert.equal(s.order, i + 1, `${s.id}: order`));
    assert.equal(new Set(SCENARIOS.map((s) => s.id)).size, SCENARIOS.length);
  });

  it("opens the first crisis to everybody and the rest one at a time", () => {
    assert.equal(isUnlocked(LADDER[0]!, []), true);
    assert.equal(isUnlocked(LADDER[1]!, []), false);
    assert.equal(isUnlocked(LADDER[1]!, [LADDER[0]!]), true);
    // Clearing out of order must not open a later stage: you cannot skip.
    assert.equal(isUnlocked(LADDER[5]!, [LADDER[0]!, LADDER[9]!]), false);
    assert.equal(nextStage([]), LADDER[0]);
    assert.equal(nextStage(LADDER.slice(0, 3)), LADDER[3]);
    assert.equal(nextStage([...LADDER]), null);
  });

  it("hands out a title every two clears, five in all", () => {
    assert.equal(TITLES.length, 5);
    assert.deepEqual(TITLES.map((t) => t.at), [2, 4, 6, 8, 10]);
    assert.deepEqual(TITLES.map((t) => t.nameZh), ["入门", "新手", "熟练", "交易员", "天才交易员"]);
    assert.equal(titlesFor(0).length, 0);
    assert.equal(titlesFor(1).length, 0);
    assert.equal(titlesFor(2).length, 1);
    assert.equal(titlesFor(7).length, 3);
    // The last title needs the whole ladder, which is the point of it.
    assert.equal(titlesFor(LADDER.length).length, 5);
    assert.equal(nextTitle(2)?.need, 2);
    assert.equal(nextTitle(10), null);
  });
});

/* ------------------------------------------------------------------ */
/* The four tellings                                                   */
/* ------------------------------------------------------------------ */

describe("the four tellings", () => {
  it("makes 半小时 the reference telling", () => {
    // Everything is balanced against one decision per scenario day, and the
    // default has to be that, or every pinned number above would drift.
    const implicit = createRun("baht", "governor", "solo");
    const explicit = createRun("baht", "governor", "solo", "sprint");
    assert.equal(implicit.length, "sprint");
    assert.equal(implicit.days, scenarioOf("baht").days);
    assert.deepEqual(
      [implicit.days, implicit.tempo, implicit.drift, implicit.waveScale],
      [explicit.days, explicit.tempo, explicit.drift, explicit.waveScale],
    );
    assert.equal(explicit.tempo, 1);
    // Close to 1 rather than exactly 1: the waves carry this run's own jitter,
    // so the scale that normalises them lands near unity rather than on it.
    assert.ok(Math.abs(explicit.waveScale - 1) < 0.2);
  });

  it("gets longer, deeper and slower per step as the clock is cut finer", () => {
    const s = scenarioOf("hkd");
    let steps = 0;
    let minutes = 0;
    for (const spec of LENGTHS) {
      const here = totalSteps(s, spec.id);
      assert.ok(here > steps, `${spec.id}: must offer more decisions than the telling before it`);
      const est = estimateMinutes(s, spec.id);
      assert.ok(est > minutes, `${spec.id}: must estimate longer than the telling before it`);
      steps = here;
      minutes = est;
      // Per-step weight falls as the clock is cut finer, or the long tellings
      // would carry several times the drag.
      const run = createRun("hkd", "governor", "solo", spec.id);
      assert.ok(run.tempo <= 1.0001);
    }
  });

  it("lands each telling near the clock printed on its label", () => {
    // The labels are a promise about how long this takes. A "一小时" that is
    // really twenty minutes is the kind of mismatch between words and
    // mechanics this project keeps having to stay out of.
    for (const s of SCENARIOS.filter((x) => x.major)) {
      for (const spec of LENGTHS.slice(1)) {
        const est = estimateMinutes(s, spec.id);
        assert.ok(
          est >= spec.minutes * 0.8 && est <= spec.minutes * 1.25,
          `${s.id}/${spec.id}: ${est}min against a ${spec.minutes}min label`,
        );
      }
    }
  });

  it("reaches the same verdict however long the telling is", () => {
    // The single most important invariant here. The tellings are the same
    // crisis at four resolutions — if a policy that wins in half an hour loses
    // over three, the length has quietly become a difficulty setting and the
    // achievements attached to it become a tax.
    const pot = (id: StoryId) => usableReserves(scenarioOf(id));
    const cases: [StoryId, StoryRole, (r: StoryRun) => DayOrders, boolean, string][] = [
      ["baht", "governor", () => ({ rate: scenarioOf("baht").maxRate }), true, "baht: hike early"],
      ["baht", "governor", () => ({}), false, "baht: sit still"],
      [
        "hkd",
        "governor",
        (r) => ({
          rate: scenarioOf("hkd").maxRate,
          spend: pot("hkd") * 0.11 * r.tempo,
          buyEquity: pot("hkd") * 0.09 * r.tempo,
        }),
        true,
        "hkd: both legs",
      ],
      ["hkd", "governor", () => ({ rate: scenarioOf("hkd").maxRate }), false, "hkd: one leg"],
      [
        "lehman",
        "governor",
        (r) => ({
          rate: scenarioOf("lehman").maxRate,
          spend: r.day >= Math.round(r.days * 0.28) ? pot("lehman") * 0.12 * r.tempo : 0,
          buyEquity: r.day >= Math.round(r.days * 0.28) ? pot("lehman") * 0.02 * r.tempo : 0,
          pledge: r.day === Math.max(2, Math.round(r.days * 0.2)),
        }),
        true,
        "lehman: hold the pot, then commit",
      ],
    ];
    for (const [id, role, orders, expected, label] of cases) {
      for (const spec of lengthsFor(scenarioOf(id))) {
        const run = play(id, role, orders, spec.id);
        assert.equal(run.won, expected, `${label} @ ${spec.id}`);
      }
    }
  });

  it("gives the three longer tellings an achievement and 半小时 none", () => {
    assert.equal(lengthOf("sprint").achievement, null);
    assert.equal(ACHIEVEMENTS.length, 3);
    for (const spec of LENGTHS.slice(1)) {
      assert.ok(spec.achievement, `${spec.id} should carry one`);
      assert.ok(spec.achievement!.nameZh.length > 0 && spec.achievement!.nameEn.length > 0);
    }
    assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, 3);
  });

  it("labels every step with a calendar day and a session inside it", () => {
    const run = createRun("hkd", "governor", "solo", "deep");
    assert.equal(calendarDayOf(run), 1);
    assert.equal(sessionOf(run), 0);
    run.day = run.days;
    assert.ok(calendarDayOf(run) >= 1);
    assert.ok(sessionOf(run) >= 0);
    // The reference telling is one decision per day and must say so.
    const short = createRun("hkd", "governor", "solo", "sprint");
    short.day = 5;
    assert.equal(calendarDayOf(short), 5);
    assert.equal(sessionOf(short), 0);
  });
});

/* ------------------------------------------------------------------ */
/* The telephone                                                       */
/* ------------------------------------------------------------------ */

describe("the telephone", () => {
  it("connects in more than half a second and less than a second and a half", () => {
    assert.ok(CONNECT_MIN_MS > 500);
    assert.ok(CONNECT_MAX_MS < 1500);
    for (let i = 0; i <= 40; i++) {
      const ms = connectDelayMs(i / 40);
      assert.ok(ms > 500 && ms < 1500, `draw ${i / 40} gave ${ms}ms`);
    }
    // A rubbish draw must not produce a hang or an instant answer.
    for (const bad of [NaN, -3, 7, Infinity]) {
      const ms = connectDelayMs(bad);
      assert.ok(ms > 500 && ms < 1500, `${bad} gave ${ms}ms`);
    }
    assert.ok(connectDelayMs(0.9) > connectDelayMs(0.1));
  });

  it("writes every call in both languages, with choices that are real choices", () => {
    for (const s of SCENARIOS) {
      assert.ok(s.calls.length >= 4, `${s.id}: too few calls to carry a telling`);
      for (const c of s.calls) {
        assert.ok(c.day >= 1 && c.day <= s.days, `${s.id}/${c.id}: lands outside the crisis`);
        assert.ok(c.fromZh && c.fromEn && c.roleZh && c.roleEn, `${s.id}/${c.id}: unnamed caller`);
        assert.ok(c.lines.length > 0 && c.lines.every((l) => l.zh && l.en), `${s.id}/${c.id}: lines`);
        assert.ok(c.options.length >= 2, `${s.id}/${c.id}: a call with one answer is a dialog box`);
        assert.equal(new Set(c.options.map((o) => o.id)).size, c.options.length);
        for (const o of c.options) {
          assert.ok(o.zh && o.en && o.replyZh && o.replyEn, `${s.id}/${c.id}/${o.id}: unwritten`);
        }
        // At least one answer has to do something, or the call is decoration.
        assert.ok(
          c.options.some((o) => o.effect && Object.keys(o.effect).length > 0),
          `${s.id}/${c.id}: no consequence`,
        );
      }
      assert.equal(new Set(s.calls.map((c) => c.id)).size, s.calls.length, `${s.id}: duplicate call id`);
    }
  });

  it("rings more often the deeper the telling", () => {
    const s = scenarioOf("lehman");
    let last = -1;
    for (const spec of LENGTHS) {
      const n = eligibleCalls(s, spec.detail, "governor").length;
      assert.ok(n >= last, `${spec.id}: a deeper telling must not have fewer calls`);
      last = n;
    }
    assert.ok(eligibleCalls(s, 3, "governor").length > eligibleCalls(s, 0, "governor").length);
  });

  it("only rings the seats a call was written for", () => {
    const s = scenarioOf("lehman");
    const restricted = s.calls.find((c) => c.seats && c.seats.length < 4);
    assert.ok(restricted, "lehman should have at least one seat-specific call");
    const notForThem = (["retail", "trader", "fund", "governor"] as StoryRole[]).find(
      (r) => !restricted!.seats!.includes(r),
    )!;
    assert.ok(!eligibleCalls(s, 3, notForThem).some((c) => c.id === restricted!.id));
    assert.ok(eligibleCalls(s, 3, restricted!.seats![0]!).some((c) => c.id === restricted!.id));
  });

  it("applies what you said, and writes it into the wire", () => {
    const run = createRun("baht", "governor", "solo", "standard");
    const script = run.calls.find((c) => c.options.some((o) => (o.effect?.pressure ?? 0) > 0))!;
    const option = script.options.find((o) => (o.effect?.pressure ?? 0) > 0)!;
    const before = run.pressure;
    applyCall(run, script, option);
    assert.ok(run.pressure > before, "an answer with a price has to charge it");
    assert.ok(run.callsDone.includes(script.id));
    assert.ok(run.log[0]!.zh.includes(option.zh.slice(0, 6)), "the wire has to record what was said");
  });

  it("will not let the same call be answered twice", () => {
    const run = createRun("baht", "governor", "solo", "standard");
    const script = run.calls.find((c) => c.options.some((o) => (o.effect?.pressure ?? 0) > 0))!;
    const option = script.options.find((o) => (o.effect?.pressure ?? 0) > 0)!;
    applyCall(run, script, option);
    const after = run.pressure;
    applyCall(run, script, option);
    assert.equal(run.pressure, after);
    assert.equal(run.callsDone.filter((id) => id === script.id).length, 1);
  });

  it("puts the calls a telling includes onto that telling's own calendar", () => {
    const run = createRun("hkd", "governor", "solo", "epic");
    assert.ok(run.calls.length > 0);
    for (const c of run.calls) assert.ok(c.day >= 1 && c.day <= run.days);
    assert.ok(ringingCalls(createRun("baht", "governor", "solo", "standard")).length >= 0);
  });
});

/* ------------------------------------------------------------------ */
/* The three cards that are not a slider                               */
/* ------------------------------------------------------------------ */

describe("the promise, the halt and the ratchet", () => {
  it("makes a promise work when there is something behind it", () => {
    const run = createRun("pound", "governor", "solo");
    run.pressure = 0.6;
    const out = stepDay(run, { pledge: true }, 7);
    assert.equal(out.run.pledged, true);
    assert.ok(out.run.pressure < 0.6, "a credible commitment has to buy something");
  });

  it("makes the same promise backfire on an empty pot", () => {
    const run = createRun("pound", "governor", "solo");
    run.pressure = 0.6;
    run.reserves = 1; // everything already spent
    const out = stepDay(run, { pledge: true }, 7);
    assert.equal(out.run.pledged, true);
    assert.ok(out.run.pressure > 0.6, "an unbacked promise is a distress signal");
    assert.ok(out.run.credibility < 1, "and it costs you for the rest of the run");
  });

  it("spends the promise once", () => {
    let run = createRun("pound", "governor", "solo");
    run.pressure = 0.5;
    run = stepDay(run, { pledge: true }, 3).run;
    const after = run.pressure;
    run = stepDay(run, { pledge: true }, 4).run;
    assert.ok(run.pressure >= after * 0.9, "a second promise must not pay again");
  });

  it("defers a wave when the market closes rather than deleting it", () => {
    const run = createRun("blackmon", "governor", "solo");
    // Whichever wave this telling put first: the run's own plan decides where
    // the documented events land, so the test asks the plan rather than
    // assuming a day.
    run.day = run.phases.find((p) => p.day > 1)!.day;
    // The very entry the engine will look up for this step, held by reference
    // so the assertion is about that wave and not about another one that
    // happens to weigh the same.
    const due = run.phases.find((p) => p.day === run.day)!;
    const was = due.day;
    const out = stepDay(run, { halt: true }, 5);
    assert.equal(out.run.halts, 1);
    assert.ok(out.run.credibility < 1, "closing the market costs confidence");
    // The sellers are still there tomorrow, and they arrive on top of it.
    assert.equal(due.day, was + 1);
    assert.ok(out.run.carryOver > 0);
  });

  it("refuses the cards a crisis did not have", () => {
    const baht = createRun("baht", "governor", "solo");
    baht.pressure = 0.5;
    const noPledge = stepDay(baht, { pledge: true, halt: true }, 9);
    assert.equal(noPledge.run.pledged, false, "1997 had no such promise to make");
    assert.equal(noPledge.run.halts, 0);
    const fresh = createRun("baht", "governor", "solo");
    const before = fresh.reserves;
    assert.equal(stepDay(fresh, { buyEquity: 5_000 }, 7).run.reserves, before);
  });

  it("keeps the leverage a margin requirement took out early", () => {
    // 1929's whole lesson. Tighten on the way up and the leverage is gone for
    // good; ease during the fall and you stop forcing the liquidation. Same
    // lever, and the difference between the two is the scenario.
    const s = scenarioOf("crash29");
    assert.equal(s.rateRatchets, true);
    const early = play("crash29", "governor", (r) => ({
      rate: r.day <= 3 ? s.maxRate : s.startRate,
      spend: r.reserves * 0.2,
    }));
    const late = play("crash29", "governor", (r) => ({
      rate: r.day >= 6 ? s.maxRate : s.startRate,
      spend: r.reserves * 0.2,
    }));
    assert.equal(early.won, true, "tightening before the fall has to be the answer");
    assert.equal(late.won, false, "tightening during the fall is the fall");
    assert.ok(early.equity > late.equity, "and easing into the crash has to save the market");
  });
});

/* ------------------------------------------------------------------ */
/* The seven new crises                                                */
/* ------------------------------------------------------------------ */

describe("1907: a run is about liquidity, and it is about today", () => {
  it("takes the clearing system down from a chair that does nothing", () => {
    const run = play("panic07", "governor", {});
    assert.equal(run.pegBroken, true);
    assert.equal(run.won, false);
  });

  it("is won by putting real money out, fast and in public", () => {
    const s = scenarioOf("panic07");
    const run = play("panic07", "governor", (r) => ({ rate: s.maxRate, spend: r.reserves * 0.25 }));
    assert.equal(run.won, true);
    assert.ok(run.reserves < usableReserves(s) * 0.3, "the pool is meant to be spent, not admired");
  });

  it("asks for the queue to actually go away, not just for Friday to arrive", () => {
    // `contain` exists for exactly this: surviving to the last day with the
    // panic still running is not what the briefing promised.
    const obj = scenarioOf("panic07").objectives.governor;
    assert.equal(obj.kind, "contain");
    const run = createRun("panic07", "governor", "solo");
    run.day = run.days + 1;
    run.pressure = 0.95;
    run.equity = 90;
    finishRun(run);
    assert.equal(run.won, false);
  });
});

describe("1720: the lever that holds the price is the one that empties the vault", () => {
  it("holds the rally and destroys the company when the lending is maxed", () => {
    const s = scenarioOf("southsea");
    const run = play("southsea", "governor", (r) => ({ rate: s.maxRate, spend: r.reserves * 0.25 }));
    assert.equal(run.pegBroken, false, "lending to your own buyers does hold the price");
    assert.ok(run.equity < 25, "and it takes the solvency with it");
    assert.equal(run.won, false);
  });

  it("is won by refusing to finance your own buyers", () => {
    const s = scenarioOf("southsea");
    const run = play("southsea", "governor", (r) => ({ rate: s.startRate, spend: r.reserves * 0.3 }));
    assert.equal(run.won, true);
    assert.ok(run.equity > 60, "restraint is what is left on the balance sheet");
  });

  it("pays the bear who shorts the book rather than the rally", () => {
    const rallyOnly = play("southsea", "fund", { shortCcy: 1.2 });
    const theBook = play("southsea", "fund", { shortEquity: 1.3 });
    assert.equal(rallyOnly.won, false, "the company will hold the price as long as it can");
    assert.equal(theBook.won, true);
  });
});

describe("1846: the market that drowned in its own issue", () => {
  it("sells the syndicate into the ground while the deposit floor is scraped", () => {
    const s = scenarioOf("railway");
    const run = play("railway", "governor", (r) => ({
      rate: s.startRate,
      spend: r.reserves * 0.02,
    }));
    assert.equal(run.won, false);
    assert.equal(run.pegBroken, true, "ten-per-cent deposits snap the issue calendar");
    assert.ok(run.day >= 6, "it survives the subscription season and breaks when the calls come due");
  });

  it("is won by raising the deposit and buying into the calls", () => {
    const r = robust("railway", "governor", (run) => ({
      rate: Math.min(scenarioOf("railway").maxRate, 0.55),
      spend: run.reserves * 0.1,
    }));
    assert.ok(r.wins >= 11, `raising the deposit wins ${r.wins}/12 tellings`);
    assert.ok(r.equity > 55, `solvency ${r.equity.toFixed(1)} above the 55 floor`);
  });

  it("pays the bear who shorts the syndicate rather than the rally", () => {
    const rallyOnly = play("railway", "fund", { shortCcy: 1.2 });
    const theSyndicate = play("railway", "fund", { shortEquity: 1.3 });
    assert.equal(rallyOnly.won, false, "the syndicate holds the market up as long as it dares");
    assert.equal(theSyndicate.won, true);
  });
});

describe("1873: you save the house nobody wants to save", () => {
  it("takes the chain down from a chair that follows the rules", () => {
    const run = play("panic73", "governor", {});
    assert.equal(run.pegBroken, true);
    assert.equal(run.won, false);
  });

  it("is won by standing in front of the first domino, early", () => {
    const s = scenarioOf("panic73");
    const r = robust("panic73", "governor", (run) => ({
      rate: s.maxRate,
      spend: run.reserves * (run.day <= 3 ? 0.22 : 0.08),
    }));
    assert.ok(r.wins >= 11, `the early guarantee wins ${r.wins}/12 tellings`);
  });

  it("makes the halt cost what it cost in the record", () => {
    const s = scenarioOf("panic73");
    const orders = (r: StoryRun) => ({
      rate: s.maxRate,
      spend: r.reserves * (r.day <= 3 ? 0.22 : 0.08),
    });
    const open = play("panic73", "governor", orders);
    const halted = play("panic73", "governor", (r) => ({ ...orders(r), halt: r.day === 4 }));
    // The deferred wave lands on top of a day that already has one: the
    // interest arrives as lasting doubt and as the carry-over premium.
    assert.ok(halted.credibility < open.credibility, "the bolt is read as doubt");
    assert.ok(halted.pressure > open.pressure, "the selling comes back with interest");
  });
});

describe("1890: half the lender of last resort is the list", () => {
  it("lets the house fail when the market is left to it", () => {
    const run = play("baring", "governor", {});
    assert.equal(run.pegBroken, true);
    assert.equal(run.won, false);
  });

  it("is won by moving the pool early and publishing the sentence", () => {
    const s = scenarioOf("baring");
    const r = robust("baring", "governor", (run) => ({
      rate: s.maxRate,
      spend: run.reserves * 0.15,
      pledge: run.day === 5,
    }));
    assert.ok(r.wins >= 11, `the weekend list wins ${r.wins}/12 tellings`);
    assert.ok(r.pressure < 0.5, `pressure settles to ${r.pressure.toFixed(2)}`);
  });

  it("refuses to pay for a promise said over an empty pot", () => {
    const s = scenarioOf("baring");
    const emptied = play("baring", "governor", (r) => ({
      rate: s.maxRate,
      spend: r.day === 1 ? r.reserves : 0,
      pledge: r.day === 2,
    }));
    assert.equal(emptied.won, false, "the pot is spent before the sentence is said");
  });
});

describe("1987: liquidity is a promise, not a number", () => {
  it("barely moves on the rate lever, because nothing is wrong with the price of money", () => {
    const s = scenarioOf("blackmon");
    assert.ok(rateDefence(s, s.maxRate) <= 0.35, "the rate card must be close to useless here");
    const rateOnly = play("blackmon", "governor", { rate: s.maxRate });
    assert.equal(rateOnly.won, false);
  });

  it("is won by funding the dealers and saying one sentence", () => {
    const s = scenarioOf("blackmon");
    const run = play("blackmon", "governor", (r) => ({
      rate: s.maxRate,
      spend: r.reserves * 0.2,
      pledge: r.day === Math.round(r.days * 0.65),
    }));
    assert.equal(run.won, true);
    assert.equal(run.pledged, true);
  });

  it("makes closing the market worse, which is what the record says", () => {
    const s = scenarioOf("blackmon");
    const halting = play("blackmon", "governor", (r) => ({
      rate: s.maxRate,
      spend: r.reserves * 0.2,
      halt: r.day === 2 || r.day === 3,
    }));
    assert.equal(halting.won, false);
  });
});

describe("1998 and 2008: the unwind", () => {
  it("loses Long-Term Capital to a margin call it cannot meet, left alone", () => {
    const run = play("ltcm", "governor", {});
    assert.equal(run.pegBroken, true);
    assert.equal(run.won, false);
  });

  it("catches it with capital and the book rather than with a tighter margin", () => {
    const s = scenarioOf("ltcm");
    const pot = usableReserves(s);
    const squeeze = play("ltcm", "governor", (r) => ({ rate: s.maxRate, spend: r.reserves * 0.25 }));
    const rescue = play("ltcm", "governor", (r) => ({
      rate: (s.startRate + s.maxRate) * 0.6,
      spend: pot * 0.09 * r.tempo,
      buyEquity: pot * 0.08 * r.tempo,
    }));
    assert.equal(squeeze.won, false, "tightening margin protects the lenders and forces the fire sale");
    assert.equal(rescue.won, true);
    assert.ok(rescue.equity > squeeze.equity * 1.5);
  });

  it("makes the fund's own seat about cutting before somebody cuts for it", () => {
    const stubborn = play("ltcm", "fund", { shortEquity: 0 });
    const cutting = play("ltcm", "fund", { shortEquity: 1.3 });
    assert.equal(stubborn.won, false);
    assert.equal(cutting.won, true);
    const obj = scenarioOf("ltcm").objectives.fund;
    assert.equal(obj.kind, "survive");
    assert.equal(obj.side, "defend");
  });

  it("shuts the repo market on a 2008 defender who does nothing", () => {
    const run = play("lehman", "governor", {});
    assert.equal(run.pegBroken, true);
    assert.equal(run.won, false);
  });

  it("is still winnable in 2008, by holding the pot and committing while it is full", () => {
    const s = scenarioOf("lehman");
    const pot = usableReserves(s);
    const run = play("lehman", "governor", (r) => ({
      rate: s.maxRate,
      spend: r.day >= Math.round(r.days * 0.28) ? pot * 0.12 * r.tempo : 0,
      buyEquity: r.day >= Math.round(r.days * 0.28) ? pot * 0.02 * r.tempo : 0,
      pledge: r.day === Math.max(2, Math.round(r.days * 0.2)),
    }));
    assert.equal(run.won, true);
    assert.equal(run.pledged, true);
  });
});

describe("2010 to 2012: the promise is the policy", () => {
  it("loses the spread to a defender who only preaches austerity", () => {
    const s = scenarioOf("euro");
    const run = play("euro", "governor", { rate: s.maxRate });
    assert.equal(run.won, false);
    assert.ok(run.equity < 60, "austerity shrinks the thing the ratio is measured against");
  });

  it("is won by the fund, the market and the sentence together", () => {
    const s = scenarioOf("euro");
    const pot = usableReserves(s);
    const run = play("euro", "governor", (r) => ({
      rate: s.maxRate,
      spend: pot * 0.11 * r.tempo,
      buyEquity: pot * 0.09 * r.tempo,
    }));
    assert.equal(run.won, true);
  });

  it("does not pay the short side, because history did not", () => {
    const run = play("euro", "fund", { shortCcy: 1.2, shortEquity: 1.0 });
    assert.equal(run.won, false);
  });
});

/* ------------------------------------------------------------------ */
/* What the ladder remembers                                           */
/* ------------------------------------------------------------------ */

/**
 * A minimal `localStorage`, because the ladder is the one part of story mode
 * that has to persist and the arithmetic on top of it — titles, achievements,
 * which stage opens next — is worth pinning.
 */
function withStorage(run: () => void) {
  const store = new Map<string, string>();
  const shim = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };
  const g = globalThis as { localStorage?: unknown };
  const had = "localStorage" in g;
  const previous = g.localStorage;
  g.localStorage = shim;
  try {
    run();
  } finally {
    if (had) g.localStorage = previous;
    else delete g.localStorage;
  }
}

/** A finished run, scored the way the engine would have scored it. */
function finished(id: StoryId, role: StoryRole, length: StoryLength, won: boolean): StoryRun {
  const run = createRun(id, role, "solo", length);
  run.done = true;
  run.won = won;
  return run;
}

describe("what the ladder remembers", () => {
  it("records nothing at all for a run that was lost", () => {
    withStorage(() => {
      const result = recordClear(finished("panic07", "governor", "sprint", false));
      assert.equal(result.firstClear, false);
      assert.equal(result.progress.cleared.length, 0);
      assert.equal(result.newAchievement, null);
      assert.deepEqual(result.newTitles, []);
    });
  });

  it("counts a win from any seat as a clear", () => {
    // The four seats want genuinely different things and each objective is a
    // real reading of the same crisis. Making the ladder depend on the
    // defender's chair alone would quietly say the other three were practice.
    withStorage(() => {
      const asRetail = recordClear(finished("panic07", "retail", "sprint", true));
      assert.equal(asRetail.firstClear, true);
      assert.deepEqual(asRetail.progress.cleared, ["panic07"]);
      assert.equal(asRetail.unlocked, LADDER[1]);
      // Clearing the same stage again opens nothing new and double-counts nothing.
      const again = recordClear(finished("panic07", "governor", "sprint", true));
      assert.equal(again.firstClear, false);
      assert.equal(again.progress.cleared.length, 1);
      assert.equal(again.unlocked, null);
    });
  });

  it("hands out a title on the second clear and not on the first", () => {
    withStorage(() => {
      const first = recordClear(finished(LADDER[0]!, "governor", "sprint", true));
      assert.deepEqual(first.newTitles, []);
      const second = recordClear(finished(LADDER[1]!, "governor", "sprint", true));
      assert.equal(second.newTitles.length, 1);
      assert.equal(second.newTitles[0]!.nameZh, "入门");
      assert.equal(topTitle(second.progress)?.id, "rookie");
      // And it is handed out once.
      const third = recordClear(finished(LADDER[2]!, "governor", "sprint", true));
      assert.deepEqual(third.newTitles, []);
      assert.equal(third.progress.titles.length, 1);
    });
  });

  it("gives the whole ladder the whole set of titles", () => {
    withStorage(() => {
      let last = recordClear(finished(LADDER[0]!, "governor", "sprint", true));
      for (const id of LADDER.slice(1)) {
        last = recordClear(finished(id, "governor", "sprint", true));
      }
      assert.equal(last.progress.cleared.length, LADDER.length);
      assert.equal(last.progress.titles.length, 5);
      assert.equal(topTitle(last.progress)?.nameZh, "天才交易员");
      assert.equal(nextStage(last.progress.cleared), null);
    });
  });

  it("awards nothing for the half-hour telling, by design", () => {
    withStorage(() => {
      const r = recordClear(finished("baht", "governor", "sprint", true));
      assert.equal(r.newAchievement, null);
      assert.equal(r.progress.achievements.length, 0);
      assert.equal(r.progress.best.baht, "sprint");
    });
  });

  it("awards each longer telling its own name, once", () => {
    withStorage(() => {
      const hour = recordClear(finished("baht", "governor", "standard", true));
      assert.equal(hour.newAchievement?.nameZh, "亲历者");
      // A second one-hour win does not award it twice.
      assert.equal(recordClear(finished("pound", "governor", "standard", true)).newAchievement, null);
      const file = recordClear(finished("hkd", "governor", "deep", true));
      assert.equal(file.newAchievement?.nameZh, "档案守夜人");
      const full = recordClear(finished("hkd", "governor", "epic", true));
      assert.equal(full.newAchievement?.nameZh, "历史的第一稿");
      assert.equal(full.progress.achievements.length, 3);
      assert.equal(heldAchievements(full.progress).length, 3);
    });
  });

  it("remembers the deepest telling of each crisis and never forgets one", () => {
    withStorage(() => {
      recordClear(finished("hkd", "governor", "deep", true));
      const back = recordClear(finished("hkd", "governor", "sprint", true));
      assert.equal(back.progress.best.hkd, "deep", "a quick replay must not demote the record");
    });
  });

  it("cannot award a long telling from a crisis that does not offer one", () => {
    withStorage(() => {
      // The two openers run at one length. If a save somehow claims otherwise,
      // it must not turn into an achievement.
      const r = recordClear(finished("southsea", "governor", "epic", true));
      assert.equal(scenarioOf("southsea").major, false);
      assert.equal(r.newAchievement, null);
    });
  });
});

/* ------------------------------------------------------------------ */
/* It gets worse                                                       */
/* ------------------------------------------------------------------ */

describe("a crisis that gets worse as it goes", () => {
  it("makes the last sessions weigh several times the first ones", () => {
    for (const s of SCENARIOS) {
      const run = createRun(s.id, "governor", "solo");
      const first = escalationAt(run, 1);
      const last = escalationAt(run, run.days);
      assert.ok(first < 1, `${s.id}: the opening has to give ground`);
      assert.ok(last > 1.4, `${s.id}: the close has to bite`);
      assert.ok(last / first >= 2.2, `${s.id}: only ${(last / first).toFixed(1)}x across the run`);
      // Monotone: never a session that is lighter than the one before it.
      for (let step = 2; step <= run.days; step++) {
        assert.ok(escalationAt(run, step) >= escalationAt(run, step - 1) - 1e-9, `${s.id} @ ${step}`);
      }
    }
  });

  it("redistributes the weight rather than adding any", () => {
    // The whole crisis still weighs what it weighed. If escalation added
    // pressure instead of moving it, every scenario would quietly have been
    // rebalanced by a coefficient nobody meant to change.
    for (const s of SCENARIOS) {
      const run = createRun(s.id, "governor", "solo");
      const byStep = new Map<number, number>();
      for (const p of run.phases) byStep.set(p.day, (byStep.get(p.day) ?? 0) + p.pressure);
      let flat = 0;
      let leaned = 0;
      for (let step = 1; step <= run.days; step++) {
        const w = byStep.get(step) ?? run.drift;
        flat += w;
        leaned += w * escalationAt(run, step);
      }
      assert.ok(Math.abs(leaned - flat) < 1e-6, `${s.id}: ${leaned.toFixed(3)} vs ${flat.toFixed(3)}`);
    }
  });

  it("leans hardest on the four-year one", () => {
    // 炼狱 is the endurance rung. It has to be the one that gets worst.
    const dep = createRun("depression", "governor", "solo");
    const baht = createRun("baht", "governor", "solo");
    assert.ok(
      escalationAt(dep, dep.days) / escalationAt(dep, 1) >
        escalationAt(baht, baht.days) / escalationAt(baht, 1),
    );
  });
});

/* ------------------------------------------------------------------ */
/* History rhymes                                                      */
/* ------------------------------------------------------------------ */

describe("the record, and this run's version of it", () => {
  it("still runs every documented event, at a weight of its own", () => {
    // The guarantee: the forward book leaks, the index gaps, the bank fails.
    // What is not guaranteed is that any of them lands the way it landed.
    for (const s of SCENARIOS) {
      const a = createRun(s.id, "governor", "solo", "sprint", 11);
      const b = createRun(s.id, "governor", "solo", "sprint", 977);
      const scripted = (run: StoryRun) =>
        run.phases.filter((p) => s.phases.some((q) => q.titleZh === p.titleZh));
      assert.equal(scripted(a).length, scripted(b).length, `${s.id}: an event went missing`);
      for (const q of s.phases.filter((p) => (p.minDetail ?? 0) === 0)) {
        assert.ok(scripted(a).some((p) => p.titleZh === q.titleZh), `${s.id}: ${q.titleZh}`);
        assert.ok(scripted(b).some((p) => p.titleZh === q.titleZh), `${s.id}: ${q.titleZh}`);
      }
    }
  });

  it("gives two seeds two different versions of the same crisis", () => {
    const a = createRun("baht", "governor", "solo", "sprint", 11);
    const b = createRun("baht", "governor", "solo", "sprint", 977);
    const shape = (run: StoryRun) => run.phases.map((p) => `${p.day}:${p.pressure.toFixed(4)}`).join("|");
    assert.notEqual(shape(a), shape(b), "two seeds must not tell the identical story");
    // And the divergence beats are drawn per run, not written into the file.
    assert.equal(a.divergences.length, 2);
    assert.ok(a.divergences.every((d) => d.zh.length > 0 && d.en.length > 0));
  });

  it("keeps the perturbation small", () => {
    // Small enough that the crisis is recognisably the same one, across a
    // spread of seeds. A scenario that swings by half its weight is not a
    // retelling, it is a different scenario.
    const s = scenarioOf("hkd");
    const weight = (seed: number) =>
      createRun("hkd", "governor", "solo", "sprint", seed).phases.reduce((a, p) => a + p.pressure, 0);
    const runs = [3, 29, 101, 5077, 90210].map(weight);
    const base = s.phases.filter((p) => (p.minDetail ?? 0) === 0).reduce((a, p) => a + p.pressure, 0);
    for (const w of runs) {
      assert.ok(Math.abs(w - base) < base * 0.45, `${w.toFixed(2)} against ${base.toFixed(2)}`);
    }
  });

  it("replays a seed exactly, so a defeat can be studied", () => {
    // The debrief hands its own seed back to 再打一次 for this reason.
    const a = play("hkd", "governor", { rate: 0.18 }, "sprint", 4242);
    const b = play("hkd", "governor", { rate: 0.18 }, "sprint", 4242);
    assert.deepEqual(
      [a.pressure, a.equity, a.book, a.day, a.won],
      [b.pressure, b.equity, b.book, b.day, b.won],
    );
  });

  it("lets the perturbation change the ending, without changing the crisis", () => {
    // Sterling broke in the record, and it breaks in most runs here — but not
    // in all of them, because a paper that ran a day late is a paper that ran
    // a day late. This is the whole point of the divergence pool.
    const outcomes = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233].map(
      (seed) => play("pound", "fund", { shortCcy: 1.2 }, "sprint", seed).won,
    );
    const wins = outcomes.filter(Boolean).length;
    assert.ok(wins > outcomes.length * 0.4, `the record's ending should still be the usual one (${wins})`);
    assert.ok(wins < outcomes.length, "and it must not be the only one available");
  });
});

/* ------------------------------------------------------------------ */
/* Fiction in the game, fact in the file                               */
/* ------------------------------------------------------------------ */

/** Real-world proper nouns. None of these belongs in anything playable. */
const REAL_NOUNS = [
  "泰铢",
  "港元",
  "英镑",
  "欧元",
  "索罗斯",
  "美国",
  "英国",
  "泰国",
  "香港",
  "德国",
  "希腊",
  "俄罗斯",
  "华尔街",
  "纽约",
  "伦敦",
  "芝加哥",
  "曼谷",
  "美联储",
  "雷曼",
  "南海公司",
  "罗斯福",
  "baht",
  "sterling",
  "Hong Kong",
  "Wall Street",
  "New York",
  "London",
  "Chicago",
  "Bangkok",
  "Lehman",
  "Soros",
  "Roosevelt",
  "Federal Reserve",
];

describe("fiction in the game, fact in the file", () => {
  it("keeps every real name out of everything the player plays", () => {
    // The world is invented — 狮子国, 拉莫娜国, 北风基金 — so that the player
    // is making decisions rather than recalling answers. The real names are
    // in the briefing's history block, which is where they teach something.
    const playable = (s: (typeof SCENARIOS)[number]): string[] => [
      s.nameZh,
      s.nameEn,
      s.briefZh,
      s.briefEn,
      s.lessonZh,
      s.lessonEn,
      ...Object.values(s.lexicon).filter((v): v is string => typeof v === "string"),
      ...Object.values(s.seatLabel ?? {}).flatMap((l) => [l.zh, l.en]),
      ...s.phases.flatMap((p) => [p.titleZh, p.titleEn, p.bodyZh, p.bodyEn]),
      ...s.calls.flatMap((c) => [
        c.fromZh,
        c.fromEn,
        c.roleZh,
        c.roleEn,
        ...c.lines.flatMap((l) => [l.zh, l.en]),
        ...c.options.flatMap((o) => [o.zh, o.en, o.replyZh, o.replyEn]),
      ]),
      ...Object.values(s.objectives).flatMap((o) => [
        o.titleZh,
        o.titleEn,
        o.howZh,
        o.howEn,
        o.winZh,
        o.winEn,
        o.trapZh,
        o.trapEn,
      ]),
    ];
    for (const s of SCENARIOS) {
      const text = playable(s).join("\n");
      for (const noun of REAL_NOUNS) {
        assert.ok(!text.includes(noun), `${s.id}: the playable side names "${noun}"`);
      }
    }
  });

  it("puts the real names in the history block, where they teach something", () => {
    // The other half of the same rule. A fictional world that never tells you
    // what it was standing in for is not teaching financial history, it is
    // just a slider game with a costume on.
    const record = (s: (typeof SCENARIOS)[number]) =>
      [s.historyZh, s.historyEn, ...(s.historyDeepZh ?? []), ...(s.historyDeepEn ?? [])].join("\n");
    const required: Record<string, string[]> = {
      baht: ["泰铢", "泰国"],
      pound: ["英镑", "索罗斯", "量子基金"],
      hkd: ["港元", "香港", "恒生"],
      depression: ["美国", "大萧条", "罗斯福"],
      lehman: ["雷曼"],
      euro: ["欧元", "希腊"],
      southsea: ["南海公司"],
      panic07: ["摩根"],
      crash29: ["道琼斯"],
      blackmon: ["道琼斯"],
      ltcm: ["长期资本"],
      railway: ["英国", "铁路", "哈德森"],
      panic73: ["美国", "杰伊·库克", "维也纳"],
      baring: ["巴林", "阿根廷", "英格兰银行"],
    };
    for (const s of SCENARIOS) {
      const text = record(s);
      for (const needed of required[s.id] ?? []) {
        assert.ok(text.includes(needed), `${s.id}: the record never mentions ${needed}`);
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/* 炼狱                                                                 */
/* ------------------------------------------------------------------ */

describe("the long winter: the line you are supposed to let go", () => {
  it("places 大萧条 at the highest 炼狱 rung after 深渊", () => {
    const dep = scenarioOf("depression");
    assert.equal(dep.grade, 10);
    assert.equal(dep.nameZh, "大萧条");
    assert.equal(gradeOf(9).nameZh, "深渊");
    assert.equal(gradeOf(10).nameZh, "炼狱");
    assert.equal(LADDER.indexOf("lehman"), LADDER.indexOf("hkd") + 1);
    assert.equal(LADDER.indexOf("depression"), LADDER.indexOf("lehman") + 1);
  });

  it("does not end when the line breaks, because the line breaking is the point", () => {
    const dep = scenarioOf("depression");
    assert.equal(dep.endsOnBreak, false);
    const run = createRun("depression", "governor", "solo");
    run.pressure = 0.98;
    const out = stepDay(run, {}, 5);
    assert.equal(out.run.pegBroken, true);
    assert.equal(out.run.done, false, "leaving gold is a turning point, not an ending");
    // And the constraint coming off is the relief the economy needed.
    assert.ok(out.run.equity > 5);
  });

  it("scores the chair on what it saved rather than on what it held", () => {
    assert.equal(dep_gov().kind, "revive");
    const run = createRun("depression", "governor", "solo");
    run.day = run.days + 1;
    run.pegBroken = true;
    run.equity = dep_gov().target + 3;
    finishRun(run);
    assert.equal(run.won, true, "the parity gone and the banks alive is a win");
    const other = createRun("depression", "governor", "solo");
    other.day = other.days + 1;
    other.pegBroken = false;
    other.equity = dep_gov().target - 3;
    finishRun(other);
    assert.equal(other.won, false, "the parity intact and the banks gone is not");
  });

  it("punishes the responsible-looking option, which is the whole trap", () => {
    const s = scenarioOf("depression");
    const defended = robust("depression", "governor", () => ({ rate: s.maxRate, spend: 0 }));
    assert.equal(defended.wins, 0, "defending the parity has to lose every time");
    assert.ok(defended.equity < 30, "and it has to visibly take the banks with it");
  });

  it("is winnable by letting the parity go and buying the market", () => {
    const s = scenarioOf("depression");
    const pot = usableReserves(s);
    const right = robust("depression", "governor", (r) => ({
      rate: s.startRate,
      buyEquity: pot * 0.1 * r.tempo,
      pledge: r.day === Math.round(r.days * 0.8),
    }));
    assert.ok(right.wins >= 8, `the right answer has to work (${right.wins}/12)`);
    assert.ok(right.equity > 50);
  });

  it("bombards the chair from every direction it actually came from", () => {
    // 炼狱 is an endurance rung: what makes it hard is that the information
    // never stops. If this ever thins out, the scenario stops being the thing
    // it was designed to be.
    const s = scenarioOf("depression");
    assert.ok(s.calls.length >= 16, `only ${s.calls.length} calls`);
    const voices = new Set(s.calls.map((c) => c.fromZh));
    assert.ok(voices.size >= 12, `only ${voices.size} distinct voices`);
    // Spread across the whole four years rather than bunched at the end.
    const early = s.calls.filter((c) => c.day <= s.days / 3).length;
    const late = s.calls.filter((c) => c.day > (s.days * 2) / 3).length;
    assert.ok(early >= 3 && late >= 3, `early ${early}, late ${late}`);
    // At the three-hour telling, every one of them rings.
    assert.equal(eligibleCalls(s, 3, "governor").length, s.calls.filter((c) => !c.seats || c.seats.includes("governor")).length);
  });

  it("carries the one award that is above an achievement", () => {
    const dep = scenarioOf("depression");
    assert.ok(dep.crown, "炼狱 is where the crown lives");
    assert.equal(dep.crown!.nameZh, "最后贷款人");
    // Exactly one crisis has one, or it stops being the most valuable thing.
    assert.equal(SCENARIOS.filter((s) => s.crown).length, 1);
    assert.equal(dep.major, true, "and it has to offer the three-hour telling");
  });
});
