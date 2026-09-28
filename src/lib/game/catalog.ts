import type { Career, FutureSpec, ProjectSpec, PropertySpec } from "./types.ts";
export { STOCK_SEED, TECH_TICKERS } from "./universe.ts";

export const SAVE_KEY = "leo-street-legend-v2";
export const SAVE_VERSION = 6;
export const HOUR_SECONDS = 0.42;

/** Opening world GDP, denominated in Leo coins. */
export const WORLD_GDP0 = 1_000_000_000_000;
/** Investable LP dry powder on Leo Street at t0 (~8% of GDP). */
export const STREET_LP_POOL0 = 80_000_000_000;
export const DEFAULT_CREDIT = 720;
export const MIN_CREDIT = 300;
export const MAX_CREDIT = 850;
/** Hours between successful raises (14 game days). */
export const RAISE_COOLDOWN_HOURS = 14 * 24;
export const RETAIL_RAISE_MAX = 2;

/** Opening a brokerage account in any country costs at least this many Leo coins. */
export const ACCOUNT_OPEN_MIN = 100_000;
/** Cross-border travel to another financial street. Desk surcharge on top. */
export const CROSSING_FEE_MIN = 12_000;
export const CROSSING_DESK = 800;

/** 1 Leo = 75 David at t0. */
export const FX_DVD0 = 75;
/** 1 Leo = 100 Ramona at t0. */
export const FX_ANA0 = 100;
export const FX_CROSS0 = 0.75;
export const FX_SPREAD = 0.004;

/**
 * Real-money products live in `storefront.ts` now, and none of them touch the
 * tape. The cash packs and the broker/governor/quant unlocks that used to sit
 * here sold the game instead of selling to it — see that file for the rule.
 */

export const FUTURE_SEED: FutureSpec[] = [
  {
    symbol: "ST1",
    name: "街指期货",
    underlying: "INDEX",
    multiplier: 50,
    price: 100,
    history: [100],
    vol: 0.18,
  },
  {
    symbol: "OIL",
    name: "原油期货",
    underlying: "BOLT",
    multiplier: 100,
    price: 78,
    history: [78],
    vol: 0.32,
  },
  {
    symbol: "GLD",
    name: "黄金期货",
    underlying: "GOLD",
    multiplier: 10,
    price: 2320,
    history: [2320],
    vol: 0.16,
  },
  {
    symbol: "BND",
    name: "国债期货",
    underlying: "RATE",
    multiplier: 1000,
    price: 98.4,
    history: [98.4],
    vol: 0.08,
  },
  {
    symbol: "COPR",
    name: "铜期货",
    underlying: "STEEL",
    multiplier: 50,
    price: 8.4,
    history: [8.4],
    vol: 0.24,
  },
  {
    symbol: "WHT",
    name: "小麦期货",
    underlying: "INDEX",
    multiplier: 100,
    price: 6.2,
    history: [6.2],
    vol: 0.22,
  },
];

export const PROPERTY_SEED: PropertySpec[] = [
  {
    id: "soho",
    name: "苏荷阁楼",
    district: "苏荷",
    basePrice: 420000,
    price: 420000,
    rentPerDay: 185,
    history: [420000],
  },
  {
    id: "mid",
    name: "中城公寓",
    district: "中城",
    basePrice: 265000,
    price: 265000,
    rentPerDay: 118,
    history: [265000],
  },
  {
    id: "harbor",
    name: "港湾仓库",
    district: "港口",
    basePrice: 188000,
    price: 188000,
    rentPerDay: 96,
    history: [188000],
  },
  {
    id: "park",
    name: "公园顶层",
    district: "公园大道",
    basePrice: 880000,
    price: 880000,
    rentPerDay: 360,
    history: [880000],
  },
  {
    id: "mall",
    name: "街角商铺",
    district: "零售廊",
    basePrice: 340000,
    price: 340000,
    rentPerDay: 210,
    history: [340000],
  },
  {
    id: "brown",
    name: "褐石排屋",
    district: "西区",
    basePrice: 510000,
    price: 510000,
    rentPerDay: 198,
    history: [510000],
  },
];

/** Buildable land plots in the residence district (home-zone percent coords). */
export const PLOT_SEED = [
  { id: "creek", name: "溪畔地块", x: 8, y: 78, price: 120_000 },
  { id: "lane", name: "巷口地块", x: 28, y: 78, price: 100_000 },
  { id: "green", name: "绿地地块", x: 48, y: 78, price: 140_000 },
  { id: "view", name: "景观地块", x: 80, y: 78, price: 180_000 },
] as const;

/** Deed tax on land/property purchase. */
export const DEED_TAX = 0.03;
/** Stamp duty on property sale. */
export const SALE_STAMP = 0.01;
/** Daily property tax on owned real estate (~1.8%/yr). */
export const PROPERTY_TAX_DAILY = 0.00005;
/** Construction permit fee, paid before ground breaks. */
export const PERMIT_FEE = 5_000;
/** Self-build construction cost; one stage per game day. */
export const BUILD_COST = 260_000;
export const BUILD_STAGE_TICKS = 24;

export const CLIENT_NAMES = [
  "老王私募",
  "林小姐",
  "街角面包店",
  "北极信托",
  "橡实家办",
  "云端阿姨",
  "港口船东",
  "新星诊所",
];

/** One game year in ticks (365 game days) — the depression clock. */
export const YEAR_TICKS = 365 * 24;
/** Market drawdown from peak that trips the depression line (35%, Great-Depression scale). */
export const DEPRESSION_DRAWDOWN = 0.35;
/** Rescue points needed from rate cuts / broker raises / stimulus to exit a depression. */
export const RESCUE_POINTS_NEEDED = 10;

export const PROJECT_SEEDS: ProjectSpec[] = [
  { id: "pay-app", kind: "virtual", cost: 80_000, days: 20, dailyRevenue: 950, risk: 0.15, prestige: 2, nameZh: "支付应用", nameEn: "Payments app" },
  { id: "social-app", kind: "virtual", cost: 120_000, days: 26, dailyRevenue: 1_400, risk: 0.22, prestige: 3, nameZh: "社交应用", nameEn: "Social app" },
  { id: "quant-cloud", kind: "virtual", cost: 200_000, days: 32, dailyRevenue: 2_600, risk: 0.18, prestige: 4, nameZh: "量化云", nameEn: "Quant cloud" },
  { id: "game-studio", kind: "virtual", cost: 150_000, days: 24, dailyRevenue: 1_750, risk: 0.3, prestige: 3, nameZh: "游戏工作室", nameEn: "Game studio" },
  { id: "rail-branch", kind: "infra", cost: 320_000, days: 45, dailyRevenue: 3_900, risk: 0.1, prestige: 6, nameZh: "铁路支线", nameEn: "Rail branch" },
  { id: "airport-cargo", kind: "infra", cost: 450_000, days: 55, dailyRevenue: 5_600, risk: 0.12, prestige: 8, nameZh: "货运机场", nameEn: "Cargo airport" },
  { id: "port-berth", kind: "infra", cost: 380_000, days: 50, dailyRevenue: 4_700, risk: 0.12, prestige: 7, nameZh: "港口泊位", nameEn: "Port berth" },
  { id: "office-tower", kind: "infra", cost: 280_000, days: 36, dailyRevenue: 3_300, risk: 0.08, prestige: 5, nameZh: "办公塔楼", nameEn: "Office tower" },
  { id: "solar-farm", kind: "infra", cost: 240_000, days: 40, dailyRevenue: 2_900, risk: 0.1, prestige: 5, nameZh: "光伏电站", nameEn: "Solar farm" },
  { id: "fusion-pilot", kind: "research", cost: 600_000, days: 90, dailyRevenue: 7_200, risk: 0.4, prestige: 15, nameZh: "聚变试点", nameEn: "Fusion pilot" },
  { id: "drug-trial", kind: "research", cost: 350_000, days: 60, dailyRevenue: 4_400, risk: 0.35, prestige: 9, nameZh: "新药试验", nameEn: "Drug trial" },
  { id: "llm-lab", kind: "research", cost: 500_000, days: 70, dailyRevenue: 6_100, risk: 0.3, prestige: 12, nameZh: "大模型实验室", nameEn: "LLM lab" },
];

/** Simulated online world: every rival starts at Ł100,000, same as a retail player. */
export const RIVAL_SEEDS: { id: string; nameZh: string; nameEn: string; career: Career; alpha: number }[] = [
  { id: "r1", nameZh: "老张量化", nameEn: "Zhang Quant", career: "retail", alpha: 0.0012 },
  { id: "r2", nameZh: "安娜·斯威夫特", nameEn: "Ana Swift", career: "retail", alpha: 0.0009 },
  { id: "r3", nameZh: "钢铁卡洛", nameEn: "Carlo Steel", career: "retail", alpha: 0.0006 },
  { id: "r4", nameZh: "小林耳机", nameEn: "Kobayashi", career: "retail", alpha: 0.0010 },
  { id: "r5", nameZh: "查理·芒格街", nameEn: "Charlie Munger St", career: "retail", alpha: 0.0014 },
  { id: "r6", nameZh: "薇拉·看跌", nameEn: "Vera Put", career: "retail", alpha: 0.0007 },
  { id: "r7", nameZh: "港岛陈太", nameEn: "Mrs Chan", career: "retail", alpha: 0.0011 },
  { id: "r8", nameZh: "戴维·琼斯", nameEn: "Davy Jones", career: "retail", alpha: 0.0005 },
  { id: "r9", nameZh: "玛雅·高频", nameEn: "Maya HFT", career: "retail", alpha: 0.0013 },
  { id: "r10", nameZh: "沉默的鲍勃", nameEn: "Silent Bob", career: "retail", alpha: 0.0008 },
];

export const COMPANY_META: Record<string, { blurbKey: string; buildingKey: string }> = {
  GOLD: { blurbKey: "co.goldT", buildingKey: "co.goldB" },
  BLUE: { blurbKey: "co.blueT", buildingKey: "co.blueB" },
  OAK: { blurbKey: "co.oakT", buildingKey: "co.oakB" },
};

export const SHOP_ITEMS = [
  { id: "quant-server" as const, price: 500000, nameKey: "shop.quant", blurbKey: "shop.quantB" },
  { id: "install-exchange" as const, price: 10000, nameKey: "shop.instX", blurbKey: "shop.instXB" },
  { id: "install-office" as const, price: 10000, nameKey: "shop.instO", blurbKey: "shop.instOB" },
  { id: "hft" as const, price: 18000, nameKey: "shop.hft", blurbKey: "shop.hftB" },
  { id: "satellite" as const, price: 12000, nameKey: "shop.sat", blurbKey: "shop.satB" },
  { id: "analyst" as const, price: 5000, nameKey: "shop.an", blurbKey: "shop.anB" },
  { id: "renovation" as const, price: 8000, nameKey: "shop.reno", blurbKey: "shop.renoB" },
  { id: "license" as const, price: 25000, nameKey: "shop.lic", blurbKey: "shop.licB" },
];

export const SECTOR_KEY: Record<string, string> = {
  tech: "sec.tech",
  fin: "sec.fin",
  re: "sec.re",
  energy: "sec.en",
  health: "sec.hc",
  consumer: "sec.con",
  industrials: "sec.ind",
  media: "sec.med",
  materials: "sec.mat",
  util: "sec.util",
  transport: "sec.tr",
  agri: "sec.ag",
  科技: "sec.tech",
  金融: "sec.fin",
  地产: "sec.re",
  能源: "sec.en",
  医药: "sec.hc",
  消费: "sec.con",
  工业: "sec.ind",
  传媒: "sec.med",
};
