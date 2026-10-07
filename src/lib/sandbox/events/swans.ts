import { COUNTRY_ORDER } from "../countries.ts";
import { has } from "../sim.ts";
import { type EventDef, always, c, clamp, me, sway } from "./kit.ts";

/**
 * Black swans: each well under one-in-a-thousand a week (roughly one of them
 * in an average ten-year term), and each one reshapes the board.
 */
export const SWAN_CHANCE = 0.0003;
const swan = () => SWAN_CHANCE;

export const SWAN_EVENTS: Record<string, EventDef> = {
  solarStorm: {
    kind: "swan",
    when: always,
    chance: swan,
    cooldown: 9999,
    title: { zh: "太阳风暴烧断了电报网", en: "A solar storm burns out the telegraph" },
    body: () => ({
      zh: "夜空亮如白昼，电报线冒出火花。全国的清算系统停摆，银行不知道彼此还欠多少钱。",
      en: "The night sky glows like noon and the telegraph wires spark. National clearing has stopped; banks no longer know what they owe one another.",
    }),
    history: {
      zh: "史实原型：1859 年 9 月的「卡林顿事件」，有记录以来最强的地磁暴之一，欧洲和北美的电报系统大面积失灵，有的电报员被电击。",
      en: "Real precedent: the Carrington Event of September 1859, one of the strongest geomagnetic storms on record; telegraph systems across Europe and North America failed and some operators received shocks.",
    },
    onFire: (g) => {
      const m = me(g);
      m.bank -= 0.15;
      m.demand -= 0.5;
    },
    choices: [
      c("lend", "无限量供应流动性，直到系统恢复", "Unlimited liquidity until the system is back", "银行 +0.15，公信力 −15", "Banks +0.15, −15 capital"),
      c("holiday", "宣布银行假日", "Declare a bank holiday", "银行 +0.1，民意 −5", "Banks +0.1, approval −5"),
    ],
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "lend") {
        m.bank += 0.15;
        sway(g, { points: -15 });
      } else {
        m.bank += 0.1;
        sway(g, { approval: -5 });
      }
      m.bank = clamp(m.bank, 0.05, 1);
    },
  },

  pandemic: {
    kind: "swan",
    when: always,
    chance: swan,
    cooldown: 9999,
    title: { zh: "世纪大流行", en: "The pandemic of the century" },
    body: () => ({
      zh: "一种新的热病在各国港口同时出现。城市封闭、工厂停工，世界经济一个季度掉进了深渊。",
      en: "A new fever appears in every port at once. Cities lock down and factories stop; the world economy falls off a cliff within a quarter.",
    }),
    history: {
      zh: "史实原型：1918 年大流感；以及 2020 年新冠疫情——各国央行在几周之内把利率降到零附近，并开始大规模购债。",
      en: "Real precedent: the 1918 influenza; and the 2020 COVID-19 pandemic, when central banks cut rates to near zero within weeks and began buying bonds at scale.",
    },
    onFire: (g) => {
      for (const id of COUNTRY_ORDER) {
        g.countries[id].demand -= 2.2;
        g.countries[id].supply += 0.5;
      }
    },
    choices: [
      c("allIn", "利率降到零并大规模购债", "Cut to zero and buy bonds at scale", "需要 QE 工具；最快的复苏", "Needs the QE toolkit; the fastest recovery", "qeTools"),
      c("cut", "降息 2%", "Cut 2 points", "有帮助，但不够", "Helps, but not enough"),
      c("hold", "这是卫生问题，不是货币问题", "This is a health problem, not a monetary one", "民意 −10", "Approval −10"),
    ],
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "allIn") {
        m.rate = 0;
        m.qePace = 5;
        m.demand += 0.8;
      } else if (choice === "cut") m.rate = Math.max(0, m.rate - 2);
      else sway(g, { approval: -10 });
    },
  },

  megaQuake: {
    kind: "swan",
    when: always,
    chance: swan,
    cooldown: 9999,
    title: { zh: "首都大地震", en: "The great earthquake" },
    body: () => ({
      zh: "中午时分，首都和最大的港口在一分钟内化为瓦砾，随后的大火烧了三天。一半的银行档案没了。",
      en: "At noon the capital and the main port are reduced to rubble in a minute; the fires burn for three days. Half the banks' records are gone.",
    }),
    history: {
      zh: "史实原型：1923 年 9 月 1 日日本关东大地震，东京和横滨大部被毁；日本政府随后发行的「震灾票据」成了此后数年银行坏账的源头。",
      en: "Real precedent: the Great Kantō earthquake of 1 September 1923, which destroyed most of Tokyo and Yokohama; the 'earthquake bills' issued afterwards became a source of bad bank debts for years.",
    },
    onFire: (g) => {
      const m = me(g);
      m.demand -= 0.8;
      m.supply += 0.8;
      m.bank -= 0.1;
      m.deficit += 3;
    },
    choices: [
      c("rediscount", "央行贴现「震灾票据」", "Rediscount the 'earthquake bills'", "银行 +0.15，泡沫与坏账隐患", "Banks +0.15, with hidden bad debts"),
      c("rebuild", "配合重建，降息 1%", "Support rebuilding: cut 1 point", "需求恢复，通胀上行", "Demand recovers, inflation rises"),
    ],
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "rediscount") {
        m.bank = clamp(m.bank + 0.15, 0.05, 1);
        m.bubble = clamp(m.bubble + 0.08, 0, 1);
      } else m.rate = Math.max(0, m.rate - 1);
    },
  },

  warClouds: {
    kind: "swan",
    when: always,
    chance: swan,
    cooldown: 9999,
    title: { zh: "大战阴云", en: "The clouds of war" },
    body: () => ({
      zh: "两个邻国在边境集结了军队。国会通过了巨额军费，财政部长说：「战争要钱，钱要你印。」",
      en: "Two neighbours mass troops on the border. Parliament votes vast war credits, and the Finance Minister says: 'War needs money, and money needs you.'",
    }),
    history: {
      zh: "史实原型：1914 年第一次世界大战爆发，各交战国暂停金本位，主要靠印钞和战争公债为战争融资，战后多国通胀失控。",
      en: "Real precedent: on the outbreak of war in 1914 the belligerents suspended the gold standard and financed the fighting largely with printed money and war bonds; inflation ran out of control in several countries afterwards.",
    },
    onFire: (g) => {
      const m = me(g);
      m.deficit += 5;
      m.supply += 0.5;
      m.fx -= 5;
      sway(g, { pressure: 20 });
    },
    choices: [
      c("finance", "央行认购战争公债", "Buy the war bonds", "QE +10，预期 +2，民意 +10", "QE +10, expectations +2, approval +10"),
      c("refuse", "拒绝为战争印钞", "Refuse to print for war", "政府施压 +30，信誉 +8", "Pressure +30, trust +8"),
      c("half", "只认购一半，同时加息", "Buy half, and raise rates", "QE +5，加息 1%", "QE +5, hike 1 point"),
    ],
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "finance") {
        m.qe += 10;
        m.piE += 2;
        sway(g, { approval: 10, trust: -6 });
      } else if (choice === "refuse") sway(g, { pressure: 30, trust: 8 });
      else {
        m.qe += 5;
        m.rate += 1;
      }
    },
  },

  volcanicWinter: {
    kind: "swan",
    when: always,
    chance: swan,
    cooldown: 9999,
    title: { zh: "没有夏天的一年", en: "The year without a summer" },
    body: () => ({
      zh: "南方海上的一座火山把半个天空染成了灰色。六月下雪，庄稼烂在地里，粮价翻倍。",
      en: "A volcano in the southern sea has turned half the sky grey. It snows in June, crops rot in the fields and grain prices double.",
    }),
    history: {
      zh: "史实原型：1815 年印度尼西亚坦博拉火山爆发，1816 年欧洲和北美成了「没有夏天的一年」，粮食歉收、粮价飞涨。",
      en: "Real precedent: the 1815 eruption of Mount Tambora in Indonesia made 1816 'the year without a summer' in Europe and North America, with failed harvests and soaring grain prices.",
    },
    onFire: (g) => {
      for (const id of COUNTRY_ORDER) {
        g.countries[id].supply += 1;
        g.countries[id].demand -= 0.5;
      }
    },
    choices: [
      c("look", "看穿供给冲击", "Look through the supply shock", "信誉高时预期稳住", "Expectations hold if you are trusted"),
      c("hike", "加息 1% 防止预期失控", "Hike 1 point to hold expectations", "通胀更快回落，经济更疼", "Inflation falls faster; the economy hurts more"),
    ],
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "look") m.piE += has(g, "targeting") || m.trust > 65 ? 0 : 1;
      else m.rate += 1;
    },
  },
};
