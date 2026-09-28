import { clamp } from "../game/math.ts";
import { lengthOf } from "./lengths.ts";
import { scenarioOf, usableReserves } from "./scenarios.ts";
import type { Economy } from "./economy.ts";
import type { CrisisCabinet } from "./realtime.ts";
import type { StoryRun } from "./types.ts";

export type FactionId = "workers" | "merchants" | "financiers";
export type ReformId = "wageCompact" | "sharedWarehouses" | "openBooks";
export type PetitionId = "payday" | "bread" | "inputs" | "credit" | "deposits" | "freight";
export type CivicChoice = "support" | "compromise" | "decline" | "silence";
export type CivicAction = { type: "reform"; id: ReformId } | { type: "petition"; id: number; choice: CivicChoice } | { type: "caucus"; faction: FactionId };
export interface CivicState {
  ticks: number; capital: number; factions: Record<FactionId, number>;
  reform: { id: ReformId; progress: number } | null; enacted: ReformId[];
  petition: { id: number; template: PetitionId; expires: number } | null;
  nextPetition: number; serial: number; resolved: number; silences: number;
  achievements: string[]; lastOutcome: { zh: string; en: string } | null;
  lastTemplate: PetitionId | null; caucusUntil: Record<FactionId, number>;
  streaks: { livelihoods: number; supply: number };
  recentLiving: { income: number; employment: number }[];
}
export const FACTIONS: { id: FactionId; zh: string; en: string; concernZh: string; concernEn: string }[] = [
  { id: "workers", zh: "街坊互助会", en: "Neighborhood Mutual", concernZh: "在意工作、实薪与生活开销", concernEn: "Jobs, real wages and living costs" },
  { id: "merchants", zh: "实业联席会", en: "Enterprise Assembly", concernZh: "在意订单、生产和流动资金", concernEn: "Orders, production and working capital" },
  { id: "financiers", zh: "信贷公议会", en: "Credit Council", concernZh: "在意偿付能力与清算信任", concernEn: "Solvency and confidence in settlement" },
];
export const REFORMS: { id: ReformId; zh: string; en: string; factions: FactionId[]; effectZh: string; effectEn: string }[] = [
  { id: "wageCompact", zh: "保薪互助公约", en: "Wage solidarity compact", factions: ["workers", "merchants"], effectZh: "每次结算实薪 +0.2；每局最多再消耗初始资金的 2.5%。筹资机构支持 −6。", effectEn: "Real income +0.2 per settlement; uses up to 2.5% of opening funds over a full run. Credit Council support −6." },
  { id: "sharedWarehouses", zh: "共用仓储协定", en: "Shared warehouse accord", factions: ["merchants", "workers"], effectZh: "整合滞留货源，每次结算原料 +0.45；信贷公议会支持 −4。", effectEn: "Pools stranded supplies: +0.45 inputs per settlement. Credit Council support −4." },
  { id: "openBooks", zh: "联合账目核验", en: "Joint ledger verification", factions: ["financiers", "merchants"], effectZh: "每次结算银行健康 +0.06，逐步恢复公信力；实业联席会支持 −5。", effectEn: "Bank health +0.06 per settlement, with gradual credibility recovery. Enterprise Assembly support −5." },
];
interface PetitionTemplate {
  id: PetitionId; faction: FactionId; cost: number; zh: string; en: string;
  actorZh: string; actorEn: string; bodyZh: string; bodyEn: string; aidZh: string; aidEn: string;
}
/** Original fictional petitions: no assertion of historical policy powers. */
export const PETITIONS: PetitionTemplate[] = [
  { id: "payday", faction: "workers", cost: 0.004, zh: "工资袋迟到了", en: "The missing pay packets", actorZh: "梁棠 · 印刷学徒", actorEn: "Liang Tang · print apprentice", bodyZh: "印刷坊的订单没有少，老板却说账款没有到账。梁棠把一张空工资袋放在协调桌上：「房东可不收下个月的承诺。」", bodyEn: "The print shop still has orders, but its invoices remain unpaid. Liang lays an empty pay packet on the table: 'My landlord will not take next month's promise.'", aidZh: "支付过桥工资：实薪 +4，就业 +1", aidEn: "Bridge payroll: real income +4, employment +1" },
  { id: "bread", faction: "workers", cost: 0.005, zh: "同样的钱，半袋粮", en: "Same coins, half a sack", actorZh: "许禾 · 杂货店记账员", actorEn: "Xu He · grocery bookkeeper", bodyZh: "杂货铺的赊账簿已经翻到最后一页。许禾带来街坊的联名信，希望留下一批平价货；批发商坚持当天结清。", bodyEn: "The grocery's credit book has run out of pages. Xu brings a request for affordable staples; wholesalers insist on cash today.", aidZh: "购买生活物资：商品库存 +8，实薪 +2", aidEn: "Buy essentials: goods inventory +8, real income +2" },
  { id: "inputs", faction: "merchants", cost: 0.004, zh: "炉火等着一车料", en: "A furnace waiting for a cart", actorZh: "陶岑 · 车间负责人", actorEn: "Tao Cen · workshop foreman", bodyZh: "车间有订单、有工人，仓门后却只剩空筐。陶岑愿意共享下批货源，前提是有人先替供应商垫一笔订金。", bodyEn: "The workshop has orders and workers, but empty crates. Tao offers to share the next delivery if someone can advance the supplier's deposit.", aidZh: "垫付原料订金：原料库存 +12", aidEn: "Advance input deposits: input inventory +12" },
  { id: "credit", faction: "merchants", cost: 0.006, zh: "一笔借款，三枚印章", en: "One loan, three signatures", actorZh: "沈弦 · 修理铺主", actorEn: "Shen Xian · repair shop owner", bodyZh: "沈弦在三家钱庄之间跑了一上午。每一家都要另一家先签字。修理铺明天还有活，只是买不起今天的零件。", bodyEn: "Shen has spent the morning between three lenders. Each wants another's signature first. Tomorrow's repairs are booked, but today's spare parts remain unpaid.", aidZh: "设立周转担保：银行健康 +3，实薪 +1", aidEn: "Underwrite working capital: bank health +3, real income +1" },
  { id: "deposits", faction: "financiers", cost: 0.005, zh: "柜台前的折凳", en: "Folding stools outside the counter", actorZh: "余泊 · 清算书记员", actorEn: "Yu Bo · settlement clerk", bodyZh: "还没开门，储户就摆好了折凳。余泊说账目尚可清算，但人群想听见一个清楚的安排，而不是又一张空白告示。", bodyEn: "Depositors have unfolded their stools before the doors open. Yu says the books can settle, but the queue wants a clear arrangement, not another blank notice.", aidZh: "安排兑付周转：银行健康 +4，压力 −0.3%", aidEn: "Fund settlement liquidity: bank health +4, pressure −0.3%" },
  { id: "freight", faction: "merchants", cost: 0.004, zh: "卡在桥头的货车", en: "Carts stranded at the bridge", actorZh: "姜叶 · 货运调度员", actorEn: "Jiang Ye · freight dispatcher", bodyZh: "厂房扩建和市集送货抢着使用同一条路。姜叶排出一张夜间轮值表，车队愿意加班，条件是补齐灯油与车马费。", bodyEn: "Construction and market deliveries compete for the same road. Jiang has drafted a night roster; the team will work it if lamp oil and cart hire are covered.", aidZh: "购买夜运服务：商品库存 +5，银行健康 +1", aidEn: "Buy night freight: goods inventory +5, bank health +1" },
];
export function createCivic(_run: StoryRun): CivicState {
  return { ticks: 0, capital: 40, factions: { workers: 60, merchants: 60, financiers: 60 }, reform: null, enacted: [], petition: null, nextPetition: 3, serial: 0, resolved: 0, silences: 0, achievements: [], lastOutcome: null, lastTemplate: null, caucusUntil: { workers: 0, merchants: 0, financiers: 0 }, streaks: { livelihoods: 0, supply: 0 }, recentLiving: [] };
}
const ids = FACTIONS.map(f => f.id);
const validReform = (x: unknown): x is ReformId => REFORMS.some(r => r.id === x);
const validPetition = (x: unknown): x is PetitionId => PETITIONS.some(p => p.id === x);
const number = (x: unknown, min: number, max: number) => typeof x === "number" && Number.isFinite(x) && x >= min && x <= max;
/** Malformed/old saves fall back as a whole; never restore half a funded reform. */
export function normalizeCivic(value: unknown, run: StoryRun): CivicState {
  const fallback = createCivic(run);
  if (!value || typeof value !== "object") return fallback;
  const saved = value as CivicState;
  const c = { ...saved, recentLiving: saved.recentLiving === undefined ? [] : saved.recentLiving };
  if (!number(c.ticks, 0, 1e6) || !Number.isInteger(c.ticks) || !number(c.capital, 0, 100)
    || !c.factions || !ids.every(id => number(c.factions[id], 0, 100))
    || !c.caucusUntil || !ids.every(id => number(c.caucusUntil[id], 0, 1e6))
    || !c.streaks || !number(c.streaks.livelihoods, 0, 6) || !number(c.streaks.supply, 0, 6)
    || !Array.isArray(c.recentLiving) || c.recentLiving.length > 12
    || !c.recentLiving.every(x => x && number(x.income, 0, 120) && number(x.employment, 0, 100))
    || !Array.isArray(c.enacted) || c.enacted.length > 3 || !c.enacted.every(validReform) || new Set(c.enacted).size !== c.enacted.length
    || (c.reform !== null && (!c.reform || !validReform(c.reform.id) || !number(c.reform.progress, 0, 100) || c.enacted.includes(c.reform.id)))
    || !number(c.serial, 0, 1e6) || !Number.isInteger(c.serial) || !number(c.resolved, 0, c.serial) || !number(c.silences, 0, c.serial)
    || !number(c.nextPetition, 0, 1e6) || (c.lastTemplate !== null && !validPetition(c.lastTemplate))
    || (c.petition !== null && (!c.petition || !validPetition(c.petition.template) || !number(c.petition.id, 1, c.serial) || !number(c.petition.expires, 0, 1e6)))
    || !Array.isArray(c.achievements) || c.achievements.length > 3 || !c.achievements.every(a => ["livelihoods", "supply", "reformer"].includes(a)) || new Set(c.achievements).size !== c.achievements.length
    || (c.lastOutcome !== null && (!c.lastOutcome || typeof c.lastOutcome.zh !== "string" || typeof c.lastOutcome.en !== "string" || c.lastOutcome.zh.length > 600 || c.lastOutcome.en.length > 1000))) return fallback;
  return structuredClone(c);
}
export function reformSupport(c: CivicState, id: ReformId) {
  const r = REFORMS.find(x => x.id === id)!;
  return r.factions.reduce((sum, faction) => sum + c.factions[faction], 0) / r.factions.length;
}
function notify(run: StoryRun, c: CivicState, zh: string, en: string, tone: "info" | "good" | "bad" = "info") {
  c.lastOutcome = { zh, en };
  run.log.unshift({ day: run.day, zh: "【街区议事】" + zh, en: "[Civic desk] " + en, tone });
  run.log = run.log.slice(0, 60);
}
function scheduleNext(run: StoryRun, c: CivicState) {
  const draw = ((Math.imul(run.seed | 0, 1664525) + Math.imul(c.serial, 1013904223)) >>> 0);
  c.nextPetition = c.ticks + 6 + draw % 7;
}
function change(c: CivicState, faction: FactionId, delta: number) { c.factions[faction] = clamp(c.factions[faction] + delta, 0, 100); }
function silence(run: StoryRun, cabinet: CrisisCabinet, c: CivicState) {
  const p = PETITIONS.find(x => x.id === c.petition!.template)!;
  const scale = 30 / lengthOf(run.length).minutes;
  run.pressure += 0.003 * scale;
  run.credibility = clamp(run.credibility - 0.004 * scale, 0, 1);
  cabinet.publicTrust = clamp(cabinet.publicTrust - 0.4 * scale, 0, 100);
  change(c, p.faction, -4); c.silences++; c.petition = null; scheduleNext(run, c);
  notify(run, c, "「" + p.zh + "」未得到回应。街头传起了“协调中心不愿处理”的猜测；这不是经证实的消息。", "“" + p.en + "” received no answer. An unverified rumor spreads that the coordination desk is unwilling to act.", "bad");
}
/** Called exactly once AFTER each fixed five-second economy settlement. */
export function tickCivic(run: StoryRun, e: Economy, cabinet: CrisisCabinet, c: CivicState): void {
  if (run.done) return;
  c.ticks++;
  const share = 5 / (lengthOf(run.length).minutes * 60);
  const targets: Record<FactionId, number> = {
    workers: clamp(58 + (e.income - 75) * 0.55 + (e.employment - 75) * 0.2 - (e.price - 100) * 0.08 - e.orders.tax * 3, 18, 88),
    merchants: clamp(58 + (e.output - 75) * 0.28 + (e.bankHealth - 60) * 0.22, 18, 88),
    financiers: clamp(55 + (e.bankHealth - 60) * 0.4 + (run.credibility - 0.65) * 25 - run.pressure * 8, 18, 88),
  };
  for (const id of ids) c.factions[id] = clamp(c.factions[id] + (targets[id] - c.factions[id]) * 0.025, 0, 100);
  const consensus = ids.reduce((sum, id) => sum + c.factions[id], 0) / 3;
  c.capital = clamp(c.capital + (consensus >= 45 ? 0.42 : 0.12), 0, 100);
  if (c.reform) {
    c.reform.progress = clamp(c.reform.progress + (reformSupport(c, c.reform.id) >= 55 ? 7 : -2), 0, 100);
    if (c.reform.progress >= 100) {
      const reform = REFORMS.find(r => r.id === c.reform!.id)!;
      c.enacted.push(reform.id); c.reform = null;
      notify(run, c, "「" + reform.zh + "」签署生效，持续效果已开始。", "“" + reform.en + "” has been signed. Its continuing effects are now active.", "good");
    }
  }
  if (c.enacted.includes("sharedWarehouses")) e.materials = clamp(e.materials + 0.45, 0, 120);
  if (c.enacted.includes("openBooks")) {
    e.bankHealth = clamp(e.bankHealth + 0.06, 0, 100);
    run.credibility = clamp(run.credibility + 0.08 * share, 0, 1);
  }
  if (c.enacted.includes("wageCompact")) {
    const cost = usableReserves(scenarioOf(run.scenarioId)) * share * 0.025;
    if (run.reserves >= cost) { run.reserves -= cost; run.spent += cost; e.income = clamp(e.income + 0.2, 25, 120); }
  }
  if (c.petition && c.ticks >= c.petition.expires) silence(run, cabinet, c);
  if (!c.petition && c.ticks >= c.nextPetition) {
    const priorities: PetitionId[] = [];
    if (e.materials < 6) priorities.push("inputs");
    if (e.income < 70) priorities.push("payday");
    if (e.price > 115) priorities.push("bread");
    if (e.bankHealth < 55) priorities.push("deposits");
    if (e.projects.length > 0 || e.goods > 10) priorities.push("freight");
    if (e.utilization.industry < 0.7) priorities.push("credit");
    let pool = priorities.length ? priorities : PETITIONS.map(p => p.id);
    if (pool.length === 1 && pool[0] === c.lastTemplate) pool = PETITIONS.map(p => p.id).filter(p => p !== c.lastTemplate);
    else pool = pool.filter(p => p !== c.lastTemplate);
    const draw = ((Math.imul(run.seed | 0, 1103515245) + Math.imul(c.serial + 1, 12345)) >>> 0);
    const template = pool[draw % pool.length]!;
    c.petition = { id: ++c.serial, template, expires: c.ticks + 9 }; c.lastTemplate = template;
  }
  c.streaks.livelihoods = e.income >= 85 ? Math.min(6, c.streaks.livelihoods + 1) : 0;
  c.streaks.supply = e.materials >= 6 && e.sales >= 5.5 ? Math.min(6, c.streaks.supply + 1) : 0;
  const mandates = [
    { id: "livelihoods", complete: c.streaks.livelihoods >= 6, zh: "体面生活", en: "A decent living" },
    { id: "supply", complete: c.streaks.supply >= 6, zh: "货畅其流", en: "Goods on the move" },
    { id: "reformer", complete: c.enacted.length >= 1, zh: "从承诺到公约", en: "From promise to pact" },
  ];
  for (const m of mandates) if (m.complete && !c.achievements.includes(m.id)) {
    c.achievements.push(m.id); c.capital = clamp(c.capital + 6, 0, 100);
    notify(run, c, "阶段目标「" + m.zh + "」完成：协调力 +6。", "Milestone “" + m.en + "” complete: influence +6.", "good");
  }
  // Observe settled living conditions, never the instantaneous value of a clicked aid order.
  c.recentLiving.push({ income: e.income, employment: e.employment });
  if (c.recentLiving.length > 12) c.recentLiving.shift();
}

/** Separate from historic victory: only the most recent settled minute determines living standards. */
export function getRecoveryRating(c: CivicState): { ready: boolean; stars: number; income: number; employment: number; zh: string; en: string } {
  const samples = c.recentLiving;
  const income = samples.length ? samples.reduce((sum, x) => sum + x.income, 0) / samples.length : 0;
  const employment = samples.length ? samples.reduce((sum, x) => sum + x.employment, 0) / samples.length : 0;
  if (samples.length < 12) return { ready: false, stars: 0, income, employment, zh: "观察中", en: "Under observation" };
  const stars = income >= 85 && employment >= 80 && c.enacted.length >= 2 ? 3
    : income >= 75 && employment >= 75 && c.enacted.length >= 1 ? 2
    : income >= 65 && employment >= 65 ? 1 : 0;
  return { ready: true, stars, income, employment,
    zh: ["民生承压", "稳住生计", "温和复苏", "共同繁荣"][stars]!,
    en: ["Livelihoods under strain", "Livelihoods stabilized", "Moderate recovery", "Shared prosperity"][stars]! };
}
export function applyCivicAction(run: StoryRun, e: Economy, cabinet: CrisisCabinet, c: CivicState, action: CivicAction): { ok: boolean; zh: string; en: string } {
  const fail = (zh: string, en: string) => ({ ok: false, zh, en });
  if (run.done) return fail("本局已结束。", "This run has ended.");
  if (action.type === "caucus") {
    if (!ids.includes(action.faction)) return fail("议事对象无效。", "Invalid faction.");
    if (c.caucusUntil[action.faction] > c.ticks) return fail("先让上次协商落实，再召集下一轮。", "Allow the previous talks to settle first.");
    if (c.capital < 5) return fail("需要 5 点协调力。", "Requires 5 influence.");
    c.capital -= 5; change(c, action.faction, 9); c.caucusUntil[action.faction] = c.ticks + 12;
    const faction = FACTIONS.find(f => f.id === action.faction)!;
    notify(run, c, "与" + faction.zh + "达成有限共识：支持 +9，协调力 −5。生活状况仍会影响他们。", "Talks with " + faction.en + ": support +9, influence −5. Their material conditions still matter.", "good");
  } else if (action.type === "reform") {
    if (!validReform(action.id)) return fail("协定无效。", "Invalid accord.");
    if (c.reform || c.enacted.includes(action.id)) return fail("已有协定协商中，或该协定已经生效。", "Another accord is being negotiated, or this one is already active.");
    if (c.capital < 20) return fail("推动协定需要 20 点协调力。", "Starting an accord requires 20 influence.");
    const cost = usableReserves(scenarioOf(run.scenarioId)) * 0.02;
    if (run.reserves < cost) return fail("启动资金不足：需要初始可用资金的 2%。", "Insufficient setup funds: requires 2% of opening reserves.");
    c.capital -= 20; run.reserves -= cost; run.spent += cost; c.reform = { id: action.id, progress: 0 };
    const reform = REFORMS.find(r => r.id === action.id)!;
    if (action.id === "wageCompact") change(c, "financiers", -6);
    if (action.id === "sharedWarehouses") change(c, "financiers", -4);
    if (action.id === "openBooks") change(c, "merchants", -5);
    notify(run, c, "开始协商「" + reform.zh + "」。相关两方平均支持达 55 才推进；不足时进度回退。", "Negotiations begin for “" + reform.en + "”. Its two parties need average support of 55; otherwise progress recedes.");
  } else if (action.type === "petition") {
    if (!c.petition || c.petition.id !== action.id) return fail("这封请愿已经处理或失效。", "This petition has already been answered or expired.");
    if (!["support", "compromise", "decline", "silence"].includes(action.choice)) return fail("答复无效。", "Invalid response.");
    if (action.choice === "silence") { silence(run, cabinet, c); return { ok: true, ...c.lastOutcome! }; }
    const p = PETITIONS.find(x => x.id === c.petition!.template)!;
    if (action.choice === "support") {
      const cost = usableReserves(scenarioOf(run.scenarioId)) * p.cost;
      if (run.reserves < cost) return fail("无法兑现：可用资金不足，请协商或明确拒绝。", "Cannot fund this promise. Negotiate or explicitly decline.");
      run.reserves -= cost; run.spent += cost; change(c, p.faction, 6);
      if (p.faction !== "financiers") change(c, "financiers", -1);
      if (p.id === "payday") { e.income = clamp(e.income + 4, 25, 120); e.employment = clamp(e.employment + 1, 25, 100); }
      if (p.id === "bread") { e.goods = clamp(e.goods + 8, 0, 120); e.income = clamp(e.income + 2, 25, 120); }
      if (p.id === "inputs") e.materials = clamp(e.materials + 12, 0, 120);
      if (p.id === "credit") { e.bankHealth = clamp(e.bankHealth + 3, 0, 100); e.income = clamp(e.income + 1, 25, 120); }
      if (p.id === "deposits") { e.bankHealth = clamp(e.bankHealth + 4, 0, 100); run.pressure = Math.max(0, run.pressure - 0.003); }
      if (p.id === "freight") { e.goods = clamp(e.goods + 5, 0, 120); e.bankHealth = clamp(e.bankHealth + 1, 0, 100); }
      notify(run, c, "已回应「" + p.zh + "」：" + p.aidZh + "，相关支持 +6。资金已扣除。", "Answered “" + p.en + "”: " + p.aidEn + "; faction support +6. Funds paid.", "good");
    } else if (action.choice === "compromise") {
      if (c.capital < 4) return fail("协商需要 4 点协调力。", "Negotiation requires 4 influence.");
      c.capital -= 4; change(c, p.faction, 3);
      notify(run, c, "「" + p.zh + "」达成缓办协议：协调力 −4，支持 +3；物资与融资缺口仍需经营解决。", "A deferral for “" + p.en + "”: influence −4, support +3. The material shortfall still needs an economic answer.");
    } else {
      change(c, p.faction, -3);
      notify(run, c, "明确拒绝「" + p.zh + "」：保留资金，相关支持 −3。公开说明避免了沉默猜测。", "Explicitly declined “" + p.en + "”: funds retained, support −3. A clear answer avoids silence rumors.");
    }
    c.resolved++; c.petition = null; scheduleNext(run, c);
  } else return fail("决策无效。", "Invalid decision.");
  return { ok: true, ...c.lastOutcome! };
}
/** Optional social legacy only; historic scenario victory conditions stay separate. */
export function getCivicOverview(c: CivicState, _e: Economy, _run: StoryRun) {
  return { influence: c.capital, pending: c.petition ? 1 : 0, reform: c.reform, milestones: [
    { id: "livelihoods", zh: "体面生活", en: "A decent living", detailZh: "实薪 ≥85 持续 30 秒", detailEn: "Real income ≥85 for 30 seconds", value: c.achievements.includes("livelihoods") ? 30 : c.streaks.livelihoods * 5, target: 30 },
    { id: "supply", zh: "货畅其流", en: "Goods on the move", detailZh: "原料 ≥6 且销售 ≥5.5，持续 30 秒", detailEn: "Inputs ≥6 and sales ≥5.5 for 30 seconds", value: c.achievements.includes("supply") ? 30 : c.streaks.supply * 5, target: 30 },
    { id: "reformer", zh: "从承诺到公约", en: "From promise to pact", detailZh: "促成一项协定生效", detailEn: "Bring an accord into force", value: c.enacted.length ? 100 : c.reform?.progress ?? 0, target: 100 },
  ] };
}
