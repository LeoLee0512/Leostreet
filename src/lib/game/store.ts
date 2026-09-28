import { create } from "zustand";
import { ACCOUNT_OPEN_MIN, BUILD_COST, BUILD_STAGE_TICKS, DEFAULT_CREDIT, DEED_TAX, FX_ANA0, FX_CROSS0, FX_DVD0, PERMIT_FEE, PLOT_SEED, PROJECT_SEEDS, RAISE_COOLDOWN_HOURS, RIVAL_SEEDS, SALE_STAMP, SHOP_ITEMS, STOCK_SEED, STREET_LP_POOL0, WORLD_GDP0 } from "./catalog.ts";
import { clamp, randomPlayerId, sanitizeName, sanitizePlayerId, seededDraw } from "./math.ts";
import {
  compoundRate,
  creditOf,
  creditWallet,
  dayOf,
  debitWallet,
  debt,
  deposits,
  fxCapLeo,
  fxUsedToday,
  hourOf,
  isCreditBanned,
  isDelinquent,
  loanCapacity,
  loanRateOf,
  maxLeverage,
  netWorth,
  prestige,
  quoteRate,
  raiseCapacity,
  simpleRate,
  takeLiquidity,
  toLeo,
  worldGdpOf,
  isFxBanned,
} from "./economy.ts";
import { clearSave, readSave, writeSave } from "./save.ts";
import type { Career, Ccy, CountryId, GameState, Gender, LogItem, OrderKind, PanelId, QuantConfig, RivalRole, Speed, ZoneId } from "./types.ts";
import { asCountry, COUNTRY, crossingFee, emptyAccounts, hasAccount } from "./countries.ts";
import { compactUsd } from "./format.ts";
import { tPair } from "@/lib/i18n";
import { markPayPaid } from "./pay.ts";
import { grantItem, readProgress } from "./progress.ts";
import {
  addStrike,
  applyTick,
  applyPolicyShock,
  closeFutureInternal,
  closeOptionInternal,
  closeStockInternal,
  createInitial,
  recordRetireUnlock,
  tradeFuture,
  tradeOption,
  tryBuyStock,
  trySellStock,
} from "./sim.ts";

type Actions = {
  hydrate: (s: GameState) => void;
  start: (name: string, career: Career, playerId: string, gender: Gender, home?: CountryId) => void;
  tickHour: () => void;
  setPanel: (panel: PanelId) => void;
  setSpeed: (speed: Speed) => void;
  setExchangeTab: (tab: GameState["exchangeTab"]) => void;
  dismissTutorial: () => void;
  clearToast: () => void;
  buyStock: (ticker: string, shares: number, leverage: number) => string | null;
  sellStock: (ticker: string, shares: number) => string | null;
  closeStock: (ticker: string) => string | null;
  placeOrder: (ticker: string, kind: OrderKind, price: number, shares: number, leverage: number) => string | null;
  cancelOrder: (id: string) => void;
  investRival: (rivalId: string, amount: number) => string | null;
  redeemRival: (rivalId: string) => string | null;
  hireRival: (rivalId: string, role: RivalRole) => string | null;
  fireHired: () => void;
  acceptOffer: (offerId: string) => string | null;
  declineOffer: (offerId: string) => void;
  resignJob: () => void;
  buyPlot: (id: string) => string | null;
  startBuild: (id: string) => string | null;
  startProject: (specId: string) => string | null;
  shuttleTo: (zone: ZoneId) => void;
  campusLecture: () => string | null;
  campusSeminar: () => string | null;
  buyOption: (
    ticker: string,
    kind: "call" | "put",
    strike: number,
    expiryDay: number,
    qty: number,
  ) => string | null;
  closeOption: (id: string) => string | null;
  buyFuture: (symbol: string, qty: number) => string | null;
  closeFuture: (id: string) => string | null;
  deposit: (kind: "simple" | "compound", amount: number) => string | null;
  withdraw: (kind: "simple" | "compound", amount: number) => string | null;
  takeLoan: (amount: number) => string | null;
  repayLoan: (amount: number) => string | null;
  buyProperty: (id: string, mortgagePct: number) => string | null;
  sellProperty: (id: string) => string | null;
  buyShop: (id: string) => string | null;
  setQuant: (q: Partial<QuantConfig>) => void;
  raiseFund: () => string | null;
  retire: () => void;
  reset: () => void;
  persist: () => void;
  setZone: (zone: ZoneId) => void;
  travelTo: (dest: CountryId) => string | null;
  openAccount: (dest: CountryId) => string | null;
  addJournal: (text: string) => void;
  setPolicy: (country: CountryId, patch: { rate?: number; tariff?: number }) => string | null;
  rename: (name: string) => void;
  confirmPay: (orderId: string) => string | null;
  convertFx: (from: Ccy, to: Ccy, amountFrom: number) => string | null;
};

export const useGame = create<GameState & Actions>((set, get) => ({
  ...createInitial("LEO", "retail", "LEO000000000"),
  started: false,
  hydrate: (s) =>
    set({
      ...s,
      playerId: s.playerId || randomPlayerId(),
      name: s.name || "LEO",
      gender: s.gender === "female" ? "female" : "male",
      creditScore: typeof s.creditScore === "number" ? s.creditScore : DEFAULT_CREDIT,
      loanMissedDays: s.loanMissedDays ?? 0,
      creditBanUntilDay: s.creditBanUntilDay ?? 0,
      bankruptcies: s.bankruptcies ?? 0,
      inDefault: Boolean(s.inDefault),
      worldGdp: s.worldGdp === 1_000_000_000 || s.worldGdp == null ? WORLD_GDP0 : s.worldGdp,
      streetLpPool: s.streetLpPool === 80_000_000 || s.streetLpPool == null ? STREET_LP_POOL0 : s.streetLpPool,
      lastRaiseTick: s.lastRaiseTick ?? 0,
      raiseCount: s.raiseCount ?? 0,
      cash: s.cash === 50000 && (s.positions?.length ?? 0) === 0 ? 100_000 : s.cash,
      cashDvd:
        Math.abs((s.cashDvd ?? 0) - 3_750_000) < 1 && (s.positions?.length ?? 0) === 0 ? 7_500_000 : (s.cashDvd ?? 0),
      cashAna:
        Math.abs((s.cashAna ?? 0) - 5_000_000) < 1 && (s.positions?.length ?? 0) === 0 ? 10_000_000 : (s.cashAna ?? 0),
      fxDvdPerLeo: s.fxDvdPerLeo ?? FX_DVD0,
      fxAnaPerLeo: s.fxAnaPerLeo ?? FX_ANA0,
      fxDvdPerAna: s.fxDvdPerAna ?? FX_CROSS0,
      fxHistDvd: s.fxHistDvd ?? [FX_DVD0],
      fxHistAna: s.fxHistAna ?? [FX_ANA0],
      productivity: s.productivity ?? 1,
      bubbleHeat: s.bubbleHeat ?? 0.12,
      street: asCountry((s as { street?: string; homeCountry?: string }).street ?? (s as { homeCountry?: string }).homeCountry),
      homeCountry: asCountry((s as { homeCountry?: string; street?: string }).homeCountry ?? (s as { street?: string }).street),
      zone: ["warehouse", "home", "gate", "campus", "airport"].includes(s.zone) ? s.zone : "street",
      accounts: s.accounts ?? emptyAccounts(asCountry((s as { homeCountry?: string }).homeCountry ?? "leo")),
      journal: s.journal ?? [],
      policyRate: s.policyRate ?? { leo: s.fedRate ?? 0.0425, david: 0.055, ramona: 0.031 },
      policyTariff: s.policyTariff ?? { leo: 0, david: 0.06, ramona: 0.04 },
      fxDayNotional: s.fxDayNotional ?? 0,
      fxDayStamp: s.fxDayStamp ?? 1,
      fxLegs: s.fxLegs ?? [],
      lawStrikes: s.lawStrikes ?? 0,
      lawFinesPaid: s.lawFinesPaid ?? 0,
      fxBanUntilDay: s.fxBanUntilDay ?? 0,
      rmbSpent: s.rmbSpent ?? 0,
      paidOrderIds: s.paidOrderIds ?? [],
      orders: s.orders ?? [],
      positions: (s.positions ?? []).map((p) =>
        p.shares < 0 && p.borrowed > 0 && !(p.shortMargin ?? 0)
          ? { ...p, shortMargin: p.borrowed, borrowed: 0 }
          : p,
      ),
      projects: s.projects ?? [],
      rivals: s.rivals?.length ? s.rivals : RIVAL_SEEDS.map((r) => ({ ...r, nav: 100_000 })),
      rivalStakes: s.rivalStakes ?? [],
      investors: s.investors ?? [],
      offers: s.offers ?? [],
      edu: s.edu ?? 0,
      eduDay: s.eduDay ?? 0,
      plots: PLOT_SEED.map(
        (seed) => s.plots?.find((p) => p.id === seed.id) ?? { id: seed.id, owned: false, stage: 0, nextStageTick: 0 },
      ),
      hired: s.hired ?? null,
      employedBy: s.employedBy ?? null,
      lastSolicitTick: s.lastSolicitTick ?? 0,
      marketPeak: s.marketPeak ?? 0,
      depressionFromTick: s.depressionFromTick ?? null,
      rescuePoints: s.rescuePoints ?? 0,
      lastFedRate: s.lastFedRate ?? s.fedRate ?? 0.0425,
      stocks: mergeStocks(s.stocks),
      log: (s.log ?? []).map((l) => ({
        tick: l.tick,
        zh: l.zh || "",
        en: l.en || "",
        tone: l.tone || "info",
      })),
      news: (s.news ?? []).map((n) => ({
        ...n,
        headlineZh: n.headlineZh || "",
        headlineEn: n.headlineEn || "",
        bodyZh: n.bodyZh || "",
        bodyEn: n.bodyEn || "",
        rumor: Boolean(n.rumor),
      })),
      openPanel: null,
      lastToast: null,
    }),
  start: (name, career, playerId, gender, home) => {
    const prog = readProgress();
    let role: Career = career;
    if (role === "broker" && !prog.brokerUnlocked) role = "retail";
    if (role === "governor" && !prog.governorUnlocked) role = "retail";
    const init = createInitial(
      sanitizeName(name),
      role,
      sanitizePlayerId(playerId) || randomPlayerId(),
      gender === "female" ? "female" : "male",
      asCountry(home ?? "leo"),
    );
    set(init);
  },
  tickHour: () => {
    const cur = get();
    if (!cur.started || cur.gameOver) return;
    set(applyTick(cur));
  },
  setPanel: (openPanel) => set({ openPanel }),
  setSpeed: (speed) => set({ speed }),
  setExchangeTab: (exchangeTab) => set({ exchangeTab }),
  dismissTutorial: () => set({ tutorial: 0 }),
  clearToast: () => set({ lastToast: null }),
  buyStock: (ticker, shares, leverage) => {
    let err: string | null = null;
    set((s) => {
      const next = clonePlay(s);
      err = tryBuyStock(next, ticker, shares, leverage);
      return err ? s : next;
    });
    return err;
  },
  sellStock: (ticker, shares) => {
    let err: string | null = null;
    set((s) => {
      const next = clonePlay(s);
      err = trySellStock(next, ticker, shares);
      return err ? s : next;
    });
    return err;
  },
  closeStock: (ticker) => {
    let err: string | null = null;
    set((s) => {
      const next = clonePlay(s);
      err = closeStockInternal(next, ticker);
      return err ? s : next;
    });
    return err;
  },
  placeOrder: (ticker, kind, price, shares, leverage) => {
    const s = get();
    const st = s.stocks[ticker];
    if (!st) return "err.ticker";
    if (!(price > 0) || !Number.isFinite(price)) return "err.amt";
    if (!(shares > 0)) return "err.qty";
    let side: "buy" | "sell";
    if (kind === "limit") {
      side = price < st.price ? "buy" : "sell";
    } else {
      const pos = s.positions.find((p) => p.ticker === ticker && p.shares !== 0);
      if (!pos) return "err.orderSide";
      side = pos.shares > 0 ? "sell" : "buy";
      if (side === "sell" && price >= st.price) return "err.orderPx";
      if (side === "buy" && price <= st.price) return "err.orderPx";
    }
    set({
      orders: [
        ...(s.orders ?? []),
        {
          id: `ord-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
          ticker,
          side,
          kind,
          price,
          shares: Math.floor(shares),
          leverage: clamp(leverage, 1, maxLeverage(s)),
          createdTick: s.tick,
        },
      ],
    });
    return null;
  },
  cancelOrder: (oid) => {
    set({ orders: get().orders.filter((o) => o.id !== oid) });
  },
  investRival: (rivalId, amount) => {
    const s = get();
    const r = s.rivals.find((x) => x.id === rivalId);
    if (!r) return "err.unk";
    if (!(amount > 0) || !Number.isFinite(amount)) return "err.amt";
    if (s.cash < amount) return "err.cash";
    const shares = amount / Math.max(1, r.nav);
    set({ cash: s.cash - amount, rivalStakes: [...(s.rivalStakes ?? []), { rivalId, shares, invested: amount }] });
    return null;
  },
  redeemRival: (rivalId) => {
    const s = get();
    const r = s.rivals.find((x) => x.id === rivalId);
    if (!r) return "err.unk";
    const stakes = (s.rivalStakes ?? []).filter((x) => x.rivalId === rivalId);
    if (!stakes.length) return "err.noPos";
    const value = stakes.reduce((a, x) => a + x.shares, 0) * Math.max(1, r.nav);
    set({
      cash: s.cash + value * 0.98,
      rivalStakes: (s.rivalStakes ?? []).filter((x) => x.rivalId !== rivalId),
    });
    return null;
  },
  hireRival: (rivalId, role) => {
    const s = get();
    if (s.hired) return "err.have";
    if (!s.rivals.some((x) => x.id === rivalId)) return "err.unk";
    if (prestige(s) < 12) return "err.weak";
    set({ hired: { rivalId, role } });
    return null;
  },
  fireHired: () => set({ hired: null }),
  acceptOffer: (offerId) => {
    const s = get();
    const o = (s.offers ?? []).find((x) => x.id === offerId);
    if (!o || o.expiryTick <= s.tick) return "err.unk";
    if (!s.rivals.some((x) => x.id === o.rivalId)) return "err.unk";
    const offers = (s.offers ?? []).filter((x) => x.id !== offerId);
    if (o.kind === "job") {
      if (s.employedBy) return "err.have";
      set({ employedBy: { rivalId: o.rivalId, role: o.role ?? "analyst", salary: o.amount }, offers });
      return null;
    }
    set({
      cash: s.cash + o.amount,
      investors: [...(s.investors ?? []), { rivalId: o.rivalId, invested: o.amount, hwm: Math.max(1, netWorth(s) + o.amount), sinceTick: s.tick }],
      offers,
    });
    return null;
  },
  declineOffer: (offerId) => set({ offers: (get().offers ?? []).filter((x) => x.id !== offerId) }),
  resignJob: () => set({ employedBy: null }),
  buyPlot: (plotId) => {
    const s = get();
    const seed = PLOT_SEED.find((p) => p.id === plotId);
    const plot = s.plots.find((p) => p.id === plotId);
    if (!seed || !plot) return "err.unk";
    if (plot.owned) return "err.have";
    const total = seed.price * (1 + DEED_TAX);
    if (s.cash < total) return "err.cash";
    set({
      cash: s.cash - total,
      plots: s.plots.map((p) => (p.id === plotId ? { ...p, owned: true } : p)),
    });
    return null;
  },
  shuttleTo: (zone) => set({ zone, openPanel: null, tick: get().tick + 1 }),
  campusLecture: () => {
    const s = get();
    const day = dayOf(s.tick);
    if ((s.eduDay ?? 0) >= day) return "cam.lectureDone";
    set({ edu: Math.min(20, (s.edu ?? 0) + 0.5), eduDay: day });
    return null;
  },
  campusSeminar: () => {
    const s = get();
    if (s.cash < 25_000) return "err.cash";
    set({ cash: s.cash - 25_000, shop: { ...s.shop, analystUntilDay: Math.max(s.shop.analystUntilDay ?? 0, dayOf(s.tick)) + 7 } });
    return null;
  },
  startProject: (specId) => {
    const s = get();
    const spec = PROJECT_SEEDS.find((p) => p.id === specId);
    if (!spec) return "err.unk";
    if (s.projects.some((p) => p.specId === specId && !p.failed)) return "err.have";
    if (s.cash < spec.cost) return "err.cash";
    set({
      cash: s.cash - spec.cost,
      projects: [
        ...s.projects,
        { id: `pj-${s.tick}-${specId}`, specId, startTick: s.tick, doneTick: s.tick + spec.days * 24, failed: false },
      ],
    });
    return null;
  },
  startBuild: (plotId) => {
    const s = get();
    const plot = s.plots.find((p) => p.id === plotId);
    if (!plot) return "err.unk";
    if (!plot.owned) return "err.notHeld";
    if (plot.stage > 0) return "err.have";
    const total = BUILD_COST + PERMIT_FEE;
    if (s.cash < total) return "err.cash";
    set({
      cash: s.cash - total,
      plots: s.plots.map((p) => (p.id === plotId ? { ...p, stage: 1, nextStageTick: s.tick + BUILD_STAGE_TICKS } : p)),
    });
    return null;
  },
  buyOption: (ticker, kind, strike, expiryDay, qty) => {
    let err: string | null = null;
    set((s) => {
      const next = clonePlay(s);
      err = tradeOption(next, ticker, kind, strike, expiryDay, qty);
      return err ? s : next;
    });
    return err;
  },
  closeOption: (oid) => {
    let err: string | null = null;
    set((s) => {
      const next = clonePlay(s);
      err = closeOptionInternal(next, oid);
      return err ? s : next;
    });
    return err;
  },
  buyFuture: (symbol, qty) => {
    let err: string | null = null;
    set((s) => {
      const next = clonePlay(s);
      err = tradeFuture(next, symbol, qty);
      return err ? s : next;
    });
    return err;
  },
  closeFuture: (fid) => {
    let err: string | null = null;
    set((s) => {
      const next = clonePlay(s);
      err = closeFutureInternal(next, fid);
      return err ? s : next;
    });
    return err;
  },
  deposit: (kind, amount) => {
    if (amount <= 0) return "err.amt";
    const s = get();
    if (s.cash < amount) return "err.cash";
    set({
      cash: s.cash - amount,
      simpleDeposit: kind === "simple" ? s.simpleDeposit + amount : s.simpleDeposit,
      compoundDeposit: kind === "compound" ? s.compoundDeposit + amount : s.compoundDeposit,
    });
    return null;
  },
  withdraw: (kind, amount) => {
    if (amount <= 0) return "err.amt";
    const s = get();
    if (kind === "simple") {
      if (s.simpleDeposit < amount) return "err.simple";
      set({ cash: s.cash + amount, simpleDeposit: s.simpleDeposit - amount });
    } else {
      if (s.compoundDeposit < amount) return "err.comp";
      set({ cash: s.cash + amount, compoundDeposit: s.compoundDeposit - amount });
    }
    return null;
  },
  takeLoan: (amount) => {
    if (!Number.isFinite(amount) || amount <= 0) return "err.amt";
    const s = get();
    if (isCreditBanned(s)) return "err.banned";
    if (isDelinquent(s)) return "err.default";
    const cap = loanCapacity(s);
    if (amount > cap) return "err.credit";
    set({ cash: s.cash + amount, bankLoan: s.bankLoan + amount });
    return null;
  },
  repayLoan: (amount) => {
    const s = get();
    if (s.bankLoan <= 0.5) return "err.noLoan";
    const next = clonePlay(s);
    const want = !Number.isFinite(amount) || amount <= 0 ? next.bankLoan : Math.min(amount, next.bankLoan);
    const paid = takeLiquidity(next, want);
    if (paid <= 0) return "err.repay";
    next.bankLoan = Math.max(0, next.bankLoan - paid);
    if (next.bankLoan < 1) {
      next.bankLoan = 0;
      next.loanMissedDays = 0;
      next.inDefault = false;
      next.creditScore = Math.min(850, creditOf(next) + 8);
    } else {
      next.creditScore = Math.min(850, creditOf(next) + 1);
    }
    set(next);
    return null;
  },
  buyProperty: (pid, mortgagePct) => {
    const s = get();
    const spec = s.properties.find((p) => p.id === pid);
    if (!spec) return "err.home";
    if (s.ownedProps.some((h) => h.id === pid)) return "err.held";
    const down = spec.price * (1 - mortgagePct);
    const deed = spec.price * DEED_TAX;
    if (s.cash < down + deed) return "err.down";
    set({
      cash: s.cash - down - deed,
      ownedProps: [...s.ownedProps, { id: pid, mortgage: spec.price - down }],
    });
    return null;
  },
  sellProperty: (pid) => {
    const s = get();
    const h = s.ownedProps.find((x) => x.id === pid);
    const spec = s.properties.find((p) => p.id === pid);
    if (!h || !spec) return "err.notHeld";
    set({
      cash: s.cash + spec.price * (1 - SALE_STAMP) - h.mortgage,
      ownedProps: s.ownedProps.filter((x) => x.id !== pid),
    });
    return null;
  },
  buyShop: (id) => {
    const s = get();
    const item = SHOP_ITEMS.find((x) => x.id === id);
    const price = item?.price ?? 0;
    const shop = { ...s.shop };
    if (id === "quant-server") {
      if (shop.quantServer) return "err.have";
      // The rack is bought with in-game Leo, full stop. It used to be handed
      // over for free to anyone who had paid ¥19.9 in a previous run.
      if (s.cash < price) return "err.cash";
      shop.quantServer = true;
      set({ cash: s.cash - price, shop });
      return null;
    }
    if (id === "install-exchange") {
      if (!shop.quantServer) return "err.needSrv";
      if (s.cash < price) return "err.cash";
      shop.serverAt = "exchange";
      set({ cash: s.cash - price, shop });
      return null;
    }
    if (id === "install-office") {
      if (!shop.quantServer) return "err.needSrv";
      if (s.cash < price) return "err.cash";
      shop.serverAt = "office";
      shop.hft = false;
      set({ cash: s.cash - price, shop });
      return null;
    }
    if (id === "hft") {
      if (shop.hft) return "err.have";
      if (shop.serverAt !== "exchange") return "err.needX";
      if (s.cash < price) return "err.cash";
      shop.hft = true;
      set({ cash: s.cash - price, shop });
      return null;
    }
    if (id === "satellite") {
      if (shop.satellite) return "err.have";
      if (s.cash < price) return "err.cash";
      shop.satellite = true;
      set({ cash: s.cash - price, shop });
      return null;
    }
    if (id === "analyst") {
      if (s.cash < price) return "err.cash";
      shop.analystUntilDay = dayOf(s.tick) + 30;
      set({ cash: s.cash - price, shop });
      return null;
    }
    if (id === "renovation") {
      if (shop.renovation) return "err.reno";
      if (s.cash < price) return "err.cash";
      shop.renovation = true;
      set({ cash: s.cash - price, shop });
      return null;
    }
    if (id === "license") {
      if (s.career === "broker" || shop.license) return "err.lic";
      if (!readProgress().brokerUnlocked) return "err.brokerLock";
      if (s.cash < price) return "err.cash";
      shop.license = true;
      set({
        cash: s.cash - price,
        shop,
        career: "broker",
        clients:
          s.clients.length > 0
            ? s.clients
            : [{ id: "c-new", name: "第一位客户", aum: 25000, mood: 0.6 }],
        fundAum: s.fundAum > 0 ? s.fundAum : 25000,
      });
      return null;
    }
    return "err.unk";
  },
  setQuant: (q) => set({ quant: { ...get().quant, ...q } }),
  raiseFund: () => {
    const s = get();
    const { maxAdd, reason } = raiseCapacity(s);
    if (reason) return reason;
    const p = prestige(s);
    const chance = Math.min(0.82, 0.18 + p / 140);
    // Seeded draw off the run's own stream, so a raise is part of the same
    // deterministic sequence as everything else in the sim (was Math.random).
    const { value: roll, next: rngState } = seededDraw(s.rngState, s.seed);
    if (roll > chance) {
      set({ rngState, lastRaiseTick: Math.max(0, s.tick - RAISE_COOLDOWN_HOURS + 72) });
      return "err.lp";
    }
    set({ rngState });
    const add = maxAdd;
    const licensed = s.career === "broker" || s.shop.license;
    if (licensed) {
      set({
        fundAum: s.fundAum + add,
        fundHighwater: Math.max(s.fundHighwater, s.fundAum + add),
        clients: [
          ...s.clients,
          { id: `lp-${Date.now()}`, name: "新 LP", aum: add, mood: 0.75 },
        ],
        streetLpPool: Math.max(0, (s.streetLpPool ?? STREET_LP_POOL0) - add),
        lastRaiseTick: s.tick,
        raiseCount: (s.raiseCount ?? 0) + 1,
      });
    } else {
      set({
        cash: s.cash + add,
        bankLoan: s.bankLoan + add * 0.15,
        streetLpPool: Math.max(0, (s.streetLpPool ?? STREET_LP_POOL0) - add),
        lastRaiseTick: s.tick,
        raiseCount: (s.raiseCount ?? 0) + 1,
      });
    }
    return null;
  },
  retire: () => {
    recordRetireUnlock(get());
    set({ gameOver: "retire", speed: 0 });
  },
  reset: () => {
    clearSave();
    set({ ...createInitial("LEO", "retail", randomPlayerId()), started: false });
  },
  persist: () => writeSave(get()),
  setZone: (zone) => set({ zone, openPanel: null }),
  travelTo: (dest) => {
    const s = get();
    const d = asCountry(dest);
    const here = asCountry(s.street);
    if (d === here) {
      set({ zone: "street", openPanel: null });
      return null;
    }
    if (s.zone !== "gate" && s.zone !== "airport") return "err.gate";
    if (!hasAccount(s, d)) return "err.noAccount";
    const fee = Math.round(crossingFee(here, d) * (s.zone === "airport" ? 1.5 : 1));
    if (fee <= 0) return "err.gate";
    if (s.cash < fee) return "err.crossFee";
    const wp = tPair(`world.${d}Short`);
    set({
      cash: s.cash - fee,
      street: d,
      zone: "street",
      openPanel: null,
      toastSeq: s.toastSeq + 1,
      lastToast: {
        id: s.toastSeq + 1,
        zh: tPair("gate.paid", { n: compactUsd(fee), w: wp.zh }).zh,
        en: tPair("gate.paid", { n: compactUsd(fee), w: wp.en }).en,
        tone: "good",
      },
    });
    return null;
  },
  openAccount: (dest) => {
    const s = get();
    const d = asCountry(dest);
    if (hasAccount(s, d)) return "err.have";
    const fee = Math.max(ACCOUNT_OPEN_MIN, COUNTRY[d].accountFeeLeo);
    if (s.cash < fee) return "err.acctFee";
    const accounts = { ...emptyAccounts(asCountry(s.homeCountry)), ...s.accounts };
    accounts[d] = true;
    if (d === "ramona") accounts.anna = true;
    set({ cash: s.cash - fee, accounts });
    return null;
  },
  addJournal: (text) => {
    const t = text.trim();
    if (!t) return;
    const s = get();
    set({
      journal: [{ id: `j-${Date.now()}`, tick: s.tick, text: t.slice(0, 2000) }, ...(s.journal ?? [])].slice(0, 80),
    });
  },
  setPolicy: (country, patch) => {
    const s = get();
    if (s.career !== "governor") return "err.gov";
    const c = asCountry(country);
    const next = clonePlay(s);
    const policyRate = { ...(next.policyRate ?? { leo: next.fedRate, david: 0.055, ramona: 0.031 }) };
    const policyTariff = { ...(next.policyTariff ?? { leo: 0, david: 0.06, ramona: 0.04 }) };
    let rateDelta = 0;
    let tariffDelta = 0;
    if (typeof patch.rate === "number") {
      const old = policyRate[c] ?? next.fedRate;
      policyRate[c] = Math.min(0.12, Math.max(0.005, patch.rate));
      rateDelta = policyRate[c] - old;
      if (c === "leo") next.fedRate = policyRate[c];
    }
    if (typeof patch.tariff === "number") {
      const old = policyTariff[c] ?? 0;
      policyTariff[c] = Math.min(0.25, Math.max(0, patch.tariff));
      tariffDelta = policyTariff[c] - old;
    }
    next.policyRate = policyRate;
    next.policyTariff = policyTariff;
    applyPolicyShock(next, c, { rateDelta, tariffDelta });
    set(next);
    return null;
  },
  rename: (name) => {
    const n = sanitizeName(name);
    set({ name: n });
  },
  /**
   * The single place an entitlement is granted, and it can only ever grant a
   * cosmetic or an extra mode. There is deliberately no branch here that adds
   * cash, a licence or a seat — see `storefront.ts`.
   */
  confirmPay: (orderId) => {
    const order = markPayPaid(orderId);
    if (!order) return "err.unk";
    const s = get();
    if ((s.paidOrderIds ?? []).includes(order.id)) return null;
    grantItem(order.packId);
    set({
      rmbSpent: (s.rmbSpent ?? 0) + order.rmb,
      paidOrderIds: [...(s.paidOrderIds ?? []), order.id],
    });
    return null;
  },
  convertFx: (from, to, amountFrom) => {
    if (from === to) return "err.fxPair";
    if (!(amountFrom > 0) || !Number.isFinite(amountFrom)) return "err.amt";
    const s = get();
    const rate = quoteRate(s, from, to);
    const got = amountFrom * rate;
    const notionLeo = toLeo(amountFrom, from, s);
    const used = fxUsedToday(s);
    const cap = fxCapLeo(s);
    if (used + notionLeo > cap) return "err.fxCap";
    if (isFxBanned(s)) return "err.lawBan";
    let err: string | null = null;
    set((cur) => {
      const next = clonePlay(cur);
      if (!debitWallet(next, from, amountFrom)) {
        err = from === "leo" ? "err.cash" : "err.fxCash";
        return cur;
      }
      creditWallet(next, to, got);
      const day = dayOf(next.tick);
      if ((next.fxDayStamp ?? 0) !== day) {
        next.fxDayNotional = 0;
        next.fxDayStamp = day;
      }
      next.fxDayNotional = (next.fxDayNotional ?? 0) + notionLeo;
      next.fxLegs = [...(next.fxLegs ?? []), { tick: next.tick, from, to, pay: amountFrom, got }].slice(-12);
      const fine = detectTriangle(next);
      if (fine) {
        // The conversion DID settle — reporting it as an error made the panel
        // lie and invited the player to retry a leg they already paid for. The
        // fine is news, so it lands as a toast, and the call still succeeds.
        takeLiquidity(next, fine);
        next.lawFinesPaid = (next.lawFinesPaid ?? 0) + fine;
        next.creditScore = Math.max(300, creditOf(next) - 18);
        addStrike(next);
        const msg = tPair("fx.arbFine", { n: compactUsd(fine) });
        const entry: LogItem = { tick: next.tick, zh: msg.zh, en: msg.en, tone: "bad" };
        next.toastSeq += 1;
        next.lastToast = { id: next.toastSeq, ...msg, tone: "bad" };
        next.log = [entry, ...next.log].slice(0, 48);
      }
      return next;
    });
    return err;
  },
}));

function clonePlay(s: GameState): GameState {
  return {
    ...s,
    stocks: Object.fromEntries(Object.entries(s.stocks).map(([k, v]) => [k, { ...v, history: [...v.history] }])),
    futures: Object.fromEntries(Object.entries(s.futures).map(([k, v]) => [k, { ...v, history: [...v.history] }])),
    positions: s.positions.map((p) => ({ ...p })),
    options: s.options.map((o) => ({ ...o })),
    futPos: s.futPos.map((p) => ({ ...p })),
    properties: s.properties.map((p) => ({ ...p, history: [...p.history] })),
    ownedProps: s.ownedProps.map((p) => ({ ...p })),
    news: s.news.map((n) => ({ ...n })),
    pending: s.pending.map((p) => ({ ...p })),
    clients: s.clients.map((c) => ({ ...c })),
    shop: { ...s.shop },
    quant: { ...s.quant },
    log: [...s.log],
    fxLegs: (s.fxLegs ?? []).map((l) => ({ ...l })),
    fxHistDvd: [...(s.fxHistDvd ?? [])],
    fxHistAna: [...(s.fxHistAna ?? [])],
    journal: (s.journal ?? []).map((j) => ({ ...j })),
    policyRate: s.policyRate ? { ...s.policyRate } : s.policyRate,
    policyTariff: s.policyTariff ? { ...s.policyTariff } : s.policyTariff,
    accounts: s.accounts ? { ...s.accounts } : s.accounts,
  };
}

function mergeStocks(existing: GameState["stocks"] | undefined): GameState["stocks"] {
  const out: GameState["stocks"] = {};
  for (const st of STOCK_SEED) {
    const prev = existing?.[st.ticker];
    out[st.ticker] = prev
      ? {
          ...st,
          ...prev,
          nameZh: prev.nameZh || st.nameZh,
          nameEn: prev.nameEn || st.nameEn,
          country: prev.country || st.country,
          history: prev.history?.length ? prev.history : Array.from({ length: 24 }, () => prev.price ?? st.price),
        }
      : {
          ...st,
          open: st.price,
          prevClose: st.price,
          fair: st.price,
          history: Array.from({ length: 24 }, () => st.price),
        };
  }
  return out;
}

function detectTriangle(s: GameState): number {
  const legs = (s.fxLegs ?? []).filter((l) => s.tick - l.tick <= 8);
  if (legs.length < 3) return 0;
  const seen = new Set(legs.flatMap((l) => [l.from, l.to]));
  if (!seen.has("leo") || !seen.has("dvd") || !seen.has("ana")) return 0;
  // Reconstruct a small round-trip starting from Leo in the window.
  const book: Record<Ccy, number> = { leo: 0, dvd: 0, ana: 0 };
  for (const l of legs) {
    book[l.from] -= l.pay;
    book[l.to] += l.got;
  }
  const pnlLeo = toLeo(book.leo, "leo", s) + toLeo(book.dvd, "dvd", s) + toLeo(book.ana, "ana", s);
  const volume = legs.reduce((a, l) => a + toLeo(l.pay, l.from, s), 0);
  if (volume < 200) return 0;
  if (pnlLeo / volume > 0.0025) return Math.max(2000, pnlLeo * 0.5);
  return 0;
}

export function bootFromStorage() {
  const saved = readSave();
  if (saved) useGame.getState().hydrate(saved);
}

export function hudSnapshot(s: GameState) {
  return {
    cash: s.cash,
    debt: debt(s),
    rate: s.fedRate,
    simple: s.simpleDeposit,
    compound: s.compoundDeposit,
    deposits: deposits(s),
    simpleRate: simpleRate(s.fedRate),
    compoundRate: compoundRate(s.fedRate),
    net: netWorth(s),
    day: dayOf(s.tick),
    hour: hourOf(s.tick),
    lev: maxLeverage(s),
    credit: creditOf(s),
    gdp: worldGdpOf(s),
    loanApr: loanRateOf(s),
    inDefault: Boolean(s.inDefault),
    cashDvd: s.cashDvd ?? 0,
    cashAna: s.cashAna ?? 0,
    dvd: s.fxDvdPerLeo ?? FX_DVD0,
    ana: s.fxAnaPerLeo ?? FX_ANA0,
    prod: s.productivity ?? 1,
    bubble: s.bubbleHeat ?? 0,
    street: s.street ?? "leo",
  };
}
