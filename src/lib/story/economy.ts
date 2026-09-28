import { clamp } from "../game/math.ts";
import { lengthOf } from "./lengths.ts";
import { scenarioOf, usableReserves } from "./scenarios.ts";
import type { CrisisCabinet } from "./realtime.ts";
import type { StoryRun } from "./types.ts";

export const SECTORS = [
  { id: "materials", zh: "原料供应", en: "Raw materials", detailZh: "生产原料 → 供给制造业", detailEn: "Produces inputs for manufacturing" },
  { id: "industry", zh: "制造企业", en: "Manufacturing", detailZh: "消耗原料 → 生产商品", detailEn: "Turns raw materials into goods" },
  { id: "transport", zh: "运输销售", en: "Distribution", detailZh: "运送商品 → 居民消费与回款", detailEn: "Delivers goods to households" },
] as const;
export type SectorId = typeof SECTORS[number]["id"];
export type Priority = 1 | 2 | 4;
export type ProductionMethod = "balanced" | "intensive" | "labor";
export type TradeStance = "domestic" | "imports" | "exports";
export const ECONOMIC_ENVIRONMENTS = [
  { id: "steady", zh: "常态交易", en: "Normal trading", detailZh: "各环节按常态效率运作。", detailEn: "All sectors operate at their normal efficiency.", materials: 1, freight: 1, demand: 1, finance: 1 },
  { id: "demand", zh: "市集旺季", en: "Busy market season", detailZh: "居民需求 +20%；备货与配送决定订单能否兑现。", detailEn: "Household demand +20%. Stock and delivery determine whether orders become sales.", materials: 1, freight: 1, demand: 1.2, finance: 1 },
  { id: "supply", zh: "原料检修期", en: "Supply maintenance", detailZh: "本地原料产出 −20%；库存、进口与省料工艺可缓冲。", detailEn: "Local input output −20%. Inventories, imports and efficient workshops can bridge the gap.", materials: 0.8, freight: 1, demand: 1, finance: 1 },
  { id: "freight", zh: "码头拥堵", en: "Congested docks", detailZh: "运力 −22%；出口、进口和国内配送争夺同一通道。", detailEn: "Freight capacity −22%. Overseas trade and domestic deliveries share the same bottleneck.", materials: 1, freight: 0.78, demand: 1, finance: 1 },
  { id: "credit", zh: "信贷审慎期", en: "Cautious lenders", detailZh: "可得融资效率 −16%；工艺融资需求与行业优先级更重要。", detailEn: "Financing efficiency −16%. Method funding needs and sector priorities matter more.", materials: 1, freight: 1, demand: 1, finance: 0.84 },
] as const;
/** Original, forecastable simulation conditions, independent of historical shocks and RNG. */
export function economicEnvironment(e: { ticks: number; remainder: number }) {
  const index = Math.floor(e.ticks / 18) % ECONOMIC_ENVIRONMENTS.length;
  return { current: ECONOMIC_ENVIRONMENTS[index]!, next: ECONOMIC_ENVIRONMENTS[(index + 1) % ECONOMIC_ENVIRONMENTS.length]!,
    secondsLeft: Math.max(0, 90 - e.ticks % 18 * 5 - e.remainder) };
}
export const METHODS = [
  { id: "balanced", zh: "标准作业", en: "Standard", output: 1, input: 1, labor: 1, finance: 1 },
  { id: "intensive", zh: "机械集约", en: "Mechanization", output: 1.35, input: 1.3, labor: 0.7, finance: 1.12 },
  { id: "labor", zh: "熟练工坊", en: "Skilled workshops", output: 0.88, input: 0.78, labor: 1.2, finance: 0.9 },
] as const;
export const TRADE_STANCES = [
  { id: "domestic", zh: "国内优先", en: "Home market", detailZh: "全部运力供国内消费；不发生贸易收支。", detailEn: "All freight serves households. No trade cash flow." },
  { id: "imports", zh: "进口原料", en: "Import inputs", detailZh: "低库存时动用储备补料；每次最多 2.5 单位，占用 25% 运力。", detailEn: "Buy up to 2.5 inputs when stocks are low, using reserves and 25% of freight." },
  { id: "exports", zh: "出口商品", en: "Export goods", detailZh: "最多用 25% 运力出口换取储备；国内供应减少，可能推高物价。", detailEn: "Export through up to 25% of freight for reserves. Less home supply may raise prices." },
] as const;
export interface EconomyOrders {
  priorities: Record<SectorId, Priority>;
  tax: 0 | 1 | 2;
  methods: Record<SectorId, ProductionMethod>;
  trade: TradeStance;
}
export interface Construction { id: number; sector: SectorId; left: number; total: number; cost: number }
export interface Economy {
  orders: EconomyOrders;
  capacity: Record<SectorId, number>;
  utilization: Record<SectorId, number>;
  credit: Record<SectorId, number>;
  materials: number; goods: number; price: number;
  employment: number; income: number; bankHealth: number;
  sales: number; demand: number; revenue: number; lastRevenue: number;
  output: number; lastPressure: number;
  methodCooldowns: Record<SectorId, number>; methodCosts: number;
  materialOutput: number; materialUse: number; freight: number;
  lastTrade: { materials: number; goods: number; cash: number };
  tradeCash: number; imported: number; exported: number;
  projects: Construction[]; completed: number; serial: number;
  ticks: number; remainder: number;
  history: { output: number; income: number; price: number }[];
}
export function createEconomy(): Economy {
  return {
    orders: { priorities: { materials: 2, industry: 2, transport: 2 }, tax: 1,
      methods: { materials: "balanced", industry: "balanced", transport: "balanced" }, trade: "domestic" },
    capacity: { materials: 1, industry: 1, transport: 1 },
    utilization: { materials: 0.8, industry: 0.8, transport: 0.8 },
    credit: { materials: 1 / 3, industry: 1 / 3, transport: 1 / 3 },
    materials: 12, goods: 6, price: 100, employment: 80, income: 85, bankHealth: 65,
    sales: 0, demand: 5.5, revenue: 0, lastRevenue: 0, output: 80, lastPressure: 0,
    methodCooldowns: { materials: 0, industry: 0, transport: 0 }, methodCosts: 0,
    materialOutput: 0, materialUse: 0, freight: 0,
    lastTrade: { materials: 0, goods: 0, cash: 0 }, tradeCash: 0, imported: 0, exported: 0,
    projects: [], completed: 0, serial: 0, ticks: 0, remainder: 0, history: [],
  };
}
/** Only fill fields introduced by this revision; leave invalid existing data for the save validator. */
export function normalizeEconomy(e: Economy | undefined): Economy {
  if (!e) return createEconomy();
  const defaults = createEconomy();
  return { ...e, orders: normalizeEconomyOrders(e.orders),
    methodCosts: e.methodCosts === undefined ? 0 : e.methodCosts,
    materialOutput: e.materialOutput === undefined ? 0 : e.materialOutput,
    materialUse: e.materialUse === undefined ? 0 : e.materialUse,
    freight: e.freight === undefined ? 0 : e.freight,
    tradeCash: e.tradeCash === undefined ? 0 : e.tradeCash,
    imported: e.imported === undefined ? 0 : e.imported,
    exported: e.exported === undefined ? 0 : e.exported,
    methodCooldowns: e.methodCooldowns === undefined ? defaults.methodCooldowns : e.methodCooldowns,
    lastTrade: e.lastTrade === undefined ? defaults.lastTrade : e.lastTrade };
}
export function normalizeEconomyOrders(o: EconomyOrders | undefined): EconomyOrders {
  const defaults = createEconomy().orders;
  if (o === undefined) return defaults;
  return { ...o,
    methods: o?.methods === undefined ? defaults.methods : o.methods && typeof o.methods === "object" ? { ...o.methods } : o.methods,
    trade: o?.trade === undefined ? defaults.trade : o.trade,
    ...(o?.priorities && typeof o.priorities === "object" ? { priorities: { ...o.priorities } } : {}) };
}
export function methodCost(run: StoryRun, e: Economy, sector: SectorId) {
  return usableReserves(scenarioOf(run.scenarioId)) * 0.008 * e.capacity[sector];
}
/** Apply choices once. Changing machinery is a paid, rate-limited action, not a free toggle. */
export function applyEconomyOrders(run: StoryRun, e: Economy, orders: EconomyOrders): { zh: string; en: string } {
  if (run.done) return { zh: "本局已结束。", en: "This crisis has ended." };
  const next = normalizeEconomyOrders(orders);
  if (![0, 1, 2].includes(next.tax) || !TRADE_STANCES.some(x => x.id === next.trade)
    || !SECTORS.every(x => [1, 2, 4].includes(next.priorities?.[x.id]) && METHODS.some(m => m.id === next.methods?.[x.id]))) {
    return { zh: "安排无效，未执行。", en: "Invalid orders; no changes made." };
  }
  const blocked: string[] = [];
  const openingMethodCosts = e.methodCosts;
  for (const { id, zh } of SECTORS) {
    if (next.methods[id] === e.orders.methods[id]) continue;
    const cost = methodCost(run, e, id);
    if (e.methodCooldowns[id] > 0 || run.reserves < cost) { next.methods[id] = e.orders.methods[id]; blocked.push(zh); continue; }
    run.reserves -= cost; run.spent += cost; e.methodCosts += cost;
    e.methodCooldowns[id] = 30;
  }
  e.orders = structuredClone(next);
  const converted = e.methodCosts > openingMethodCosts;
  return blocked.length ? { zh: `${blocked.join("、")}的工艺切换未执行：资金不足或仍在调整期。其余经营安排已生效。`, en: "Some method changes could not proceed: insufficient funds or a conversion still settling. Other operating orders are active." }
    : converted ? { zh: `工艺改造已拨款 ${Math.round(e.methodCosts - openingMethodCosts).toLocaleString()}；下一次结算可观察产出、就业和贸易变化。`, en: `Conversion funded: ${Math.round(e.methodCosts - openingMethodCosts).toLocaleString()}. The next settlement shows output, jobs and trade effects.` }
    : { zh: "经营安排已生效；下一次结算可观察信贷、消费和贸易变化。", en: "Operating orders enacted. The next settlement shows credit, consumption and trade effects." };
}
export function projectCost(run: StoryRun, economy: Economy, sector: SectorId) {
  const level = economy.capacity[sector] - 1 + economy.projects.filter(p => p.sector === sector).length * 0.25;
  return usableReserves(scenarioOf(run.scenarioId)) * 0.045 * (1 + level * 1.8);
}
export function buildProject(run: StoryRun, e: Economy, sector: SectorId): boolean {
  if (!SECTORS.some(s => s.id === sector) || e.projects.length >= 3 || run.done) return false;
  if (e.capacity[sector] + e.projects.filter(p => p.sector === sector).length * 0.25 >= 2.5) return false;
  const cost = projectCost(run, e, sector);
  if (run.reserves < cost) return false;
  run.reserves -= cost; run.spent += cost;
  e.projects.push({ id: ++e.serial, sector, cost, left: 45, total: 45 });
  return true;
}
export function cancelProject(run: StoryRun, e: Economy, id: number): number {
  const index = e.projects.findIndex(p => p.id === id);
  if (index < 0) return 0;
  const p = e.projects.splice(index, 1)[0]!;
  const refund = p.cost * (p.left / p.total) * 0.8;
  run.reserves += refund; run.spent -= refund;
  return refund;
}

/** Fixed 5-second settlements: identical results for foreground and catch-up. */
export function advanceEconomy(run: StoryRun, e: Economy, cabinet: CrisisCabinet, seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0 || run.done) return;
  e.remainder += seconds;
  while (e.remainder >= 5 - 1e-8) {
    e.remainder = Math.max(0, e.remainder - 5);
    if (e.remainder < 1e-8) e.remainder = 0;
    tick(run, e, cabinet);
  }
  // Deadline splitting can leave an extra nanosecond-sized call after settlement.
  // Use the same precision floor as the fixed-step boundary.
  if (e.remainder < 1e-8) e.remainder = 0;
}
function tick(run: StoryRun, e: Economy, cabinet: CrisisCabinet) {
  const environment = economicEnvironment(e).current;
  e.ticks++;
  const s = scenarioOf(run.scenarioId);
  const normalized = 5 / (lengthOf(run.length).minutes * 60);
  const pot = usableReserves(s);
  for (const { id } of SECTORS) e.methodCooldowns[id] = Math.max(0, e.methodCooldowns[id] - 5);
  e.lastTrade = { materials: 0, goods: 0, cash: 0 };
  const project = e.projects[0];
  if (project) {
    project.left = Math.max(0, project.left - 5);
    if (!project.left) {
      e.capacity[project.sector] += 0.25; e.completed++; e.projects.shift();
      const sector = SECTORS.find(x => x.id === project.sector)!;
      run.log.unshift({ day: run.day, zh: `【投产】${sector.zh}扩建完成，产能增加 25%。融资与需求决定实际开工。`, en: `[Production] ${sector.en}: capacity +25%. Finance and demand determine utilization.`, tone: "good" });
      run.log = run.log.slice(0, 60);
    }
  }
  const weights = Object.values(e.orders.priorities).reduce((a, b) => a + b, 0);
  const highRate = clamp((run.rate - s.startRate) / Math.max(0.01, s.maxRate - s.startRate), 0, 1);
  const finance = clamp((0.94 - highRate * 0.24 - run.pressure * 0.22 + (cabinet.banks - 65) * 0.003 + (e.bankHealth - 65) * 0.003) * environment.finance, 0.25, 1.1);
  for (const { id } of SECTORS) {
    e.credit[id] = e.orders.priorities[id] / weights;
    // Credit is finite: expanding capacity without financing dilutes utilization.
    const method = METHODS.find(x => x.id === e.orders.methods[id])!;
    e.utilization[id] = clamp(finance * (0.35 + e.credit[id] * 1.95) / Math.sqrt(e.capacity[id]) / method.finance, 0.1, 1);
  }
  const methods = Object.fromEntries(SECTORS.map(({ id }) => [id, METHODS.find(x => x.id === e.orders.methods[id])!])) as Record<SectorId, typeof METHODS[number]>;
  const raw = 8 * e.capacity.materials * e.utilization.materials * methods.materials.output * environment.materials;
  e.materialOutput = raw;
  e.materials += raw;
  // Imports settle against actual cash; no debt or phantom stock is created.
  let freightShare = 1;
  if (e.orders.trade === "imports" && e.materials < 18) {
    const unitCost = pot * normalized * 0.04 * (1 + clamp(run.pressure, 0, 2) * 0.4);
    const quantity = Math.max(0, Math.min(2.5, 18 - e.materials, run.reserves / Math.max(0.000001, unitCost)));
    const cost = quantity * unitCost;
    e.materials += quantity; run.reserves = Math.max(0, run.reserves - cost); run.spent += cost;
    e.imported += quantity; e.lastTrade.materials = quantity; e.lastTrade.cash -= cost;
    if (quantity > 0) freightShare = 0.75;
  }
  const inputPerGood = 1.2 * methods.industry.input;
  const made = Math.min(e.materials / inputPerGood, 6 * e.capacity.industry * e.utilization.industry * methods.industry.output);
  e.materialUse = made * inputPerGood;
  e.materials = clamp(e.materials - e.materialUse, 0, 120);
  e.utilization.industry = made / (6 * e.capacity.industry * methods.industry.output);
  e.goods += made;
  // Investment crowds household goods out of distribution until completion.
  const freight = 7 * e.capacity.transport * e.utilization.transport * methods.transport.output * environment.freight * (project ? 0.88 : 1);
  e.freight = freight;
  if (e.orders.trade === "exports") {
    const quantity = Math.min(e.goods, freight * 0.25, 2.5);
    const revenue = quantity * pot * normalized * 0.025;
    e.goods -= quantity; run.reserves += revenue;
    e.exported += quantity; e.lastTrade.goods = quantity; e.lastTrade.cash += revenue;
    freightShare = 0.75;
  }
  e.tradeCash += e.lastTrade.cash;
  const supply = Math.min(e.goods, freight * freightShare);
  e.demand = 6.2 * clamp(e.income / 85, 0.5, 1.4) * (1 + Math.sin(e.ticks / 24 + run.seed % 11) * 0.1) * environment.demand;
  e.sales = Math.min(supply, e.demand);
  e.goods = clamp(e.goods - e.sales, 0, 120);
  e.utilization.transport = Math.min(1, (e.sales + e.lastTrade.goods + e.lastTrade.materials * 0.5) / (7 * e.capacity.transport * methods.transport.output));
  e.price += (clamp(100 * e.demand / Math.max(1, supply), 65, 180) - e.price) * 0.15;
  const jobs = SECTORS.reduce((total, { id }) => total + e.utilization[id] * e.capacity[id] * methods[id].labor, 0) / 3 * 100;
  e.employment += (clamp(jobs, 25, 100) - e.employment) * 0.12;
  const targetIncome = e.employment * (1.08 - e.orders.tax * 0.09) * 100 / e.price;
  e.income = clamp(e.income + (targetIncome - e.income) * 0.08, 25, 120);
  e.output = made / 6 * 100;
  e.bankHealth = clamp(e.bankHealth + ((e.sales / 5 - 1) * 0.45 - run.pressure * 0.12), 15, 100);
  e.lastRevenue = pot * normalized * (0.02 + e.orders.tax * 0.045) * e.sales / 6;
  e.revenue += e.lastRevenue; run.reserves += e.lastRevenue;
  // Economic activity feeds the crisis; magnitudes scale by total run time.
  e.lastPressure = ((80 - e.income) / 100 * 0.32 + (60 - e.bankHealth) / 100 * 0.2) * normalized;
  run.pressure = Math.max(0, run.pressure + e.lastPressure);
  const equityMove = (e.output - 75) / 100 * normalized * 0.2;
  if (!run.marketHalted) { run.equity = Math.max(5, run.equity * (1 + equityMove)); run.book = Math.max(1, run.book * (1 + equityMove * 0.8)); }
  cabinet.business = clamp(cabinet.business + (e.output - 75) * normalized * 0.18, 0, 100);
  cabinet.publicTrust = clamp(cabinet.publicTrust + (e.income - 75) * normalized * 0.18, 0, 100);
  e.history.push({ output: e.output, income: e.income, price: e.price });
  if (e.history.length > 36) e.history.shift();
}

export function economyIssue(e: Economy): { zh: string; en: string; sector: SectorId } {
  if (e.materials < 5) return { zh: "工厂等料：增加上游信贷，或让制造业改用省料的熟练工坊。短期进口能补缺口，但会占用储备与运力。", en: "Factories await inputs. Finance upstream supply or use material-saving workshops. Imports bridge the gap at the cost of reserves and freight.", sector: "materials" };
  if (e.income < 65) return { zh: "街坊买不起：检查就业、物价和筹资负担。减负或保留更多岗位有助消费；继续扩大产出未必卖得出去。", en: "Households cannot afford enough. Check jobs, prices and funding burdens. More production alone will not create buyers.", sector: "industry" };
  if (e.goods > 12) return { zh: "库存不是利润：先看购买力，再补运输。出口可以回款，但会挤占国内配送；继续扩厂可能只会增加库存。", en: "Inventory is not profit. Check purchasing power and distribution. Exports earn reserves but compete with household deliveries.", sector: "transport" };
  if (e.sales < e.demand * 0.85) return { zh: "消费缺口：商品交付不足推高物价。查看开工率，补融资或产能最紧的一环。", en: "Unmet demand pushes prices up. Fund the bottleneck in production or delivery.", sector: e.utilization.industry < e.utilization.transport ? "industry" : "transport" };
  return { zh: "供需暂时平衡。可尝试为薄弱环节改造工艺；留意机械化减少岗位、扩建挤占运输，也要为下一轮冲击留钱。", en: "Supply and demand are balanced. Consider a targeted conversion, while watching jobs lost to machinery, construction freight and rescue reserves.", sector: "materials" };
}
