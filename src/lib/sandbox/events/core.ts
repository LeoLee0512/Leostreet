import { COUNTRY_ORDER, PROFILES } from "../countries.ts";
import { has, nameOf, pushNews, riskPremium } from "../sim.ts";
import { type EventDef, c, clamp, me, prof, sickNeighbour } from "./kit.ts";

/** The recurring events of central banking: runs, attacks, pressure, shocks. */
export const CORE_EVENTS: Record<string, EventDef> = {
  bankRun: {
    kind: "crisis",
    history: {
      zh: "史实原型：2007 年 9 月英国北岩银行挤兑，是英国一百四十多年来第一次大规模银行挤兑；1907 年美国大恐慌中，J.P. 摩根召集银行家联合出资救市。",
      en: "Real precedent: the September 2007 run on Northern Rock, Britain's first bank run in well over a century; in the US Panic of 1907, J.P. Morgan rallied bankers to fund a rescue.",
    },
    when: (g) => me(g).bank < 0.5,
    chance: (g) => (has(g, "depositInsurance") ? 0.5 : 1) * (has(g, "stressTests") ? 0.5 : 1),
    cooldown: 20,
    title: { zh: "银行门口排起了长队", en: "Queues outside the banks" },
    body: () => ({
      zh: "储户开始提现，银行间市场冻结。几家大银行的高管在你办公室外等着——他们要的是今晚就能到账的钱。",
      en: "Depositors are withdrawing and the interbank market has frozen. Bank chiefs are waiting outside your office; they need money that lands tonight.",
    }),
    choices: [
      c("lolr", "敞开放贷，惩罚利率", "Lend freely at a penalty rate", "银行健康 +0.3，泡沫稍增，公信力 −15", "Banks +0.3, a little moral hazard, −15 capital"),
      c("bailout", "政府注资救助", "Government bail-out", "银行健康 +0.45，国债 +6% GDP，民意下降", "Banks +0.45, debt +6% of GDP, approval falls"),
      c("fail", "让问题银行倒闭", "Let the weak banks fail", "短痛：需求骤降、失业上升；但市场看到纪律", "Short pain: demand drops, jobs go; markets see discipline"),
    ],
    onFire: (g) => {
      g.crises += 1;
    },
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "lolr") {
        const strong = has(g, "bagehot");
        m.bank += strong ? 0.4 : 0.3;
        m.bubble = clamp(m.bubble + (strong ? 0.02 : 0.06), 0, 1);
        g.points = Math.max(0, g.points - (strong ? 5 : 15));
        pushNews(g, { zh: "央行宣布：对有抵押品的银行敞开供应流动性。", en: "The central bank will lend without limit against good collateral." }, "good");
      } else if (choice === "bailout") {
        m.bank += 0.45;
        m.debt += 6;
        g.approval -= 8;
        m.trust -= 3;
        pushNews(g, { zh: "财政部注资银行业。纳税人买单。", en: "The Treasury recapitalises the banks. Taxpayers foot the bill." }, "info");
      } else {
        m.bank -= 0.1;
        m.demand -= 0.6;
        g.approval -= 12;
        m.trust += 4;
        pushNews(g, { zh: "三家银行倒闭。储户损失惨重，但幸存者更干净了。", en: "Three banks fail. Depositors lose heavily, but the survivors are cleaner." }, "bad");
      }
      m.bank = clamp(m.bank, 0.05, 1);
    },
  },

  currencyAttack: {
    kind: "crisis",
    history: {
      zh: "史实原型：1992 年 9 月 16 日「黑色星期三」，英镑在索罗斯等投机者的狙击下退出欧洲汇率机制；英格兰银行当天把利率从 10% 提到 12%，又宣布提到 15%（未实施），仍没能守住。",
      en: "Real precedent: 'Black Wednesday', 16 September 1992. Under attack from George Soros and others, sterling left the European Exchange Rate Mechanism; the Bank of England raised rates from 10% to 12% that day and announced 15% (never applied), and still could not hold.",
    },
    when: (g) => me(g).fxYoY < -20 || (riskPremium(g, g.player) > 1.6 && me(g).reserves < 6),
    chance: () => 0.3,
    cooldown: 26,
    title: { zh: "货币遭到狙击", en: "The currency is under attack" },
    body: (g) => ({
      zh: `${prof(g).currency.zh}一周内连跌，外汇市场上全是卖单。交易员在赌你守不住。`,
      en: `The ${prof(g).currency.en} has fallen all week and the market is full of sellers. Traders are betting you cannot hold.`,
    }),
    choices: [
      c("defend", "加息 2% 并动用储备", "Hike 2 points and spend reserves", "汇率 +5，储备 −3，经济承压", "Currency +5, reserves −3, the economy takes the strain"),
      c("float", "放手让它贬", "Let it fall", "汇率 −8，进口通胀上升", "Currency −8, imported inflation rises"),
      c("controls", "实施资本管制", "Impose capital controls", "资金出不去，信誉受损", "Money cannot leave; trust suffers"),
      c("swap", "动用国际互换额度", "Draw on swap lines", "储备 +8，汇率 +4", "Reserves +8, currency +4", "swapLines"),
    ],
    onFire: (g) => {
      g.crises += 1;
    },
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "defend") {
        m.rate += 2;
        m.reserves = Math.max(0, m.reserves - 3);
        m.fx += 5;
      } else if (choice === "float") {
        m.fx -= 8;
        m.trust += has(g, "floating") ? 2 : -5;
      } else if (choice === "controls") {
        g.capitalControls = true;
        m.trust -= 6;
      } else {
        m.reserves += 8;
        m.fx += 4;
        pushNews(g, { zh: "邻国央行开通互换额度。市场松了口气。", en: "Neighbouring central banks open swap lines. Markets exhale." }, "good");
      }
      m.trust = clamp(m.trust, 0, 100);
    },
  },

  govDemand: {
    kind: "crisis",
    history: {
      zh: "史实原型：1971–72 年，尼克松总统多次向美联储主席亚瑟·伯恩斯施压，要求大选前保持宽松；此后美国陷入 1970 年代的高通胀。",
      en: "Real precedent: in 1971–72 President Nixon repeatedly pressed Fed Chairman Arthur Burns to keep money easy before the election; the US went on to the high inflation of the 1970s.",
    },
    when: (g) => g.pressure >= 80 && !has(g, "independence"),
    chance: () => 0.25,
    cooldown: 20,
    title: { zh: "财政部长来电", en: "The Finance Minister calls" },
    body: () => ({
      zh: "「失业率这么高，你还在跟通胀较劲？下周之前降息半个点，不然内阁会重新考虑你的任命。」",
      en: "'With unemployment this high you are still fighting inflation? Cut half a point by next week, or cabinet will reconsider your appointment.'",
    }),
    choices: [
      c("comply", "照办，降息 0.5%", "Comply: cut half a point", "政府满意，市场看穿了你", "The government is pleased; markets see through you"),
      c("refuse", "公开拒绝", "Refuse in public", "消耗 40 公信力，信誉 +3", "Costs 40 capital, trust +3"),
      c("negotiate", "私下周旋", "Negotiate quietly", "压力稍降，信誉 −3，公信力 −10", "Pressure eases a little, trust −3, −10 capital"),
    ],
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "comply") {
        m.rate = Math.max(0, m.rate - 0.5);
        m.trust -= 8;
        g.pressure -= 25;
      } else if (choice === "refuse") {
        if (g.points >= 40) {
          g.points -= 40;
          g.pressure -= 10;
          m.trust += 3;
        } else {
          g.approval -= 10;
          g.pressure += 10;
          pushNews(g, { zh: "你拒绝了财政部，但你手里没有足够的政治资本。", en: "You refused the Treasury without the political capital to back it." }, "bad");
        }
      } else {
        g.pressure -= 15;
        m.trust -= 3;
        g.points = Math.max(0, g.points - 10);
      }
      m.trust = clamp(m.trust, 0, 100);
      g.pressure = clamp(g.pressure, 0, 100);
    },
  },

  oilShock: {
    kind: "history",
    history: {
      zh: "史实原型：1973 年 10 月阿拉伯石油禁运，几个月内油价约涨到原来的四倍；1979 年伊朗革命后又发生第二次石油危机。",
      en: "Real precedent: the October 1973 Arab oil embargo roughly quadrupled oil prices within months; a second oil shock followed the 1979 Iranian revolution.",
    },
    when: () => true,
    chance: () => 0.004,
    cooldown: 104,
    title: { zh: "油价一夜翻倍", en: "Oil prices double overnight" },
    body: () => ({
      zh: "产油区爆发冲突，油价翻倍。物价马上要涨，增长马上要掉——这是供给冲击，加息治不了油井。",
      en: "Conflict in the oil fields doubles the price. Prices will jump and growth will slow: a supply shock, and rate hikes do not drill wells.",
    }),
    choices: [
      c("look", "看穿冲击，按兵不动", "Look through it", "信誉高时预期稳住；信誉低时预期上窜", "Expectations hold if you are trusted, drift up if not"),
      c("hike", "加息 0.5%，先压通胀", "Hike half a point", "通胀更快回落，经济更疼", "Inflation falls faster; the economy hurts more"),
      c("cut", "降息 0.5%，先保增长", "Cut half a point", "增长托住，通胀预期上升", "Growth supported; inflation expectations rise"),
    ],
    onFire: (g) => {
      for (const id of COUNTRY_ORDER) {
        const m = g.countries[id];
        m.supply += 0.5;
        m.demand += PROFILES[id].commodity ? 0.35 : -0.2;
      }
    },
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "look") m.piE += m.trust > 60 ? 0 : 0.6;
      else if (choice === "hike") m.rate += 0.5;
      else {
        m.rate = Math.max(0, m.rate - 0.5);
        m.piE += 0.5;
      }
    },
  },

  housingBoom: {
    kind: "crisis",
    history: {
      zh: "史实原型：2000 年代中期的美国房地产泡沫，零首付与次级贷款泛滥，房价在 2006 年见顶后下跌，引爆 2007–08 年金融危机。",
      en: "Real precedent: the mid-2000s US housing bubble — zero-deposit and subprime lending everywhere; prices peaked in 2006 and their fall set off the 2007–08 financial crisis.",
    },
    when: (g) => me(g).bubble > 0.6,
    chance: () => 0.05,
    cooldown: 52,
    title: { zh: "房价一年涨了三成", en: "House prices up a third in a year" },
    body: () => ({
      zh: "排队买房的人绕了街区两圈，银行在放零首付贷款。每个人都觉得自己会变富。",
      en: "Buyers queue twice round the block and banks offer zero-deposit mortgages. Everyone feels rich.",
    }),
    choices: [
      c("hike", "加息 0.5%", "Hike half a point", "给全经济降温，包括不需要降温的部分", "Cools everything, including what did not need it"),
      c("cap", "启用信贷上限", "Switch on the credit cap", "精准给楼市降温", "Cools housing precisely", "macroprudential"),
      c("ignore", "这是繁荣，不是泡沫", "It's a boom, not a bubble", "民意 +3，泡沫继续长", "Approval +3; the froth keeps growing"),
    ],
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "hike") m.rate += 0.5;
      else if (choice === "cap") g.macroCap = true;
      else {
        g.approval += 3;
        m.bubble = clamp(m.bubble + 0.05, 0, 1);
      }
    },
  },

  deflation: {
    kind: "crisis",
    history: {
      zh: "史实原型：1990 年代资产泡沫破裂后的日本，物价长期下跌；日本银行 1999 年实行零利率，2001 年开始量化宽松。",
      en: "Real precedent: Japan after its asset bubble burst — years of falling prices; the Bank of Japan adopted zero rates in 1999 and quantitative easing in 2001.",
    },
    when: (g) => me(g).pi < 0.3,
    chance: () => 0.1,
    cooldown: 52,
    title: { zh: "物价开始下跌", en: "Prices start to fall" },
    body: () => ({
      zh: "商店在降价，消费者却更不买了——明天会更便宜。工资谈判陷入僵局，债务的实际负担在加重。",
      en: "Shops cut prices and shoppers buy less: it will be cheaper tomorrow. Wage talks stall and the real burden of debt grows.",
    }),
    choices: [
      c("cut", "降息 0.5%", "Cut half a point", "利率越接近零，这一招越没用", "The nearer zero, the weaker this gets"),
      c("qe", "启动量化宽松", "Start quantitative easing", "每年购债 4% GDP", "Buy bonds at 4% of GDP a year", "qeTools"),
      c("pledge", "承诺长期低利率", "Pledge rates stay low", "免费的鸽派前瞻指引", "A free dovish pledge", "guidance"),
      c("wait", "再观察一下", "Wait and see", "也许只是油价", "Maybe it is only oil"),
    ],
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "cut") m.rate = Math.max(0, m.rate - 0.5);
      else if (choice === "qe") m.qePace = 4;
      else if (choice === "pledge") g.guidance = { kind: "dovish", until: g.week + 26, rate: m.rate };
      else m.piE -= 0.2;
    },
  },

  fiscalSplurge: {
    kind: "random",
    history: {
      zh: "史实原型：1972 年英国「巴伯繁荣」，财政大臣巴伯大幅减税扩张，随后英国通胀在 1975 年升至 20% 以上。",
      en: "Real precedent: Britain's 1972 'Barber boom' — Chancellor Anthony Barber's tax-cutting expansion, after which UK inflation passed 20% in 1975.",
    },
    when: (g) => g.pressure > 55 || Math.floor(g.week / 52) % 4 === 3,
    chance: () => 0.008,
    cooldown: 104,
    title: { zh: "政府宣布大规模减税", en: "The government announces big tax cuts" },
    body: () => ({
      zh: "选举在即，内阁宣布减税加补贴，赤字将扩大 2.5% GDP。他们希望你别抵消掉这份「礼物」。",
      en: "With an election near, cabinet announces tax cuts and subsidies worth 2.5% of GDP. They hope you will not offset the 'gift'.",
    }),
    onFire: (g) => {
      me(g).deficit += 2.5;
    },
    choices: [
      c("accommodate", "配合，不动利率", "Accommodate", "增长更快，通胀预期 +0.3", "Faster growth, expectations +0.3"),
      c("warn", "公开警告通胀风险", "Warn about inflation in public", "信誉 +3，政府施压 +10", "Trust +3, government pressure +10"),
      c("monetize", "直接买下新发国债", "Buy the new bonds outright", "债务看起来轻了；信誉 −10，预期 +1", "Debt looks lighter; trust −10, expectations +1"),
    ],
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "accommodate") m.piE += 0.3;
      else if (choice === "warn") {
        m.trust = clamp(m.trust + 3, 0, 100);
        g.pressure = clamp(g.pressure + 10, 0, 100);
      } else {
        m.qe += 5;
        m.debt -= 5;
        m.piE += 1;
        m.trust = clamp(m.trust - 10, 0, 100);
      }
    },
  },

  foreignCrisis: {
    kind: "crisis",
    history: {
      zh: "史实原型：1997 年 7 月泰铢贬值，引发亚洲金融危机，几个月内传染到印尼、马来西亚和韩国。",
      en: "Real precedent: the July 1997 devaluation of the Thai baht set off the Asian financial crisis, spreading to Indonesia, Malaysia and South Korea within months.",
    },
    when: (g) => sickNeighbour(g) !== undefined,
    chance: () => 0.4,
    cooldown: 40,
    title: { zh: "邻国银行业告急", en: "A neighbour's banks are failing" },
    body: (g) => {
      const n = nameOf(sickNeighbour(g) ?? COUNTRY_ORDER.find((id) => id !== g.player)!);
      return {
        zh: `${n.zh}的银行正在倒下，恐慌顺着贸易和资本流向你这边。`,
        en: `Banks are falling in ${n.en}, and the panic is travelling your way through trade and capital flows.`,
      };
    },
    onFire: (g) => {
      me(g).demand -= 0.25;
    },
    choices: [
      c("swap", "向邻国提供互换额度", "Offer them swap lines", "储备 −3，危机止步，信誉 +5", "Reserves −3, the fire stops, trust +5", "swapLines"),
      c("ease", "预防性降息 0.25%", "Cut a quarter point as insurance", "托住需求", "Cushions demand"),
      c("hold", "隔岸观火", "Watch from across the water", "什么都不做", "Do nothing"),
    ],
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "swap") {
        m.reserves = Math.max(0, m.reserves - 3);
        const n = sickNeighbour(g);
        if (n) g.countries[n].bank += 0.25;
        m.trust = clamp(m.trust + 5, 0, 100);
      } else if (choice === "ease") m.rate = Math.max(0, m.rate - 0.25);
      else m.demand -= 0.15;
    },
  },

  election: {
    kind: "random",
    when: (g) => g.week % 208 === 170,
    chance: () => 1,
    cooldown: 100,
    title: { zh: "大选进入倒计时", en: "The election campaign begins" },
    body: () => ({
      zh: "两党都在承诺「便宜的贷款和更多的工作」。记者问你：大选前会不会降息？",
      en: "Both parties promise 'cheap loans and more jobs'. A reporter asks: will you cut before the vote?",
    }),
    choices: [
      c("silent", "「央行不评论选举。」", "'The bank does not comment on elections.'", "信誉 +2", "Trust +2"),
      c("hint", "暗示可能降息", "Hint at a cut", "政府施压 −20，预期 +0.3，信誉 −4", "Pressure −20, expectations +0.3, trust −4"),
      c("warn", "公开表示通胀优先", "Say inflation comes first", "信誉 +4，政府施压 +15", "Trust +4, pressure +15"),
    ],
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "silent") m.trust += 2;
      else if (choice === "hint") {
        g.pressure -= 20;
        m.piE += 0.3;
        m.trust -= 4;
      } else {
        m.trust += 4;
        g.pressure += 15;
      }
      m.trust = clamp(m.trust, 0, 100);
      g.pressure = clamp(g.pressure, 0, 100);
    },
  },

  techBoom: {
    kind: "history",
    history: {
      zh: "史实原型：1840 年代英国铁路狂热；1990 年代末的互联网泡沫——两次都是真技术、假估值。",
      en: "Real precedent: Britain's railway mania of the 1840s and the dot-com bubble of the late 1990s — real technology, unreal valuations, both times.",
    },
    when: () => true,
    chance: () => 0.003,
    cooldown: 156,
    title: { zh: "新技术点燃投资热潮", en: "A new technology sparks an investment boom" },
    body: () => ({
      zh: "电报与流水线正在改变工厂。生产率上升、物价承压下行——但股市已经开始讲「这次不一样」。",
      en: "New machines are remaking the factories. Productivity rises and prices ease, but the stock market has started saying 'this time is different'.",
    }),
    onFire: (g) => {
      const m = me(g);
      m.supply -= 0.3;
      m.demand += 0.2;
      m.bubble = clamp(m.bubble + 0.1, 0, 1);
    },
    choices: [
      c("welcome", "让繁荣跑一会儿", "Let the boom run", "增长更快，泡沫也更大", "Faster growth, bigger froth"),
      c("lean", "逆风加息 0.25%", "Lean against it: hike a quarter", "泡沫长得慢一些", "The froth grows more slowly"),
    ],
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "welcome") g.approval += 4;
      else {
        m.rate += 0.25;
        m.bubble = clamp(m.bubble - 0.08, 0, 1);
      }
    },
  },

  foreignHike: {
    kind: "history",
    history: {
      zh: "史实原型：1979–81 年美联储在沃尔克领导下大幅加息，美元走强、资本回流美国，拉丁美洲在 1982 年陷入债务危机。",
      en: "Real precedent: the Volcker Fed's steep hikes of 1979–81 strengthened the dollar and pulled capital home; Latin America fell into its debt crisis in 1982.",
    },
    when: () => true,
    chance: () => 0.004,
    cooldown: 104,
    title: { zh: "大卫国央行意外大幅加息", en: "A surprise jumbo hike abroad" },
    body: () => ({
      zh: "世界最大的金融中心一次加息 1.5 个点。热钱正在撤回去，你的汇率首当其冲。",
      en: "The world's financial centre hikes 1.5 points in one go. Hot money is heading home, and your currency is first in line.",
    }),
    onFire: (g) => {
      const big = g.player === "dawei" ? "lion" : "dawei";
      g.countries[big].rate += 1.5;
      if (g.player !== big) me(g).fx -= 3 * PROFILES[g.player].openness * 2;
    },
    choices: [
      c("follow", "跟随加息 0.5%", "Follow with half a point", "汇率稳住，经济承压", "The currency steadies; the economy takes strain"),
      c("absorb", "让汇率吸收冲击", "Let the currency absorb it", "进口通胀上升一点", "A little imported inflation"),
      c("sell", "动用储备干预", "Spend reserves to steady it", "储备 −2，汇率 +3", "Reserves −2, currency +3"),
    ],
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "follow") m.rate += 0.5;
      else if (choice === "sell") {
        if (m.reserves >= 2) {
          m.reserves -= 2;
          m.fx += 3;
        }
      }
    },
  },
};
