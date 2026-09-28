import { CLIENT_NAMES, FUTURE_SEED, PLOT_SEED, PROPERTY_SEED, PROJECT_SEEDS, RIVAL_SEEDS, STOCK_SEED, SAVE_VERSION, BUILD_COST, BUILD_STAGE_TICKS, DEFAULT_CREDIT, DEPRESSION_DRAWDOWN, PROPERTY_TAX_DAILY, RESCUE_POINTS_NEEDED, STREET_LP_POOL0, WORLD_GDP0, YEAR_TICKS, FX_ANA0, FX_CROSS0, FX_DVD0 } from "./catalog.ts";
import {
  compoundRate,
  countryCcy,
  creditOf,
  creditWallet,
  dayOf,
  debitWallet,
  debt,
  hourOf,
  isCreditBanned,
  isMarketOpen,
  isWeekend,
  loanRateOf,
  maintenanceRequired,
  marginEquity,
  marginRate,
  maxLeverage,
  mortgageRate,
  netWorth,
  optionMark,
  prestige,
  simpleRate,
  slippage,
  takeLiquidity,
  toLeo,
  worldGdpOf,
} from "./economy.ts";
import { asCountry, defaultPolicyRate, defaultPolicyTariff, emptyAccounts, hasAccount, isAnyBoardOpen, isBoardOpen, policyRateOf, tariffOf, transportFeeLeo } from "./countries.ts";
import { blackScholes, clamp, id, makeRng, randn, seededDraw } from "./math.ts";
import { readProgress, writeProgress } from "./progress.ts";
import { maybeSpawnNews, nextNewsGap } from "./news.ts";
import type {
  Career,
  CountryId,
  FuturePos,
  GameState,
  Gender,
  LogItem,
  OptionPos,
} from "./types.ts";

function pushLog(s: GameState, zh: string, en: string, tone: LogItem["tone"] = "info") {
  s.log = [{ tick: s.tick, zh, en, tone }, ...s.log].slice(0, 48);
}

function toast(s: GameState, zh: string, en: string, tone: LogItem["tone"] = "info") {
  s.toastSeq += 1;
  s.lastToast = { id: s.toastSeq, zh, en, tone };
  pushLog(s, zh, en, tone);
}

function rngFrom(s: GameState): () => number {
  const rng = makeRng(s.rngState || s.seed || 1);
  const wrapped = () => {
    const v = rng();
    s.rngState = (Math.imul(s.rngState || s.seed, 1664525) + 1013904223) >>> 0;
    return v;
  };
  return wrapped;
}

/**
 * One seeded draw off the run's own stream, for code paths that fire outside
 * the tick loop (an order the player just sent, a raise they just attempted).
 * These used `Math.random()`, which quietly broke the `seed`/`rngState`
 * contract the rest of the sim is built on.
 */
export function rollRng(s: GameState): number {
  const { value, next } = seededDraw(s.rngState, s.seed);
  s.rngState = next;
  return value;
}

function pushHist(arr: number[], v: number, cap = 96) {
  arr.push(v);
  if (arr.length > cap) arr.shift();
}

function indexPx(s: GameState): number {
  const list = Object.values(s.stocks);
  const avg =
    list.reduce((a, st) => a + toLeo(st.price, countryCcy(st.country ?? "leo"), s), 0) / Math.max(1, list.length);
  return avg;
}

export function createInitial(name: string, career: Career, playerId: string, gender: Gender = "male", homeCountry: CountryId = "leo"): GameState {
  const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  const stocks: GameState["stocks"] = {};
  for (const st of STOCK_SEED) {
    stocks[st.ticker] = {
      ...st,
      open: st.price,
      prevClose: st.price,
      fair: st.price,
      history: Array.from({ length: 24 }, () => st.price),
    };
  }
  const futures: GameState["futures"] = {};
  for (const f of FUTURE_SEED) {
    futures[f.symbol] = { ...f, history: [...f.history] };
  }
  const idx0 =
    Object.values(stocks).reduce((a, st) => {
      const ccy = st.country === "david" ? FX_DVD0 : asCountry(st.country) === "ramona" ? FX_ANA0 : 1;
      return a + st.price / Math.max(1, ccy);
    }, 0) / Math.max(1, Object.keys(stocks).length);
  if (futures.ST1) {
    futures.ST1.price = idx0;
    futures.ST1.history = [idx0];
  }
  const home = asCountry(homeCountry);
  const localMult = home === "david" ? FX_DVD0 : home === "ramona" ? FX_ANA0 : 1;
  const seedCash = career === "broker" ? 1_000_000 : 100_000;
  const cash = home === "leo" ? seedCash : 0;
  const cashDvd = home === "david" ? seedCash * localMult : 0;
  const cashAna = home === "ramona" ? seedCash * localMult : 0;
  const clients =
    career === "broker"
      ? CLIENT_NAMES.slice(0, 3).map((n, i) => ({
          id: `c${i}`,
          name: n,
          aum: 40000 + i * 15000,
          mood: 0.7,
        }))
      : [];
  const fundAum = clients.reduce((a, c) => a + c.aum, 0);

  return {
    version: SAVE_VERSION,
    started: true,
    name,
    playerId,
    gender,
    career,
    tick: 9,
    speed: 1,
    cash,
    cashDvd,
    cashAna,
    simpleDeposit: 0,
    simpleAccrued: 0,
    compoundDeposit: 0,
    bankLoan: 0,
    seed,
    rngState: seed,
    fedRate: 0.0425,
    stocks,
    futures,
    positions: [],
    options: [],
    orders: [],
    futPos: [],
    properties: PROPERTY_SEED.map((p) => ({ ...p, history: [...p.history] })),
    ownedProps: [],
    news: [],
    pending: [],
    clients,
    fundAum,
    fundHighwater: fundAum,
    shop: {
      quantServer: false,
      serverAt: "none",
      hft: false,
      satellite: false,
      analystUntilDay: 0,
      renovation: false,
      license: false,
    },
    quant: { momentum: false, meanRev: false, newsHunter: false, grid: false, allocPct: 20 },
    log: [
      {
        tick: 9,
        zh: career === "broker" ? "牌照已挂上。客户在走廊里等你给他们赚钱。" : "账户开好了。狮子街的灯刚亮，先别急着加杠杆。",
        en: career === "broker" ? "License on the wall. Clients are in the hall." : "Account open. Leo Street just lit up. Don't lever yet.",
        tone: "info",
      },
    ],
    openPanel: null,
    exchangeTab: "stocks",
    gameOver: null,
    dayPnlMark: seedCash,
    haltUntilTick: 0,
    nextNewsTick: 12,
    toastSeq: 0,
    lastToast: null,
    tutorial: 1,
    creditScore: DEFAULT_CREDIT,
    loanMissedDays: 0,
    creditBanUntilDay: 0,
    bankruptcies: 0,
    inDefault: false,
    worldGdp: WORLD_GDP0,
    streetLpPool: STREET_LP_POOL0,
    lastRaiseTick: 0,
    raiseCount: 0,
    fxDvdPerLeo: FX_DVD0,
    fxAnaPerLeo: FX_ANA0,
    fxDvdPerAna: FX_CROSS0,
    fxHistDvd: Array.from({ length: 24 }, () => FX_DVD0),
    fxHistAna: Array.from({ length: 24 }, () => FX_ANA0),
    productivity: 1,
    bubbleHeat: 0.12,
    street: home,
    homeCountry: home,
    zone: "street",
    accounts: emptyAccounts(home),
    fxDayNotional: 0,
    fxDayStamp: 1,
    fxLegs: [],
    lawStrikes: 0,
    lawFinesPaid: 0,
    fxBanUntilDay: 0,
    rmbSpent: 0,
    paidOrderIds: [],
    journal: [],
    policyRate: defaultPolicyRate(),
    policyTariff: defaultPolicyTariff(),
    projects: [],
    rivals: RIVAL_SEEDS.map((r) => ({ ...r, nav: 100_000 })),
    rivalStakes: [],
    hired: null,
    employedBy: null,
    investors: [],
    offers: [],
    plots: PLOT_SEED.map((p) => ({ id: p.id, owned: false, stage: 0, nextStageTick: 0 })),
    edu: 0,
    eduDay: 0,
    lastSolicitTick: 0,
    marketPeak: idx0,
    depressionFromTick: null,
    rescuePoints: 0,
    lastFedRate: 0.0425,
  };
}

/**
 * One hour of MARKET: boards opening, due shocks, prices, fills, expiries, news.
 *
 * Split out of `applyTick` so a match round can run the same, tested tape
 * without dragging in the single-player economy — rent, mortgages, property
 * tax, construction, projects, rivals, the depression clock. A round is a
 * trading session, not a life.
 *
 * Mutates `s`, and takes the caller's `rng` so both callers stay on one stream.
 */
export function stepMarket(s: GameState, rng: () => number) {
  openBoards(s);
  applyDueShocks(s);

  if (isAnyBoardOpen(s.tick) && s.tick >= s.haltUntilTick) {
    stepPrices(s, rng);
    markFutures(s);
  }

  expireOptions(s);
  fillOrders(s);

  if (s.tick >= s.nextNewsTick) {
    const spawned = maybeSpawnNews(s, rng);
    if (spawned.news.length) {
      s.news = [...spawned.news, ...s.news].slice(0, 80);
      s.pending = [...s.pending, ...spawned.pending];
      const n = spawned.news[0];
      if (n && n.visibleTick <= s.tick) {
        toast(s, n.headlineZh, n.headlineEn, n.exclusive ? "news" : "info");
      }
    }
    s.nextNewsTick = s.tick + nextNewsGap(rng, hourOf(s.tick));
  }
}

export function applyTick(prev: GameState): GameState {
  if (!prev.started || prev.gameOver) return prev;
  const s: GameState = {
    ...prev,
    stocks: { ...prev.stocks },
    futures: { ...prev.futures },
    positions: prev.positions.map((p) => ({ ...p })),
    options: prev.options.map((o) => ({ ...o })),
    orders: prev.orders.map((o) => ({ ...o })),
    futPos: prev.futPos.map((p) => ({ ...p })),
    properties: prev.properties.map((p) => ({ ...p, history: [...p.history] })),
    ownedProps: prev.ownedProps.map((p) => ({ ...p })),
    news: prev.news.map((n) => ({ ...n })),
    pending: [...prev.pending],
    clients: prev.clients.map((c) => ({ ...c })),
    investors: (prev.investors ?? []).map((i) => ({ ...i })),
    offers: (prev.offers ?? []).map((o) => ({ ...o })),
    plots: (prev.plots ?? []).map((p) => ({ ...p })),
    projects: (prev.projects ?? []).map((p) => ({ ...p })),
    rivals: (prev.rivals ?? []).map((r) => ({ ...r })),
    rivalStakes: (prev.rivalStakes ?? []).map((r) => ({ ...r })),
    shop: { ...prev.shop },
    quant: { ...prev.quant },
    log: [...prev.log],
    fxLegs: (prev.fxLegs ?? []).map((l) => ({ ...l })),
    fxHistDvd: [...(prev.fxHistDvd ?? [])],
    fxHistAna: [...(prev.fxHistAna ?? [])],
  };
  s.tick += 1;
  const rng = rngFrom(s);
  const hour = hourOf(s.tick);

  if (hour === 0) accrueDaily(s, rng);
  stepFx(s, rng);
  if (hour === 16 && !isWeekend(s.tick)) closeBell(s, rng);

  stepMarket(s, rng);

  if (!(isAnyBoardOpen(s.tick) && s.tick >= s.haltUntilTick) && hour === 0) {
    stepProperty(s, rng, 0.15);
  }

  runQuant(s, rng);
  brokerFlow(s, rng);

  for (const n of s.news) {
    if (!n.applied && n.visibleTick === s.tick && n.tick !== s.tick) {
      toast(s, n.headlineZh, n.headlineEn, n.exclusive ? "news" : "info");
    }
  }

  forcedLiquidation(s);
  checkBreaker(s);
  checkBust(s);
  maybeUnlockProgress(s);
  return s;
}

/** Match resting orders against the tape: limits fill on touch, stops guard open positions. */
function fillOrders(s: GameState) {
  if (!s.orders.length) return;
  const rest: GameState["orders"] = [];
  for (const o of s.orders) {
    const st = s.stocks[o.ticker];
    if (!st) continue;
    const ctry = asCountry(st.country);
    if (!isBoardOpen(s.tick, ctry) || s.tick < s.haltUntilTick) {
      rest.push(o);
      continue;
    }
    const cur = st.price;
    if (o.kind === "limit") {
      if (o.side === "buy" && cur <= o.price) {
        const err = buyStockInternal(s, o.ticker, o.shares, o.leverage);
        if (!err) toast(s, `限价买单成交 ${o.ticker} x${o.shares} @ ${cur.toFixed(2)}`, `Limit buy filled ${o.ticker} x${o.shares} @ ${cur.toFixed(2)}`, "good");
        else pushLog(s, `限价买单未能成交（${err}）`, `Limit buy failed (${err})`, "bad");
        continue;
      }
      if (o.side === "sell" && cur >= o.price) {
        const err = trySellStock(s, o.ticker, o.shares);
        if (!err) toast(s, `限价卖单成交 ${o.ticker} x${o.shares} @ ${cur.toFixed(2)}`, `Limit sell filled ${o.ticker} x${o.shares} @ ${cur.toFixed(2)}`, "good");
        else pushLog(s, `限价卖单未能成交（${err}）`, `Limit sell failed (${err})`, "bad");
        continue;
      }
      rest.push(o);
      continue;
    }
    // Stop-loss: it lives only as long as the position it guards.
    const pos = s.positions.find((p) => p.ticker === o.ticker && p.shares !== 0);
    if (!pos) continue;
    if (o.side === "sell" && pos.shares > 0 && cur <= o.price) {
      closeStockInternal(s, o.ticker);
      toast(s, `止损触发，卖出 ${o.ticker} @ ${cur.toFixed(2)}`, `Stop triggered, sold ${o.ticker} @ ${cur.toFixed(2)}`, "bad");
      continue;
    }
    if (o.side === "buy" && pos.shares < 0 && cur >= o.price) {
      closeStockInternal(s, o.ticker);
      toast(s, `止损触发，回补 ${o.ticker} @ ${cur.toFixed(2)}`, `Stop triggered, covered ${o.ticker} @ ${cur.toFixed(2)}`, "bad");
      continue;
    }
    rest.push(o);
  }
  s.orders = rest;
}

function openBoards(s: GameState) {
  let opened = false;
  for (const st of Object.values(s.stocks)) {
    const c = asCountry(st.country);
    if (isBoardOpen(s.tick, c) && !isBoardOpen(s.tick - 1, c)) {
      st.prevClose = st.price;
      st.open = st.price;
      opened = true;
    }
  }
  if (opened && isBoardOpen(s.tick, asCountry(s.homeCountry ?? "leo"))) {
    s.dayPnlMark = netWorth(s);
  }
}

function closeBell(s: GameState, rng: () => number) {
  const nw = netWorth(s);
  const pnl = nw - s.dayPnlMark;
  if (Math.abs(pnl) > 50) {
    pushLog(
      s,
      `收盘净值 ${pnl >= 0 ? "赚" : "亏"} ${Math.abs(pnl).toFixed(0)}`,
      `Close NAV ${pnl >= 0 ? "+" : "−"} ${Math.abs(pnl).toFixed(0)}`,
      pnl >= 0 ? "good" : "bad",
    );
  }
  stepProperty(s, rng, 1);
  if (s.fundAum > 0) {
    const fee = s.fundAum * (0.02 / 365);
    s.cash += fee;
  }
  for (const h of s.ownedProps) {
    const spec = s.properties.find((p) => p.id === h.id);
    if (spec) s.cash += spec.rentPerDay;
  }
}

function accrueDaily(s: GameState, rng: () => number) {
  const sr = simpleRate(s.fedRate);
  const cr = compoundRate(s.fedRate);
  s.simpleAccrued += s.simpleDeposit * (sr / 365);
  s.compoundDeposit *= 1 + cr / 365;
  if (dayOf(s.tick) % 30 === 0 && s.simpleAccrued > 0) {
    s.cash += s.simpleAccrued;
    pushLog(s, `单利结息入账 Ł${s.simpleAccrued.toFixed(0)}`, `Simple interest posted Ł${s.simpleAccrued.toFixed(0)}`, "good");
    s.simpleAccrued = 0;
  }
  serviceBankLoan(s);
  growProductivity(s, rng);
  maybeBurstBubble(s, rng);
  s.fxDayNotional = 0;
  s.fxDayStamp = dayOf(s.tick);
  if ((s.fxBanUntilDay ?? 0) > 0 && dayOf(s.tick) >= s.fxBanUntilDay) {
    s.lawStrikes = 0;
    s.fxBanUntilDay = 0;
    pushLog(s, "套汇禁令到期，跨境柜台重新开门。", "FX ban lifted. Cross-border desk is open.", "good");
  }
  for (const p of s.positions) {
    if (p.borrowed > 0) p.borrowed *= 1 + marginRate(s.fedRate) / 365;
  }
  for (const h of s.ownedProps) {
    if (h.mortgage > 0) {
      const pay = Math.min(h.mortgage * (mortgageRate(s.fedRate) / 365) + h.mortgage * 0.0004, h.mortgage);
      const paid = takeLiquidity(s, pay);
      if (paid >= pay * 0.99) {
        const interest = h.mortgage * (mortgageRate(s.fedRate) / 365);
        h.mortgage = Math.max(0, h.mortgage - (paid - interest));
      } else {
        h.mortgage += h.mortgage * (mortgageRate(s.fedRate) / 365);
        s.creditScore = Math.max(300, creditOf(s) - 2);
      }
    }
  }
  growWorld(s);
  // Property tax on all owned real estate; shortfall rolls into bank debt.
  for (const h of s.ownedProps) {
    const spec = s.properties.find((p) => p.id === h.id);
    if (!spec) continue;
    const tax = spec.price * PROPERTY_TAX_DAILY;
    const paid = takeLiquidity(s, tax);
    if (paid < tax) s.bankLoan += tax - paid;
  }
  // Construction: one stage per day; at stage 5 the house joins the realty book.
  for (const plot of s.plots) {
    if (!plot.owned || plot.stage < 1 || plot.stage >= 5 || s.tick < plot.nextStageTick) continue;
    plot.stage += 1;
    plot.nextStageTick = s.tick + BUILD_STAGE_TICKS;
    if (plot.stage >= 5) {
      const seed = PLOT_SEED.find((p) => p.id === plot.id);
      const value = Math.round(((seed?.price ?? 100_000) + BUILD_COST) * 1.15);
      const name = seed?.name.replace("地块", "小屋") ?? "自建小屋";
      s.properties.push({
        id: `built-${plot.id}`,
        name,
        district: "自建区",
        basePrice: value,
        price: value,
        rentPerDay: Math.round(BUILD_COST / 1000),
        history: [value],
      });
      s.ownedProps.push({ id: `built-${plot.id}`, mortgage: 0 });
      toast(s, `${name} 封顶交付！`, `${name} topped out — keys handed over.`, "good");
    }
  }
  if (dayOf(s.tick) % 90 === 0) {
    for (const st of Object.values(s.stocks)) {
      if (st.dividendYield > 0) {
        const pos = s.positions.find((p) => p.ticker === st.ticker);
        if (pos && pos.shares > 0) {
          const div = pos.shares * st.price * (st.dividendYield / 4);
          s.cash += div;
          pushLog(s, `${st.ticker} 派息 Ł${div.toFixed(0)}`, `${st.ticker} dividend Ł${div.toFixed(0)}`, "good");
        }
      }
    }
  }
  if (rng() < 0.04) {
    const delta = (rng() < 0.5 ? -1 : 1) * 0.0025;
    s.fedRate = clamp(s.fedRate + delta, 0.005, 0.09);
    pushLog(s, `利率走廊微调至 ${(s.fedRate * 100).toFixed(2)}%`, `Rate corridor now ${(s.fedRate * 100).toFixed(2)}%`, "news");
  }
  // Projects: build for N days, then pay daily revenue; incidents and failures scale with risk.
  for (const pj of s.projects) {
    const spec = PROJECT_SEEDS.find((p) => p.id === pj.specId);
    if (!spec || pj.failed) continue;
    if (s.tick < pj.doneTick) continue;
    if (!pj.done) {
      pj.done = true;
      toast(s, `${spec.nameZh} 建成投产，日入 Ł${spec.dailyRevenue}`, `${spec.nameEn} is live, earning Ł${spec.dailyRevenue}/day`, "good");
    }
    s.cash += spec.dailyRevenue;
    if (rng() < spec.risk * 0.03) {
      s.cash -= spec.dailyRevenue;
      pushLog(s, `${spec.nameZh} 事故停产一日`, `${spec.nameEn}: incident halted a day`, "bad");
    }
    if (rng() < spec.risk * 0.004) {
      pj.failed = true;
      toast(s, `${spec.nameZh} 项目失败了`, `${spec.nameEn} failed for good`, "bad");
    }
  }
  // The depression clock (Art. 13): 35% off the peak index trips the line.
  // Rescue points come from rate cuts, broker raises and green days; a full
  // year under the line ends the game, in single-player and online alike.
  const idxNow = indexPx(s);
  s.marketPeak = Math.max(s.marketPeak ?? 0, idxNow);
  if (s.depressionFromTick == null) {
    if ((s.marketPeak ?? 0) > 0 && idxNow <= (s.marketPeak ?? 0) * (1 - DEPRESSION_DRAWDOWN)) {
      s.depressionFromTick = s.tick;
      s.rescuePoints = 0;
      toast(
        s,
        "大萧条来了：指数自峰值回撤 35%。央行降息、券商募资、市场回暖都能攒挽救点。一年内救不回来，狮子街就散了。",
        "Depression: the index is 35% off its peak. Rate cuts, raises and green days earn rescue points. One year under the line ends it.",
        "bad",
      );
    }
  } else {
    if (s.fedRate < (s.lastFedRate ?? s.fedRate) - 0.001) s.rescuePoints += 2;
    const list = Object.values(s.stocks);
    const green = list.filter((st) => st.price > st.prevClose).length / Math.max(1, list.length);
    if (green > 0.55) s.rescuePoints += 1;
    if ((s.lastRaiseTick ?? 0) > s.tick - 24 && (s.lastRaiseTick ?? 0) <= s.tick) s.rescuePoints += 2;
    if (s.rescuePoints >= RESCUE_POINTS_NEEDED) {
      s.depressionFromTick = null;
      s.rescuePoints = 0;
      s.marketPeak = idxNow;
      toast(s, "救市成功，大萧条结束。狮子街的灯重新亮了。", "Rescue complete — the depression is over. The street is lit again.", "good");
    } else if (s.tick - s.depressionFromTick > YEAR_TICKS) {
      s.gameOver = "depression";
      s.speed = 0;
      toast(s, "一年过去，市场没有救回来。大萧条吞没了一切。", "A year without rescue. The depression took everything.", "bad");
    }
  }
  s.lastFedRate = s.fedRate;
  stepRivals(s, rng);
  maybeSolicit(s, rng);
  settleWorld(s, rng);
}

function applyDueShocks(s: GameState) {
  const due = s.pending.filter((p) => p.tick === s.tick);
  s.pending = s.pending.filter((p) => p.tick !== s.tick);
  for (const sh of due) {
    if (sh.rateShock) {
      s.fedRate = clamp(s.fedRate + sh.rateShock, 0.005, 0.09);
      const bnd = s.futures.BND;
      if (bnd) {
        bnd.price = clamp(bnd.price * (1 - sh.rateShock * 8), 80, 120);
        pushHist(bnd.history, bnd.price);
      }
      for (const st of Object.values(s.stocks)) {
        st.price = Math.max(1.2, st.price * (1 - (st.duration ?? 0) * sh.rateShock * 0.9));
        pushHist(st.history, st.price);
      }
    }
    if (sh.ticker && sh.shock) {
      const st = s.stocks[sh.ticker];
      if (st) {
        st.price = Math.max(1.2, st.price * (1 + sh.shock));
        pushHist(st.history, st.price);
      }
    } else if (sh.shock) {
      for (const st of Object.values(s.stocks)) {
        st.price = Math.max(1.2, st.price * (1 + sh.shock * st.beta));
        pushHist(st.history, st.price);
      }
    }
    const n = s.news.find((x) => x.impactTick === s.tick);
    if (n) n.applied = true;
  }
}

function stepPrices(s: GameState, rng: () => number) {
  const mkt = randn(rng) * 0.004;
  const hoursPerYear = 252 * 7;
  const prod = s.productivity ?? 1;
  const heat = s.bubbleHeat ?? 0;
  for (const ticker of Object.keys(s.stocks)) {
    const st = { ...s.stocks[ticker]!, history: [...s.stocks[ticker]!.history] };
    const floor = asCountry(st.country) === "leo" ? 0.8 : 20;
    if (!isBoardOpen(s.tick, asCountry(st.country))) continue;
    const rate = policyRateOf(s, asCountry(st.country));
    const ratePenalty = (st.duration ?? 0) * (rate - 0.03) * 0.012;
    const reversion = (Math.log(st.fair / Math.max(0.5, st.price)) * 0.08) / hoursPerYear;
    const mu = (st.drift - ratePenalty + (prod - 1) * 0.04) / hoursPerYear + reversion;
    const shock = st.beta * mkt + st.vol * randn(rng) * Math.sqrt(1 / hoursPerYear);
    st.price = Math.max(floor, st.price * Math.exp(mu + shock));
    st.fair = Math.max(floor, st.fair * Math.exp((st.drift * 0.35 + 0.018 * prod) / hoursPerYear));
    if (ticker === "BLUE") st.fair = st.fair * (1 + (s.fedRate - 0.03) * 0.0002);
    if (ticker === "OAK") st.fair = st.fair * (1 - (s.fedRate - 0.03) * 0.0003);
    if (st.sector === "tech") {
      st.price *= 1 + heat * 0.00015;
    }
    pushHist(st.history, st.price);
    s.stocks[ticker] = st;
  }
  // Bubble heat: tech PE vs productivity
  const tech = Object.values(s.stocks).filter((x) => x.sector === "tech");
  if (tech.length) {
    const gap = tech.reduce((a, x) => a + x.price / Math.max(1, x.fair) - 1, 0) / tech.length;
    s.bubbleHeat = clamp((s.bubbleHeat ?? 0) * 0.996 + gap * 0.05, 0, 1);
  }
  const idx = indexPx(s);
  for (const sym of Object.keys(s.futures)) {
    const f = { ...s.futures[sym]!, history: [...s.futures[sym]!.history] };
    if (sym === "ST1") f.price = idx;
    else if (sym === "BND") {
      f.price = clamp(f.price * Math.exp(-0.15 * (s.fedRate - 0.0425) / hoursPerYear + randn(rng) * 0.001), 80, 120);
    } else if (sym === "GLD") {
      const u = s.stocks.GOLD?.price ?? f.price;
      f.price = Math.max(1, f.price * 0.96 + u * 12.4 * 0.04);
      f.price *= Math.exp(randn(rng) * f.vol * Math.sqrt(1 / hoursPerYear));
    } else if (sym === "OIL") {
      const u = s.stocks.BOLT?.price ?? f.price;
      f.price = Math.max(1, f.price * 0.96 + u * 1.45 * 0.04);
      f.price *= Math.exp(randn(rng) * f.vol * Math.sqrt(1 / hoursPerYear));
    } else {
      f.price = Math.max(0.2, f.price * Math.exp(randn(rng) * f.vol * Math.sqrt(1 / hoursPerYear)));
    }
    pushHist(f.history, f.price);
    s.futures[sym] = f;
  }
}

function markFutures(s: GameState) {
  for (const p of s.futPos) {
    const f = s.futures[p.symbol];
    if (!f) continue;
    const pnl = (f.price - p.entry) * f.multiplier * p.qty;
    s.cash += pnl;
    p.entry = f.price;
  }
}

function stepProperty(s: GameState, rng: () => number, intensity: number) {
  const oak = s.stocks.OAK?.price ?? 68;
  const oak0 = 68;
  for (const p of s.properties) {
    const rateDrag = (s.fedRate - 0.03) * 0.4;
    const drift = ((oak / oak0 - 1) * 0.15 - rateDrag) * 0.002 * intensity;
    p.price = Math.max(p.basePrice * 0.55, p.price * (1 + drift + randn(rng) * 0.004 * intensity));
    pushHist(p.history, p.price, 48);
  }
}

/** Collateral to hand back on a written option, in the listing's local coin. */
function postedMarginOf(s: GameState, o: OptionPos): number {
  if (typeof o.posted === "number" && Number.isFinite(o.posted)) return Math.max(0, o.posted);
  // Pre-`posted` saves: best effort from the premium-era rule, never from spot.
  const st = s.stocks[o.ticker];
  return st ? st.price * 100 * Math.abs(o.qty) * 0.2 : 0;
}

function expireOptions(s: GameState) {
  const day = dayOf(s.tick);
  const hour = hourOf(s.tick);
  if (hour !== 16) return;
  const keep: OptionPos[] = [];
  for (const o of s.options) {
    if (o.expiryDay > day) {
      keep.push(o);
      continue;
    }
    const st = s.stocks[o.ticker];
    const ccy = countryCcy(st?.country ?? "leo");
    const intrinsic =
      o.kind === "call"
        ? Math.max(0, (st?.price ?? 0) - o.strike)
        : Math.max(0, o.strike - (st?.price ?? 0));
    // Settle in the underlying's local coin (Art. 1); release the margin that was
    // ACTUALLY posted at open — re-deriving it from today's spot minted money on
    // every rally and burned it on every sell-off.
    if (o.qty > 0) {
      creditWallet(s, ccy, intrinsic * o.qty * 100);
    } else {
      const owed = intrinsic * Math.abs(o.qty) * 100;
      if (owed > 0 && !debitWallet(s, ccy, owed)) takeLiquidity(s, toLeo(owed, ccy, s));
      creditWallet(s, ccy, postedMarginOf(s, o));
    }
    const settle = intrinsic * o.qty * 100;
    const mark = ccy === "dvd" ? "Đ" : ccy === "ana" ? "₳" : "Ł";
    const sign = settle > 0 ? "+" : settle < 0 ? "−" : "";
    toast(
      s,
      `${o.ticker} ${o.kind === "call" ? "看涨" : "看跌"} ${o.strike} 到期结算 ${sign}${Math.abs(settle).toFixed(0)} ${mark}`,
      `${o.ticker} ${o.kind} ${o.strike} expiry ${sign}${Math.abs(settle).toFixed(0)} ${mark}`,
      settle >= 0 ? "good" : "bad",
    );
  }
  s.options = keep;
}

function runQuant(s: GameState, rng: () => number) {
  if (!s.shop.quantServer) return;
  if (!isMarketOpen(s.tick) || s.tick < s.haltUntilTick) return;
  const budget = s.cash * (s.quant.allocPct / 100);
  if (budget < 800) return;
  const instant = s.shop.hft && s.shop.serverAt === "exchange";
  if (!instant && hourOf(s.tick) % 2 !== 0) return;

  const tickers = Object.keys(s.stocks);
  if (s.quant.momentum) {
    const t = tickers.reduce((best, k) => {
      const h = s.stocks[k]!.history;
      const ret = h.length > 6 ? h[h.length - 1]! / h[h.length - 6]! - 1 : 0;
      const br = s.stocks[best]!.history;
      const bret = br.length > 6 ? br[br.length - 1]! / br[br.length - 6]! - 1 : 0;
      return ret > bret ? k : best;
    }, tickers[0]!);
    const ret =
      s.stocks[t]!.history.length > 6
        ? s.stocks[t]!.history.at(-1)! / s.stocks[t]!.history.at(-6)! - 1
        : 0;
    if (ret > 0.025) buyStockInternal(s, t, Math.floor(budget * 0.25 / s.stocks[t]!.price), 1);
  }
  if (s.quant.meanRev) {
    for (const t of tickers) {
      const h = s.stocks[t]!.history;
      if (h.length < 8) continue;
      const ret = h.at(-1)! / h.at(-8)! - 1;
      if (ret < -0.045) buyStockInternal(s, t, Math.floor((budget * 0.2) / s.stocks[t]!.price), 1);
    }
  }
  if (s.quant.newsHunter && s.shop.serverAt === "exchange") {
    const fresh = s.news.find((n) => n.exclusive && n.tick === s.tick && n.ticker && n.shock);
    if (fresh?.ticker && fresh.shock) {
      const px = s.stocks[fresh.ticker]!.price;
      const qty = Math.max(1, Math.floor((budget * 0.5) / px));
      if (fresh.shock > 0) buyStockInternal(s, fresh.ticker, qty, 1);
      else shortStockInternal(s, fresh.ticker, qty);
    }
  }
  if (s.quant.grid) {
    // Grid bot: mean-reverting rungs — buy when the tape dips ~2% under the
    // history mean, sell inventory when it runs ~2% over it.
    for (const t of tickers) {
      const h = s.stocks[t]!.history;
      if (h.length < 8) continue;
      const anchor = h.reduce((a, v) => a + v, 0) / h.length;
      if (anchor <= 0) continue;
      const px = s.stocks[t]!.price;
      const dev = px / anchor - 1;
      if (dev < -0.02) buyStockInternal(s, t, Math.floor((budget * 0.08) / px), 1);
      else if (dev > 0.02) {
        const pos = s.positions.find((p) => p.ticker === t && p.shares > 0);
        if (pos) trySellStock(s, t, Math.max(1, Math.floor(pos.shares * 0.25)));
      }
    }
  }
  void rng;
}

function brokerFlow(s: GameState, rng: () => number) {
  const licensed = s.career === "broker" || s.shop.license;
  if (!licensed || !s.clients.length) return;
  if (!isMarketOpen(s.tick)) return;
  if (rng() > 0.18) return;
  const c = s.clients[Math.floor(rng() * s.clients.length)]!;
  const notional = c.aum * (0.02 + rng() * 0.05);
  const comm = notional * 0.0015;
  s.cash += comm;
  const nw = netWorth(s);
  const ret = (nw - s.dayPnlMark) / Math.max(1, s.dayPnlMark);
  c.mood = clamp(c.mood + ret * 2 + (rng() - 0.5) * 0.05, 0.05, 1);
  if (c.mood < 0.25 && rng() < 0.3) {
    s.fundAum -= c.aum;
    pushLog(s, `${c.name} 赎回 ${c.aum.toFixed(0)}`, `${c.name} redeemed ${c.aum.toFixed(0)}`, "bad");
    s.clients = s.clients.filter((x) => x.id !== c.id);
  } else if (c.mood > 0.8 && rng() < 0.08) {
    const add = 8000 + rng() * 18000;
    c.aum += add;
    s.fundAum += add;
    pushLog(s, `${c.name} 追加 ${add.toFixed(0)}`, `${c.name} added ${add.toFixed(0)}`, "good");
  }
}

function forcedLiquidation(s: GameState) {
  const need = maintenanceRequired(s);
  if (need <= 0) return;
  const eq = marginEquity(s);
  if (eq >= need) return;
  toast(s, "保证金不足，触发强制平仓", "Maintenance fail — forced liquidation", "bad");
  let guard = 0;
  while (marginEquity(s) < maintenanceRequired(s) && guard++ < 8) {
    const leveraged = s.positions
      .map((p) => ({ p, px: s.stocks[p.ticker]?.price ?? 0 }))
      .filter((x) => x.p.borrowed > 0 || x.p.shares < 0)
      .sort((a, b) => Math.abs(b.p.shares * b.px) - Math.abs(a.p.shares * a.px));
    if (leveraged[0]) {
      closeStockInternal(s, leveraged[0].p.ticker, true);
      continue;
    }
    if (s.futPos[0]) {
      closeFutureInternal(s, s.futPos[0].id, true);
      continue;
    }
    if (s.options[0]) {
      closeOptionInternal(s, s.options[0].id, true);
      continue;
    }
    break;
  }
}

function checkBreaker(s: GameState) {
  if (!isMarketOpen(s.tick)) return;
  let sum = 0;
  let n = 0;
  for (const st of Object.values(s.stocks)) {
    sum += st.price / st.open - 1;
    n++;
  }
  const avg = sum / Math.max(1, n);
  if (avg <= -0.07 && s.tick >= s.haltUntilTick) {
    s.haltUntilTick = s.tick + 2;
    toast(s, "指数熔断，交易暂停两小时", "Circuit breaker — two hours dark", "bad");
  }
}

function checkBust(s: GameState) {
  const nw = netWorth(s);
  const emptyBook =
    s.positions.length === 0 && s.options.length === 0 && s.futPos.length === 0 && s.ownedProps.length === 0;
  if (nw < -1000 && (s.inDefault || (s.loanMissedDays ?? 0) >= 7) && !isCreditBanned(s)) {
    declareBankruptcy(s);
    return;
  }
  if ((s.bankruptcies ?? 0) >= 2 && nw <= 0 && emptyBook) {
    s.gameOver = "bust";
    s.speed = 0;
    toast(s, "二次破产。狮子街把你除名了。", "Second bankruptcy. Leo Street struck you off.", "bad");
    return;
  }
  if (nw <= 0 && s.cash < 200 && emptyBook) {
    if ((s.bankruptcies ?? 0) === 0) {
      declareBankruptcy(s);
      if (netWorth(s) <= 0 && s.cash < 80 && s.positions.length === 0 && s.ownedProps.length === 0) {
        s.gameOver = "bust";
        s.speed = 0;
        toast(s, "破产清算完毕。狮子街的灯还亮着，但不再为你亮。", "Bankruptcy closed. The street is still lit. Not for you.", "bad");
      }
      return;
    }
    s.gameOver = "bust";
    s.speed = 0;
    toast(s, "账户被清算。狮子街的灯还亮着，但不再为你亮。", "Account gone. The street is still lit. Not for you.", "bad");
  }
}

function growWorld(s: GameState) {
  const gdp = worldGdpOf(s);
  const cap = gdp * 0.08;
  const refill = s.depressionFromTick != null ? gdp * 0.000004 : gdp * 0.000015;
  s.streetLpPool = Math.min(cap, (s.streetLpPool ?? STREET_LP_POOL0) + refill);
}

function serviceBankLoan(s: GameState) {
  if (s.bankLoan <= 1) {
    if ((s.loanMissedDays ?? 0) > 0) {
      s.loanMissedDays = 0;
      s.inDefault = false;
    }
    return;
  }
  const interest = s.bankLoan * (loanRateOf(s) / 365);
  const paid = takeLiquidity(s, interest);
  if (paid >= interest * 0.99) {
    s.loanMissedDays = Math.max(0, (s.loanMissedDays ?? 0) - 1);
    if (s.loanMissedDays === 0) s.inDefault = false;
    s.creditScore = Math.min(850, creditOf(s) + 0.08);
    return;
  }
  s.bankLoan += interest - paid;
  s.loanMissedDays = (s.loanMissedDays ?? 0) + 1;
  const miss = s.loanMissedDays;
  s.creditScore = Math.max(300, creditOf(s) - (miss >= 3 ? 12 : 5));
  if (miss === 3) {
    s.inDefault = true;
    toast(s, "已列入失信：停止新授信，贷款利率上浮，杠杆被砍。", "Default listed: no new credit, loan spread up, leverage cut.", "bad");
  } else if (miss === 7) {
    const seized = takeLiquidity(s, s.bankLoan);
    s.bankLoan = Math.max(0, s.bankLoan - seized);
    toast(s, "存款已被划扣抵债。", "Deposits swept against the loan.", "bad");
  } else if (miss >= 14 && miss < 21) {
    seizeOneProperty(s);
  } else if (miss >= 21) {
    declareBankruptcy(s);
  } else if (miss > 3) {
    toast(s, `贷款逾期第 ${miss} 天，信用 ${creditOf(s)}`, `Loan past due day ${miss}. Credit ${creditOf(s)}`, "bad");
  }
}

function seizeOneProperty(s: GameState) {
  const h = s.ownedProps[0];
  if (!h) return;
  const spec = s.properties.find((p) => p.id === h.id);
  s.ownedProps = s.ownedProps.filter((x) => x.id !== h.id);
  if (!spec) return;
  const proceeds = spec.price * 0.72;
  const residual = proceeds - h.mortgage;
  if (residual > 0) {
    const toLoan = Math.min(residual, s.bankLoan);
    s.bankLoan -= toLoan;
    s.cash += residual - toLoan;
  } else {
    s.bankLoan += -residual;
  }
  toast(
    s,
    `法拍 ${spec.name}，回收 Ł${Math.max(0, residual).toFixed(0)}`,
    `Seized ${spec.name}, recovered Ł${Math.max(0, residual).toFixed(0)}`,
    "bad",
  );
}

export function declareBankruptcy(s: GameState) {
  if (s.gameOver) return;
  const tickers = [...new Set(s.positions.map((p) => p.ticker))];
  for (const t of tickers) closeStockInternal(s, t, true);
  while (s.futPos[0]) closeFutureInternal(s, s.futPos[0].id, true);
  while (s.options[0]) closeOptionInternal(s, s.options[0].id, true);
  while (s.ownedProps[0]) seizeOneProperty(s);
  const swept = takeLiquidity(s, s.bankLoan);
  s.bankLoan = Math.max(0, s.bankLoan - swept) * 0.6;
  s.streetLpPool = (s.streetLpPool ?? STREET_LP_POOL0) + s.fundAum * 0.5;
  s.fundAum = 0;
  s.fundHighwater = 0;
  s.clients = [];
  s.creditScore = 300;
  s.creditBanUntilDay = dayOf(s.tick) + 90;
  s.inDefault = false;
  s.loanMissedDays = 0;
  s.bankruptcies = (s.bankruptcies ?? 0) + 1;
  s.cash = Math.max(s.cash, 500);
  toast(
    s,
    `破产重整：仓位被清，四成债务豁免，九十日内禁贷。信用 300。`,
    `Bankruptcy: book wiped, 40% of debt discharged, 90-day credit ban. Score 300.`,
    "bad",
  );
}

function maybeUnlockProgress(s: GameState) {
  const prev = readProgress();
  const nw = netWorth(s);
  const d = debt(s);
  const ratio = d / Math.max(1, nw + d);
  if (s.career === "retail" && nw >= 100_000_000 && ratio <= 0.1 && !prev.brokerUnlocked) {
    writeProgress({ brokerUnlocked: true });
    toast(s, "持牌券商已解锁。下次开局可以扮演，或现在去情报铺挂牌。", "Licensed broker unlocked. Start as one next life, or buy the license now.", "good");
  }
}

export function recordRetireUnlock(s: GameState) {
  const nw = netWorth(s);
  const d = debt(s);
  const ratio = d / Math.max(1, nw + d);
  if (s.career === "retail" && nw >= 100_000_000 && ratio <= 0.1) writeProgress({ brokerUnlocked: true });
  if (s.career === "broker" && nw >= 10_000_000_000 && ratio <= 0.15) {
    writeProgress({ governorUnlocked: true });
    toast(s, "央行总裁已解锁。下次开局可以按自己的意愿加息、降息、调关税。", "Governor unlocked. Next life you set rates and tariffs.", "good");
  }
}

export function applyPolicyShock(
  s: GameState,
  country: CountryId,
  patch: { rateDelta?: number; tariffDelta?: number },
) {
  const c = asCountry(country);
  const dRate = patch.rateDelta ?? 0;
  const dTariff = patch.tariffDelta ?? 0;
  if (dRate) {
    for (const st of Object.values(s.stocks)) {
      if (asCountry(st.country) !== c) continue;
      st.price = Math.max(1.2, st.price * (1 - (st.duration ?? 0) * dRate * 0.9));
      pushHist(st.history, st.price);
    }
    s.bubbleHeat = clamp((s.bubbleHeat ?? 0) + (dRate < 0 ? 0.09 : -0.14), 0, 1);
    if (dRate > 0.004) {
      s.productivity = Math.max(0.9, (s.productivity ?? 1) * (1 - dRate * 0.8));
    } else if (dRate < -0.004) {
      s.productivity = (s.productivity ?? 1) * (1 - dRate * 0.35);
    }
  }
  if (dTariff) {
    s.productivity = Math.max(0.82, (s.productivity ?? 1) * (1 - dTariff * 0.55));
    s.worldGdp = Math.max(WORLD_GDP0 * 0.7, (s.worldGdp ?? WORLD_GDP0) * (1 - dTariff * 0.25));
    if (c === "david") s.fxDvdPerLeo = clamp((s.fxDvdPerLeo ?? FX_DVD0) * (1 + dTariff * 0.4), 40, 140);
    if (c === "ramona") s.fxAnaPerLeo = clamp((s.fxAnaPerLeo ?? FX_ANA0) * (1 + dTariff * 0.4), 55, 180);
  }
}

function fillPx(s: GameState, raw: number, side: "buy" | "sell"): number {
  const slip = slippage(s);
  return side === "buy" ? raw * (1 + slip) : raw * (1 - slip);
}

function pushHistFx(arr: number[], v: number) {
  arr.push(v);
  if (arr.length > 96) arr.shift();
}

function stepFx(s: GameState, rng: () => number) {
  const hoursPerYear = 252 * 7;
  const dDvd = Math.exp(randn(rng) * 0.012 * Math.sqrt(1 / hoursPerYear));
  const dAna = Math.exp(randn(rng) * 0.011 * Math.sqrt(1 / hoursPerYear));
  s.fxDvdPerLeo = clamp((s.fxDvdPerLeo ?? FX_DVD0) * dDvd, 40, 140);
  s.fxAnaPerLeo = clamp((s.fxAnaPerLeo ?? FX_ANA0) * dAna, 55, 180);
  const ppp = (s.fxDvdPerLeo ?? FX_DVD0) / (s.fxAnaPerLeo ?? FX_ANA0);
  s.fxDvdPerAna = clamp(
    (s.fxDvdPerAna ?? FX_CROSS0) * Math.exp(randn(rng) * 0.01 * Math.sqrt(1 / hoursPerYear)) * 0.92 + ppp * 0.08,
    0.35,
    1.6,
  );
  s.fxHistDvd = [...(s.fxHistDvd ?? [FX_DVD0])];
  s.fxHistAna = [...(s.fxHistAna ?? [FX_ANA0])];
  pushHistFx(s.fxHistDvd, s.fxDvdPerLeo);
  pushHistFx(s.fxHistAna, s.fxAnaPerLeo);
}

function growProductivity(s: GameState, rng: () => number) {
  let g = Math.max(0.000015, 0.022 / 365 + randn(rng) * 0.000018);
  if (s.depressionFromTick != null) g = -0.012 / 365 + randn(rng) * 0.00001;
  s.productivity = Math.max(s.depressionFromTick != null ? 0.82 : 1, (s.productivity ?? 1) * (1 + g));
  s.worldGdp = Math.max(WORLD_GDP0, worldGdpOf(s) * (1 + g * 0.9));
}

function maybeBurstBubble(s: GameState, rng: () => number) {
  const heat = s.bubbleHeat ?? 0;
  if (heat < 0.68) return;
  if (rng() > 0.045) return;
  const crash = 0.1 + rng() * 0.14;
  for (const st of Object.values(s.stocks)) {
    const hit = st.sector === "tech" ? crash : crash * 0.45;
    st.price = Math.max(1, st.price * (1 - hit * (0.7 + st.beta * 0.3)));
    pushHist(st.history, st.price);
  }
  s.bubbleHeat = heat * 0.28;
  toast(
    s,
    `景气泡沫破裂：估值相对生产力偏了 ${(heat * 100).toFixed(0)}%。科技先掉。`,
    `Boom-bust: prices ran ${(heat * 100).toFixed(0)}% ahead of productivity. Tech first.`,
    "bad",
  );
}

/** Art. 8 — financial stability levy on the excess of a single order above 25% of NAV (floor Ł200,000). */
function stabilityLevy(s: GameState, notionalLeo: number): number {
  const cap = Math.max(200_000, netWorth(s) * 0.25);
  return notionalLeo > cap ? (notionalLeo - cap) * 0.001 : 0;
}

/** Collect a fine from liquidity; any shortfall converts to bank debt. Returns the fine charged. */
function payFine(s: GameState, fine: number): number {
  const paid = takeLiquidity(s, fine);
  if (paid < fine) s.bankLoan += fine - paid;
  s.lawFinesPaid = (s.lawFinesPaid ?? 0) + fine;
  return fine;
}

/** One constitutional strike; the third triggers a 30-day FX ban plus an extra credit hit. */
export function addStrike(s: GameState) {
  s.lawStrikes = (s.lawStrikes ?? 0) + 1;
  if (s.lawStrikes === 3) {
    s.fxBanUntilDay = dayOf(s.tick) + 30;
    s.creditScore = Math.max(300, creditOf(s) - 25);
  }
}

/** Art. 8 enforcement: charge the stability levy on an oversized order. */
function chargeLevy(s: GameState, notionalLeo: number) {
  const levy = stabilityLevy(s, notionalLeo);
  if (levy <= 0) return;
  payFine(s, levy);
  pushLog(
    s,
    `金融稳定税：单笔名义 ${Math.round(notionalLeo).toLocaleString()} 超额，缴纳 ${Math.round(levy).toLocaleString()} Leo币。`,
    `Stability levy: order of Ł${Math.round(notionalLeo).toLocaleString()} over the cap, charged Ł${Math.round(levy).toLocaleString()}.`,
    "info",
  );
}

/** Art. 9 enforcement: trading an exclusive before its public impact risks a regulatory probe. */
function insiderProbe(s: GameState, ticker: string, notionalLeo: number) {
  const hot = s.news.find(
    (n) =>
      n.ticker === ticker &&
      n.exclusive &&
      !n.applied &&
      n.visibleTick <= s.tick &&
      s.tick < n.impactTick,
  );
  if (!hot) return;
  if (rollRng(s) > 0.12) return;
  const fine = payFine(s, Math.max(2000, notionalLeo * 0.008));
  addStrike(s);
  s.creditScore = Math.max(300, creditOf(s) - 8);
  pushLog(
    s,
    `内幕交易调查：抢在独家消息落地前交易 ${ticker}，罚款 ${Math.round(fine).toLocaleString()} Leo币，记违宪一次。`,
    `Insider probe: front-ran ${ticker} before the exclusive landed. Fine Ł${Math.round(fine).toLocaleString()}, one strike.`,
    "bad",
  );
  toast(
    s,
    `监管上门：内幕交易罚款 ${Math.round(fine).toLocaleString()} Leo币。`,
    `Regulators called: insider fine Ł${Math.round(fine).toLocaleString()}.`,
    "bad",
  );
}


export function buyStockInternal(s: GameState, ticker: string, shares: number, leverage: number) {
  if (shares <= 0) return "err.qty";
  if (s.tick < s.haltUntilTick) return "err.halt";
  const st = s.stocks[ticker];
  if (!st) return "err.ticker";
  const ctry = asCountry(st.country);
  if (!isBoardOpen(s.tick, ctry)) return "err.closed";
  if (!hasAccount(s, ctry)) return "err.noAccount";
  // Buying against an open short covers it first.
  if (s.positions.some((p) => p.ticker === ticker && p.shares < 0)) closeStockInternal(s, ticker);
  const ccy = countryCcy(ctry);
  const px = fillPx(s, st.price, "buy");
  const cost = px * shares;
  const lev = clamp(leverage, 1, maxLeverage(s));
  const cashNeed = cost / lev;
  if (!debitWallet(s, ccy, cashNeed)) return ccy === "leo" ? "err.cash" : "err.fxCash";
  const remote = asCountry(s.street) !== ctry;
  const notion = toLeo(cost, ccy, s);
  if (remote) {
    const extraLeo = notion * tariffOf(s, ctry) + transportFeeLeo(notion, true);
    if (extraLeo > 0.5 && !debitWallet(s, "leo", extraLeo)) {
      creditWallet(s, ccy, cashNeed);
      return "err.duty";
    }
  }
  const borrowed = toLeo(cost - cashNeed, ccy, s);
  const existing = s.positions.find((p) => p.ticker === ticker);
  if (existing) {
    const total = existing.shares + shares;
    existing.avgCost = (existing.avgCost * existing.shares + px * shares) / Math.max(1, total);
    existing.shares = total;
    existing.borrowed += borrowed;
  } else {
    s.positions.push({ ticker, shares, avgCost: px, borrowed });
  }
  chargeLevy(s, notion);
  insiderProbe(s, ticker, notion);
  return null;
}

export function shortStockInternal(s: GameState, ticker: string, shares: number) {
  if (shares <= 0) return "err.qty";
  if (s.tick < s.haltUntilTick) return "err.halt";
  const st = s.stocks[ticker];
  if (!st) return "err.ticker";
  const ctry = asCountry(st.country);
  if (!isBoardOpen(s.tick, ctry)) return "err.closed";
  if (!hasAccount(s, ctry)) return "err.noAccount";
  // Shorting against an open long closes it first.
  if (s.positions.some((p) => p.ticker === ticker && p.shares > 0)) closeStockInternal(s, ticker);
  const ccy = countryCcy(ctry);
  const px = fillPx(s, st.price, "sell");
  const proceeds = px * shares;
  const margin = proceeds * 0.5;
  if (!debitWallet(s, ccy, margin)) return ccy === "leo" ? "err.margin" : "err.fxCash";
  // Sale proceeds are credited now; the P&L settles through the cover price at close.
  creditWallet(s, ccy, proceeds);
  // Collateral stays in the coin it was debited from (Art. 1). Booking it as Leo
  // and refunding Leo on the cover leaked the whole FX move into thin air and
  // never returned the foreign wallet's money.
  const existing = s.positions.find((p) => p.ticker === ticker);
  if (existing) {
    const total = Math.abs(existing.shares) + shares;
    existing.avgCost = (existing.avgCost * Math.abs(existing.shares) + px * shares) / Math.max(1, total);
    existing.shares -= shares;
    existing.shortMargin = (existing.shortMargin ?? 0) + margin;
  } else {
    s.positions.push({ ticker, shares: -shares, avgCost: px, borrowed: 0, shortMargin: margin });
  }
  const notion = toLeo(proceeds, ccy, s);
  chargeLevy(s, notion);
  insiderProbe(s, ticker, notion);
  return null;
}

export function closeStockInternal(s: GameState, ticker: string, force = false) {
  const p = s.positions.find((x) => x.ticker === ticker);
  if (!p) return "err.noPos";
  const st = s.stocks[ticker];
  if (!st) return "err.ticker";
  const ccy = countryCcy(st.country ?? "leo");
  const side: "buy" | "sell" = p.shares >= 0 ? "sell" : "buy";
  const px = fillPx(s, st.price, side) * (force ? 0.99 : 1);
  if (p.shares >= 0) {
    creditWallet(s, ccy, p.shares * px);
    const pay = takeLiquidity(s, p.borrowed);
    if (pay < p.borrowed) s.bankLoan += p.borrowed - pay;
  } else {
    // Buy back the borrowed shares, then release the posted collateral — back
    // into the SAME wallet it was locked from.
    const cover = Math.abs(p.shares) * px;
    if (!debitWallet(s, ccy, cover)) takeLiquidity(s, toLeo(cover, ccy, s));
    creditWallet(s, ccy, p.shortMargin ?? 0);
  }
  s.positions = s.positions.filter((x) => x.ticker !== ticker);
  if (force) pushLog(s, `强平 ${ticker} @ ${px.toFixed(2)}`, `Liq ${ticker} @ ${px.toFixed(2)}`, "bad");
  return null;
}

export function tradeOption(
  s: GameState,
  ticker: string,
  kind: "call" | "put",
  strike: number,
  expiryDay: number,
  qty: number,
): string | null {
  if (qty === 0) return "err.qty";
  if (s.tick < s.haltUntilTick) return "err.halt";
  const st = s.stocks[ticker];
  if (!st) return "err.ticker";
  const ctry = asCountry(st.country);
  if (!isBoardOpen(s.tick, ctry)) return "err.closed";
  if (!hasAccount(s, ctry)) return "err.noAccount";
  const ccy = countryCcy(ctry);
  const T = Math.max(1, expiryDay - dayOf(s.tick)) / 365;
  const prem = blackScholes(st.price, strike, T, s.fedRate, st.vol, kind);
  const px = fillPx(s, prem, qty > 0 ? "buy" : "sell");
  // Premium and margin settle in the underlying's local coin (Art. 1).
  const cost = px * 100 * qty;
  let posted = 0;
  if (qty > 0) {
    if (!debitWallet(s, ccy, cost)) return ccy === "leo" ? "err.cash" : "err.fxCash";
  } else {
    posted = st.price * 100 * Math.abs(qty) * 0.2;
    if (!debitWallet(s, ccy, posted)) return ccy === "leo" ? "err.openM" : "err.fxCash";
    creditWallet(s, ccy, Math.abs(cost));
  }
  s.options.push({
    id: id("opt"),
    ticker,
    kind,
    strike,
    expiryDay,
    qty,
    premium: px,
    posted,
  });
  chargeLevy(s, toLeo(st.price * 100 * Math.abs(qty), ccy, s));
  return null;
}

export function closeOptionInternal(s: GameState, oid: string, force = false) {
  const o = s.options.find((x) => x.id === oid);
  if (!o) return "err.noOpt";
  const st = s.stocks[o.ticker];
  const ccy = countryCcy(st?.country ?? "leo");
  const mark = optionMark(s, o);
  const px = fillPx(s, mark, o.qty > 0 ? "sell" : "buy") * (force ? 0.98 : 1);
  if (o.qty > 0) {
    creditWallet(s, ccy, px * o.qty * 100);
  } else {
    // Buy the contract back, then release exactly the margin posted at open.
    const buyback = px * Math.abs(o.qty) * 100;
    if (!debitWallet(s, ccy, buyback)) takeLiquidity(s, toLeo(buyback, ccy, s));
    creditWallet(s, ccy, postedMarginOf(s, o));
  }
  s.options = s.options.filter((x) => x.id !== oid);
  return null;
}

export function tradeFuture(s: GameState, symbol: string, qty: number): string | null {
  if (qty === 0) return "err.qty";
  if (s.tick < s.haltUntilTick) return "err.halt";
  const f = s.futures[symbol];
  if (!f) return "err.noFut";
  const notional = f.price * f.multiplier * Math.abs(qty);
  const posted = notional * 0.1;
  if (s.cash < posted) return "err.margin";
  s.cash -= posted;
  s.futPos.push({
    id: id("fut"),
    symbol,
    qty,
    entry: fillPx(s, f.price, qty > 0 ? "buy" : "sell"),
    posted,
  });
  chargeLevy(s, notional);
  return null;
}

export function closeFutureInternal(s: GameState, fid: string, force = false) {
  const p = s.futPos.find((x) => x.id === fid) as FuturePos | undefined;
  if (!p) return "err.noFut";
  const f = s.futures[p.symbol];
  if (!f) return "err.noFut";
  const px = fillPx(s, f.price, p.qty > 0 ? "sell" : "buy") * (force ? 0.99 : 1);
  const pnl = (px - p.entry) * f.multiplier * p.qty;
  s.cash += pnl + p.posted;
  s.futPos = s.futPos.filter((x) => x.id !== fid);
  return null;
}

export function tryBuyStock(
  s: GameState,
  ticker: string,
  shares: number,
  leverage: number,
): string | null {
  const err = buyStockInternal(s, ticker, shares, leverage);
  if (!err) pushLog(s, `买入 ${ticker} x${shares}${leverage > 1 ? ` ${leverage}x` : ""}`, `Buy ${ticker} x${shares}${leverage > 1 ? ` ${leverage}x` : ""}`, "good");
  return err;
}

export function trySellStock(s: GameState, ticker: string, shares: number): string | null {
  const p = s.positions.find((x) => x.ticker === ticker);
  if (!p || p.shares <= 0) {
    const err = shortStockInternal(s, ticker, shares);
    if (!err) pushLog(s, `做空 ${ticker} x${shares}`, `Short ${ticker} x${shares}`, "info");
    return err;
  }
  if (shares >= p.shares) return closeStockInternal(s, ticker);
  const st = s.stocks[ticker];
  if (!st) return "err.ticker";
  const ccy = countryCcy(st.country ?? "leo");
  const px = fillPx(s, st.price, "sell");
  const ratio = shares / p.shares;
  creditWallet(s, ccy, shares * px);
  const repay = p.borrowed * ratio;
  takeLiquidity(s, repay);
  p.borrowed -= repay;
  p.shares -= shares;
  pushLog(s, `卖出 ${ticker} x${shares}`, `Sell ${ticker} x${shares}`, "info");
  return null;
}

/* ------------------------------------------------------------------ */
/* Online world: rivals trade the same tape; money and jobs flow both ways. */
/* ------------------------------------------------------------------ */

const HIRE_WAGE: Record<string, number> = { analyst: 600, trader: 1000, manager: 1600 };
const SOLICIT_COOLDOWN = 3 * 24;
const OFFER_TTL = 2 * 24;

/** Rivals' NAV drifts by their own alpha plus a beta to the day's market move. */
function stepRivals(s: GameState, rng: () => number) {
  let sum = 0;
  let n = 0;
  for (const st of Object.values(s.stocks)) {
    if (st.prevClose > 0) {
      sum += st.price / st.prevClose - 1;
      n++;
    }
  }
  const mkt = n ? sum / n : 0;
  for (const r of s.rivals) {
    const drift = r.alpha + mkt * 0.55 + randn(rng) * 0.012;
    r.nav = clamp(r.nav * (1 + drift), 20_000, 2e10);
  }
}

/** Rivals reach out every few days: money to manage, or a job for you. */
function maybeSolicit(s: GameState, rng: () => number) {
  s.offers = (s.offers ?? []).filter((o) => o.expiryTick > s.tick);
  if (s.tick - (s.lastSolicitTick ?? 0) < SOLICIT_COOLDOWN) return;
  if ((s.offers ?? []).length >= 3) return;
  const p = prestige(s);
  if (p < 8) return;
  const r = s.rivals[Math.floor(rng() * s.rivals.length)]!;
  if (rng() < 0.5 && !s.employedBy) {
    const role: "analyst" | "trader" | "manager" = p >= 30 ? "manager" : p >= 16 ? "trader" : "analyst";
    const salary = Math.round(600 + p * 60 + rng() * 400);
    s.offers.push({ id: id("ofr"), rivalId: r.id, kind: "job", role, amount: salary, expiryTick: s.tick + OFFER_TTL });
    toast(
      s,
      `${r.nameZh} 想聘你做${role === "manager" ? "基金经理" : role === "trader" ? "交易员" : "量化分析师"}，日薪 ${salary}`,
      `${r.nameEn} offers you a ${role} seat at ${salary}/day`,
      "info",
    );
  } else {
    const amount = Math.round((20_000 + p * 4000 + rng() * 30_000) / 1000) * 1000;
    s.offers.push({ id: id("ofr"), rivalId: r.id, kind: "invest", amount, expiryTick: s.tick + OFFER_TTL });
    toast(
      s,
      `${r.nameZh} 想向你投资 Ł${amount.toLocaleString()}`,
      `${r.nameEn} wants to back you with Ł${amount.toLocaleString()}`,
      "good",
    );
  }
  s.lastSolicitTick = s.tick;
}

/** Daily world settlement: staff wages and effects, your salary, investor fees and exits. */
function settleWorld(s: GameState, rng: () => number) {
  const nw = netWorth(s);
  if (s.hired) {
    const wage = HIRE_WAGE[s.hired.role] ?? 800;
    s.cash -= wage;
    if (s.hired.role === "analyst") {
      s.shop.analystUntilDay = Math.max(s.shop.analystUntilDay ?? 0, dayOf(s.tick) + 2);
    } else if (s.hired.role === "trader") {
      s.cash += Math.max(0, nw) * 0.0005 * (0.5 + rng());
    } else if (s.hired.role === "manager") {
      for (const c of s.clients) c.mood = clamp(c.mood + 0.015, 0.05, 1);
      if ((s.career === "broker" || s.shop.license) && rng() < 0.08) {
        const add = 6000 + rng() * 14000;
        s.clients.push({ id: `c-${s.tick}`, name: CLIENT_NAMES[Math.floor(rng() * CLIENT_NAMES.length)]!, aum: add, mood: 0.65 });
        s.fundAum += add;
      }
    }
  }
  if (s.employedBy) {
    s.cash += s.employedBy.salary ?? 800;
  }
  const keep: GameState["investors"] = [];
  for (const inv of s.investors ?? []) {
    const stake = inv.invested * (nw / Math.max(1, inv.hwm));
    s.cash += stake * (0.02 / 365);
    const r = s.rivals.find((x) => x.id === inv.rivalId);
    if (nw < inv.hwm * 0.82) {
      const paid = takeLiquidity(s, stake);
      if (paid < stake) s.bankLoan += stake - paid;
      toast(
        s,
        `${r?.nameZh ?? inv.rivalId} 撤资了（净值跌破 18%）`,
        `${r?.nameEn ?? inv.rivalId} pulled out (NAV −18%)`,
        "bad",
      );
      continue;
    }
    if (nw > inv.hwm * 1.3) {
      const gains = stake - inv.invested;
      if (gains > 1) {
        const cut = gains * 0.5;
        const paid = takeLiquidity(s, cut);
        if (paid < cut) s.bankLoan += cut - paid;
        pushLog(
          s,
          `${r?.nameZh ?? inv.rivalId} 分红赎回 ${cut.toFixed(0)}`,
          `${r?.nameEn ?? inv.rivalId} skimmed ${cut.toFixed(0)} of gains`,
          "info",
        );
      }
      inv.hwm = nw;
    }
    keep.push(inv);
  }
  s.investors = keep;
}


