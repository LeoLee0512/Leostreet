/**
 * Tests for 荣誉系统 — the record page.
 *
 * Two things are worth guarding here and neither is exciting. The first is
 * the streak arithmetic, because a streak that resets on a Tuesday when the
 * player did show up is the kind of bug that is only ever noticed by the
 * person it happens to. The second is the balance sheet: a page that shows a
 * player their debts has to reconcile, or it is worse than not showing them.
 *
 * Runs on plain Node (`--experimental-strip-types`), so nothing here may reach
 * for a `@/` alias, the DOM, or `localStorage`.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createInitial } from "./sim.ts";
import { debt, netWorth } from "./economy.ts";
import { dayKey, hasVenture, ledgerOf, winRate, winRateByRole, withSession, type Bout, type LoginLog } from "./honor.ts";
import type { GameState } from "./types.ts";

function fresh(patch: Partial<GameState> = {}): GameState {
  const s = createInitial("TEST", "retail", "TEST00000001", "male", "leo");
  s.seed = 123456789;
  s.rngState = 123456789;
  s.tick = 15;
  return Object.assign(s, patch);
}

const EMPTY: LoginLog = {
  sessions: 0,
  firstAt: 0,
  lastAt: 0,
  days: [],
  streak: 0,
  bestStreak: 0,
  seconds: 0,
};

const DAY = 86_400_000;
/** Noon local, so a timezone offset cannot roll a fixture onto the wrong date. */
function at(dayOffset: number, hour = 12): number {
  const d = new Date(2026, 0, 5 + dayOffset, hour, 0, 0);
  return d.getTime();
}

function bout(over: Partial<Bout> = {}): Bout {
  return {
    id: "b1",
    at: at(0),
    kind: "match",
    role: "trader",
    won: true,
    tag: "ranked",
    note: "5v5",
    rated: true,
    ...over,
  };
}

describe("login record", () => {
  it("counts the first session as a streak of one", () => {
    const after = withSession(EMPTY, at(0));
    assert.equal(after.sessions, 1);
    assert.equal(after.streak, 1);
    assert.equal(after.bestStreak, 1);
    assert.equal(after.firstAt, at(0));
    assert.equal(after.days.length, 1);
  });

  it("does not grow the streak for a second session on the same day", () => {
    // A streak counts days visited, not times opened. Four sessions on a
    // Tuesday is one day of a streak, and any other reading is a lie.
    let log = withSession(EMPTY, at(0, 9));
    log = withSession(log, at(0, 14));
    log = withSession(log, at(0, 22));
    assert.equal(log.sessions, 3);
    assert.equal(log.streak, 1);
    assert.equal(log.days.length, 1);
  });

  it("extends the streak on consecutive days and breaks it on a gap", () => {
    let log = withSession(EMPTY, at(0));
    log = withSession(log, at(1));
    log = withSession(log, at(2));
    assert.equal(log.streak, 3);
    assert.equal(log.bestStreak, 3);
    // Skip a day.
    log = withSession(log, at(4));
    assert.equal(log.streak, 1, "a missed day resets the run");
    assert.equal(log.bestStreak, 3, "but the best is a record, not a state");
  });

  it("keeps the days list bounded", () => {
    let log = EMPTY;
    for (let i = 0; i < 450; i++) log = withSession(log, at(i));
    assert.ok(log.days.length <= 400);
    assert.equal(log.streak, 450, "the streak itself is not capped by the window");
  });

  it("reads a date in the player's own timezone", () => {
    // Stored as YYYY-MM-DD so a streak lines up with the calendar the player
    // is actually looking at, not with UTC.
    const key = dayKey(new Date(2026, 8, 21, 23, 30).getTime());
    assert.equal(key, "2026-09-21");
    assert.notEqual(dayKey(at(0)), dayKey(at(0) + DAY));
  });
});

describe("win rate", () => {
  it("returns null rather than a fake nought per cent before anything is played", () => {
    const w = winRate([]);
    assert.equal(w.rate, null);
    assert.equal(w.played, 0);
  });

  it("counts only the bouts where winning meant something", () => {
    const bouts = [
      bout({ won: true }),
      bout({ won: false }),
      // A warm-up. Stored, shown in the history, out of the headline number.
      bout({ won: true, tag: "practice", rated: false }),
    ];
    const w = winRate(bouts);
    assert.equal(w.played, 2);
    assert.equal(w.won, 1);
    assert.equal(w.rate, 0.5);
  });

  it("splits by seat, which is the number that actually says something", () => {
    const bouts = [
      bout({ role: "analyst", won: true }),
      bout({ role: "analyst", won: true }),
      bout({ role: "risk", won: false }),
      bout({ role: "risk", won: false }),
      bout({ role: "risk", won: true }),
      bout({ role: "governor", kind: "story", won: true }),
    ];
    const byRole = winRateByRole(bouts);
    assert.equal(byRole.analyst!.rate, 1);
    assert.equal(byRole.risk!.played, 3);
    assert.equal(byRole.risk!.won, 1);
    // Story runs and matches are different games; asking for one must not
    // fold the other in.
    const matchesOnly = winRateByRole(bouts, "match");
    assert.equal(matchesOnly.governor, undefined);
    assert.equal(winRateByRole(bouts, "story").governor!.rate, 1);
  });

  it("keeps an unrated seat visible with no rate rather than dropping it", () => {
    const byRole = winRateByRole([bout({ role: "pm", rated: false })]);
    assert.equal(byRole.pm!.played, 0);
    assert.equal(byRole.pm!.rate, null);
  });
});

describe("the balance sheet", () => {
  it("reconciles: assets minus what you owe is what you are worth", () => {
    const s = fresh({ cash: 400_000, bankLoan: 120_000 });
    const l = ledgerOf(s);
    assert.equal(l.netWorth, netWorth(s));
    assert.equal(l.personalDebt, debt(s));
    // The page shows both numbers side by side, so they have to add up on it.
    assert.ok(Math.abs(l.totalAssets - l.personalDebt - l.netWorth) < 1e-6);
  });

  it("breaks personal debt into the three things it is actually made of", () => {
    const s = fresh({ cash: 500_000, bankLoan: 80_000 });
    const l = ledgerOf(s);
    assert.equal(l.personalParts.bankLoan, 80_000);
    assert.equal(l.personalParts.mortgage, 0);
    assert.equal(
      l.personalParts.bankLoan + l.personalParts.mortgage + l.personalParts.margin,
      l.personalDebt,
    );
  });

  it("shows no company at all for a player who never started one", () => {
    const s = fresh();
    assert.equal(hasVenture(s), false);
    assert.equal(ledgerOf(s).companyDebt, 0);
  });

  it("counts client money and outside capital as money the firm owes back", () => {
    // Both are liabilities in the plain sense the player cares about: somebody
    // else can ask for them, and the firm has to hand them over.
    const s = fresh({
      career: "broker",
      fundAum: 2_500_000,
      investors: [{ rivalId: "r1", invested: 750_000, hwm: 1, sinceTick: 0 }],
    });
    const l = ledgerOf(s);
    assert.equal(l.hasVenture, true);
    assert.equal(l.companyParts.clientAum, 2_500_000);
    assert.equal(l.companyParts.investors, 750_000);
    assert.equal(l.companyDebt, 3_250_000);
    // And it stays out of the personal column, because it is not personal.
    assert.equal(l.personalDebt, debt(s));
  });

  it("treats a started venture as a business even with nothing owed yet", () => {
    const s = fresh({
      projects: [{ id: "p1", specId: "spec", startTick: 0, doneTick: 100, failed: false }],
    });
    assert.equal(hasVenture(s), true);
    assert.equal(ledgerOf(s).companyDebt, 0);
  });
});
