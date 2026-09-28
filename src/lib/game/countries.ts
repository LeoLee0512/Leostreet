import type { CountryId, Ccy, GameState } from "./types.ts";
import { ACCOUNT_OPEN_MIN, CROSSING_DESK, CROSSING_FEE_MIN } from "./catalog.ts";

export const COUNTRY_IDS: CountryId[] = ["leo", "david", "ramona"];

export function asCountry(c: unknown): CountryId {
  if (c === "david") return "david";
  if (c === "anna" || c === "ramona") return "ramona";
  return "leo";
}

export function asCcy(c: unknown): Ccy {
  if (c === "dvd") return "dvd";
  if (c === "ana" || c === "rmn") return "ana";
  return "leo";
}

export interface CountrySpec {
  id: CountryId;
  ccy: Ccy;
  board: "L" | "D" | "R";
  tz: number;
  open: [number, number];
  weekend: number[];
  travelFeeLeo: number;
  accountFeeLeo: number;
  baseRate: number;
  baseTariff: number;
}

export const COUNTRY: Record<CountryId, CountrySpec> = {
  leo: {
    id: "leo",
    ccy: "leo",
    board: "L",
    tz: 0,
    open: [9, 15],
    weekend: [5, 6],
    travelFeeLeo: CROSSING_FEE_MIN,
    accountFeeLeo: ACCOUNT_OPEN_MIN,
    baseRate: 0.0425,
    baseTariff: 0,
  },
  ramona: {
    id: "ramona",
    ccy: "ana",
    board: "R",
    tz: 6,
    open: [10, 16],
    weekend: [4, 5],
    travelFeeLeo: CROSSING_FEE_MIN,
    accountFeeLeo: ACCOUNT_OPEN_MIN + 20_000,
    baseRate: 0.031,
    baseTariff: 0.04,
  },
  david: {
    id: "david",
    ccy: "dvd",
    board: "D",
    tz: -6,
    open: [8, 14],
    weekend: [6],
    travelFeeLeo: CROSSING_FEE_MIN,
    accountFeeLeo: ACCOUNT_OPEN_MIN + 20_000,
    baseRate: 0.055,
    baseTariff: 0.06,
  },
};

export function localHour(tick: number, country: CountryId): number {
  const spec = COUNTRY[asCountry(country)];
  return ((tick % 24) + spec.tz + 48) % 24;
}

export function localWeekday(tick: number, country: CountryId): number {
  const spec = COUNTRY[asCountry(country)];
  return Math.floor((tick + spec.tz) / 24) % 7;
}

export function isBoardOpen(tick: number, country: CountryId): boolean {
  const spec = COUNTRY[asCountry(country)];
  const wd = localWeekday(tick, spec.id);
  if (spec.weekend.includes(wd)) return false;
  const h = localHour(tick, spec.id);
  return h >= spec.open[0] && h <= spec.open[1];
}

export function isAnyBoardOpen(tick: number): boolean {
  return COUNTRY_IDS.some((c) => isBoardOpen(tick, c));
}

export function hasAccount(s: GameState, country: CountryId): boolean {
  const c = asCountry(country);
  const a = s.accounts;
  if (!a) return c === asCountry(s.homeCountry ?? s.street ?? "leo");
  if (c === "ramona") return Boolean(a.ramona || a.anna);
  return Boolean(a[c]);
}

/** Pay this to leave the current street for another. Same street is free. */
export function crossingFee(from: CountryId, to: CountryId): number {
  if (asCountry(from) === asCountry(to)) return 0;
  const dest = asCountry(to);
  return Math.max(CROSSING_FEE_MIN, COUNTRY[dest].travelFeeLeo) + CROSSING_DESK;
}

export function tariffOf(s: GameState, dest: CountryId): number {
  const c = asCountry(dest);
  const override = s.policyTariff?.[c];
  if (typeof override === "number") return override;
  return COUNTRY[c].baseTariff;
}

export function policyRateOf(s: GameState, country: CountryId): number {
  const c = asCountry(country);
  const override = s.policyRate?.[c];
  if (typeof override === "number") return override;
  if (c === "leo") return s.fedRate;
  return COUNTRY[c].baseRate + (s.fedRate - 0.0425) * 0.5;
}

export function transportFeeLeo(notionalLeo: number, remote: boolean): number {
  return (remote ? 220 : 40) + Math.abs(notionalLeo) * (remote ? 0.004 : 0.001);
}

export function emptyAccounts(home: CountryId): NonNullable<GameState["accounts"]> {
  const h = asCountry(home);
  return {
    leo: h === "leo",
    david: h === "david",
    ramona: h === "ramona",
    anna: h === "ramona",
  };
}

export function defaultPolicyRate(): NonNullable<GameState["policyRate"]> {
  return { leo: 0.0425, david: 0.055, ramona: 0.031 };
}

export function defaultPolicyTariff(): NonNullable<GameState["policyTariff"]> {
  return { leo: 0, david: 0.06, ramona: 0.04 };
}

export function clockWithTz(tick: number, country: CountryId): string {
  const h = localHour(tick, country);
  return `${h.toString().padStart(2, "0")}:00`;
}
