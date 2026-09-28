import { createInitial, stepMarket } from "../game/sim.ts";
import { makeRng, seededDraw } from "../game/math.ts";
import type { GameState, Stock } from "../game/types.ts";
import { roleOf } from "./roles.ts";
import type { MatchPosition, MatchState, RoundResult, RoundState, Seat, SeatBook, TeamId, TeamStanding } from "./types.ts";

/**
 * The match board: twelve names, chosen so every one of them teaches a
 * different lesson. Duration runs from −3 (a bank, which LIKES a hike) to +16
 * (a quantum story that is all terminal value), which is exactly the axis the
 * analyst seat is reading.
 *
 * Twelve, not two hundred. A name the desk can refer to by nickname is worth
 * more than a spreadsheet nobody has an opinion about.
 */
export const MATCH_BOARD = [
  "GOLD", "QBIT", "SEMI", "MEMX",
  "BLUE", "OAK", "NOVA", "BOLT",
  "LAMP", "STEEL", "PIXL", "CLDX",
] as const;

/** Every seat starts a round with the same book. Skill decides the rest. */
export const SEAT_START_CASH = 250_000;

/** Base spread the board charges before the role multiplier. */
const BASE_SLIP = 0.0016;

/** Hours of tape in one round. At ~2.2s a tick this is a 4–6 minute session. */
export const ROUND_TICKS = 120;

/** The market opens at 09:00 on the round's first tick. */
const ROUND_START_TICK = 9;

/** What a custom room may change. Practice only — ranked always uses defaults. */
export interface RoundSetup {
  /** Ticks of tape. Defaults to {@link ROUND_TICKS}. */
  lengthTicks?: number;
  /** How many names are on the board, from 6 up to the full twelve. */
  boardSize?: number;
}

export function createRound(match: MatchState, index: number, setup: RoundSetup = {}): RoundState {
  // Each round gets its own tape off the match seed, so a series is replayable
  // end to end from one number and every team sees the identical market.
  const seed = (match.seed ^ ((index + 1) * 0x9e3779b9)) >>> 0;
  const market = createInitial("MARKET", "retail", "MATCH00000001", "male", "leo");
  market.seed = seed;
  market.rngState = seed;
  market.tick = ROUND_START_TICK;
  market.stocks = boardOnly(market.stocks, setup.boardSize);
  // A round is a trading session: none of the single-player economy applies.
  market.properties = [];
  market.plots = [];
  market.projects = [];
  market.rivals = [];
  market.clients = [];
  market.fundAum = 0;

  return {
    index,
    market,
    books: match.seats.map((seat) => ({
      seatId: seat.id,
      cash: SEAT_START_CASH,
      start: SEAT_START_CASH,
      positions: [],
    })),
    callouts: [],
    elapsed: 0,
    lengthTicks: Math.max(20, setup.lengthTicks ?? ROUND_TICKS),
    done: false,
  };
}

function boardOnly(all: Record<string, Stock>, size?: number): Record<string, Stock> {
  const out: Record<string, Stock> = {};
  // A smaller board keeps the duration spread: the list is already ordered so
  // that the first six cover tech, banks, property, pharma, energy and retail.
  const n = size ?? MATCH_BOARD.length;
  const want = MATCH_BOARD.slice(0, Math.max(6, Math.min(n, MATCH_BOARD.length)));
  for (const ticker of want) {
    const st = all[ticker];
    if (st) out[ticker] = st;
  }
  return out;
}

export function bookOf(round: RoundState, seatId: string): SeatBook | undefined {
  return round.books.find((b) => b.seatId === seatId);
}

export function priceOf(round: RoundState, ticker: string): number {
  return round.market.stocks[ticker]?.price ?? 0;
}

/** Marked-to-market value of one seat's book, net of what it borrowed. */
export function seatNav(round: RoundState, seatId: string): number {
  const book = bookOf(round, seatId);
  if (!book) return 0;
  let nav = book.cash;
  for (const p of book.positions) {
    nav += p.shares * priceOf(round, p.ticker);
    nav += p.shortMargin;
    nav -= p.borrowed;
  }
  return nav;
}

export function teamNav(round: RoundState, match: MatchState, team: TeamId): number {
  return match.seats
    .filter((s) => s.team === team)
    .reduce((a, s) => a + seatNav(round, s.id), 0);
}

/** Gross exposure over equity — what the risk seat is watching. */
export function teamLeverage(round: RoundState, match: MatchState, team: TeamId): number {
  const seats = match.seats.filter((s) => s.team === team);
  let gross = 0;
  for (const seat of seats) {
    const book = bookOf(round, seat.id);
    if (!book) continue;
    for (const p of book.positions) gross += Math.abs(p.shares * priceOf(round, p.ticker));
  }
  const equity = Math.max(1, teamNav(round, match, team));
  return gross / equity;
}

/** The spread this seat pays, after its role multiplier. */
export function slippageFor(seat: Seat): number {
  return BASE_SLIP * roleOf(seat.role).slippageMult;
}

export type TradeError =
  | "err.qty"
  | "err.ticker"
  | "err.cash"
  | "err.noPos"
  | "err.roundOver";

/**
 * Buy (positive `shares`) or sell/short (negative). One entry point so the
 * role's spread is applied in exactly one place and a bot cannot trade on terms
 * the player could not.
 */
export function trade(
  round: RoundState,
  seat: Seat,
  ticker: string,
  shares: number,
  leverage = 1,
): TradeError | null {
  if (round.done) return "err.roundOver";
  if (!Number.isFinite(shares) || shares === 0) return "err.qty";
  const st = round.market.stocks[ticker];
  if (!st) return "err.ticker";
  const book = bookOf(round, seat.id);
  if (!book) return "err.noPos";

  const slip = slippageFor(seat);
  const qty = Math.trunc(shares);
  const buying = qty > 0;
  const px = buying ? st.price * (1 + slip) : st.price * (1 - slip);
  const existing = book.positions.find((p) => p.ticker === ticker);

  // Trading against an open position closes it down first rather than opening
  // an opposing one — the same rule the single-player desk uses.
  if (existing && Math.sign(existing.shares) === -Math.sign(qty)) {
    const closing = Math.min(Math.abs(qty), Math.abs(existing.shares));
    closePartial(book, existing, closing, px);
    const left = Math.abs(qty) - closing;
    if (left === 0) return null;
    return trade(round, seat, ticker, Math.sign(qty) * left, leverage);
  }

  if (buying) {
    const lev = Math.max(1, Math.min(leverage, 5));
    const cost = px * qty;
    const own = cost / lev;
    if (book.cash < own) return "err.cash";
    book.cash -= own;
    const borrowed = cost - own;
    if (existing) {
      const total = existing.shares + qty;
      existing.avgCost = (existing.avgCost * existing.shares + px * qty) / Math.max(1, total);
      existing.shares = total;
      existing.borrowed += borrowed;
    } else {
      book.positions.push({ ticker, shares: qty, avgCost: px, borrowed, shortMargin: 0 });
    }
    return null;
  }

  // Short: post half the notional, take the proceeds.
  const n = Math.abs(qty);
  const proceeds = px * n;
  const margin = proceeds * 0.5;
  if (book.cash < margin) return "err.cash";
  book.cash -= margin;
  book.cash += proceeds;
  if (existing) {
    const total = Math.abs(existing.shares) + n;
    existing.avgCost = (existing.avgCost * Math.abs(existing.shares) + px * n) / Math.max(1, total);
    existing.shares -= n;
    existing.shortMargin += margin;
  } else {
    book.positions.push({ ticker, shares: -n, avgCost: px, borrowed: 0, shortMargin: margin });
  }
  return null;
}

function closePartial(book: SeatBook, pos: MatchPosition, shares: number, px: number) {
  const ratio = shares / Math.abs(pos.shares);
  if (pos.shares > 0) {
    book.cash += shares * px;
    const repay = pos.borrowed * ratio;
    book.cash -= repay;
    pos.borrowed -= repay;
    pos.shares -= shares;
  } else {
    book.cash -= shares * px;
    const release = pos.shortMargin * ratio;
    book.cash += release;
    pos.shortMargin -= release;
    pos.shares += shares;
  }
  if (Math.abs(pos.shares) < 1e-9) {
    const i = book.positions.indexOf(pos);
    if (i >= 0) book.positions.splice(i, 1);
  }
}

/** Flatten one position completely. The risk seat's force-cut runs through here. */
export function closePosition(round: RoundState, seat: Seat, ticker: string): TradeError | null {
  const book = bookOf(round, seat.id);
  if (!book) return "err.noPos";
  const pos = book.positions.find((p) => p.ticker === ticker);
  if (!pos) return "err.noPos";
  const st = round.market.stocks[ticker];
  if (!st) return "err.ticker";
  const slip = slippageFor(seat);
  const px = pos.shares > 0 ? st.price * (1 - slip) : st.price * (1 + slip);
  closePartial(book, pos, Math.abs(pos.shares), px);
  return null;
}

/** Flatten every book. Called at the bell so a round settles in cash. */
export function settleAll(round: RoundState, match: MatchState) {
  for (const seat of match.seats) {
    const book = bookOf(round, seat.id);
    if (!book) continue;
    for (const pos of [...book.positions]) closePosition(round, seat, pos.ticker);
  }
}

/** Advance the shared tape one hour. Bots and callouts are layered on top. */
export function stepRound(round: RoundState) {
  if (round.done) return;
  const m = round.market;
  m.tick += 1;
  const rng = () => {
    const { value, next } = seededDraw(m.rngState, m.seed);
    m.rngState = next;
    return value;
  };
  stepMarket(m, rng);
  round.elapsed += 1;
  if (round.elapsed >= round.lengthTicks) round.done = true;
}

export function roundRng(round: RoundState): () => number {
  return makeRng(round.market.rngState || round.market.seed || 1);
}

/**
 * Live standings, best return first — safe to call mid-round.
 *
 * A competitive round has to show you the scoreboard while it still matters.
 * Marked to market, so it moves under you exactly like the real thing.
 */
export function standingsOf(round: RoundState, match: MatchState): TeamStanding[] {
  const standings: TeamStanding[] = match.teams.map((team) => {
    const seats = match.seats.filter((s) => s.team === team);
    const nav = seats.reduce((a, s) => a + seatNav(round, s.id), 0);
    const start = seats.length * SEAT_START_CASH;
    return { team, nav, start, returnPct: nav / Math.max(1, start) - 1 };
  });
  standings.sort((a, b) => b.returnPct - a.returnPct);
  return standings;
}

/** Final standings for a finished round. Everything is flattened to cash first. */
export function finishRound(round: RoundState, match: MatchState): RoundResult {
  settleAll(round, match);
  round.done = true;
  const standings = standingsOf(round, match);
  const top = standings[0]!;
  const drawn = standings.filter((s) => Math.abs(s.returnPct - top.returnPct) < 1e-12).length > 1;
  return { index: round.index, standings, winner: drawn ? null : top.team };
}
