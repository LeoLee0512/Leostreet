import { PROFILES } from "./countries.ts";
import type { SandboxGame, Txt } from "./types.ts";

/**
 * The beginner-mode advisor: a plain-language nudge built on the Taylor rule,
 * the same rule the AI central banks follow. Following it plays a solid,
 * unspectacular game; beating it is the expert's job.
 */
export interface Advice {
  /** Suggested change to the policy rate, in quarter points (0 = hold). */
  delta: number;
  text: Txt;
}

export function adviceFor(g: SandboxGame): Advice {
  const p = PROFILES[g.player];
  const m = g.countries[g.player];
  const rule = p.rStar + m.pi + 0.5 * (m.pi - p.piStar) + 0.5 * m.gap;
  const gap = rule - m.rate;
  const delta = Math.abs(gap) < 0.4 ? 0 : Math.sign(gap) * (Math.abs(gap) > 1.5 ? 0.5 : 0.25);
  const hot = m.pi > p.piStar + 0.5;
  const cold = m.pi < p.piStar - 0.5;
  const jobless = m.u > p.uStar + 1;
  let why: Txt;
  if (delta > 0)
    why = hot
      ? { zh: `物价涨得太快（${m.pi.toFixed(1)}%，目标 ${p.piStar}%）。加息让借钱变贵，给经济降降温。`, en: `Prices are rising too fast (${m.pi.toFixed(1)}%, target ${p.piStar}%). A hike makes borrowing dearer and cools things down.` }
      : { zh: "经济有点过热，提前加一点息，免得通胀冒头。", en: "The economy is running hot; a small hike now heads off inflation." };
  else if (delta < 0)
    why = jobless
      ? { zh: `失业的人太多（${m.u.toFixed(1)}%）。降息让借钱便宜，企业更愿意招人。`, en: `Too many people are out of work (${m.u.toFixed(1)}%). A cut makes borrowing cheaper so firms hire.` }
      : cold
        ? { zh: `物价几乎不涨（${m.pi.toFixed(1)}%）。降息给经济加点油。`, en: `Prices are barely rising (${m.pi.toFixed(1)}%). A cut gives the economy some fuel.` }
        : { zh: "利率比需要的高了一点，可以小幅降息。", en: "Rates are a little higher than needed; a small cut would do." };
  else why = { zh: "物价和就业都在正常范围。现在不用动，按「播放」让时间走一会儿。", en: "Prices and jobs are both on track. Hold for now and let time run." };
  return { delta, text: why };
}

/** The option a careful governor would pick for each event (beginner mode marks it). */
export const RECOMMENDED: Record<string, (g: SandboxGame) => string> = {
  bankRun: () => "lolr",
  currencyAttack: (g) => (g.countries[g.player].reserves > 4 ? "defend" : "float"),
  govDemand: () => "negotiate",
  election: () => "silent",
  foreignCrisis: () => "ease",
  oilShock: () => "look",
  foreignHike: () => "absorb",
  techBoom: () => "lean",
  fiscalSplurge: () => "warn",
  housingBoom: (g) => (g.focusDone.includes("macroprudential") ? "cap" : "hike"),
  deflation: (g) => (g.focusDone.includes("qeTools") ? "qe" : "cut"),
  volckerMoment: () => "gradual",
  whateverItTakes: (g) => (g.countries[g.player].trust >= 55 ? "pledge" : "buy"),
  plazaAccord: () => "agree",
  hedgeFundCollapse: () => "broker",
  investmentBankWeekend: (g) => (g.points >= 40 ? "buyer" : "rescue"),
  currencyReform: () => "reform",
  goldSuspension: () => "float",
  bulbMania: () => "warn",
  goldRush: () => "lean",
  strikeWave: () => "firm",
  bumperHarvest: () => "look",
  portFire: () => "lend",
  statsScandal: () => "publish",
  pressGaffe: () => "clarify",
  newRailway: () => "welcome",
  migrationWave: () => "steady",
  privateNotes: () => "regulate",
  influenza: () => "cut",
  stateVisit: () => "accept",
  solarStorm: () => "lend",
  pandemic: (g) => (g.focusDone.includes("qeTools") ? "allIn" : "cut"),
  megaQuake: () => "rebuild",
  warClouds: () => "half",
  volcanicWinter: () => "look",
  lionTreasury: () => "meet",
  daweiRigging: () => "reform",
  nordlanOilBust: () => "cut",
  sereinHurricane: () => "ease",
  ramonaIndexation: () => "oppose",
  veldenSecession: () => "reassure",
};

export function recommendedChoice(g: SandboxGame): string | null {
  if (!g.event) return null;
  const pick = RECOMMENDED[g.event.key]?.(g);
  const ok = g.event.choices.find((c) => c.id === pick && (!c.requires || g.focusDone.includes(c.requires)));
  return ok ? ok.id : null;
}
