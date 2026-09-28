import type { Lexicon, Objective, StoryPhase } from "../types.ts";

/**
 * Shared seat templates and vocabulary.
 *
 * The two seats at the bottom of the market — the retail investor and the bank
 * trader — want roughly the same thing in every crisis: still be solvent on
 * Friday, and get paid for being right. Their briefings are written once here
 * and overridden per scenario where the crisis changes the job.
 *
 * The two seats at the top are always written per scenario, because what a
 * governor can even *do* is the thing that differs between 1720 and 2008.
 */

/** The fund on the other side of every one of these trades. */
export const ATTACKER_ZH = "北风基金";
export const ATTACKER_EN = "Northwind Capital";

export function retailObjective(over: Partial<Objective> = {}): Objective {
  return {
    side: "neutral",
    kind: "survive",
    target: 0.7,
    titleZh: "活下来",
    titleEn: "Survive",
    howZh: "你没有内线，也没有储备。你能做的只有三件事：减杠杆、换币种、别在利率飙升的那天满仓持股。",
    howEn: "You have no inside line and no reserves. You can do three things: cut leverage, move currency, and not be fully invested on the day rates spike.",
    winZh: "最后一天净值还剩 70% 以上就算赢。这一关不比谁赚得多，比谁没被抬出去。",
    winEn: "End the last day with 70% of your net worth or more. This one is not about who earns most — it is about who is still here.",
    trapZh: "最危险的不是贬值，是保卫战期间的加息。利率从 8% 拉到 25%，你满仓的高久期股票会先死。",
    trapEn: "Devaluation is not what kills you — the defence is. When the policy rate goes from 8% to 25%, your long-duration holdings die first.",
    ...over,
  };
}

export function traderObjective(over: Partial<Objective> = {}): Objective {
  return {
    side: "neutral",
    kind: "profit",
    target: 0.15,
    titleZh: "给自己的台子赚到钱",
    titleEn: "Make your desk money",
    howZh: "你不用选立场，你只要选对边——而且是「两条腿都要选」。做空货币只赚贬值那一天的钱；这段时间你手上的股票会一路被加息碾下去。只做一条腿，最后大概率是白忙一场。",
    howEn: "You do not need a side, you need the right side — on both legs. Shorting the currency only pays on the day it moves; meanwhile the hikes grind down whatever equity you are still holding. One leg alone usually nets out to nothing.",
    winZh: "最后一天自己的账面收益 ≥ +15%。",
    winEn: "Finish the last day up 15% or more on your own book.",
    trapZh: "只做空货币、照常持股，是最常见的死法：贬值那天赚的，早就被前面几天的加息亏光了。仓位还要留得住一次 20% 的跳空。",
    trapEn: "Shorting the currency while still holding stock is the usual way to end up flat: the hikes take back what the devaluation pays. And size so you can survive a 20% gap.",
    ...over,
  };
}

/* ------------------------------------------------------------------ */
/* Vocabularies                                                        */
/* ------------------------------------------------------------------ */

/** A currency peg: the classic. */
export const PEG_LEXICON: Lexicon = {
  lineZh: "钉子",
  lineEn: "the peg",
  gaugeZh: "汇率",
  gaugeEn: "Rate",
  breakZh: "钉子断了。汇率跳空，官方宣布浮动。",
  breakEn: "The peg is gone. The rate gaps and a float is announced.",
  rateZh: "政策利率",
  rateEn: "Policy rate",
  potZh: "可用储备",
  potEn: "Usable reserves",
  spendZh: "动用储备干预",
  spendEn: "Spend reserves",
  buyZh: "外汇基金入市买股",
  buyEn: "Buy equities outright",
  marketZh: "股指",
  marketEn: "Index",
};

/** A bank run: what is being defended is confidence, and it is not a price. */
export const RUN_LEXICON: Lexicon = {
  lineZh: "清算体系",
  lineEn: "the clearing system",
  gaugeZh: "挤兑指数",
  gaugeEn: "Run index",
  breakZh: "清算停摆。窗口关闭，队伍还没散。",
  breakEn: "Clearing stops. The windows close with the queue still outside.",
  rateZh: "拆借利率",
  rateEn: "Call money rate",
  potZh: "救助资金池",
  potEn: "Rescue pool",
  spendZh: "注入流动性",
  spendEn: "Inject liquidity",
  buyZh: "直接收购问题资产",
  buyEn: "Buy the bad book outright",
  marketZh: "股指",
  marketEn: "Index",
  shortLineZh: "做空银行与信托股",
  shortLineEn: "Short the banks and trusts",
  shortEqZh: "把仓位换成现金",
  shortEqEn: "Move the book into cash",
};

/** A mania: nothing is being defended. The line that breaks is the price. */
export const MANIA_LEXICON: Lexicon = {
  lineZh: "行情",
  lineEn: "the rally",
  gaugeZh: "估值热度",
  gaugeEn: "Froth",
  breakZh: "泡沫破了。认购单变成了废纸，门口挤满了人。",
  breakEn: "The bubble goes. Subscription slips turn into wallpaper and the door fills up.",
  rateZh: "认购分期比例",
  rateEn: "Subscription terms",
  potZh: "公司金库",
  potEn: "Company treasury",
  spendZh: "回购自家股票",
  spendEn: "Buy back your own stock",
  buyZh: "给买家放贷",
  buyEn: "Lend buyers the money",
  marketZh: "账面清偿能力",
  marketEn: "Book solvency",
  shortLineZh: "做空这只股票",
  shortLineEn: "Short the stock",
  shortEqZh: "减掉手上的存货",
  shortEqEn: "Cut the inventory",
};

/** A leverage unwind: margin, haircuts, and the phone that stops being answered. */
export const LEVERAGE_LEXICON: Lexicon = {
  lineZh: "保证金体系",
  lineEn: "the margin system",
  gaugeZh: "追缴压力",
  gaugeEn: "Margin pressure",
  breakZh: "追缴无法完成。经纪商开始代客强平，价格自己往下找买家。",
  breakEn: "The calls cannot be met. Brokers start liquidating for clients and the price goes looking for a bid.",
  rateZh: "保证金比例",
  rateEn: "Margin requirement",
  potZh: "救助资金池",
  potEn: "Rescue pool",
  spendZh: "向市场注资",
  spendEn: "Put money into the market",
  buyZh: "直接接下账簿",
  buyEn: "Take the book onto your own balance sheet",
  marketZh: "股指",
  marketEn: "Index",
  shortLineZh: "做空这个体系",
  shortLineEn: "Short the system",
  shortEqZh: "降低杠杆 / 对冲股票仓位",
  shortEqEn: "Cut leverage and hedge the book",
};

/** A sovereign: the line is a spread, and the pot is political. */
export const SOVEREIGN_LEXICON: Lexicon = {
  lineZh: "主权利差",
  lineEn: "the sovereign spread",
  gaugeZh: "利差",
  gaugeEn: "Spread",
  breakZh: "利差失控。一级市场关门，这个国家借不到钱了。",
  breakEn: "The spread runs away. The primary market shuts and the country can no longer borrow.",
  rateZh: "财政紧缩力度",
  rateEn: "Austerity",
  potZh: "救助基金",
  potEn: "Rescue fund",
  spendZh: "动用救助基金买债",
  spendEn: "Buy bonds with the fund",
  buyZh: "直接购买二级市场债券",
  buyEn: "Buy in the secondary market",
  marketZh: "经济与银行",
  marketEn: "Economy and banks",
  shortLineZh: "做空主权债",
  shortLineEn: "Short the sovereign",
  shortEqZh: "减掉银行股与本国资产",
  shortEqEn: "Cut banks and domestic assets",
};

/* ------------------------------------------------------------------ */
/* Divergence                                                          */
/* ------------------------------------------------------------------ */

/**
 * The things that went slightly differently this time.
 *
 * Every documented event in every scenario still happens — the forward book
 * still leaks, the index still gaps, the bank still fails. What this pool
 * supplies is the rest of it: the paper that ran a day early, the counterpart
 * who picked up the phone, the figure that was published late. Two are drawn
 * per run, placed at random, and none of them is large.
 *
 * They are shared rather than written per crisis on purpose. These are not
 * the story; they are the reason the same story does not end the same way
 * twice, and the reason a player who has cleared a scenario once cannot clear
 * it again from memory.
 */
export const DIVERGENCES: StoryPhase[] = [
  {
    day: 0,
    titleZh: "报纸提前了一天",
    titleEn: "The paper ran a day early",
    bodyZh: "那篇访谈本该在周末见报。排版出了点岔子，它今天就在报摊上了。",
    bodyEn: "That interview was supposed to run at the weekend. A composing-room mix-up put it on the newsstands this morning.",
    pressure: 0.09,
  },
  {
    day: 0,
    titleZh: "邻国这次接了电话",
    titleEn: "The neighbour picked up this time",
    bodyZh: "同一个号码，上一次没人接。这一次对面的人在办公室，而且愿意一起入市。",
    bodyEn: "Same number; last time nobody answered. This time the person on the other end is at their desk, and willing to go into the market with you.",
    pressure: -0.11,
  },
  {
    day: 0,
    titleZh: "一个数字迟了两小时",
    titleEn: "A number is two hours late",
    bodyZh: "统计口径临时改了，数据推迟发布。市场自己把那两个小时填满了，填的全是最坏的猜测。",
    bodyEn: "A definition changed at the last minute and the release slipped. The market filled those two hours itself, entirely with the worst guess available.",
    pressure: 0.07,
  },
  {
    day: 0,
    titleZh: "结算所临时提了保证金",
    titleEn: "The clearing house raises margin overnight",
    bodyZh: "没有预告，隔夜生效。对手方今天要补钱——你也要。",
    bodyEn: "No notice, effective overnight. The other side has to find money today. So do you.",
    pressure: 0.06,
    equityShock: 0.035,
  },
  {
    day: 0,
    titleZh: "一笔大单没有出现",
    titleEn: "A large order never arrives",
    bodyZh: "一家机构本来今天要建仓，董事会拖了一周。盘口安静得反常。",
    bodyEn: "An institution meant to build a position today; its board pushed the decision by a week. The tape is unnaturally quiet.",
    pressure: -0.08,
  },
  {
    day: 0,
    titleZh: "一句话被录了下来",
    titleEn: "A sentence gets recorded",
    bodyZh: "电梯里的一句私下抱怨被一位记者听见了。它会出现在明天的第二版。",
    bodyEn: "A private complaint in a lift is overheard by a reporter. It will be in tomorrow's second edition.",
    pressure: 0.08,
    equityShock: 0.02,
  },
  {
    day: 0,
    titleZh: "有人在休息日把钱调了回来",
    titleEn: "Somebody moves money back over the weekend",
    bodyZh: "一家海外分行的头寸在没人注意的时候回了国。不多，但方向是对的。",
    bodyEn: "A position at a foreign branch comes home while nobody is watching. It is not large, and it is pointing the right way.",
    pressure: -0.07,
  },
  {
    day: 0,
    titleZh: "传闻多了一个名字",
    titleEn: "The rumour picks up a name",
    bodyZh: "同一条传闻，这次带上了一家具体机构的名字。带名字的传闻和不带名字的，是两种东西。",
    bodyEn: "The same rumour, this time with an institution's name attached. A rumour with a name in it is a different animal.",
    pressure: 0.1,
  },
];
