import type { StoryId } from "./types.ts";

/**
 * The ladder.
 *
 * Ten grades, ten crises, cleared in order. Two things matter here and they
 * are easy to get backwards:
 *
 * 1. **The grade is not the order.** Grades may tie — sterling 1992 and Black
 *    Monday 1987 are the same weight of problem from opposite directions — so
 *    the unlock chain is its own field and the grade is a label on top of it.
 * 2. **The grade is a claim about how hard the scenario is to WIN**, not about
 *    how famous the crisis is or how much money was lost. 1907 is the gentlest
 *    entry in the game and it nearly took the American banking system with it.
 */

export interface Grade {
  /** 1..10. */
  level: number;
  nameZh: string;
  nameEn: string;
  /** What a scenario at this grade asks of you. */
  blurbZh: string;
  blurbEn: string;
  /** Badge colour. */
  tint: string;
}

export const GRADES: Grade[] = [
  {
    level: 1,
    nameZh: "简单",
    nameEn: "Simple",
    blurbZh: "工具是够用的。你要做的只是相信它，并且今天就用。",
    blurbEn: "The tools are enough. All you have to do is trust them, and use them today.",
    tint: "#2a7a55",
  },
  {
    level: 2,
    nameZh: "普通",
    nameEn: "Normal",
    blurbZh: "有一条明路，也有一个显眼的诱惑。赢的人是忍住的那个。",
    blurbEn: "There is a clear path and an obvious temptation. The winner is whoever resists.",
    tint: "#3f7f4f",
  },
  {
    level: 3,
    nameZh: "进阶",
    nameEn: "Advanced",
    blurbZh: "公告上的数字是错的。你得先算出真实的那个。",
    blurbEn: "The published number is wrong. You have to work out the real one first.",
    tint: "#6b7a2e",
  },
  {
    level: 4,
    nameZh: "难",
    nameEn: "Hard",
    blurbZh: "有一条正反馈回路在跑。你越晚动手，它转得越快。",
    blurbEn: "A feedback loop is already running. The later you move, the faster it spins.",
    tint: "#9a7420",
  },
  {
    level: 5,
    nameZh: "高难",
    nameEn: "Very hard",
    blurbZh: "牌都在你手上，可惜每一张都有代价，而且代价在别人身上。",
    blurbEn: "You hold every card. Each one has a price, and somebody else pays it.",
    tint: "#c07a1f",
  },
  {
    level: 6,
    nameZh: "极难",
    nameEn: "Extreme",
    blurbZh: "历史上这一关是输的。要赢，你得比当年的人更早做决定。",
    blurbEn: "History lost this one. To win it you have to decide earlier than they did.",
    tint: "#c45045",
  },
  {
    level: 7,
    nameZh: "噩梦",
    nameEn: "Nightmare",
    blurbZh: "你的对手不是某个人，是一个自己会加速的循环。",
    blurbEn: "Your opponent is not a person. It is a loop that accelerates itself.",
    tint: "#a83a4f",
  },
  {
    level: 8,
    nameZh: "地狱",
    nameEn: "Hell",
    blurbZh: "不止一条战线，而且它们互相拆台。守住一条，另一条就塌。",
    blurbEn: "More than one front, and they undermine each other. Hold one and the other falls.",
    tint: "#7d2f52",
  },
  {
    level: 9,
    nameZh: "深渊",
    nameEn: "Abyss",
    blurbZh: "没有一张牌是干净的，而且时钟从第一天就在走。",
    blurbEn: "No card is clean, and the clock has been running since day one.",
    tint: "#332a5e",
  },  {
    level: 10,
    nameZh: "炼狱",
    nameEn: "Inferno",
    blurbZh: "四年，几百个决定，没有一个是「决定性的那一天」。消息从六个方向同时压过来，而漏掉的那一通电话也是一种决定。",
    blurbEn: "Four years and several hundred decisions, not one of them a decisive day. The information comes from six directions at once, and the call you miss is a decision too.",
    tint: "#5c2a63",
  },

];

export function gradeOf(level: number): Grade {
  return GRADES.find((g) => g.level === level) ?? GRADES[0]!;
}

/**
 * The unlock chain, in order.
 *
 * Kept as its own list rather than derived from the grades, because ties would
 * make a sort ambiguous and the order a player walks the ladder in has to be
 * stable across releases — a save that has cleared five is a save that has
 * cleared these five.
 */
export const LADDER: StoryId[] = [
  "panic07",
  "southsea",
  "railway",
  "baht",
  "panic73",
  "crash29",
  "blackmon",
  "pound",
  "baring",
  "ltcm",
  "euro",
  "hkd",
  "lehman",
  "depression",
];

/* ------------------------------------------------------------------ */
/* Titles                                                              */
/* ------------------------------------------------------------------ */

export interface StoryTitle {
  id: string;
  /** Clears needed. */
  at: number;
  nameZh: string;
  nameEn: string;
  blurbZh: string;
  blurbEn: string;
}

/**
 * One title per two crises cleared. Five titles, and the ladder is longer
 * than ten now — the last one lands on the tenth clear, and the crises beyond
 * it pay out in history rather than in titles.
 */
export const TITLES: StoryTitle[] = [
  {
    id: "rookie",
    at: 2,
    nameZh: "入门",
    nameEn: "Initiate",
    blurbZh: "两场危机。你知道了挤兑和泡沫长什么样。",
    blurbEn: "Two crises in. You know what a run and a bubble look like.",
  },
  {
    id: "novice",
    at: 4,
    nameZh: "新手",
    nameEn: "Novice",
    blurbZh: "四场。你学会了先去查那个没人公布的数字。",
    blurbEn: "Four. You have learned to go looking for the number nobody published.",
  },
  {
    id: "skilled",
    at: 6,
    nameZh: "熟练",
    nameEn: "Practised",
    blurbZh: "六场。你能在回路加速之前认出它。",
    blurbEn: "Six. You can spot the loop before it accelerates.",
  },
  {
    id: "trader",
    at: 8,
    nameZh: "交易员",
    nameEn: "Trader",
    blurbZh: "八场。你开始在别人还在争论的时候就动手了。",
    blurbEn: "Eight. You move while everyone else is still arguing.",
  },
  {
    id: "prodigy",
    at: 10,
    nameZh: "天才交易员",
    nameEn: "Prodigy",
    blurbZh: "十场。十九世纪的挤兑、泡沫和名单你全见过了——后面还有更长的冬天。",
    blurbEn: "Ten. The runs, the bubbles and the lists of the nineteenth century are all behind you — the long winter still lies ahead.",
  },
];

/** Titles earned at this many clears. */
export function titlesFor(cleared: number): StoryTitle[] {
  return TITLES.filter((tt) => cleared >= tt.at);
}

/** The next title and how many more clears it needs, or null at the top. */
export function nextTitle(cleared: number): { title: StoryTitle; need: number } | null {
  const next = TITLES.find((tt) => tt.at > cleared);
  return next ? { title: next, need: next.at - cleared } : null;
}

/**
 * Whether a scenario is open.
 *
 * The first is always open; after that you need the one before it on the
 * ladder. Deliberately checked against the ladder rather than against a count,
 * so a player who somehow clears a later stage cannot skip the one before it.
 */
export function isUnlocked(id: StoryId, cleared: readonly string[]): boolean {
  if (cleared.includes(id)) return true;
  const i = LADDER.indexOf(id);
  if (i <= 0) return true;
  return cleared.includes(LADDER[i - 1]!);
}

/** The next stage the player has not cleared, for the lobby's "continue" line. */
export function nextStage(cleared: readonly string[]): StoryId | null {
  return LADDER.find((id) => !cleared.includes(id)) ?? null;
}
