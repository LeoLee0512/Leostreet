/**
 * Ranked rating.
 *
 * Elo, adapted for a series between teams rather than a single game between
 * players: the series result is what moves the number, not individual rounds,
 * so throwing one round to set up the next costs nothing. With three teams the
 * result is scored as a placement — first gains, last loses, middle is close to
 * flat — because a straight win/loss would punish second place as hard as third
 * in a format where second place is a real outcome.
 */

export const RATING_START = 1200;
export const RATING_FLOOR = 0;

/** How far one series can move a rating. Lower once players are placed. */
export function kFactor(played: number): number {
  if (played < 10) return 60; // placement matches move fast
  if (played < 40) return 36;
  return 24;
}

export interface RankTier {
  id: string;
  nameZh: string;
  nameEn: string;
  /** Inclusive lower bound. */
  min: number;
}

export const TIERS: RankTier[] = [
  { id: "intern", nameZh: "实习生", nameEn: "Intern", min: 0 },
  { id: "clerk", nameZh: "跑单员", nameEn: "Clerk", min: 1000 },
  { id: "dealer", nameZh: "操盘手", nameEn: "Dealer", min: 1300 },
  { id: "desk", nameZh: "交易主管", nameEn: "Desk head", min: 1600 },
  { id: "partner", nameZh: "合伙人", nameEn: "Partner", min: 1900 },
  { id: "legend", nameZh: "狮子街传说", nameEn: "Leo Street Legend", min: 2200 },
];

export function tierOf(rating: number): RankTier {
  let out = TIERS[0]!;
  for (const t of TIERS) if (rating >= t.min) out = t;
  return out;
}

/** Points to the next tier, or null at the top. */
export function toNextTier(rating: number): { tier: RankTier; points: number } | null {
  const next = TIERS.find((t) => t.min > rating);
  return next ? { tier: next, points: next.min - rating } : null;
}

function expectedScore(mine: number, theirs: number): number {
  return 1 / (1 + 10 ** ((theirs - mine) / 400));
}

/**
 * New rating after a series.
 *
 * `place` is 0-based finishing position, `fieldSize` the number of teams. Two
 * teams collapse to the usual win = 1 / loss = 0; three teams score
 * 1 / 0.5 / 0 so the middle placement is roughly rating-neutral.
 */
export function applySeriesResult(opts: {
  rating: number;
  opponentRating: number;
  place: number;
  fieldSize: number;
  played: number;
}): number {
  const { rating, opponentRating, place, fieldSize, played } = opts;
  const denom = Math.max(1, fieldSize - 1);
  const score = Math.max(0, Math.min(1, 1 - place / denom));
  const delta = kFactor(played) * (score - expectedScore(rating, opponentRating));
  return Math.max(RATING_FLOOR, Math.round(rating + delta));
}

export interface RankedRecord {
  rating: number;
  played: number;
  won: number;
}

export const EMPTY_RECORD: RankedRecord = { rating: RATING_START, played: 0, won: 0 };

const KEY = "leo-street-ranked-v1";

export function readRanked(): RankedRecord {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY_RECORD };
    const p = JSON.parse(raw) as Partial<RankedRecord>;
    return {
      rating: numberOr(p.rating, RATING_START),
      played: Math.max(0, numberOr(p.played, 0)),
      won: Math.max(0, numberOr(p.won, 0)),
    };
  } catch {
    return { ...EMPTY_RECORD };
  }
}

export function writeRanked(next: RankedRecord): RankedRecord {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
  return next;
}

function numberOr(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
