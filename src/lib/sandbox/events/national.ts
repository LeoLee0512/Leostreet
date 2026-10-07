import { type EventDef, always, c, clamp, me, sway } from "./kit.ts";

/** One or two events per country: the trouble that comes with that particular job. */
export const NATIONAL_EVENTS: Record<string, EventDef> = {
  lionTreasury: {
    kind: "national",
    only: ["lion"],
    when: always,
    chance: () => 0.004,
    cooldown: 156,
    title: { zh: "狮子国财政部换帅", en: "A new Treasury chief in the Lion Kingdom" },
    body: () => ({
      zh: "新任财政大臣第一次讲话就说「央行太保守了」，他要的是五年翻一番的增长。",
      en: "The new Chancellor's first speech calls the central bank 'too timid'; he wants growth that doubles the economy in five years.",
    }),
    onFire: (g) => sway(g, { pressure: 15 }),
    choices: [
      c("meet", "请他来央行吃顿午饭", "Invite him to lunch at the bank", "政府施压 −10，公信力 −10", "Pressure −10, −10 capital"),
      c("speech", "发表演讲，阐述通胀的代价", "Give a speech on the cost of inflation", "信誉 +3，施压 +5", "Trust +3, pressure +5"),
    ],
    resolve: (g, choice) => {
      if (choice === "meet") sway(g, { pressure: -10, points: -10 });
      else sway(g, { trust: 3, pressure: 5 });
    },
  },

  daweiRigging: {
    kind: "national",
    only: ["dawei"],
    when: always,
    chance: () => 0.004,
    cooldown: 208,
    title: { zh: "金融城利率操纵丑闻", en: "The City rate-rigging scandal" },
    body: () => ({
      zh: "交易员的聊天记录曝光：几家大银行多年来联手报假利率，整个市场的贷款都按这个数字定价。",
      en: "Traders' chat logs leak: for years several big banks colluded to submit false rates, and every loan in the market is priced off that number.",
    }),
    history: {
      zh: "史实原型：2012 年曝光的伦敦银行同业拆借利率（LIBOR）操纵案，巴克莱等多家银行被处以巨额罚款，LIBOR 最终在 2020 年代初停用。",
      en: "Real precedent: the LIBOR rigging scandal exposed in 2012; Barclays and other banks paid huge fines, and LIBOR was retired in the early 2020s.",
    },
    onFire: (g) => {
      me(g).bank = clamp(me(g).bank - 0.08, 0.05, 1);
      sway(g, { trust: -4 });
    },
    choices: [
      c("reform", "推动基准利率改革（公信力 −30）", "Push a benchmark reform (−30 capital)", "信誉 +7", "Trust +7"),
      c("fine", "罚款了事", "Fine them and move on", "民意 −3", "Approval −3"),
    ],
    resolve: (g, choice) => {
      if (choice === "reform") sway(g, { points: -30, trust: 7 });
      else sway(g, { approval: -3 });
    },
  },

  nordlanOilBust: {
    kind: "national",
    only: ["nordlan"],
    when: always,
    chance: () => 0.004,
    cooldown: 156,
    title: { zh: "油价腰斩", en: "Oil prices halve" },
    body: () => ({
      zh: "世界油价半年跌掉一半。北境海上的钻井平台停工，克朗跟着往下掉，出口收入一夜蒸发。",
      en: "World oil prices halve in six months. The northern rigs shut down, the krone falls with them, and export income evaporates.",
    }),
    history: {
      zh: "史实原型：2014–15 年国际油价腰斩，挪威克朗大幅贬值，挪威央行在 2015 年两次降息应对。",
      en: "Real precedent: the 2014–15 oil price collapse; the Norwegian krone fell sharply and Norges Bank cut rates twice in 2015.",
    },
    onFire: (g) => {
      const m = me(g);
      m.demand -= 0.8;
      m.fx -= 6;
    },
    choices: [
      c("cut", "降息 0.5%，让克朗替经济减压", "Cut half a point and let the krone cushion it", "进口通胀上升，就业更稳", "Some imported inflation; jobs hold better"),
      c("fund", "动用石油基金托底（储备 −3）", "Tap the oil fund (reserves −3)", "需求 +0.4", "Demand +0.4"),
      c("defend", "托住汇率", "Defend the currency", "储备 −2，汇率 +3", "Reserves −2, currency +3"),
    ],
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "cut") m.rate = Math.max(0, m.rate - 0.5);
      else if (choice === "fund") {
        m.reserves = Math.max(0, m.reserves - 3);
        m.demand += 0.4;
      } else {
        m.reserves = Math.max(0, m.reserves - 2);
        m.fx += 3;
      }
    },
  },

  sereinHurricane: {
    kind: "national",
    only: ["serein"],
    when: always,
    chance: () => 0.005,
    cooldown: 104,
    title: { zh: "飓风季重创旅游业", en: "A hurricane season wrecks tourism" },
    body: () => ({
      zh: "三场飓风接连登陆，海滨酒店一半停业。游客取消了整个冬季的预订，外汇收入断了。",
      en: "Three hurricanes make landfall in a row and half the seaside hotels close. Tourists cancel the whole winter; foreign earnings stop.",
    }),
    onFire: (g) => {
      const m = me(g);
      m.demand -= 0.6;
      m.deficit += 1.5;
      m.fx -= 3;
    },
    choices: [
      c("ease", "降息 0.5%", "Cut half a point", "托住内需，汇率承压", "Supports demand, weighs on the currency"),
      c("hold", "守住汇率，不动利率", "Hold the currency and rates", "储备 −1", "Reserves −1"),
    ],
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "ease") m.rate = Math.max(0, m.rate - 0.5);
      else m.reserves = Math.max(0, m.reserves - 1);
    },
  },

  ramonaIndexation: {
    kind: "national",
    only: ["ramona"],
    when: (g) => me(g).pi > 5,
    chance: () => 0.006,
    cooldown: 156,
    title: { zh: "工资指数化法案", en: "The wage indexation bill" },
    body: () => ({
      zh: "国会要通过一项法案：所有工资和合同按上个月的物价自动上调。工会欢呼——但这会把今天的通胀永远刻进明天。",
      en: "Congress wants every wage and contract to rise automatically with last month's prices. The unions cheer — but it would carve today's inflation into tomorrow.",
    }),
    history: {
      zh: "史实原型：1980 年代巴西、阿根廷普遍实行工资与物价指数化，通胀惯性极强、多次稳定计划失败，直到 1994 年巴西推出「雷亚尔计划」才被打破。",
      en: "Real precedent: widespread wage and price indexation in 1980s Brazil and Argentina made inflation self-perpetuating and defeated plan after plan, until Brazil's Real Plan of 1994.",
    },
    choices: [
      c("oppose", "公开反对（施压 +15）", "Oppose it in public (pressure +15)", "法案搁浅，信誉 +5", "The bill stalls; trust +5"),
      c("accept", "接受", "Accept it", "预期 +1.5", "Expectations +1.5"),
    ],
    resolve: (g, choice) => {
      if (choice === "oppose") sway(g, { pressure: 15, trust: 5 });
      else me(g).piE += 1.5;
    },
  },

  veldenSecession: {
    kind: "national",
    only: ["velden"],
    when: always,
    chance: () => 0.004,
    cooldown: 208,
    title: { zh: "成员州要求退出邦联", en: "A member state demands to leave the League" },
    body: () => ({
      zh: "最富的成员州举行公投，要求退出邦联、发行自己的货币。外国投资者开始抛售维岚盾资产。",
      en: "The richest member state votes to leave the League and issue its own money. Foreign investors start selling guilder assets.",
    }),
    onFire: (g) => {
      me(g).fx -= 4;
      sway(g, { trust: -6 });
    },
    choices: [
      c("reassure", "发表团结声明（公信力 −20）", "Issue a statement of unity (−20 capital)", "信誉 +6", "Trust +6"),
      c("swap", "开放对成员州银行的流动性", "Open liquidity to the state's banks", "银行稳住，储备 −2", "Banks steady, reserves −2"),
    ],
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "reassure") sway(g, { points: -20, trust: 6 });
      else {
        m.reserves = Math.max(0, m.reserves - 2);
        m.bank = clamp(m.bank + 0.05, 0.05, 1);
      }
    },
  },
};
