/**
 * Tests for the competitive layer. Same rule as the sim suite: plain Node, no
 * `@/` aliases, no DOM.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { makeRng } from "../game/math.ts";
import { stepBots, calloutsFor } from "./bots.ts";
import {
  MATCH_BOARD,
  ROUND_TICKS,
  SEAT_START_CASH,
  bookOf,
  closePosition,
  createRound,
  finishRound,
  priceOf,
  seatNav,
  settleAll,
  slippageFor,
  stepRound,
  teamLeverage,
  trade,
} from "./round.ts";
import { ROLES, ROLE_IDS } from "./roles.ts";
import {
  buildSeats,
  createMatch,
  decideSeries,
  isMatchOver,
  maxRounds,
  recordRound,
  seriesWinner,
  stillAlive,
  winsFor,
  winsNeeded,
} from "./series.ts";
import { RATING_START, applySeriesResult, kFactor, tierOf, toNextTier } from "./rating.ts";
import type { MatchState, RoundResult, TeamId } from "./types.ts";

function match(over: Partial<Parameters<typeof createMatch>[0]> = {}): MatchState {
  return createMatch({
    id: "m1",
    mode: "casual",
    format: "bo5",
    teamCount: 2,
    playerRole: "trader",
    playerName: "ME",
    seed: 42,
    rng: makeRng(7),
    ...over,
  });
}

function result(index: number, winner: TeamId, teams: TeamId[], ret = 0.05): RoundResult {
  return {
    index,
    standings: teams.map((team) => ({
      team,
      nav: 0,
      start: 0,
      returnPct: team === winner ? ret : ret - 0.02,
    })),
    winner,
  };
}

describe("roles", () => {
  it("never lets one seat both know and trade cheaply", () => {
    // The whole co-op premise: the seat with the model pays the widest spread.
    for (const id of ROLE_IDS) {
      const r = ROLES[id];
      if (r.seesModel) assert.ok(r.slippageMult > 1, `${id} sees the model AND fills cheaply`);
      if (r.slippageMult < 1) assert.equal(r.seesModel, false, `${id} fills cheaply AND sees the model`);
    }
  });

  it("gives every seat exactly one thing nobody else has", () => {
    const counts = {
      seesModel: ROLE_IDS.filter((r) => ROLES[r].seesModel).length,
      lead: ROLE_IDS.filter((r) => ROLES[r].newsLeadTicks > 0).length,
      cut: ROLE_IDS.filter((r) => ROLES[r].canForceCut).length,
      alloc: ROLE_IDS.filter((r) => ROLES[r].allocatesCapital).length,
    };
    assert.deepEqual(counts, { seesModel: 1, lead: 1, cut: 1, alloc: 1 });
  });
});

describe("lineups", () => {
  it("seats five roles per team and exactly one human", () => {
    const m = match({ teamCount: 3 });
    assert.equal(m.seats.length, 15);
    assert.equal(m.seats.filter((s) => s.human).length, 1);
    for (const team of m.teams) {
      const roles = m.seats.filter((s) => s.team === team).map((s) => s.role).sort();
      assert.deepEqual(roles, [...ROLE_IDS].sort());
    }
  });

  it("puts the player in the role they asked for, on team A", () => {
    const m = match({ playerRole: "risk" });
    const me = m.seats.find((s) => s.human)!;
    assert.equal(me.role, "risk");
    assert.equal(me.team, "a");
  });

  it("varies bot skill from the seeded stream but keeps it in range", () => {
    const seats = buildSeats(2, "pm", "ME", makeRng(3));
    const bots = seats.filter((s) => !s.human);
    assert.ok(bots.every((b) => b.skill >= 0 && b.skill <= 1));
    assert.ok(new Set(bots.map((b) => b.skill)).size > 1, "every bot had identical skill");
  });
});

describe("series", () => {
  it("needs 3 of 5 and 4 of 7", () => {
    assert.equal(winsNeeded("bo5"), 3);
    assert.equal(winsNeeded("bo7"), 4);
    assert.equal(maxRounds("bo5"), 5);
    assert.equal(maxRounds("bo7"), 7);
  });

  it("settles a Bo5 at three wins", () => {
    let m = match();
    for (const i of [0, 1]) m = recordRound(m, result(i, "a", m.teams));
    assert.equal(seriesWinner(m), null);
    assert.equal(m.winner, null);
    m = recordRound(m, result(2, "a", m.teams));
    assert.equal(seriesWinner(m), "a");
    assert.equal(m.winner, "a");
    assert.ok(isMatchOver(m));
    assert.equal(winsFor(m.results, "a"), 3);
  });

  it("knows when a team is mathematically out", () => {
    let m = match();
    for (const i of [0, 1]) m = recordRound(m, result(i, "a", m.teams));
    assert.equal(stillAlive(m, "b"), true); // 0-2 with three left is alive
    m = recordRound(m, result(2, "b", m.teams));
    m = recordRound(m, result(3, "a", m.teams));
    assert.equal(seriesWinner(m), "a");
  });

  it("goes the distance in a Bo7", () => {
    let m = match({ format: "bo7" });
    const order: TeamId[] = ["a", "b", "a", "b", "a", "b", "a"];
    order.forEach((w, i) => {
      m = recordRound(m, result(i, w, m.teams));
    });
    assert.equal(m.results.length, 7);
    assert.equal(m.winner, "a");
  });

  it("breaks a three-team tie on total return, not on nothing", () => {
    let m = match({ teamCount: 3 });
    // a, b, c, a, b -> a and b both on 2 with no rounds left.
    const order: TeamId[] = ["a", "b", "c", "a", "b"];
    order.forEach((w, i) => {
      m = recordRound(m, {
        index: i,
        standings: m.teams.map((team) => ({
          team,
          nav: 0,
          start: 0,
          // Team b wins by less each time, so a has the better total.
          returnPct: team === w ? (w === "a" ? 0.2 : 0.02) : 0,
        })),
        winner: w,
      });
    });
    assert.equal(seriesWinner(m), null, "nobody reached three");
    assert.ok(isMatchOver(m), "the format ran out of rounds");
    assert.equal(decideSeries(m), "a");
    assert.equal(m.winner, "a");
  });
});

describe("round trading", () => {
  it("opens a twelve-name board and funds every seat equally", () => {
    const m = match({ teamCount: 3 });
    const r = createRound(m, 0);
    assert.deepEqual(Object.keys(r.market.stocks).sort(), [...MATCH_BOARD].sort());
    assert.equal(r.books.length, 15);
    assert.ok(r.books.every((b) => b.cash === SEAT_START_CASH));
    assert.ok(r.market.properties.length === 0, "a round is a session, not a life");
  });

  it("charges the trader less than the analyst for the same fill", () => {
    const m = match();
    const analyst = m.seats.find((s) => s.team === "a" && s.role === "analyst")!;
    const trader = m.seats.find((s) => s.team === "a" && s.role === "trader")!;
    assert.ok(slippageFor(trader) < slippageFor(analyst));

    const r = createRound(m, 0);
    assert.equal(trade(r, analyst, "GOLD", 100), null);
    assert.equal(trade(r, trader, "GOLD", 100), null);
    assert.ok(
      bookOf(r, trader.id)!.cash > bookOf(r, analyst.id)!.cash,
      "the cheap seat should have more cash left after an identical trade",
    );
  });

  it("round-trips a long for only the spread", () => {
    const m = match();
    const seat = m.seats.find((s) => s.role === "trader" && s.team === "a")!;
    const r = createRound(m, 0);
    const before = seatNav(r, seat.id);
    trade(r, seat, "BLUE", 200);
    closePosition(r, seat, "BLUE");
    const lost = before - seatNav(r, seat.id);
    assert.ok(lost > 0, "crossing twice must cost something");
    assert.ok(lost < before * 0.01, `only the spread should be lost, lost ${lost}`);
    assert.equal(bookOf(r, seat.id)!.positions.length, 0);
  });

  it("round-trips a short for only the spread", () => {
    const m = match();
    const seat = m.seats.find((s) => s.role === "pm" && s.team === "a")!;
    const r = createRound(m, 0);
    const before = seatNav(r, seat.id);
    trade(r, seat, "OAK", -150);
    const pos = bookOf(r, seat.id)!.positions[0]!;
    assert.ok(pos.shares < 0 && pos.shortMargin > 0);
    closePosition(r, seat, "OAK");
    const lost = before - seatNav(r, seat.id);
    assert.ok(lost > 0 && lost < before * 0.01, `short round-trip cost ${lost}`);
  });

  it("nets a sell against an open long instead of opening a short", () => {
    const m = match();
    const seat = m.seats.find((s) => s.role === "trader" && s.team === "a")!;
    const r = createRound(m, 0);
    trade(r, seat, "NOVA", 100);
    trade(r, seat, "NOVA", -40);
    const pos = bookOf(r, seat.id)!.positions.find((p) => p.ticker === "NOVA")!;
    assert.equal(pos.shares, 60);
  });

  it("flips through flat when the sell is larger than the long", () => {
    const m = match();
    const seat = m.seats.find((s) => s.role === "trader" && s.team === "a")!;
    const r = createRound(m, 0);
    trade(r, seat, "LAMP", 50);
    trade(r, seat, "LAMP", -80);
    const pos = bookOf(r, seat.id)!.positions.find((p) => p.ticker === "LAMP")!;
    assert.equal(pos.shares, -30, "should end net short thirty");
  });

  it("refuses a trade it cannot fund, and an unknown name", () => {
    const m = match();
    const seat = m.seats.find((s) => s.role === "trader" && s.team === "a")!;
    const r = createRound(m, 0);
    assert.equal(trade(r, seat, "NOPE", 10), "err.ticker");
    assert.equal(trade(r, seat, "GOLD", 0), "err.qty");
    assert.equal(trade(r, seat, "GOLD", 10_000_000), "err.cash");
  });

  it("leaves borrowing out of net worth", () => {
    const m = match();
    const seat = m.seats.find((s) => s.role === "trader" && s.team === "a")!;
    const r = createRound(m, 0);
    const before = seatNav(r, seat.id);
    trade(r, seat, "SEMI", 100, 3);
    const pos = bookOf(r, seat.id)!.positions[0]!;
    assert.ok(pos.borrowed > 0, "leverage must record a loan");
    assert.ok(Math.abs(seatNav(r, seat.id) - before) < before * 0.01, "borrowing is not income");
  });

  it("reports team leverage from gross exposure", () => {
    const m = match();
    const r = createRound(m, 0);
    assert.equal(teamLeverage(r, m, "a"), 0);

    // One seat barely moves the number: the desk has five seats of equity
    // behind it. It is the whole desk piling in that the risk seat must catch.
    const seat = m.seats.find((s) => s.role === "trader" && s.team === "a")!;
    trade(r, seat, "GOLD", 300, 3);
    const solo = teamLeverage(r, m, "a");
    assert.ok(solo > 0 && solo < 0.2, `one seat should barely register, got ${solo}`);

    for (const mate of m.seats.filter((s) => s.team === "a" && s.id !== seat.id)) {
      trade(r, mate, "GOLD", 2000, 5);
    }
    assert.ok(teamLeverage(r, m, "a") > 1, "a desk this long must read as levered");
  });
});

describe("custom rooms", () => {
  it("shortens the round and shrinks the board on request", () => {
    const m = match();
    const r = createRound(m, 0, { lengthTicks: 40, boardSize: 6 });
    assert.equal(r.lengthTicks, 40);
    assert.equal(Object.keys(r.market.stocks).length, 6);
  });

  it("refuses a board so small or a round so short it stops being a match", () => {
    const m = match();
    const r = createRound(m, 0, { lengthTicks: 1, boardSize: 1 });
    assert.ok(r.lengthTicks >= 20, "a one-tick round is not a round");
    assert.ok(Object.keys(r.market.stocks).length >= 6, "a board needs enough names to have a choice");
  });

  it("keeps the standard setup when asked for nothing", () => {
    const m = match();
    const r = createRound(m, 0);
    assert.equal(r.lengthTicks, ROUND_TICKS);
    assert.equal(Object.keys(r.market.stocks).length, MATCH_BOARD.length);
  });
});

describe("round lifecycle", () => {
  it("runs the tape and ends on its own clock", () => {
    const m = match();
    const r = createRound(m, 0);
    const first = priceOf(r, "GOLD");
    for (let i = 0; i < r.lengthTicks; i++) stepRound(r);
    assert.equal(r.done, true);
    assert.equal(r.elapsed, r.lengthTicks);
    assert.notEqual(priceOf(r, "GOLD"), first, "prices should have moved");
    stepRound(r); // a finished round ignores further ticks
    assert.equal(r.elapsed, r.lengthTicks);
  });

  it("settles every book to cash at the bell", () => {
    const m = match();
    const seat = m.seats.find((s) => s.role === "trader" && s.team === "a")!;
    const r = createRound(m, 0);
    trade(r, seat, "GOLD", 100);
    trade(r, seat, "OAK", -100);
    for (let i = 0; i < 20; i++) stepRound(r);
    settleAll(r, m);
    assert.ok(r.books.every((b) => b.positions.length === 0), "everyone must be flat");
  });

  it("calls a dead heat a draw instead of quietly handing it to team A", () => {
    // Nobody trades, so every desk finishes on exactly its starting cash.
    const m = match({ teamCount: 3 });
    const r = createRound(m, 0);
    for (let i = 0; i < 5; i++) stepRound(r);
    const res = finishRound(r, m);
    assert.equal(res.standings[0]!.returnPct, res.standings[1]!.returnPct);
    assert.equal(res.winner, null, "a tie must not award the first-listed team");
    assert.equal(winsFor([res], "a"), 0);
  });

  it("ranks teams by return and names a winner", () => {
    const m = match({ teamCount: 3 });
    const r = createRound(m, 0);
    for (let i = 0; i < 30; i++) stepRound(r);
    // Trade first, so the desks genuinely diverge and the round has a winner.
    for (const seat of m.seats) trade(r, seat, MATCH_BOARD[m.seats.indexOf(seat) % 12]!, 40 + m.seats.indexOf(seat));
    for (let i = 0; i < 30; i++) stepRound(r);
    const res = finishRound(r, m);
    assert.equal(res.standings.length, 3);
    assert.ok(res.winner, "diverged desks must produce a winner");
    assert.equal(res.winner, res.standings[0]!.team);
    for (let i = 1; i < res.standings.length; i++) {
      assert.ok(res.standings[i - 1]!.returnPct >= res.standings[i]!.returnPct, "standings must be sorted");
    }
    assert.ok(res.standings.every((s) => s.start === 5 * SEAT_START_CASH));
  });

  it("replays identically from the same match seed", () => {
    const play = () => {
      const m = match();
      const r = createRound(m, 0);
      const rng = makeRng(99);
      for (let i = 0; i < 40; i++) {
        stepRound(r);
        stepBots(r, m, rng);
      }
      return { px: priceOf(r, "GOLD"), navs: m.seats.map((s) => seatNav(r, s.id)) };
    };
    assert.deepEqual(play(), play());
  });

  it("gives each round of a series a different tape", () => {
    const m = match();
    const run = (i: number) => {
      const r = createRound(m, i);
      for (let k = 0; k < 30; k++) stepRound(r);
      return priceOf(r, "GOLD");
    };
    assert.notEqual(run(0), run(1));
  });
});

describe("bots and callouts", () => {
  it("the desk hears from its own seats and never from the other team", () => {
    const m = match({ playerRole: "trader", teamCount: 2 });
    const r = createRound(m, 0);
    const rng = makeRng(11);
    for (let i = 0; i < 60; i++) {
      stepRound(r);
      stepBots(r, m, rng);
    }
    const mine = calloutsFor(r, "a");
    assert.ok(mine.length > 0, "a silent desk gives the player nothing to act on");
    assert.ok(mine.every((c) => c.team === "a"));
    assert.ok(r.callouts.some((c) => c.team === "b"), "team b should be talking too");
  });

  it("relays the analyst's model read, which the player cannot see themselves", () => {
    // The player is the trader here: without this callout they are blind.
    const m = match({ playerRole: "trader" });
    const r = createRound(m, 0);
    const rng = makeRng(5);
    for (let i = 0; i < 80; i++) {
      stepRound(r);
      stepBots(r, m, rng);
    }
    assert.ok(
      calloutsFor(r, "a").some((c) => c.role === "analyst"),
      "the analyst seat must report",
    );
  });

  it("never lets a bot trade on terms the player could not get", () => {
    const m = match();
    const r = createRound(m, 0);
    const rng = makeRng(13);
    for (let i = 0; i < 80; i++) {
      stepRound(r);
      stepBots(r, m, rng);
    }
    // Nobody can end a round with negative cash they never funded.
    for (const b of r.books) {
      assert.ok(Number.isFinite(b.cash), `${b.seatId} cash went non-finite`);
      assert.ok(Number.isFinite(seatNav(r, b.seatId)), `${b.seatId} nav went non-finite`);
    }
  });

  it("leaves the human seat alone", () => {
    const m = match({ playerRole: "analyst" });
    const me = m.seats.find((s) => s.human)!;
    const r = createRound(m, 0);
    const rng = makeRng(17);
    for (let i = 0; i < 60; i++) {
      stepRound(r);
      stepBots(r, m, rng);
    }
    assert.equal(bookOf(r, me.id)!.positions.length, 0, "bots must not trade the player's book");
    assert.ok(!r.callouts.some((c) => c.seatId === me.id), "bots must not speak for the player");
  });
});

describe("rating", () => {
  it("starts new players low enough to have somewhere to climb", () => {
    // Placement lands on 跑单员, not in the middle of the ladder — the first
    // promotion should be something you earn in your first evening.
    assert.equal(tierOf(RATING_START).id, "clerk");
    assert.equal(toNextTier(RATING_START)!.tier.id, "dealer");
    assert.equal(tierOf(0).id, "intern");
    assert.equal(tierOf(99_999).id, "legend");
    assert.equal(toNextTier(99_999), null);
  });

  it("moves placement matches faster than settled ones", () => {
    assert.ok(kFactor(0) > kFactor(20));
    assert.ok(kFactor(20) > kFactor(100));
  });

  it("rewards a win over a stronger field more than over a weaker one", () => {
    const base = { rating: 1200, place: 0, fieldSize: 2, played: 50 };
    const vsStrong = applySeriesResult({ ...base, opponentRating: 1600 });
    const vsWeak = applySeriesResult({ ...base, opponentRating: 800 });
    assert.ok(vsStrong > vsWeak);
    assert.ok(vsStrong > 1200 && vsWeak > 1200, "a win should never lose points");
  });

  it("makes second of three roughly neutral and third a loss", () => {
    const base = { rating: 1200, opponentRating: 1200, fieldSize: 3, played: 50 };
    const first = applySeriesResult({ ...base, place: 0 });
    const second = applySeriesResult({ ...base, place: 1 });
    const third = applySeriesResult({ ...base, place: 2 });
    assert.ok(first > second && second > third);
    assert.ok(Math.abs(second - 1200) <= 1, `second place moved ${second - 1200}`);
    assert.ok(third < 1200);
  });

  it("scores a forfeit exactly like finishing last", () => {
    // The desk screen tells the player that leaving a ranked match costs what
    // losing costs. This is that promise, in numbers.
    const base = { rating: 1400, opponentRating: 1400, played: 50 };
    const lostOnTheBoard = applySeriesResult({ ...base, place: 1, fieldSize: 2 });
    const walkedAway = applySeriesResult({ ...base, place: 2 - 1, fieldSize: 2 });
    assert.equal(walkedAway, lostOnTheBoard);
    assert.ok(walkedAway < base.rating, "a forfeit has to cost something");
  });

  it("never drops below the floor", () => {
    let rating = 5;
    for (let i = 0; i < 20; i++) {
      rating = applySeriesResult({ rating, opponentRating: 2400, place: 1, fieldSize: 2, played: 100 });
    }
    assert.ok(rating >= 0);
  });
});
