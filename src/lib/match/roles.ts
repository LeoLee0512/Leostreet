import type { RoleId } from "./types.ts";

/**
 * The five seats.
 *
 * The design rule behind every number here: **nobody can both know and act**.
 * The analyst is the only seat that sees model value and duration, and it is
 * also the most expensive seat to trade from. The trader crosses the spread for
 * almost nothing and is blind. That gap is the reason the two of them have to
 * talk, and talking is the game.
 *
 * It also answers the question the single-player build never had a good answer
 * to — "where does my edge come from in the first two minutes?" It comes from
 * your desk, not from staring at a random walk.
 */
export interface RoleSpec {
  id: RoleId;
  nameZh: string;
  nameEn: string;
  blurbZh: string;
  blurbEn: string;
  /** Multiplies the board's base slippage. Below 1 is cheap, above 1 is dear. */
  slippageMult: number;
  /** Sees fair value, duration sensitivity and realized vol. */
  seesModel: boolean;
  /** Ticks of warning before a pending shock lands. 0 is "same as everyone". */
  newsLeadTicks: number;
  /** Sees every teammate's exposure, not just their own. */
  seesTeamBook: boolean;
  /** May force-close a teammate's position. */
  canForceCut: boolean;
  /** May move the team's shared reserve between seats. */
  allocatesCapital: boolean;
}

export const ROLES: Record<RoleId, RoleSpec> = {
  analyst: {
    id: "analyst",
    nameZh: "分析师",
    nameEn: "Analyst",
    blurbZh: "只有你看得到模型价、久期和真实波动率。但你下单最贵——你负责知道，不负责开枪。",
    blurbEn: "Only you see fair value, duration and realized vol. You also pay the widest spread: you know, you do not shoot.",
    slippageMult: 1.6,
    seesModel: true,
    newsLeadTicks: 0,
    seesTeamBook: false,
    canForceCut: false,
    allocatesCapital: false,
  },
  trader: {
    id: "trader",
    nameZh: "交易员",
    nameEn: "Trader",
    blurbZh: "全队最低滑点，大单也吃得下。但你看不到模型价——你要听分析师的。",
    blurbEn: "The cheapest fills on the desk, size included. You cannot see fair value: you trade what the analyst calls.",
    slippageMult: 0.35,
    seesModel: false,
    newsLeadTicks: 0,
    seesTeamBook: false,
    canForceCut: false,
    allocatesCapital: false,
  },
  risk: {
    id: "risk",
    nameZh: "风控",
    nameEn: "Risk",
    blurbZh: "你看得到全队的总敞口和杠杆，并且可以强制砍掉任何一个队友的仓位。队伍不爆仓是你的活。",
    blurbEn: "You see the desk's whole book and its leverage, and you can cut any teammate's position. Not blowing up is your job.",
    slippageMult: 1,
    seesModel: false,
    newsLeadTicks: 0,
    seesTeamBook: true,
    canForceCut: true,
    allocatesCapital: false,
  },
  desk: {
    id: "desk",
    nameZh: "消息位",
    nameEn: "Desk",
    blurbZh: "消息比别人早两个 tick 到你手上。早两个 tick 就是全部。",
    blurbEn: "News reaches you two ticks before the tape. Two ticks is the whole edge.",
    slippageMult: 1.1,
    seesModel: false,
    newsLeadTicks: 2,
    seesTeamBook: false,
    canForceCut: false,
    allocatesCapital: false,
  },
  pm: {
    id: "pm",
    nameZh: "基金经理",
    nameEn: "PM",
    blurbZh: "你分配全队的储备金，也看得到每个人的仓位。你决定谁能开大。",
    blurbEn: "You allocate the desk's reserve and see everyone's book. You decide who gets size.",
    slippageMult: 1,
    seesModel: false,
    newsLeadTicks: 0,
    seesTeamBook: true,
    canForceCut: false,
    allocatesCapital: true,
  },
};

export const ROLE_IDS: RoleId[] = ["analyst", "trader", "risk", "desk", "pm"];

export function roleOf(id: RoleId): RoleSpec {
  return ROLES[id];
}
