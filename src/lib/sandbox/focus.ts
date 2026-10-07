import type { FocusId, FocusNode } from "./types.ts";

/**
 * The national-focus tree: institutional reforms bought with 公信力 (political
 * capital) and finished over weeks, Hearts-of-Iron style. Three branches:
 * independence & communication, financial stability, the external front.
 * `at` is the [column, row] slot in the tree view; columns 0–2, 3–5 and 6–7
 * are the three branches.
 */
export const BRANCHES = [
  { cols: [0, 2], name: { zh: "制度与沟通", en: "Institutions" } },
  { cols: [3, 5], name: { zh: "金融稳定", en: "Financial stability" } },
  { cols: [6, 7], name: { zh: "对外", en: "External" } },
] as const;
export const FOCUS: FocusNode[] = [
  {
    id: "independence",
    name: { zh: "央行独立", en: "Central bank independence" },
    effect: { zh: "政府施压 −20；信誉目标 +8；政府不能再强令降息", en: "Government pressure −20; trust target +8; no more forced cuts" },
    cost: 80,
    weeks: 20,
    requires: [],
    at: [1, 0],
  },
  {
    id: "targeting",
    name: { zh: "通胀目标制", en: "Inflation targeting" },
    effect: { zh: "预期更快锚定目标；信誉目标 +6", en: "Expectations anchor faster; trust target +6" },
    cost: 60,
    weeks: 16,
    requires: ["independence"],
    at: [0, 1],
  },
  {
    id: "transparency",
    name: { zh: "透明沟通", en: "Transparent communication" },
    effect: { zh: "每周公信力 +0.3；坏消息对信誉的伤害减半", en: "+0.3 political capital a week; bad news hurts trust half as much" },
    cost: 40,
    weeks: 8,
    requires: ["targeting"],
    at: [0, 2],
  },
  {
    id: "guidance",
    name: { zh: "前瞻指引", en: "Forward guidance" },
    effect: { zh: "解锁「承诺」：鸽派承诺立刻放松，鹰派承诺压低预期；违约重罚", en: "Unlocks pledges: a dovish pledge eases now, a hawkish one pulls expectations down; breaking one is costly" },
    cost: 50,
    weeks: 10,
    requires: ["targeting"],
    at: [1, 2],
  },
  {
    id: "qeTools",
    name: { zh: "量化宽松工具", en: "Quantitative easing toolkit" },
    effect: { zh: "解锁购债（QE）：利率到零之后还能放松", en: "Unlocks bond purchases: easing beyond zero rates" },
    cost: 70,
    weeks: 16,
    requires: ["independence"],
    at: [2, 1],
  },
  {
    id: "depositInsurance",
    name: { zh: "存款保险", en: "Deposit insurance" },
    effect: { zh: "挤兑概率减半；银行恢复更快", en: "Bank runs half as likely; banks heal faster" },
    cost: 60,
    weeks: 14,
    requires: [],
    at: [4, 0],
  },
  {
    id: "bagehot",
    name: { zh: "最后贷款人原则", en: "Lender-of-last-resort doctrine" },
    effect: { zh: "危机放贷更便宜、更有效（白芝浩：自由放贷、惩罚利率、良好抵押）", en: "Crisis lending cheaper and stronger (Bagehot: lend freely, at a penalty, on good collateral)" },
    cost: 50,
    weeks: 10,
    requires: ["depositInsurance"],
    at: [3, 1],
  },
  {
    id: "macroprudential",
    name: { zh: "宏观审慎", en: "Macroprudential policy" },
    effect: { zh: "解锁「信贷上限」：不加息也能给楼市降温", en: "Unlocks a credit cap: cool housing without raising rates" },
    cost: 70,
    weeks: 18,
    requires: ["depositInsurance"],
    at: [5, 1],
  },
  {
    id: "bankReform",
    name: { zh: "银行资本改革", en: "Bank capital reform" },
    effect: { zh: "泡沫积累 −40%；银行健康度下限 +0.1", en: "Bubbles build 40% slower; bank health floor +0.1" },
    cost: 90,
    weeks: 24,
    requires: ["macroprudential", "bagehot"],
    at: [4, 2],
  },
  {
    id: "reserveBuild",
    name: { zh: "外汇储备积累", en: "Reserve accumulation" },
    effect: { zh: "外汇储备每年 +1% GDP", en: "Reserves +1% of GDP a year" },
    cost: 50,
    weeks: 12,
    requires: [],
    at: [6, 0],
  },
  {
    id: "floating",
    name: { zh: "自由浮动汇率", en: "Free float" },
    effect: { zh: "汇率传导 −30%；风险溢价降低", en: "Exchange-rate pass-through −30%; lower risk premium" },
    cost: 60,
    weeks: 14,
    requires: [],
    at: [7, 0],
  },
  {
    id: "fiscalRule",
    name: { zh: "财政规则", en: "Fiscal rule" },
    effect: { zh: "赤字目标 −1% GDP；政府施压 −5", en: "Deficit target −1% of GDP; government pressure −5" },
    cost: 70,
    weeks: 18,
    requires: ["independence"],
    at: [1, 1],
  },
  {
    id: "yieldCurve",
    name: { zh: "收益率曲线控制", en: "Yield-curve control" },
    effect: { zh: "购债的放松效果 ×1.5", en: "Bond purchases ease 1.5× as much" },
    cost: 60,
    weeks: 12,
    requires: ["qeTools"],
    at: [2, 2],
  },
  {
    id: "stressTests",
    name: { zh: "银行压力测试", en: "Bank stress tests" },
    effect: { zh: "挤兑概率再减半；银行恢复更快", en: "Bank runs half as likely again; banks heal faster" },
    cost: 60,
    weeks: 14,
    requires: ["bankReform"],
    at: [4, 3],
  },
  {
    id: "swapLines",
    name: { zh: "国际互换额度", en: "Swap lines" },
    effect: { zh: "货币危机时可动用外国央行的美元式额度", en: "Draw on foreign central banks when the currency is attacked" },
    cost: 80,
    weeks: 20,
    requires: ["reserveBuild"],
    at: [6, 1],
  },
  {
    id: "intlCoop",
    name: { zh: "国际央行合作", en: "Central-bank cooperation" },
    effect: { zh: "解锁「联合行动」：提议各国一起降息或加息", en: "Unlocks joint action: propose a coordinated cut or hike" },
    cost: 80,
    weeks: 18,
    requires: ["swapLines"],
    at: [6, 2],
  },
];

export const FOCUS_BY_ID = Object.fromEntries(FOCUS.map((f) => [f.id, f])) as Record<FocusId, FocusNode>;

export function focusAvailable(done: readonly FocusId[], id: FocusId): boolean {
  return !done.includes(id) && FOCUS_BY_ID[id].requires.every((r) => done.includes(r));
}
