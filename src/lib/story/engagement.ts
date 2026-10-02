import type { StoryLength } from "./types.ts";
import { GAME_DISCLAIMER } from "../disclaimer.ts";
import type { MissionCondition } from "./mission.ts";

/** Personal, local records. They never grant money, a clear, or a paid entitlement. */
export const COLLECTION_KEY = "leo-street-collection-v1";
export const REPORT_LIMIT = 30;
export type Appearance = "naval" | "slate";
export type Wish = "new-stories" | "desk-styles";
export interface StoryReportInput {
  scenarioId: string;
  scenarioNameZh: string;
  scenarioNameEn: string;
  won: boolean;
  stars: number;
  income: number;
  employment: number;
  seed: number;
  length: StoryLength;
  elapsedSeconds: number;
  /** Stable finishedAt from the run, not the time the results screen renders. */
  completedAt: number;
  conditions?: MissionCondition[];
}
export interface StoryReport extends StoryReportInput {
  id: string;
}
export interface StoryCollectionState {
  version: 1;
  reports: StoryReport[];
  bestByScenario: Record<string, StoryReport>;
  appearance: Appearance;
  wishlist: Wish[];
}
const SCENARIO_IDS = new Set([
  "panic07",
  "southsea",
  "baht",
  "crash29",
  "blackmon",
  "pound",
  "ltcm",
  "euro",
  "hkd",
  "depression",
  "lehman",
]);
const LENGTHS = new Set(["sprint", "standard", "deep", "epic"]);
const finite = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const empty = (): StoryCollectionState => ({
  version: 1,
  reports: [],
  bestByScenario: {},
  appearance: "naval",
  wishlist: [],
});

function reportOf(value: unknown): StoryReport | null {
  if (
    !record(value) ||
    !SCENARIO_IDS.has(String(value.scenarioId)) ||
    typeof value.scenarioNameZh !== "string" ||
    !value.scenarioNameZh.trim() ||
    typeof value.scenarioNameEn !== "string" ||
    !value.scenarioNameEn.trim() ||
    typeof value.won !== "boolean" ||
    !finite(value.stars, 0, 3) ||
    !Number.isInteger(value.stars) ||
    !finite(value.income, 0, 10000) ||
    !finite(value.employment, 0, 100) ||
    !finite(value.seed, -2147483648, 4294967295) ||
    !Number.isInteger(value.seed) ||
    !LENGTHS.has(String(value.length)) ||
    !finite(value.elapsedSeconds, 0, 1000000) ||
    !finite(value.completedAt, 1, 8640000000000000)
  )
    return null;
  const input: StoryReportInput = {
    scenarioId: String(value.scenarioId),
    scenarioNameZh: value.scenarioNameZh.trim().slice(0, 96),
    scenarioNameEn: value.scenarioNameEn.trim().slice(0, 96),
    won: value.won,
    stars: value.stars,
    income: value.income,
    employment: value.employment,
    seed: value.seed,
    length: value.length as StoryLength,
    elapsedSeconds: value.elapsedSeconds,
    completedAt: value.completedAt,
  };
  if (
    Array.isArray(value.conditions) &&
    value.conditions.length > 0 &&
    value.conditions.length <= 8 &&
    value.conditions.every(
      (c) =>
        record(c) &&
        typeof c.met === "boolean" &&
        ["id", "zh", "en", "current", "target"].every(
          (k) => typeof c[k] === "string" && c[k].length > 0 && c[k].length <= 160,
        ),
    )
  ) {
    input.conditions = value.conditions.map((c) => ({
      id: c.id,
      zh: c.zh,
      en: c.en,
      current: c.current,
      target: c.target,
      met: c.met,
    }));
  }
  return { ...input, id: `${input.scenarioId}:${input.seed}:${input.length}:${input.completedAt}` };
}

/** Victory first, then sustained recovery stars and final living conditions. */
function better(next: StoryReport, prev: StoryReport): boolean {
  if (next.won !== prev.won) return next.won;
  if (next.stars !== prev.stars) return next.stars > prev.stars;
  if (next.income !== prev.income) return next.income > prev.income;
  if (next.employment !== prev.employment) return next.employment > prev.employment;
  return next.completedAt > prev.completedAt;
}
function rememberBest(best: Record<string, StoryReport>, report: StoryReport) {
  const prev = best[report.scenarioId];
  if (!prev || better(report, prev)) best[report.scenarioId] = report;
}

export function readCollection(): StoryCollectionState {
  const result = empty();
  try {
    if (typeof localStorage === "undefined") return result;
    const raw = localStorage.getItem(COLLECTION_KEY);
    if (!raw || raw.length > 250000) return result;
    const parsed: unknown = JSON.parse(raw);
    if (!record(parsed) || parsed.version !== 1) return result;
    if (parsed.appearance === "slate") result.appearance = "slate";
    if (Array.isArray(parsed.wishlist))
      result.wishlist = [
        ...new Set(
          parsed.wishlist.filter((v): v is Wish => v === "new-stories" || v === "desk-styles"),
        ),
      ];
    if (record(parsed.bestByScenario)) {
      for (const [id, value] of Object.entries(parsed.bestByScenario)) {
        const item = reportOf(value);
        if (item && id === item.scenarioId) rememberBest(result.bestByScenario, item);
      }
    }
    if (Array.isArray(parsed.reports)) {
      const seen = new Set<string>();
      const reports = parsed.reports
        .map(reportOf)
        .filter((v): v is StoryReport => !!v)
        .sort((a, b) => b.completedAt - a.completedAt);
      for (const item of reports) {
        rememberBest(result.bestByScenario, item);
        if (seen.has(item.id) || result.reports.length >= REPORT_LIMIT) continue;
        seen.add(item.id);
        result.reports.push(item);
      }
    }
  } catch {
    /* Unavailable or damaged storage is an empty, usable collection. */
  }
  return result;
}
function writeCollection(next: StoryCollectionState): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

export function recordStoryReport(input: StoryReportInput): StoryCollectionState {
  const next = readCollection();
  const report = reportOf(input);
  if (
    !report ||
    next.reports.some((r) => r.id === report.id) ||
    next.bestByScenario[report.scenarioId]?.id === report.id
  )
    return next;
  next.reports = [report, ...next.reports]
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, REPORT_LIMIT);
  rememberBest(next.bestByScenario, report);
  writeCollection(next);
  return next;
}
export function readAppearance(): Appearance {
  return readCollection().appearance;
}
export function applyAppearance(appearance: Appearance): boolean {
  if (appearance !== "naval" && appearance !== "slate") return false;
  const next = readCollection();
  next.appearance = appearance;
  const saved = writeCollection(next);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("leo-street-appearance"));
  return saved;
}
/** A private note of interest. No message, reservation or order is sent. */
export function toggleStoryWish(wish: Wish): StoryCollectionState {
  const next = readCollection();
  if (wish !== "new-stories" && wish !== "desk-styles") return next;
  next.wishlist = next.wishlist.includes(wish)
    ? next.wishlist.filter((v) => v !== wish)
    : [...next.wishlist, wish];
  writeCollection(next);
  return next;
}
export function reportShareText(report: StoryReport, en = false): string {
  const lengths = en
    ? { sprint: "30-minute", standard: "1-hour", deep: "90-minute", epic: "3-hour" }
    : { sprint: "半小时", standard: "一小时", deep: "一个半小时", epic: "三小时" };
  return en
    ? `Leo Street · ${report.scenarioNameEn}\n${report.won ? "Crisis contained" : "Still learning"} · Recovery ${report.stars}/3 stars\nReal income ${report.income.toFixed(1)} · Employment ${report.employment.toFixed(1)}%\n${lengths[report.length]} campaign · ${Math.floor(report.elapsedSeconds / 60)} minutes played · Seed ${report.seed}\nA local game report, not a verified ranking.\n${GAME_DISCLAIMER.en}`
    : `狮子街传说 · ${report.scenarioNameZh}\n${report.won ? "守住了危机" : "这次积累了经验"} · 复苏 ${report.stars}/3 星\n生活购买力 ${report.income.toFixed(1)} · 就业 ${report.employment.toFixed(1)}%\n${lengths[report.length]}战役 · 已游玩 ${Math.floor(report.elapsedSeconds / 60)} 分钟 · 种子 ${report.seed}\n个人本地游戏战报，不是经核验的排名。\n${GAME_DISCLAIMER.zh}`;
}
