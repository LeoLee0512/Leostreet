import { LADDER } from "./difficulty.ts";
import { BAHT, HKD, POUND } from "./crises/pegs.ts";
import { BARING, BLACKMON, CRASH29, PANIC07, PANIC73 } from "./crises/panics.ts";
import { RAILWAY, SOUTHSEA } from "./crises/manias.ts";
import { LEHMAN, LTCM } from "./crises/leverage.ts";
import { EURO } from "./crises/sovereign.ts";
import { DEPRESSION } from "./crises/depression.ts";
import type { Scenario, StoryId, StoryRole } from "./types.ts";

/**
 * The scenario registry.
 *
 * Fourteen crises, three centuries, one ladder. The content itself lives in
 * `crises/`, grouped by the mechanism each group teaches — a currency peg is
 * not the same animal as a repo run, and mixing them in one file made it far
 * too easy to copy a coefficient from a scenario it does not belong to.
 */

export { ATTACKER_EN, ATTACKER_ZH } from "./crises/seats.ts";

const ALL: Scenario[] = [
  PANIC07,
  SOUTHSEA,
  RAILWAY,
  BAHT,
  PANIC73,
  CRASH29,
  BLACKMON,
  POUND,
  BARING,
  LTCM,
  EURO,
  HKD,
  DEPRESSION,
  LEHMAN,
];

/** Every scenario, in ladder order. */
export const SCENARIOS: Scenario[] = LADDER.map((id) => {
  const found = ALL.find((s) => s.id === id);
  if (!found) throw new Error(`story: ladder names ${id} but no scenario ships with that id`);
  return found;
});

export function scenarioOf(id: StoryId): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? PANIC07;
}

export function objectiveOf(id: StoryId, role: StoryRole) {
  return scenarioOf(id).objectives[role];
}

/** Usable reserves: what the headline figure hides. */
export function usableReserves(s: Scenario): number {
  return Math.max(0, s.reserves - s.committedForward);
}

export const STORY_ROLES: StoryRole[] = ["retail", "trader", "fund", "governor"];

/** The default names of the four chairs, used where a crisis does not rename them. */
export const ROLE_LABEL: Record<StoryRole, { zh: string; en: string }> = {
  retail: { zh: "普通股民", en: "Retail investor" },
  trader: { zh: "银行交易员", en: "Bank trader" },
  fund: { zh: "对冲基金经理", en: "Hedge fund manager" },
  governor: { zh: "央行行长", en: "Central bank governor" },
};

/**
 * What this crisis calls that chair.
 *
 * In 1907 the person holding the defence is a private banker chairing a
 * clearing house, and calling him a central bank governor would be teaching
 * the player something false about the period — the whole point of 1907 is
 * that there was no central bank.
 */
export function seatLabelOf(s: Scenario, role: StoryRole): { zh: string; en: string } {
  return s.seatLabel?.[role] ?? ROLE_LABEL[role];
}
