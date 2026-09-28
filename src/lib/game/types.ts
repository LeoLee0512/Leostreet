export type Career = "retail" | "broker" | "governor";
export type Gender = "male" | "female";
export type CountryId = "leo" | "david" | "ramona";
export type Ccy = "leo" | "dvd" | "ana";
export type ZoneId = "street" | "warehouse" | "home" | "gate" | "campus" | "airport";
export type PanelId =
  | "exchange"
  | "bank"
  | "news"
  | "shop"
  | "realty"
  | "office"
  | "broker"
  | "vc"
  | "fed"
  | "gold"
  | "blue"
  | "oak"
  | "server-pad"
  | "portfolio"
  | "settings"
  | "honor"
  | "fx"
  | "law"
  | "warehouse"
  | "home"
  | "gate"
  | "campus"
  | "station"
  | "world"
  | null;

export type Speed = 0 | 1 | 3 | 8;

export interface Stock {
  ticker: string;
  name: string;
  nameZh: string;
  nameEn: string;
  sector: string;
  country: CountryId;
  theme?: string;
  color: string;
  price: number;
  open: number;
  prevClose: number;
  history: number[];
  vol: number;
  beta: number;
  drift: number;
  fair: number;
  dividendYield: number;
  duration: number;
  pe: number;
}

export interface FutureSpec {
  symbol: string;
  name: string;
  underlying: string;
  multiplier: number;
  price: number;
  history: number[];
  vol: number;
}

export interface StockPos {
  ticker: string;
  shares: number;
  avgCost: number;
  /** Margin loan behind a leveraged long (Leo). Interest-bearing debt. */
  borrowed: number;
  /**
   * Own cash locked as collateral behind a short sale, denominated in the
   * LISTING's local coin — the same wallet it was debited from, so covering
   * returns it to that wallet instead of leaking across the FX rate.
   */
  shortMargin?: number;
}

export interface OptionPos {
  id: string;
  ticker: string;
  kind: "call" | "put";
  strike: number;
  expiryDay: number;
  qty: number;
  premium: number;
  /**
   * Collateral actually posted when writing (qty < 0), in the listing's local
   * coin. Refunded verbatim on close/expiry — re-deriving it from the CURRENT
   * spot used to mint or burn money whenever the underlying moved.
   */
  posted?: number;
}

export interface FuturePos {
  id: string;
  symbol: string;
  qty: number;
  entry: number;
  posted: number;
}

export interface PropertyHolding {
  id: string;
  mortgage: number;
}

export interface PropertySpec {
  id: string;
  name: string;
  district: string;
  basePrice: number;
  price: number;
  rentPerDay: number;
  history: number[];
}

export interface NewsItem {
  id: string;
  tick: number;
  headlineZh: string;
  headlineEn: string;
  bodyZh: string;
  bodyEn: string;
  exclusive: boolean;
  rumor: boolean;
  ticker?: string;
  shock?: number;
  rateShock?: number;
  impactTick: number;
  visibleTick: number;
  applied: boolean;
  country?: CountryId;
}

export interface Client {
  id: string;
  name: string;
  aum: number;
  mood: number;
}

export interface LogItem {
  tick: number;
  zh: string;
  en: string;
  tone: "info" | "good" | "bad" | "news";
}

export interface ShopFlags {
  quantServer: boolean;
  serverAt: "none" | "office" | "exchange";
  hft: boolean;
  satellite: boolean;
  analystUntilDay: number;
  renovation: boolean;
  license: boolean;
}

export interface QuantConfig {
  momentum: boolean;
  meanRev: boolean;
  newsHunter: boolean;
  grid: boolean;
  allocPct: number;
}

export type RivalRole = "analyst" | "trader" | "manager";

export interface Rival {
  id: string;
  nameZh: string;
  nameEn: string;
  career: Career;
  nav: number;
  alpha: number;
}

export interface RivalStake {
  rivalId: string;
  shares: number;
  invested: number;
}

/** A rival's money parked with you: tracks your NAV relative to their high-water mark. */
export interface InvestorStake {
  rivalId: string;
  invested: number;
  hwm: number;
  sinceTick: number;
}

/** A buildable land plot: stage 0 empty/owned, 1-4 under construction, 5 delivered. */
export interface PlotState {
  id: string;
  owned: boolean;
  stage: number;
  nextStageTick: number;
}

/** A rival's solicitation: park money with you, or hire you for a role. */
export interface WorldOffer {
  id: string;
  rivalId: string;
  kind: "invest" | "job";
  role?: RivalRole;
  amount: number;
  expiryTick: number;
}

export type ProjectKind = "virtual" | "infra" | "research";

export interface ProjectSpec {
  id: string;
  kind: ProjectKind;
  cost: number;
  days: number;
  dailyRevenue: number;
  risk: number;
  prestige: number;
  nameZh: string;
  nameEn: string;
}

export interface ProjectInst {
  id: string;
  specId: string;
  startTick: number;
  doneTick: number;
  failed: boolean;
  done?: boolean;
}

export interface PendingShock {
  tick: number;
  ticker?: string;
  shock: number;
  rateShock?: number;
}

export interface FxLeg {
  tick: number;
  from: Ccy;
  to: Ccy;
  pay: number;
  got: number;
}

export interface JournalEntry {
  id: string;
  tick: number;
  text: string;
}

export type OrderKind = "limit" | "stop";

/** A resting order on the book: limit fills when crossed; stop guards an open position. */
export interface PendingOrder {
  id: string;
  ticker: string;
  side: "buy" | "sell";
  kind: OrderKind;
  price: number;
  shares: number;
  leverage: number;
  createdTick: number;
}

export interface GameState {
  version: number;
  started: boolean;
  name: string;
  playerId: string;
  gender: Gender;
  career: Career;
  tick: number;
  speed: Speed;
  cash: number;
  cashDvd: number;
  cashAna: number;
  simpleDeposit: number;
  simpleAccrued: number;
  compoundDeposit: number;
  bankLoan: number;
  seed: number;
  rngState: number;
  fedRate: number;
  stocks: Record<string, Stock>;
  futures: Record<string, FutureSpec>;
  positions: StockPos[];
  options: OptionPos[];
  orders: PendingOrder[];
  futPos: FuturePos[];
  properties: PropertySpec[];
  ownedProps: PropertyHolding[];
  news: NewsItem[];
  pending: PendingShock[];
  clients: Client[];
  fundAum: number;
  fundHighwater: number;
  shop: ShopFlags;
  quant: QuantConfig;
  log: LogItem[];
  openPanel: PanelId;
  exchangeTab: "stocks" | "options" | "futures";
  gameOver: null | "bust" | "retire" | "depression";
  dayPnlMark: number;
  haltUntilTick: number;
  nextNewsTick: number;
  toastSeq: number;
  lastToast: { id: number; zh: string; en: string; tone: LogItem["tone"] } | null;
  tutorial: number;
  creditScore: number;
  loanMissedDays: number;
  creditBanUntilDay: number;
  bankruptcies: number;
  inDefault: boolean;
  worldGdp: number;
  streetLpPool: number;
  lastRaiseTick: number;
  raiseCount: number;
  fxDvdPerLeo: number;
  fxAnaPerLeo: number;
  fxDvdPerAna: number;
  fxHistDvd: number[];
  fxHistAna: number[];
  productivity: number;
  bubbleHeat: number;
  street: CountryId;
  homeCountry: CountryId;
  zone: ZoneId;
  accounts: { leo: boolean; david: boolean; ramona: boolean; anna?: boolean };
  fxDayNotional: number;
  fxDayStamp: number;
  fxLegs: FxLeg[];
  lawStrikes: number;
  lawFinesPaid: number;
  fxBanUntilDay: number;
  rmbSpent: number;
  paidOrderIds: string[];
  journal: JournalEntry[];
  policyRate: { leo: number; david: number; ramona: number };
  policyTariff: { leo: number; david: number; ramona: number };
  projects: ProjectInst[];
  rivals: Rival[];
  rivalStakes: RivalStake[];
  hired: { rivalId: string; role: RivalRole } | null;
  employedBy: { rivalId: string; role: RivalRole; salary?: number } | null;
  investors: InvestorStake[];
  offers: WorldOffer[];
  plots: PlotState[];
  /** Campus education: permanent prestige bonus, one lecture per day. */
  edu: number;
  eduDay: number;
  lastSolicitTick: number;
  marketPeak: number;
  depressionFromTick: number | null;
  rescuePoints: number;
  lastFedRate: number;
}
