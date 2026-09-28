import { clamp, seededDraw } from "../game/math.ts";
import { lengthOf } from "./lengths.ts";
import { usableReserves } from "./scenarios.ts";
import type { Scenario, StoryLength, StoryRun } from "./types.ts";

export const SILENCE_WARNING_ZH = "市场会胡乱猜测国家部门的意图；传言可能引发撤资、抛售和信任下降。";
export const SILENCE_WARNING_EN = "Markets may wildly speculate about the authorities' intentions, triggering withdrawals, selling and lost trust.";
export function canPause(length: StoryLength) { return length !== "sprint"; }
export function decisionSeconds(run: StoryRun) { return lengthOf(run.length).minutes * 60 / run.days; }

export type PolicyId = "coordinate" | "backstop" | "restructure";
export interface CrisisCabinet {
  banks: number;
  business: number;
  publicTrust: number;
  silenceStreak: number;
  silences: number;
  route: PolicyId | null;
  due: number;
  enacted: boolean;
  cost: number;
}
export const POLICIES: { id: PolicyId; zh: string; en: string; detailZh: string; detailEn: string; share: number; delay: number }[] = [
  { id: "coordinate", zh: "组织联合救助", en: "Coordinate a rescue pool", detailZh: "承诺 5% 初始可用资金，等待两个时段。需要金融机构合作；改善拆借意愿，效果取决于届时信任。", detailEn: "Commit 5% of opening funds; two sessions. Requires bank cooperation; restores lending according to trust at execution.", share: 0.05, delay: 2 },
  { id: "backstop", zh: "建立紧急支持安排", en: "Establish emergency support", detailZh: "承诺 12% 初始可用资金，等待一个时段。直接缓解压力，但资源负担会引起公众不满。", detailEn: "Commit 12% of opening funds; one session. Relieves stress directly, at a cost to public confidence.", share: 0.12, delay: 1 },
  { id: "restructure", zh: "协调有序重组", en: "Coordinate restructuring", detailZh: "承诺 8% 初始可用资金，等待两个时段。金融机构承担损失；短期市场承压，企业融资环境改善。", detailEn: "Commit 8% of opening funds; two sessions. Banks take losses and markets initially weaken; business finance improves.", share: 0.08, delay: 2 },
];
export function createCabinet(): CrisisCabinet {
  return { banks: 65, business: 65, publicTrust: 65, silenceStreak: 0, silences: 0, route: null, due: 0, enacted: false, cost: 0 };
}
function log(run: StoryRun, zh: string, en: string, tone: "bad" | "good" | "info" = "info") {
  run.log.unshift({ day: run.day, zh, en, tone });
  run.log = run.log.slice(0, 60);
}
/** These are explicitly game abstractions, not claims about historical policy sizes. */
export function enactRoute(run: StoryRun, cabinet: CrisisCabinet, s: Scenario, choice: PolicyId | null) {
  const next = { ...cabinet };
  if (choice && !next.route) {
    const policy = POLICIES.find((p) => p.id === choice)!;
    const cost = usableReserves(s) * policy.share;
    if (run.reserves < cost) {
      log(run, "【协调失败】可用资金不足，方案未启动；请重新选择。", "[Coordination failed] Insufficient funds; choose again.", "bad");
    } else {
      run.reserves -= cost; run.spent += cost;
      next.route = choice; next.due = run.day + policy.delay; next.cost = cost;
      log(run, `【政策排期】${policy.zh}：已拨付 ${Math.round(cost).toLocaleString()}，第 ${next.due} 时段落实。`, `[Policy scheduled] ${policy.en}; funded ${Math.round(cost)}, due session ${next.due}.`);
    }
  }
  if (next.route && !next.enacted && run.day >= next.due) {
    next.enacted = true;
    if (next.route === "coordinate") {
      const support = next.banks / 100;
      run.pressure = Math.max(0, run.pressure - 0.16 * support);
      next.banks = clamp(next.banks + 12, 0, 100);
    } else if (next.route === "backstop") {
      run.pressure = Math.max(0, run.pressure - 0.2);
      next.banks = clamp(next.banks + 20, 0, 100);
      next.publicTrust = clamp(next.publicTrust - 12, 0, 100);
    } else {
      run.pressure = Math.max(0, run.pressure - 0.14);
      run.equity *= 0.96;
      next.banks = clamp(next.banks - 12, 0, 100);
      next.business = clamp(next.business + 18, 0, 100);
    }
    const p = POLICIES.find((p) => p.id === next.route)!;
    log(run, `【政策落实】${p.zh}。利益相关方的态度已改变。`, `[Policy enacted] ${p.en}. Stakeholders have changed their positions.`, "good");
  }
  return next;
}

/** One reaction per deadline, even if several unanswered calls expire together. */
export function marketResponse(run: StoryRun, cabinet: CrisisCabinet, silent: boolean, seed: number) {
  const next = { ...cabinet };
  if (!silent) {
    next.silenceStreak = 0;
    next.banks = clamp(next.banks + 0.8 * run.tempo, 0, 100);
    next.business = clamp(next.business + 0.5 * run.tempo, 0, 100);
    next.publicTrust = clamp(next.publicTrust + 0.6 * run.tempo, 0, 100);
    return { cabinet: next, seed };
  }
  const draw = seededDraw(seed, run.seed);
  next.silences += 1; next.silenceStreak += 1;
  // Solvency information is not invented; the log labels conjecture as such.
  const suspicion = (0.012 + draw.value * 0.022) * (1 + Math.min(4, next.silenceStreak) * 0.2) * run.tempo;
  const patient = run.credibility > 0.8 && next.silenceStreak === 1 && draw.value < 0.3;
  run.pressure = Math.max(0, run.pressure + (patient ? -0.005 * run.tempo : suspicion));
  if (!patient) {
    run.credibility = clamp(run.credibility - 0.025 * run.tempo, 0, 1);
    next.banks = clamp(next.banks - 3 * run.tempo, 0, 100);
    next.business = clamp(next.business - 2 * run.tempo, 0, 100);
    next.publicTrust = clamp(next.publicTrust - 4 * run.tempo, 0, 100);
    run.equity *= Math.max(0.95, 1 - suspicion * 0.15);
  }
  const zh = patient ? "部分机构相信方案正在准备，暂时观望。" : draw.value < 0.6 ? "机构据未获回应的融资请求推测支持不足，收紧拆借。" : "未经证实的「部门已放弃救助」传言扩散，交易者跟随抛售。";
  const en = patient ? "Some institutions wait, trusting a plan is being prepared." : draw.value < 0.6 ? "Unanswered funding requests lead banks to infer inadequate support and tighten lending." : "An unverified claim that the authorities abandoned the rescue spreads and traders sell.";
  log(run, `【沉默·市场猜测，非事实】${zh}`, `[Silence · market conjecture, not fact] ${en}`, patient ? "info" : "bad");
  return { cabinet: next, seed: draw.next };
}

/** Weak cooperation creates a financing drag; this remains small and time-scaled. */
export function stakeholderPressure(run: StoryRun, cabinet: CrisisCabinet) {
  const squeeze = Math.max(0, 50 - cabinet.banks) * 0.0006 + Math.max(0, 45 - cabinet.publicTrust) * 0.0004;
  run.pressure += squeeze * run.tempo;
  run.equity *= 1 + (cabinet.business - 65) * 0.00015 * run.tempo;
  if (squeeze > 0) log(run, "【融资反馈】信任不足使机构继续收紧融资。", "[Funding feedback] Low trust keeps financing tight.", "bad");
}
