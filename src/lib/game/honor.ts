import {
  debt,
  deposits,
  futureMtm,
  netWorth,
  optionMtm,
  postedFutures,
  propertyEquity,
  shortMarginPosted,
  stockBorrow,
  stockMtm,
  toLeo,
} from "./economy.ts";
import type { GameState } from "./types.ts";

/**
 * 荣誉系统 — the record of what this account has actually done.
 *
 * Everything here is local and descriptive. Nothing in this file grants
 * anything, unlocks anything or can be bought: it reads what happened and
 * adds it up. That is deliberate — the moment a stats page can hand out a
 * reward, it stops being a record and becomes another progression system.
 *
 * Two things are worth knowing before you read on:
 *
 * - **Win rate is only counted where winning means something.** Practice
 *   matches and abandoned runs are stored but excluded from the headline
 *   rate, because a number that counts warm-ups is a number nobody trusts.
 * - **Company debt is a real liability, not a metaphor.** Client money and
 *   outside investors' capital are things the firm owes back, so they are
 *   listed as debt and broken out rather than netted into one figure.
 */

const KEY = "leo-street-honor-v1";
/** How many bouts are kept. Old ones fall off the end of the list. */
const MAX_BOUTS = 200;

/* ------------------------------------------------------------------ */
/* Shapes                                                              */
/* ------------------------------------------------------------------ */

export interface LoginLog {
  /** Sessions started on this device. */
  sessions: number;
  /** Epoch ms of the first session ever seen. */
  firstAt: number;
  /** Epoch ms of the most recent session. */
  lastAt: number;
  /** Distinct calendar days played, as YYYY-MM-DD, newest last. */
  days: string[];
  /** Consecutive days up to and including the last one played. */
  streak: number;
  bestStreak: number;
  /** Total seconds with the game open, accumulated across sessions. */
  seconds: number;
}

/** A match or a story run, once it is over. */
export interface Bout {
  id: string;
  at: number;
  kind: "match" | "story";
  /** Match: the seat (`analyst`…). Story: the chair (`governor`…). */
  role: string;
  won: boolean;
  /** Match: the queue (`ranked`…). Story: the scenario id. */
  tag: string;
  /** A short human label: "5v5 · BO5" or "地狱 · 三小时". */
  note: string;
  /** Ranked only: the rating this bout moved. */
  delta?: number;
  /** Whether this counts towards the headline win rate. */
  rated: boolean;
}

export interface Honor {
  login: LoginLog;
  bouts: Bout[];
}

const EMPTY_LOGIN: LoginLog = {
  sessions: 0,
  firstAt: 0,
  lastAt: 0,
  days: [],
  streak: 0,
  bestStreak: 0,
  seconds: 0,
};

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

function safeParse(raw: string | null): Partial<Honor> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<Honor>;
  } catch {
    return null;
  }
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function readHonor(): Honor {
  try {
    const p = safeParse(typeof localStorage === "undefined" ? null : localStorage.getItem(KEY));
    if (!p) return { login: { ...EMPTY_LOGIN, days: [] }, bouts: [] };
    const login = (p.login ?? {}) as Partial<LoginLog>;
    return {
      login: {
        sessions: Math.max(0, num(login.sessions)),
        firstAt: Math.max(0, num(login.firstAt)),
        lastAt: Math.max(0, num(login.lastAt)),
        days: Array.isArray(login.days)
          ? login.days.filter((d): d is string => typeof d === "string").slice(-400)
          : [],
        streak: Math.max(0, num(login.streak)),
        bestStreak: Math.max(0, num(login.bestStreak)),
        seconds: Math.max(0, num(login.seconds)),
      },
      bouts: Array.isArray(p.bouts)
        ? (p.bouts.filter((b) => b && typeof b === "object") as Bout[]).slice(0, MAX_BOUTS)
        : [],
    };
  } catch {
    return { login: { ...EMPTY_LOGIN, days: [] }, bouts: [] };
  }
}

function write(next: Honor): Honor {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
  return next;
}

/* ------------------------------------------------------------------ */
/* Login                                                               */
/* ------------------------------------------------------------------ */

/** Local calendar date as YYYY-MM-DD. Local, because a streak is a human thing. */
export function dayKey(at: number): string {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const ta = Date.UTC(ay ?? 0, (am ?? 1) - 1, ad ?? 1);
  const tb = Date.UTC(by ?? 0, (bm ?? 1) - 1, bd ?? 1);
  return Math.round((tb - ta) / 86_400_000);
}

/**
 * Advance the login log by one session.
 *
 * Pure, so the streak arithmetic can be tested without a clock or a browser.
 * The streak counts *calendar days visited*, not sessions: opening the game
 * four times on a Tuesday is still one day of a streak, which is the only
 * reading a player would accept.
 */
export function withSession(login: LoginLog, at: number): LoginLog {
  const key = dayKey(at);
  const last = login.days[login.days.length - 1];
  let streak = login.streak;
  const days = [...login.days];
  if (last !== key) {
    days.push(key);
    if (days.length > 400) days.shift();
    const gap = last ? daysBetween(last, key) : 0;
    streak = last && gap === 1 ? login.streak + 1 : 1;
  } else if (streak === 0) {
    streak = 1;
  }
  return {
    ...login,
    days,
    streak,
    bestStreak: Math.max(login.bestStreak, streak),
    sessions: login.sessions + 1,
    firstAt: login.firstAt || at,
    lastAt: at,
  };
}

/** Record that the player has just opened the game. */
export function recordSession(at: number = Date.now()): Honor {
  const cur = readHonor();
  return write({ ...cur, login: withSession(cur.login, at) });
}

/** Add time spent. Called on a timer and when the tab goes away. */
export function addPlaySeconds(seconds: number): Honor {
  const cur = readHonor();
  if (!(seconds > 0)) return cur;
  return write({ ...cur, login: { ...cur.login, seconds: cur.login.seconds + Math.round(seconds) } });
}

/* ------------------------------------------------------------------ */
/* Bouts                                                               */
/* ------------------------------------------------------------------ */

export function recordBout(bout: Omit<Bout, "id" | "at"> & { at?: number }): Honor {
  const cur = readHonor();
  const at = bout.at ?? Date.now();
  const entry: Bout = { ...bout, at, id: `b-${at.toString(36)}-${cur.bouts.length}` };
  return write({ ...cur, bouts: [entry, ...cur.bouts].slice(0, MAX_BOUTS) });
}

export interface WinRate {
  played: number;
  won: number;
  /** 0..1, or null when nothing counted yet — never a fake 0%. */
  rate: number | null;
}

export function winRate(bouts: readonly Bout[]): WinRate {
  const counted = bouts.filter((b) => b.rated);
  const won = counted.filter((b) => b.won).length;
  return { played: counted.length, won, rate: counted.length ? won / counted.length : null };
}

/** Win rate per seat, which is the number that actually tells you something. */
export function winRateByRole(bouts: readonly Bout[], kind?: Bout["kind"]): Record<string, WinRate> {
  const out: Record<string, WinRate> = {};
  for (const b of bouts) {
    if (kind && b.kind !== kind) continue;
    const cur = out[b.role] ?? { played: 0, won: 0, rate: null };
    if (!b.rated) {
      out[b.role] = cur;
      continue;
    }
    const played = cur.played + 1;
    const won = cur.won + (b.won ? 1 : 0);
    out[b.role] = { played, won, rate: played ? won / played : null };
  }
  return out;
}

export function boutsOf(bouts: readonly Bout[], kind: Bout["kind"]): Bout[] {
  return bouts.filter((b) => b.kind === kind);
}

/* ------------------------------------------------------------------ */
/* The balance sheet                                                   */
/* ------------------------------------------------------------------ */

export interface Ledger {
  /** Everything owned, before anything owed. */
  totalAssets: number;
  /** Assets minus what the player personally owes. */
  netWorth: number;
  /** 个人欠债: bank loan, mortgages, and margin borrowed against stock. */
  personalDebt: number;
  personalParts: { bankLoan: number; mortgage: number; margin: number };
  /** Whether the player has actually started something. */
  hasVenture: boolean;
  /** 公司欠债: money the firm owes other people and would have to hand back. */
  companyDebt: number;
  companyParts: { clientAum: number; investors: number };
  /** Liquid cash across all three wallets plus deposits. */
  liquid: number;
}

/**
 * Whether the player is running a business at all.
 *
 * True for a licensed broker (the firm holds client money), for anyone who has
 * taken outside investors, and for anyone who has started a venture. Retail
 * players who have done none of those never see a company row, because for
 * them there is no company and an empty "公司欠债: 0" is just noise.
 */
export function hasVenture(s: GameState): boolean {
  return (
    s.career === "broker" ||
    (s.investors?.length ?? 0) > 0 ||
    (s.projects?.length ?? 0) > 0 ||
    (s.fundAum ?? 0) > 0
  );
}

export function ledgerOf(s: GameState): Ledger {
  const mortgage = s.ownedProps.reduce((a, h) => a + h.mortgage, 0);
  const margin = stockBorrow(s);
  const personalDebt = debt(s);
  const liquid =
    s.cash + toLeo(s.cashDvd ?? 0, "dvd", s) + toLeo(s.cashAna ?? 0, "ana", s) + deposits(s);
  // Property is carried at equity in `netWorth`, so the gross asset figure has
  // to add the mortgage back or the two numbers would not reconcile.
  const totalAssets =
    liquid +
    stockMtm(s) +
    optionMtm(s) +
    futureMtm(s) +
    postedFutures(s) +
    shortMarginPosted(s) +
    propertyEquity(s) +
    mortgage;
  const investors = (s.investors ?? []).reduce((a, i) => a + i.invested, 0);
  const clientAum = Math.max(0, s.fundAum ?? 0);
  return {
    totalAssets,
    netWorth: netWorth(s),
    personalDebt,
    personalParts: { bankLoan: s.bankLoan, mortgage, margin },
    hasVenture: hasVenture(s),
    companyDebt: clientAum + investors,
    companyParts: { clientAum, investors },
    liquid,
  };
}

/** Wipe the record. Only ever called from an explicit reset. */
export function clearHonor() {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
