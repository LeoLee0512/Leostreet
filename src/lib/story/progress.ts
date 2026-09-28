import { LADDER, TITLES, titlesFor, type StoryTitle } from "./difficulty.ts";
import { ACHIEVEMENTS, lengthOf } from "./lengths.ts";
import type { Achievement } from "./types.ts";
import { SCENARIOS, scenarioOf } from "./scenarios.ts";
import type { StoryLength, StoryRun } from "./types.ts";

/**
 * What the player has cleared on the ladder.
 *
 * Kept separate from the general-purpose `game/progress` store because this is
 * a different kind of thing: `game/progress` records what a player *owns*,
 * this records what they have *done*, and the two should never be able to
 * reach each other. Nothing here is purchasable and there is no code path that
 * grants a clear for a payment.
 */

const KEY = "leo-street-story-v1";

export interface StoryProgress {
  /** Scenario ids cleared, meaning won from any seat. */
  cleared: string[];
  /** Scenario id → the deepest telling it has been won at. */
  best: Record<string, StoryLength>;
  achievements: string[];
  titles: string[];
}

const EMPTY: StoryProgress = { cleared: [], best: {}, achievements: [], titles: [] };

const LENGTH_RANK: Record<StoryLength, number> = { sprint: 0, standard: 1, deep: 2, epic: 3 };

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export function readStoryProgress(): StoryProgress {
  try {
    const raw = typeof localStorage === "undefined" ? null : localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY, best: {} };
    const p = JSON.parse(raw) as Partial<StoryProgress>;
    const best: Record<string, StoryLength> = {};
    if (p.best && typeof p.best === "object") {
      for (const [k, v] of Object.entries(p.best)) {
        if (typeof v === "string" && v in LENGTH_RANK) best[k] = v as StoryLength;
      }
    }
    return {
      // Only ids that still ship: a scenario removed from the ladder must not
      // keep counting towards titles.
      cleared: strings(p.cleared).filter((id) => LADDER.includes(id as never)),
      best,
      achievements: strings(p.achievements),
      titles: strings(p.titles),
    };
  } catch {
    return { ...EMPTY, best: {} };
  }
}

function write(next: StoryProgress): StoryProgress {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
  return next;
}

export interface ClearResult {
  progress: StoryProgress;
  /** True the first time this scenario is cleared at all. */
  firstClear: boolean;
  /** Titles handed out by this clear. */
  newTitles: StoryTitle[];
  /** The achievement this telling carries, if it was not already held. */
  newAchievement: Achievement | null;
  /** The one crisis with something above an achievement, if this run took it. */
  newCrown: Achievement | null;
  /** The scenario this clear opened, if any. */
  unlocked: string | null;
}

/**
 * Record a finished run.
 *
 * A **win from any seat** clears the stage. The four seats want genuinely
 * different things and each objective is a real reading of the same crisis —
 * making the ladder depend on the governor's chair alone would quietly say
 * that the other three were practice.
 *
 * Achievements come from the telling, not the seat, and only the three longer
 * ones carry any: the 半小时 version is explicitly the one that skips the
 * record, so it has nothing to award.
 */
export function recordClear(run: StoryRun): ClearResult {
  const cur = readStoryProgress();
  const empty: ClearResult = {
    progress: cur,
    firstClear: false,
    newTitles: [],
    newAchievement: null,
    newCrown: null,
    unlocked: null,
  };
  if (!run.won) return empty;

  const id = run.scenarioId;
  const firstClear = !cur.cleared.includes(id);
  const cleared = firstClear ? [...cur.cleared, id] : cur.cleared;

  const best = { ...cur.best };
  const prev = best[id];
  if (!prev || LENGTH_RANK[run.length] > LENGTH_RANK[prev]) best[id] = run.length;

  const earned = titlesFor(cleared.length).map((t) => t.id);
  const newTitles = TITLES.filter((t) => earned.includes(t.id) && !cur.titles.includes(t.id));

  // Only the major set-pieces offer the longer tellings, so only they can
  // award one — the short openers run at 半小时 and have nothing to give.
  const scenario = scenarioOf(id);
  const spec = lengthOf(run.length);
  const award = scenario.major ? spec.achievement : null;
  const newAchievement = award && !cur.achievements.includes(award.id) ? award : null;

  // One crisis carries something above an achievement, and only at the longest
  // telling. Nothing else in the game awards it and nothing else ever should.
  const crown = run.length === "epic" ? (scenario.crown ?? null) : null;
  const newCrown = crown && !cur.achievements.includes(crown.id) ? crown : null;

  const earnedIds = [newAchievement?.id, newCrown?.id].filter((x): x is string => Boolean(x));
  const next = write({
    cleared,
    best,
    achievements: [...new Set([...cur.achievements, ...earnedIds])],
    titles: [...new Set([...cur.titles, ...newTitles.map((t) => t.id)])],
  });

  const i = LADDER.indexOf(id as never);
  const unlocked = firstClear && i >= 0 && i + 1 < LADDER.length ? LADDER[i + 1]! : null;

  return { progress: next, firstClear, newTitles, newAchievement, newCrown, unlocked };
}

/** Every award that exists, including the one crisis-specific crown. */
export function allAwards(): Achievement[] {
  const crowns = SCENARIOS.map((s) => s.crown).filter((c): c is Achievement => Boolean(c));
  return [...ACHIEVEMENTS, ...crowns];
}

/** Achievements the player holds, resolved to their definitions. */
export function heldAchievements(p: StoryProgress = readStoryProgress()): Achievement[] {
  return allAwards().filter((a) => p.achievements.includes(a.id));
}

/** Titles the player holds, resolved to their definitions. */
export function heldTitles(p: StoryProgress = readStoryProgress()): StoryTitle[] {
  return TITLES.filter((t) => p.titles.includes(t.id));
}

/** The highest title held, which is the one worth displaying. */
export function topTitle(p: StoryProgress = readStoryProgress()): StoryTitle | null {
  const held = heldTitles(p);
  return held.length ? held[held.length - 1]! : null;
}

/** Wipe the ladder. Only ever called from an explicit reset. */
export function clearStoryProgress() {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
