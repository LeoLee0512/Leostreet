/**
 * The central-banker sandbox (G1): one country's central bank on a living world
 * map. Pure data + arithmetic, runnable under `node --test`.
 *
 * Units: rates and inflation are annual percentages; one tick is one week.
 */
import type { WorldCountryId } from "../world/world.ts";

export type CountryId = WorldCountryId;

/** A bilingual string pair; the UI picks the side. */
export interface Txt {
  zh: string;
  en: string;
}

/** Fixed character of an economy: what "normal" looks like there. */
export interface CountryProfile {
  id: CountryId;
  currency: Txt;
  /** Short ticker printed next to numbers, e.g. "Ł". */
  symbol: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  blurb: Txt;
  /** Relative economic weight in the world aggregates. */
  weight: number;
  piStar: number;
  rStar: number;
  uStar: number;
  gStar: number;
  /** Exports + imports over GDP, 0–1: how much the world reaches in. */
  openness: number;
  /** Share of a depreciation that turns up in prices. */
  passthrough: number;
  rrrBase: number;
  deficitNorm: number;
  /** Commodity exporters gain when oil spikes. */
  commodity: boolean;
  start: Partial<Macro>;
}

/** The moving macro state every country carries. */
export interface Macro {
  rate: number;
  rrr: number;
  /** Stock of bonds the central bank holds, % of GDP. */
  qe: number;
  /** Purchase pace, % of GDP per year (negative = selling, QT). */
  qePace: number;
  /** Inflation, year on year. */
  pi: number;
  /** What households and firms expect inflation to be. */
  piE: number;
  /** Output gap, % of potential. */
  gap: number;
  /** Unemployment rate. */
  u: number;
  /** Real growth, annualised and smoothed. */
  growth: number;
  /** Trade-weighted exchange rate index, 100 = start; higher = stronger. */
  fx: number;
  /** Year-on-year % change of fx, smoothed. */
  fxYoY: number;
  /** Foreign reserves, % of GDP. */
  reserves: number;
  debt: number;
  deficit: number;
  /** Credit growth, year on year. */
  credit: number;
  /** Asset froth, 0–1. */
  bubble: number;
  /** Banking system health, 0–1. Below 0.5 depositors start to queue. */
  bank: number;
  equity: number;
  /** Market trust in the central bank, 0–100: how well expectations stay anchored. */
  trust: number;
  /** Lagged policy stance, pp above neutral: what the economy actually feels. */
  stance: number;
  /** Demand and supply shock processes (AR(1)). */
  demand: number;
  supply: number;
}

export type FocusId =
  | "independence"
  | "targeting"
  | "transparency"
  | "guidance"
  | "qeTools"
  | "depositInsurance"
  | "bagehot"
  | "macroprudential"
  | "bankReform"
  | "reserveBuild"
  | "floating"
  | "swapLines"
  | "fiscalRule"
  | "yieldCurve"
  | "stressTests"
  | "intlCoop";

export interface FocusNode {
  id: FocusId;
  name: Txt;
  effect: Txt;
  cost: number;
  weeks: number;
  requires: FocusId[];
  /** Grid slot for the tree view: column, row. */
  at: [number, number];
}

export type GuidanceKind = "dovish" | "hawkish";

export interface Guidance {
  kind: GuidanceKind;
  until: number;
  /** The rate on the day the promise was made. */
  rate: number;
}

export interface EventChoice {
  id: string;
  label: Txt;
  hint: Txt;
  /** Focus required for this option to be offered. */
  requires?: FocusId;
}

/** crisis = core central-banking trouble; history = modelled on a real episode;
 *  random = everyday texture; national = one country only; swan = black swan. */
export type EventKind = "crisis" | "history" | "random" | "national" | "swan";

export interface PendingEvent {
  key: string;
  kind: EventKind;
  title: Txt;
  body: Txt;
  history?: Txt;
  choices: EventChoice[];
  week: number;
}

export interface NewsItem {
  week: number;
  text: Txt;
  tone: "good" | "bad" | "info";
}

/** One weekly snapshot of the player's economy for the charts. */
export interface Sample {
  w: number;
  rate: number;
  pi: number;
  u: number;
  growth: number;
  fx: number;
  trust: number;
}

/** term = ten years served; retired = an endless term ended by choice. */
export type EndReason = "term" | "retired" | "fired" | "hyperinflation";

export type Letter = "S" | "A" | "B" | "C" | "D";

export interface SandboxGame {
  version: 1;
  seed: number;
  rng: number;
  week: number;
  /** Game length in weeks (10 years). Ignored when `endless`. */
  length: number;
  /** Endless term: no fixed end; a review every ten years instead. */
  endless?: boolean;
  /** Ten-year reviews of an endless term, oldest first. */
  decades?: { letter: Letter; avgLoss: number }[];
  /** Running totals at the start of the current decade. */
  decadeMark?: { loss: number; crises: number };
  player: CountryId;
  countries: Record<CountryId, Macro>;
  /** Player-only politics. */
  points: number;
  approval: number;
  pressure: number;
  capitalControls: boolean;
  macroCap: boolean;
  focusDone: FocusId[];
  focusActive: { id: FocusId; left: number } | null;
  guidance: Guidance | null;
  /** Weeks since the last rate move, and the rate 26 weeks ago, for "too fast" checks. */
  rateLog: number[];
  event: PendingEvent | null;
  /** Earliest week each event key may fire again. */
  cooldown: Record<string, number>;
  news: NewsItem[];
  history: Sample[];
  /** Running welfare loss: Σ (π−π*)² + ½(u−u*)² per week. */
  loss: number;
  crises: number;
  lowApprovalWeeks: number;
  over: EndReason | null;
}

export type Action =
  | { type: "rate"; delta: number }
  | { type: "rrr"; delta: number }
  | { type: "qe"; pace: number }
  | { type: "guidance"; kind: GuidanceKind }
  | { type: "intervene"; side: "buy" | "sell" }
  | { type: "capitalControls"; on: boolean }
  | { type: "macroCap"; on: boolean }
  | { type: "focus"; id: FocusId }
  | { type: "coordinate"; dir: "cut" | "hike" }
  | { type: "requestSwap" }
  | { type: "retire" }
  | { type: "choose"; choice: string };
