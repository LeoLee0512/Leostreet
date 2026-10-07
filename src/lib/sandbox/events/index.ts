import { nextRandom } from "../sim.ts";
import type { PendingEvent, SandboxGame } from "../types.ts";
import { CORE_EVENTS } from "./core.ts";
import { HISTORY_EVENTS } from "./history.ts";
import type { EventDef } from "./kit.ts";
import { NATIONAL_EVENTS } from "./national.ts";
import { RANDOM_EVENTS } from "./random.ts";
import { SWAN_EVENTS } from "./swans.ts";

export const EVENTS: Record<string, EventDef> = {
  ...CORE_EVENTS,
  ...HISTORY_EVENTS,
  ...NATIONAL_EVENTS,
  ...RANDOM_EVENTS,
  ...SWAN_EVENTS,
};

/** Urgent trouble first; colour last. At most one event a week. */
const ORDER = [
  "bankRun",
  "currencyAttack",
  "currencyReform",
  "investmentBankWeekend",
  "govDemand",
  "volckerMoment",
  "whateverItTakes",
  "election",
  "foreignCrisis",
  ...Object.keys(SWAN_EVENTS),
  ...Object.keys(EVENTS).filter((k) => !["bankRun", "currencyAttack", "currencyReform", "investmentBankWeekend", "govDemand", "volckerMoment", "whateverItTakes", "election", "foreignCrisis"].includes(k) && !(k in SWAN_EVENTS)),
];

export function eventFor(g: SandboxGame): PendingEvent | null {
  if (g.week < 4) return null;
  for (const key of ORDER) {
    const def = EVENTS[key]!;
    if (def.only && !def.only.includes(g.player)) continue;
    if ((g.cooldown[key] ?? 0) > g.week) continue;
    if (!def.when(g)) continue;
    if (nextRandom(g) >= def.chance(g)) continue;
    g.cooldown[key] = g.week + def.cooldown;
    def.onFire?.(g);
    return {
      key,
      kind: def.kind,
      title: def.title,
      body: def.body(g),
      history: def.history,
      choices: def.choices.map((ch) => ({ ...ch })),
      week: g.week,
    };
  }
  return null;
}
