import { clamp } from "../game/math.ts";
import { lengthOf } from "./lengths.ts";
import { scenarioOf } from "./scenarios.ts";
import type { StoryRun } from "./types.ts";

export interface MissionCondition {
  id: string;
  zh: string;
  en: string;
  current: string;
  target: string;
  met: boolean;
}
// Never round a failing value into an apparently passing boundary value.
function displayValue(value: number, target: number, minimum: boolean) {
  const rounded = value.toFixed(1);
  if ((minimum ? value < target : value > target) && rounded === target.toFixed(1))
    return `${minimum ? "<" : ">"} ${Number(target.toPrecision(12))}`;
  return rounded;
}
/** These are the engine's end conditions, never an estimated probability of winning. */
export function missionConditions(run: StoryRun): MissionCondition[] {
  const scenario = scenarioOf(run.scenarioId),
    objective = scenario.objectives[run.role];
  const conditions: MissionCondition[] = [];
  const line = () =>
    conditions.push({
      id: "line",
      zh: "守住金融防线",
      en: "Keep the financial line intact",
      current: run.pegBroken ? "×" : "✓",
      target: "✓",
      met: !run.pegBroken,
    });
  const market = (target: number) =>
    conditions.push({
      id: "market",
      zh: scenario.lexicon.marketZh ?? "市场指数",
      en: scenario.lexicon.marketEn ?? "Market index",
      current: displayValue(run.equity, target, true),
      target: `≥ ${target}`,
      met: run.equity >= target,
    });
  if (
    objective.kind === "holdPeg" ||
    objective.kind === "contain" ||
    (objective.kind === "survive" && objective.side === "defend")
  )
    line();
  if (objective.kind === "breakPeg")
    conditions.push({
      id: "break",
      zh: "突破金融防线",
      en: "Break the financial line",
      current: run.pegBroken ? "✓" : "—",
      target: "✓",
      met: run.pegBroken,
    });
  if (
    (objective.kind === "holdPeg" || objective.kind === "contain") &&
    objective.equityFloor !== undefined
  )
    market(objective.equityFloor);
  if (objective.kind === "revive") market(objective.target);
  if (objective.kind === "contain")
    conditions.push({
      id: "pressure",
      zh: "把恐慌压低（百分刻度）",
      en: "Bring panic under control",
      current: displayValue(run.pressure * 100, objective.target * 100, false),
      target: `≤ ${(objective.target * 100).toFixed(0)}`,
      met: run.pressure <= objective.target,
    });
  if (objective.kind === "profit" || objective.kind === "survive") {
    const value = objective.kind === "profit" ? run.book - 100 : run.book;
    conditions.push({
      id: "book",
      zh: objective.kind === "profit" ? "账户收益率" : "保住原有资产",
      en: objective.kind === "profit" ? "Portfolio return" : "Capital retained",
      current: `${value.toFixed(1)}%`,
      target: `≥ ${(objective.target * 100).toFixed(0)}%`,
      met:
        objective.kind === "profit"
          ? run.book / 100 - 1 >= objective.target
          : run.book / 100 >= objective.target,
    });
  }
  return conditions;
}
export function missionTimeline(run: StoryRun, elapsed: number) {
  const total = lengthOf(run.length).minutes * 60;
  const seconds = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
  return {
    total,
    elapsed: Math.min(total, seconds),
    remaining: Math.max(0, total - seconds),
    fraction: clamp(seconds / total, 0, 1),
    completedSessions: Math.min(run.days, Math.max(0, run.day - 1)),
    totalSessions: run.days,
    nextWave: run.phases.filter((p) => p.day >= run.day).sort((a, b) => a.day - b.day)[0] ?? null,
    milestones: run.phases.map((p) => ({
      day: p.day,
      zh: p.titleZh,
      en: p.titleEn,
      position: clamp(p.day / run.days, 0, 1),
      passed: p.day < run.day,
    })),
  };
}
