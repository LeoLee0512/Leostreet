import { create } from "zustand";
import { makeRng, seededDraw } from "../game/math.ts";
import { stepBots } from "./bots.ts";
import { recordBout } from "../game/honor.ts";
import { applySeriesResult, readRanked, writeRanked, type RankedRecord } from "./rating.ts";
import { ROLES } from "./roles.ts";
import {
  closePosition,
  createRound,
  type RoundSetup,
  finishRound,
  seatNav,
  stepRound,
  trade as tradeSeat,
  type TradeError,
} from "./round.ts";
import { createMatch, playerSeat, recordRound } from "./series.ts";
import type {
  MatchFormat,
  MatchMode,
  MatchState,
  RoleId,
  RoundResult,
  RoundState,
  TeamCount,
} from "./types.ts";

/** Wall-clock seconds per tick of tape. 120 ticks ≈ 4.8 minutes of round. */
export const MATCH_TICK_SECONDS = 2.4;

/**
 * `intro` is the huddle before the bell: the lineup, your seat, and what that
 * seat can see. A round that just starts gives the player no moment to read
 * their own role, and the role is the whole game.
 */
export type MatchPhase = "idle" | "intro" | "round" | "roundResult" | "matchResult";

interface MatchStore {
  phase: MatchPhase;
  /** Custom-room settings for this match. Empty on every rated queue. */
  setup: RoundSetup;
  match: MatchState | null;
  round: RoundState | null;
  lastResult: RoundResult | null;
  ranked: RankedRecord;
  /** Rating delta from the match that just finished, for the result screen. */
  ratingDelta: number;
  /**
   * Bumped on every mutation. `RoundState` is mutated in place by the round
   * module, so this is what tells React something happened.
   */
  rev: number;

  startMatch: (opts: {
    mode: MatchMode;
    format: MatchFormat;
    teamCount: TeamCount;
    role: RoleId;
    playerName: string;
    /** Ignored outside practice — a custom room must never reach ranked. */
    setup?: RoundSetup;
    /** 0..1 override for bot strength, practice only. */
    botSkill?: number;
  }) => void;
  tick: () => void;
  trade: (ticker: string, shares: number, leverage?: number) => TradeError | null;
  closeOut: (ticker: string) => TradeError | null;
  /** Risk seat only: flatten a teammate's position. */
  forceCut: (seatId: string, ticker: string) => TradeError | null;
  nextRound: () => void;
  /** Leave the huddle and open the market. */
  beginRound: () => void;
  /**
   * Abandon a match in progress. In ranked this is scored as finishing last,
   * so walking away when you are behind costs what losing costs — otherwise
   * the forfeit button is just a way to never lose rating.
   */
  forfeit: () => void;
  quit: () => void;
}

export const useMatch = create<MatchStore>((set, get) => ({
  phase: "idle",
  setup: {},
  match: null,
  round: null,
  lastResult: null,
  ranked: { rating: 1200, played: 0, won: 0 },
  ratingDelta: 0,
  rev: 0,

  startMatch: ({ mode, format, teamCount, role, playerName, setup, botSkill }) => {
    const custom: RoundSetup = mode === "practice" ? (setup ?? {}) : {};
    const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
    const match = createMatch({
      id: `m-${seed.toString(36)}`,
      mode,
      format,
      teamCount,
      playerRole: role,
      playerName,
      seed,
      rng: makeRng(seed),
      // Ranked lobbies are stronger than casual ones, which is most of what
      // separating the two queues means while the opponents are bots.
      botSkill:
        mode === "practice" && typeof botSkill === "number"
          ? botSkill
          : mode === "ranked"
            ? 0.72
            : mode === "casual"
              ? 0.55
              : 0.38,
    });
    set({
      phase: "intro",
      setup: custom,
      match,
      round: createRound(match, 0, custom),
      lastResult: null,
      ratingDelta: 0,
      ranked: readRanked(),
      rev: get().rev + 1,
    });
  },

  tick: () => {
    const { round, match, phase } = get();
    if (phase !== "round" || !round || !match) return;

    stepRound(round);
    // Bots share the round's own stream, so a replayed seed replays the match.
    const rng = () => {
      const { value, next } = seededDraw(round.market.rngState, round.market.seed);
      round.market.rngState = next;
      return value;
    };
    stepBots(round, match, rng);

    if (!round.done) {
      set({ round: { ...round }, rev: get().rev + 1 });
      return;
    }

    const result = finishRound(round, match);
    const nextMatch = recordRound(match, result);
    const over = nextMatch.winner !== null;
    set({
      match: nextMatch,
      round: { ...round },
      lastResult: result,
      phase: over ? "matchResult" : "roundResult",
      rev: get().rev + 1,
    });
    if (over) {
      settleRating(nextMatch, set, get);
      // Every finished series goes into the record, rated or not. A practice
      // match is still something the player played; it just does not count
      // towards the headline win rate.
      logBout(nextMatch, get().ratingDelta);
    }
  },

  trade: (ticker, shares, leverage = 1) => {
    const { round, match } = get();
    const seat = match && playerSeat(match);
    if (!round || !seat) return "err.noPos";
    const err = tradeSeat(round, seat, ticker, shares, leverage);
    if (!err) set({ round: { ...round }, rev: get().rev + 1 });
    return err;
  },

  closeOut: (ticker) => {
    const { round, match } = get();
    const seat = match && playerSeat(match);
    if (!round || !seat) return "err.noPos";
    const err = closePosition(round, seat, ticker);
    if (!err) set({ round: { ...round }, rev: get().rev + 1 });
    return err;
  },

  forceCut: (seatId, ticker) => {
    const { round, match } = get();
    const me = match && playerSeat(match);
    if (!round || !match || !me || me.role !== "risk") return "err.noPos";
    const target = match.seats.find((s) => s.id === seatId && s.team === me.team);
    if (!target) return "err.noPos";
    const err = closePosition(round, target, ticker);
    if (!err) set({ round: { ...round }, rev: get().rev + 1 });
    return err;
  },

  nextRound: () => {
    const { match } = get();
    if (!match || match.winner) return;
    set({
      phase: "intro",
      round: createRound(match, match.results.length, get().setup),
      rev: get().rev + 1,
    });
  },

  beginRound: () => {
    if (get().phase !== "intro") return;
    set({ phase: "round", rev: get().rev + 1 });
  },

  forfeit: () => {
    const { match, ranked } = get();
    if (match?.mode === "ranked") {
      const rating = applySeriesResult({
        rating: ranked.rating,
        opponentRating: ranked.rating,
        place: match.teams.length - 1, // last
        fieldSize: match.teams.length,
        played: ranked.played,
      });
      const next: RankedRecord = { rating, played: ranked.played + 1, won: ranked.won };
      writeRanked(next);
      set({ ranked: next, ratingDelta: rating - ranked.rating });
    }
    // A forfeit is a loss, and it is recorded as one. Walking away when you
    // are behind has to cost what losing costs, in the record as well as in
    // the rating, or the record quietly flatters whoever quits early.
    if (match) logBout(match, get().ratingDelta, true);
    set({ phase: "idle", match: null, round: null, lastResult: null, rev: get().rev + 1 });
  },

  quit: () => set({ phase: "idle", match: null, round: null, lastResult: null, rev: get().rev + 1 }),
}));

/** Write a finished series into the honour record. */
function logBout(match: MatchState, delta: number, forfeited = false) {
  const me = playerSeat(match);
  if (!me) return;
  const seat = ROLES[me.role];
  recordBout({
    kind: "match",
    role: me.role,
    won: !forfeited && match.winner === me.team,
    tag: match.mode,
    note: `${match.teams.length === 3 ? "5v5v5" : "5v5"} · ${match.format.toUpperCase()} · ${seat.nameZh}`,
    delta: match.mode === "ranked" ? delta : undefined,
    // Practice is a warm-up against weaker bots. Counting it would make the
    // headline win rate a number nobody trusts.
    rated: match.mode !== "practice",
  });
}

/** Ranked only: move the rating once the series is decided, then persist it. */
function settleRating(
  match: MatchState,
  set: (patch: Partial<MatchStore>) => void,
  get: () => MatchStore,
) {
  if (match.mode !== "ranked" || !match.winner) return;
  const me = playerSeat(match);
  if (!me) return;

  const order = [...match.teams].sort(
    (x, y) => totalReturn(match, y) - totalReturn(match, x),
  );
  const place = Math.max(0, order.indexOf(me.team));
  const before = get().ranked;
  const rating = applySeriesResult({
    rating: before.rating,
    // Bot lobbies have no rating of their own; the queue is assumed even.
    opponentRating: before.rating,
    place,
    fieldSize: match.teams.length,
    played: before.played,
  });
  const next: RankedRecord = {
    rating,
    played: before.played + 1,
    won: before.won + (match.winner === me.team ? 1 : 0),
  };
  writeRanked(next);
  set({ ranked: next, ratingDelta: rating - before.rating });
}

function totalReturn(match: MatchState, team: string): number {
  return match.results.reduce(
    (a, r) => a + (r.standings.find((s) => s.team === team)?.returnPct ?? 0),
    0,
  );
}

/** Player's own mark-to-market for the round in progress. */
export function myNav(store: MatchStore): number {
  const seat = store.match && playerSeat(store.match);
  if (!store.round || !seat) return 0;
  return seatNav(store.round, seat.id);
}
