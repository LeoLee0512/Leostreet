import { realizedVol } from "../game/math.ts";
import { roleOf } from "./roles.ts";
import { MATCH_BOARD, bookOf, closePosition, priceOf, seatNav, teamLeverage, trade } from "./round.ts";
import type { Callout, MatchState, RoundState, Seat, TeamId } from "./types.ts";

/**
 * The desk, played by the machine.
 *
 * Bots exist for two reasons and the second one matters more. They trade, so a
 * round has opponents. And they **talk** — which is the whole point of the
 * asymmetric seats. In single-player the four teammates around you are the only
 * way the analyst's model value, the desk's early news and the risk seat's
 * leverage warning ever reach you.
 *
 * That is also what replaces reading the street for information: the signal now
 * comes from people, not from scenery, which is the one channel that survives
 * into real multiplayer unchanged.
 */

let calloutSeq = 0;

function say(
  round: RoundState,
  seat: Seat,
  zh: string,
  en: string,
  tone: Callout["tone"] = "info",
) {
  calloutSeq += 1;
  round.callouts.push({
    id: `c${calloutSeq}`,
    tick: round.elapsed,
    seatId: seat.id,
    role: seat.role,
    team: seat.team,
    zh,
    en,
    tone,
  });
  // The feed is a tail, not a transcript.
  if (round.callouts.length > 60) round.callouts.splice(0, round.callouts.length - 60);
}

/** Only your own desk's chatter reaches you. */
export function calloutsFor(round: RoundState, team: TeamId): Callout[] {
  return round.callouts.filter((c) => c.team === team);
}

const ZH_NAME: Record<string, string> = {
  GOLD: "金狮", QBIT: "量子鬃", SEMI: "狮芯", MEMX: "忆鬃",
  BLUE: "蓝鲸", OAK: "橡树", NOVA: "新星", BOLT: "闪电",
  LAMP: "街灯", STEEL: "钢铁", PIXL: "像素", CLDX: "云鬃",
};

const zhOf = (t: string) => ZH_NAME[t] ?? t;

/** How far a name has run from model value. The analyst's whole job. */
function gapOf(round: RoundState, ticker: string): number {
  const st = round.market.stocks[ticker];
  if (!st || !st.fair) return 0;
  return st.price / st.fair - 1;
}

function pickExtreme(round: RoundState): { ticker: string; gap: number } {
  let best = { ticker: MATCH_BOARD[0] as string, gap: 0 };
  for (const t of MATCH_BOARD) {
    const gap = gapOf(round, t);
    if (Math.abs(gap) > Math.abs(best.gap)) best = { ticker: t, gap };
  }
  return best;
}

/**
 * Run one bot seat for one tick: what it says, then what it does.
 * `rng` is the round's own stream, so a replayed round replays identically.
 */
export function stepBot(round: RoundState, match: MatchState, seat: Seat, rng: () => number) {
  if (seat.human || round.done) return;
  const spec = roleOf(seat.role);
  const skill = seat.skill;

  switch (seat.role) {
    case "analyst":
      analystTurn(round, seat, skill, rng);
      break;
    case "trader":
      traderTurn(round, seat, skill, rng);
      break;
    case "risk":
      riskTurn(round, match, seat, skill);
      break;
    case "desk":
      deskTurn(round, seat, spec.newsLeadTicks, skill);
      break;
    case "pm":
      pmTurn(round, match, seat, skill, rng);
      break;
  }
}

/** Calls the mispricing out loud, and takes a small position itself. */
function analystTurn(round: RoundState, seat: Seat, skill: number, rng: () => number) {
  if (round.elapsed % 6 !== 0) return;
  const { ticker, gap } = pickExtreme(round);
  const st = round.market.stocks[ticker];
  if (!st) return;
  if (Math.abs(gap) < 0.02) return;

  // A mispricing can persist for many ticks. Repeating the identical line every
  // six of them buries the rest of the desk's chatter, so hold the call until
  // it has meaningfully moved or gone quiet for a while.
  const prior = [...round.callouts]
    .reverse()
    .find((c) => c.team === seat.team && c.role === "analyst" && c.en.startsWith(ticker));
  if (prior && round.elapsed - prior.tick < 24) return;

  // A weaker analyst mis-reads the gap, so bad teammates give bad calls.
  const noise = (rng() - 0.5) * (1 - skill) * 0.08;
  const called = gap + noise;
  const rich = called > 0;
  say(
    round,
    seat,
    `${zhOf(ticker)} 模型价 ${st.fair.toFixed(0)}，现价 ${st.price.toFixed(0)}，久期 ${st.duration.toFixed(0)}。${rich ? "贵了" : "便宜了"} ${Math.abs(called * 100).toFixed(0)}%`,
    `${ticker} fair ${st.fair.toFixed(0)} vs ${st.price.toFixed(0)}, duration ${st.duration.toFixed(0)} — ${rich ? "rich" : "cheap"} by ${Math.abs(called * 100).toFixed(0)}%`,
    Math.abs(called) > 0.05 ? "edge" : "info",
  );

  if (Math.abs(called) > 0.04) {
    const size = Math.floor((seatNavBudget(round, seat) * 0.18) / Math.max(1, st.price));
    if (size > 0) trade(round, seat, ticker, rich ? -size : size, 1);
  }
}

/** Acts on the loudest recent call from its own desk. */
function traderTurn(round: RoundState, seat: Seat, skill: number, rng: () => number) {
  if (round.elapsed % 3 !== 0) return;
  const call = [...round.callouts]
    .reverse()
    .find((c) => c.team === seat.team && c.role === "analyst" && round.elapsed - c.tick <= 8);
  if (!call) return;
  if (rng() > 0.35 + skill * 0.5) return;

  const ticker = MATCH_BOARD.find((t) => call.en.startsWith(t));
  if (!ticker) return;
  const st = round.market.stocks[ticker];
  if (!st) return;
  const rich = call.en.includes("rich");
  const size = Math.floor((seatNavBudget(round, seat) * 0.3) / Math.max(1, st.price));
  if (size <= 0) return;
  const err = trade(round, seat, ticker, rich ? -size : size, rich ? 1 : 2);
  if (!err && round.elapsed % 12 === 0) {
    say(
      round,
      seat,
      `${zhOf(ticker)} 我上了 ${size} 股，${rich ? "空" : "多"}。滑点这边最便宜。`,
      `Took ${size} ${ticker} ${rich ? "short" : "long"} — cheapest fills are on my seat.`,
    );
  }
}

/** Watches the desk's leverage and cuts the worst book when it runs hot. */
function riskTurn(round: RoundState, match: MatchState, seat: Seat, skill: number) {
  if (round.elapsed % 4 !== 0) return;
  const lev = teamLeverage(round, match, seat.team);
  const ceiling = 2.6 + (1 - skill) * 1.4;

  if (lev > ceiling * 0.8 && lev <= ceiling) {
    say(
      round,
      seat,
      `全队杠杆 ${lev.toFixed(1)}x，再加我就砍。`,
      `Desk leverage ${lev.toFixed(1)}x. Add more and I cut.`,
      "alert",
    );
    return;
  }
  if (lev <= ceiling) return;

  const mates = match.seats.filter((s) => s.team === seat.team);
  let worst: { seat: Seat; ticker: string; loss: number } | null = null;
  for (const mate of mates) {
    const book = bookOf(round, mate.id);
    if (!book) continue;
    for (const p of book.positions) {
      const loss = (priceOf(round, p.ticker) - p.avgCost) * p.shares;
      if (!worst || loss < worst.loss) worst = { seat: mate, ticker: p.ticker, loss };
    }
  }
  if (!worst) return;
  closePosition(round, worst.seat, worst.ticker);
  say(
    round,
    seat,
    `杠杆 ${lev.toFixed(1)}x 超线，强制平掉 ${zhOf(worst.ticker)}。别骂，活着要紧。`,
    `${lev.toFixed(1)}x is over the line — cutting ${worst.ticker}. Survive first.`,
    "alert",
  );
}

/** Sees a pending shock early and announces it before the tape reacts. */
function deskTurn(round: RoundState, seat: Seat, lead: number, skill: number) {
  const m = round.market;
  const soon = m.pending.find((p) => p.tick > m.tick && p.tick - m.tick <= lead);
  if (!soon) return;
  // A weak desk seat sometimes sits on it.
  if (skill < 0.4 && round.elapsed % 2 === 0) return;
  const already = round.callouts.some(
    (c) => c.team === seat.team && c.role === "desk" && round.elapsed - c.tick < lead + 1,
  );
  if (already) return;

  if (soon.rateShock) {
    const cut = soon.rateShock < 0;
    say(
      round,
      seat,
      `${lead} 个 tick 后有${cut ? "降息" : "加息"}消息。高久期的先动。`,
      `${cut ? "A cut" : "A hike"} lands in ${lead} ticks. High duration moves first.`,
      "edge",
    );
    return;
  }
  if (soon.ticker && soon.shock) {
    const up = soon.shock > 0;
    say(
      round,
      seat,
      `${zhOf(soon.ticker)} ${lead} 个 tick 后有${up ? "利好" : "利空"}落地。`,
      `${soon.ticker} gets ${up ? "good" : "bad"} news in ${lead} ticks.`,
      "edge",
    );
  }
}

/** Reads the desk's book and tells the biggest loser to size down. */
function pmTurn(round: RoundState, match: MatchState, seat: Seat, skill: number, rng: () => number) {
  if (round.elapsed % 10 !== 0) return;
  const mates = match.seats.filter((s) => s.team === seat.team && s.id !== seat.id);
  if (!mates.length) return;

  if (round.elapsed === 10) {
    say(
      round,
      seat,
      `开盘了。分析师报价，交易员执行，风控盯杠杆。别单干。`,
      `We're open. Analyst calls, trader executes, risk watches leverage. Nobody freelances.`,
    );
    return;
  }

  const worst = mates.reduce((a, b) => (seatNav(round, a.id) < seatNav(round, b.id) ? a : b));
  const pnl = seatNav(round, worst.id) - (bookOf(round, worst.id)?.start ?? 0);
  if (pnl < -12_000) {
    say(
      round,
      seat,
      `${worst.name} 这一轮亏了 ${Math.abs(pnl / 1000).toFixed(0)}K，先收手。`,
      `${worst.name} is down ${Math.abs(pnl / 1000).toFixed(0)}K this round — size down.`,
      "alert",
    );
  }

  // The PM also trades its own book, conservatively.
  if (rng() > skill) return;
  const { ticker, gap } = pickExtreme(round);
  const st = round.market.stocks[ticker];
  if (!st || Math.abs(gap) < 0.05) return;
  const size = Math.floor((seatNavBudget(round, seat) * 0.12) / Math.max(1, st.price));
  if (size > 0) trade(round, seat, ticker, gap > 0 ? -size : size, 1);
}

function seatNavBudget(round: RoundState, seat: Seat): number {
  return Math.max(0, Math.min(seatNav(round, seat.id), bookOf(round, seat.id)?.cash ?? 0));
}

/** Step every bot seat for this tick. */
export function stepBots(round: RoundState, match: MatchState, rng: () => number) {
  for (const seat of match.seats) stepBot(round, match, seat, rng);
}
