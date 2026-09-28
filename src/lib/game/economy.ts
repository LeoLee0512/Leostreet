import {
  DEFAULT_CREDIT,
  PROJECT_SEEDS,
  FX_ANA0,
  FX_CROSS0,
  FX_DVD0,
  FX_SPREAD,
  MAX_CREDIT,
  MIN_CREDIT,
  RAISE_COOLDOWN_HOURS,
  RETAIL_RAISE_MAX,
  STREET_LP_POOL0,
  WORLD_GDP0,
} from "./catalog.ts";
import { blackScholes, clamp } from "./math.ts";
import type { Ccy, CountryId, GameState, OptionPos } from "./types.ts";
import { asCountry, isBoardOpen } from "./countries.ts";

export function dayOf(tick: number): number {
  return Math.floor(tick / 24) + 1;
}

export function hourOf(tick: number): number {
  return tick % 24;
}

export function weekdayOf(tick: number): number {
  return (dayOf(tick) - 1) % 7;
}

export function isWeekend(tick: number): boolean {
  const w = weekdayOf(tick);
  return w >= 5;
}

export function isMarketOpen(tick: number, country: CountryId = "leo"): boolean {
  return isBoardOpen(tick, country);
}

export function simpleRate(fed: number): number {
  return Math.max(0.005, fed - 0.01);
}

export function compoundRate(fed: number): number {
  return Math.max(0.004, fed - 0.01);
}

export function creditOf(s: GameState): number {
  const n = s.creditScore ?? DEFAULT_CREDIT;
  return clamp(Math.round(n), MIN_CREDIT, MAX_CREDIT);
}

export function isCreditBanned(s: GameState): boolean {
  return (s.creditBanUntilDay ?? 0) > dayOf(s.tick);
}

export function isDelinquent(s: GameState): boolean {
  return Boolean(s.inDefault) || (s.loanMissedDays ?? 0) >= 3;
}

export function loanRate(fed: number, creditScore = DEFAULT_CREDIT, delinquent = false): number {
  const spread = clamp((720 - creditScore) / 8000, -0.015, 0.06);
  return Math.max(0.02, fed + 0.03 + spread + (delinquent ? 0.05 : 0));
}

export function loanRateOf(s: GameState): number {
  return loanRate(s.fedRate, creditOf(s), isDelinquent(s));
}

export function marginRate(fed: number): number {
  return fed + 0.04;
}

export function mortgageRate(fed: number): number {
  return fed + 0.02;
}

export function indexLevel(s: GameState): number {
  const list = Object.values(s.stocks);
  if (!list.length) return 100;
  const sum = list.reduce((a, st) => a + st.price / (st.prevClose || st.price), 0);
  return (sum / list.length) * 100;
}

export function optionMark(s: GameState, o: OptionPos): number {
  const st = s.stocks[o.ticker];
  if (!st) return 0;
  const T = Math.max(0, o.expiryDay - dayOf(s.tick)) / 365;
  if (T <= 0) {
    if (o.kind === "call") return Math.max(0, st.price - o.strike);
    return Math.max(0, o.strike - st.price);
  }
  return blackScholes(st.price, o.strike, T, s.fedRate, st.vol, o.kind);
}

export function stockMtm(s: GameState): number {
  return s.positions.reduce((a, p) => {
    const st = s.stocks[p.ticker];
    if (!st) return a;
    return a + toLeo(p.shares * st.price, countryCcy(st.country ?? "leo"), s);
  }, 0);
}

export function stockBorrow(s: GameState): number {
  return s.positions.reduce((a, p) => a + p.borrowed, 0);
}

/**
 * Own cash locked as collateral behind short sales, valued in Leo. An asset,
 * not a debt. `shortMargin` is stored in the listing's local coin, so it is
 * converted here at today's rate — which is exactly what makes a foreign short
 * carry honest FX exposure on its collateral.
 */
export function shortMarginPosted(s: GameState): number {
  return s.positions.reduce((a, p) => {
    if (p.shares >= 0 || !p.shortMargin) return a;
    const st = s.stocks[p.ticker];
    return a + toLeo(p.shortMargin, countryCcy(st?.country ?? "leo"), s);
  }, 0);
}

export function optionMtm(s: GameState): number {
  return s.options.reduce((a, o) => {
    const st = s.stocks[o.ticker];
    if (!st) return a;
    return a + toLeo(optionMark(s, o) * o.qty * 100, countryCcy(st.country ?? "leo"), s);
  }, 0);
}

export function futureMtm(s: GameState): number {
  return s.futPos.reduce((a, p) => {
    const f = s.futures[p.symbol];
    if (!f) return a;
    return a + (f.price - p.entry) * f.multiplier * p.qty;
  }, 0);
}

export function propertyEquity(s: GameState): number {
  return s.ownedProps.reduce((a, h) => {
    const spec = s.properties.find((p) => p.id === h.id);
    return a + (spec?.price ?? 0) - h.mortgage;
  }, 0);
}

export function deposits(s: GameState): number {
  return s.simpleDeposit + s.simpleAccrued + s.compoundDeposit;
}

export function liquidFunds(s: GameState): number {
  return s.cash + deposits(s);
}

export function debt(s: GameState): number {
  const mort = s.ownedProps.reduce((a, h) => a + h.mortgage, 0);
  return s.bankLoan + mort + stockBorrow(s);
}

export function postedFutures(s: GameState): number {
  return s.futPos.reduce((a, p) => a + p.posted, 0);
}

export function netWorth(s: GameState): number {
  return (
    s.cash +
    toLeo(s.cashDvd ?? 0, "dvd", s) +
    toLeo(s.cashAna ?? 0, "ana", s) +
    deposits(s) +
    stockMtm(s) +
    optionMtm(s) +
    futureMtm(s) +
    postedFutures(s) +
    shortMarginPosted(s) +
    propertyEquity(s) -
    s.bankLoan -
    stockBorrow(s)
  );
}

export function maintenanceRequired(s: GameState): number {
  let need = 0;
  for (const p of s.positions) {
    const st = s.stocks[p.ticker];
    if (!st) continue;
    const notional = Math.abs(toLeo(p.shares * st.price, countryCcy(st.country ?? "leo"), s));
    if (p.borrowed > 0 || p.shares < 0) need += notional * 0.3;
  }
  for (const o of s.options) {
    const st = s.stocks[o.ticker];
    if (!st) continue;
    if (o.qty < 0) need += toLeo(st.price * 100 * Math.abs(o.qty) * 0.2, countryCcy(st.country ?? "leo"), s);
  }
  for (const p of s.futPos) {
    need += p.posted * 0.6;
  }
  return need;
}

export function marginEquity(s: GameState): number {
  return (
    s.cash +
    stockMtm(s) +
    optionMtm(s) +
    futureMtm(s) +
    postedFutures(s) +
    shortMarginPosted(s) -
    stockBorrow(s)
  );
}

/**
 * Leverage is N× of actual capacity: NAV size, credit, and (as a ceiling)
 * license / colo. Delinquency and a GDP notional cap bind the rest.
 * There is no rigid 2/4/10 career lock.
 */
export function maxLeverage(s: GameState): number {
  if (isCreditBanned(s) || (s.loanMissedDays ?? 0) >= 14) return 1;
  const nw = Math.max(0, netWorth(s));
  const size = 1 + Math.log10(Math.max(1, nw / 25000));
  const creditF = clamp(0.25 + (creditOf(s) - 300) / 550, 0.25, 1.25);
  const raw = 1 + size * creditF * 2.4;
  let infra = 12;
  if (s.career === "broker" || s.shop.license) infra = 20;
  if (s.shop.hft && s.shop.serverAt === "exchange") infra = 30;
  if (isDelinquent(s)) infra = Math.min(infra, 2);
  const gdp = s.worldGdp ?? WORLD_GDP0;
  const eq = Math.max(250, marginEquity(s));
  const gdpCap = (gdp * 0.12) / eq;
  const cap = Math.min(infra, raw, gdpCap);
  return Math.max(1, Math.floor(cap * 2) / 2);
}

export function loanCapacity(s: GameState): number {
  if (isCreditBanned(s) || isDelinquent(s)) return 0;
  const ltv = clamp(0.12 + (creditOf(s) - 300) / 900, 0.12, 0.65);
  return Math.max(0, netWorth(s) * ltv - s.bankLoan);
}

export function slippage(s: GameState): number {
  if (s.shop.hft && s.shop.serverAt === "exchange") return 0.0002;
  return 0.0018;
}

export function prestige(s: GameState): number {
  let p = s.career === "broker" ? 20 : 8;
  if (s.shop.renovation) p += 25;
  if (s.shop.license) p += 15;
  if (s.shop.quantServer) p += 10;
  if (s.shop.hft) p += 12;
  const nw = netWorth(s);
  p += Math.min(40, nw / 80000);
  p += s.edu ?? 0;
  for (const pj of s.projects ?? []) {
    const spec = PROJECT_SEEDS.find((x) => x.id === pj.specId);
    if (spec && !pj.failed && s.tick >= pj.doneTick) p += spec.prestige;
  }
  p += (creditOf(s) - 710) / 20;
  if (s.inDefault) p -= 28;
  p -= (s.bankruptcies ?? 0) * 22;
  return Math.max(0, p);
}

export function analystOn(s: GameState): boolean {
  return s.shop.analystUntilDay > dayOf(s.tick);
}

export function visibleNews(s: GameState): GameState["news"] {
  return s.news.filter((n) => {
    if (n.visibleTick > s.tick) return false;
    if (n.exclusive && !(s.shop.quantServer && s.shop.serverAt === "exchange")) {
      return n.impactTick <= s.tick;
    }
    return true;
  });
}

/** Sweep cash then deposits. Mutates `s`. Returns how much was taken. */
export function takeLiquidity(s: GameState, amount: number): number {
  if (amount <= 0) return 0;
  let need = amount;
  const fromCash = Math.min(s.cash, need);
  s.cash -= fromCash;
  need -= fromCash;
  if (need <= 0) return amount;
  const fromSimple = Math.min(s.simpleDeposit, need);
  s.simpleDeposit -= fromSimple;
  need -= fromSimple;
  if (need <= 0) return amount;
  const fromAcc = Math.min(s.simpleAccrued, need);
  s.simpleAccrued -= fromAcc;
  need -= fromAcc;
  if (need <= 0) return amount;
  const fromC = Math.min(s.compoundDeposit, need);
  s.compoundDeposit -= fromC;
  need -= fromC;
  return amount - need;
}

export function worldGdpOf(s: GameState): number {
  return s.worldGdp ?? WORLD_GDP0;
}

export function streetPoolOf(s: GameState): number {
  return s.streetLpPool ?? STREET_LP_POOL0;
}

export function raiseCooldownLeft(s: GameState): number {
  const last = s.lastRaiseTick ?? 0;
  if (last <= 0) return 0;
  return Math.max(0, last + RAISE_COOLDOWN_HOURS - s.tick);
}

export function raiseCapacity(s: GameState): { maxAdd: number; reason: string | null } {
  const left = raiseCooldownLeft(s);
  if (left > 0) return { maxAdd: 0, reason: "err.raiseCd" };
  const nw = netWorth(s);
  if (nw < 80000) return { maxAdd: 0, reason: "err.nav" };
  if (isDelinquent(s) || isCreditBanned(s)) return { maxAdd: 0, reason: "err.banned" };
  const licensed = s.career === "broker" || s.shop.license;
  if (!licensed && (s.raiseCount ?? 0) >= RETAIL_RAISE_MAX) return { maxAdd: 0, reason: "err.raiseRetail" };
  const gdp = worldGdpOf(s);
  const hardCap = gdp * (licensed ? 0.08 : 0.004);
  const used = licensed ? s.fundAum : 0;
  const room = Math.max(0, hardCap - used);
  const pool = streetPoolOf(s);
  const p = prestige(s);
  const want = Math.round(40000 + p * 2500 + nw * 0.08);
  const maxAdd = Math.min(want, pool * 0.12, room);
  if (maxAdd < 8000) return { maxAdd: 0, reason: "err.raiseDry" };
  return { maxAdd, reason: null };
}

export function countryCcy(c: CountryId | undefined): Ccy {
  const id = asCountry(c);
  if (id === "david") return "dvd";
  if (id === "ramona") return "ana";
  return "leo";
}

export function dvdPerLeo(s: GameState): number {
  return s.fxDvdPerLeo ?? FX_DVD0;
}

export function anaPerLeo(s: GameState): number {
  return s.fxAnaPerLeo ?? FX_ANA0;
}

export function dvdPerAna(s: GameState): number {
  return s.fxDvdPerAna ?? FX_CROSS0;
}

export function toLeo(amount: number, ccy: Ccy, s: GameState): number {
  if (ccy === "leo") return amount;
  if (ccy === "dvd") return amount / Math.max(0.01, dvdPerLeo(s));
  return amount / Math.max(0.01, anaPerLeo(s));
}

export function fromLeo(amountLeo: number, ccy: Ccy, s: GameState): number {
  if (ccy === "leo") return amountLeo;
  if (ccy === "dvd") return amountLeo * dvdPerLeo(s);
  return amountLeo * anaPerLeo(s);
}

/** Mid units of `to` per 1 `from`. */
export function midRate(s: GameState, from: Ccy, to: Ccy): number {
  if (from === to) return 1;
  if (from === "leo" && to === "dvd") return dvdPerLeo(s);
  if (from === "dvd" && to === "leo") return 1 / dvdPerLeo(s);
  if (from === "leo" && to === "ana") return anaPerLeo(s);
  if (from === "ana" && to === "leo") return 1 / anaPerLeo(s);
  if (from === "dvd" && to === "ana") return 1 / Math.max(1e-6, dvdPerAna(s));
  if (from === "ana" && to === "dvd") return dvdPerAna(s);
  return 1;
}

export function quoteRate(s: GameState, from: Ccy, to: Ccy): number {
  return midRate(s, from, to) * (1 - FX_SPREAD);
}

export function debitWallet(s: GameState, ccy: Ccy, amt: number): boolean {
  if (amt <= 0) return true;
  if (ccy === "leo") {
    if (s.cash < amt) return false;
    s.cash -= amt;
    return true;
  }
  if (ccy === "dvd") {
    if ((s.cashDvd ?? 0) < amt) return false;
    s.cashDvd = (s.cashDvd ?? 0) - amt;
    return true;
  }
  if ((s.cashAna ?? 0) < amt) return false;
  s.cashAna = (s.cashAna ?? 0) - amt;
  return true;
}

export function creditWallet(s: GameState, ccy: Ccy, amt: number) {
  if (ccy === "leo") s.cash += amt;
  else if (ccy === "dvd") s.cashDvd = (s.cashDvd ?? 0) + amt;
  else s.cashAna = (s.cashAna ?? 0) + amt;
}

export function fxCapLeo(s: GameState): number {
  const nw = Math.max(0, netWorth(s));
  return Math.min(nw * 0.35 + 8000, 250000);
}

export function fxUsedToday(s: GameState): number {
  const day = dayOf(s.tick);
  if ((s.fxDayStamp ?? 0) !== day) return 0;
  return s.fxDayNotional ?? 0;
}

export function isFxBanned(s: GameState): boolean {
  return (s.fxBanUntilDay ?? 0) > dayOf(s.tick);
}

export function triangleGap(s: GameState): number {
  return dvdPerLeo(s) * (1 / Math.max(1e-6, dvdPerAna(s))) * (1 / anaPerLeo(s)) - 1;
}

