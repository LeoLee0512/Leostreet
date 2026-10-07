import { COUNTRY_ORDER, PROFILES } from "../countries.ts";
import type { CountryId, EventChoice, EventKind, SandboxGame, Txt } from "../types.ts";

/**
 * Shared shape and helpers for sandbox events. Each event: when it may fire,
 * how likely per week, how long until it may fire again, what it says, and
 * what each answer does. `history` is the real episode it is modelled on —
 * real names live only there, never in the playable title/body/choices.
 */
export interface EventDef {
  kind: EventKind;
  /** Restrict to these player countries. */
  only?: CountryId[];
  when: (g: SandboxGame) => boolean;
  chance: (g: SandboxGame) => number;
  cooldown: number;
  title: Txt;
  body: (g: SandboxGame) => Txt;
  history?: Txt;
  choices: EventChoice[];
  /** Applied the moment the event fires, before the player answers. */
  onFire?: (g: SandboxGame) => void;
  resolve: (g: SandboxGame, choice: string) => void;
}

export const me = (g: SandboxGame) => g.countries[g.player];
export const prof = (g: SandboxGame) => PROFILES[g.player];
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const c = (id: string, zh: string, en: string, hintZh: string, hintEn: string, requires?: EventChoice["requires"]): EventChoice => ({
  id,
  label: { zh, en },
  hint: { zh: hintZh, en: hintEn },
  requires,
});
export const always = () => true;

/** Nudge trust, approval and pressure while keeping them in 0–100. */
export function sway(g: SandboxGame, d: { trust?: number; approval?: number; pressure?: number; points?: number }) {
  const m = me(g);
  if (d.trust) m.trust = clamp(m.trust + d.trust, 0, 100);
  if (d.approval) g.approval = clamp(g.approval + d.approval, 0, 100);
  if (d.pressure) g.pressure = clamp(g.pressure + d.pressure, 0, 100);
  if (d.points) g.points = Math.max(0, g.points + d.points);
}

export function sickNeighbour(g: SandboxGame): CountryId | undefined {
  return COUNTRY_ORDER.find((id) => id !== g.player && g.countries[id].bank < 0.45);
}
