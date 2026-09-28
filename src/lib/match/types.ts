import type { GameState } from "../game/types.ts";

/**
 * A competitive match: two or three teams of five trading the same tape, over a
 * best-of series. One round is a trading session, not a lifetime — the
 * single-player economy (rent, mortgages, credit, construction) is not part of
 * it.
 */

/** The five seats on a desk. Each sees something the others do not. */
export type RoleId = "analyst" | "trader" | "risk" | "desk" | "pm";

export type TeamId = "a" | "b" | "c";

/** 5v5 or 5v5v5. */
export type TeamCount = 2 | 3;

/** Best-of-five (first to 3) or best-of-seven (first to 4). */
export type MatchFormat = "bo5" | "bo7";

/**
 * `practice` is the warm-up: no rating, no queue. `casual` is matchmaking,
 * `ranked` moves your rating.
 */
export type MatchMode = "practice" | "casual" | "ranked";

export interface Seat {
  /** Stable within a match; books and callouts key off it. */
  id: string;
  team: TeamId;
  role: RoleId;
  name: string;
  /** Exactly one seat is the player while this runs single-player. */
  human: boolean;
  /** 0..1 — how well a bot in this seat plays. Ignored for the human. */
  skill: number;
}

/** One seat's book for one round. Lean by design: a round is minutes long. */
export interface SeatBook {
  seatId: string;
  /** Cash in Leo. Every match board is Leo-denominated. */
  cash: number;
  /** What this seat started the round with, for the return figure. */
  start: number;
  positions: MatchPosition[];
}

export interface MatchPosition {
  ticker: string;
  /** Negative for a short. */
  shares: number;
  avgCost: number;
  /** Margin loan behind a leveraged long. */
  borrowed: number;
  /** Own cash locked behind a short, released on cover. */
  shortMargin: number;
}

/** What a teammate says out loud. In single-player this is how you learn. */
export interface Callout {
  id: string;
  tick: number;
  seatId: string;
  role: RoleId;
  team: TeamId;
  zh: string;
  en: string;
  /** Drives emphasis in the feed; `alert` is the one you must not miss. */
  tone: "info" | "edge" | "alert";
}

export interface RoundState {
  index: number;
  /** The shared tape. Only the market half of the sim runs on it. */
  market: GameState;
  books: SeatBook[];
  callouts: Callout[];
  /** Ticks elapsed in this round, not the market's absolute tick. */
  elapsed: number;
  lengthTicks: number;
  done: boolean;
}

export interface TeamStanding {
  team: TeamId;
  nav: number;
  start: number;
  returnPct: number;
}

export interface RoundResult {
  index: number;
  standings: TeamStanding[];
  /**
   * Null on a dead heat. A stable sort would otherwise hand every tie to the
   * team that happens to be listed first, which is a quiet bias in team A's
   * favour across a whole ladder.
   */
  winner: TeamId | null;
}

export interface MatchState {
  id: string;
  mode: MatchMode;
  format: MatchFormat;
  teams: TeamId[];
  seats: Seat[];
  seed: number;
  results: RoundResult[];
  /** Set once a team reaches the wins the format needs. */
  winner: TeamId | null;
}
