import { COUNTRY_ORDER } from "../countries.ts";
import { has, nextRandom, pushNews, riskPremium } from "../sim.ts";
import { type EventDef, always, c, clamp, me, prof, sway } from "./kit.ts";

/**
 * Events modelled on real episodes. The playable side stays fictional (the
 * "Northwind fund", "blue iris bulbs"); the real names live only in `history`.
 */
export const HISTORY_EVENTS: Record<string, EventDef> = {
  volckerMoment: {
    kind: "history",
    when: (g) => me(g).pi > prof(g).piStar + 6,
    chance: () => 0.2,
    cooldown: 104,
    title: { zh: "通胀成了脱缰野马", en: "Inflation has bolted" },
    body: () => ({
      zh: "工会按两位数通胀谈工资，商店每周换一次价签。有人说只剩一个办法：把利率提到让人喘不过气，直到所有人相信你是认真的。",
      en: "Unions bargain for double-digit inflation and shops reprice every week. Some say only one cure remains: rates high enough to hurt, until everyone believes you mean it.",
    }),
    history: {
      zh: "史实原型：1979 年 10 月，保罗·沃尔克领导的美联储转向严控货币，联邦基金利率一度接近 20%；美国通胀从 1980 年的约 13.5% 降到 1983 年的约 3%，代价是两次衰退。",
      en: "Real precedent: in October 1979 the Fed under Paul Volcker clamped down on money; the federal funds rate neared 20% and US inflation fell from about 13.5% in 1980 to about 3% in 1983, at the cost of two recessions.",
    },
    choices: [
      c("shock", "休克疗法：一次加息 4%", "Shock therapy: hike 4 points at once", "衰退几乎确定；信誉 +10，预期开始回落", "A recession is all but certain; trust +10, expectations start to fall"),
      c("gradual", "循序渐进：加息 1%", "Gradualism: hike 1 point", "疼得少，好得也慢", "Less pain, slower cure"),
      c("accommodate", "和通胀共处", "Learn to live with it", "政府满意；预期 +1，信誉 −8", "The government is pleased; expectations +1, trust −8"),
    ],
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "shock") {
        m.rate += 4;
        m.demand -= 0.8;
        m.piE -= 1;
        sway(g, { trust: 10, approval: -15, pressure: 20 });
      } else if (choice === "gradual") m.rate += 1;
      else {
        m.piE += 1;
        sway(g, { trust: -8, pressure: -15 });
      }
    },
  },

  whateverItTakes: {
    kind: "history",
    when: (g) => me(g).debt > 105 && riskPremium(g, g.player) > 1,
    chance: () => 0.12,
    cooldown: 78,
    title: { zh: "国债收益率飙升", en: "Bond yields are spiking" },
    body: () => ({
      zh: "外国基金在抛你的国债，十年期收益率一周跳了一个半点。市场在问：如果没人接盘，央行会不会站出来？",
      en: "Foreign funds are dumping your bonds; ten-year yields jumped 1.5 points in a week. Markets are asking: if no one else buys, will the central bank?",
    }),
    history: {
      zh: "史实原型：2012 年 7 月 26 日，欧洲央行行长德拉吉在伦敦说出「不惜一切代价」保卫欧元，意大利、西班牙国债收益率随即大幅回落——而欧央行为此设计的直接购债计划（OMT）从未真正启用。",
      en: "Real precedent: on 26 July 2012 ECB President Mario Draghi said in London he would do 'whatever it takes' to save the euro; Italian and Spanish yields fell sharply — and the bond-buying programme built for it (OMT) was never actually used.",
    },
    choices: [
      c("pledge", "「不惜一切代价」", "'Whatever it takes'", "信誉够高时，一句话就够；不够时没人信", "If you are trusted, the words are enough; if not, nobody listens"),
      c("buy", "直接大规模购债", "Buy bonds outright, at scale", "收益率回落；QE +6% GDP，预期 +0.4", "Yields fall; QE +6% of GDP, expectations +0.4"),
      c("stay", "这是财政问题，央行不管", "This is fiscal; the bank stays out", "需求下滑，政府施压 +15", "Demand slides; government pressure +15"),
    ],
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "pledge") {
        if (m.trust >= 55) sway(g, { trust: 10 });
        else {
          sway(g, { trust: -6 });
          m.demand -= 0.3;
          pushNews(g, { zh: "市场不信这句话。收益率继续上行。", en: "Markets do not believe it. Yields keep rising." }, "bad");
        }
      } else if (choice === "buy") {
        m.qe += 6;
        m.piE += 0.4;
        sway(g, { trust: 2 });
      } else {
        m.demand -= 0.5;
        sway(g, { pressure: 15 });
      }
    },
  },

  plazaAccord: {
    kind: "history",
    when: (g) => me(g).fx > 112,
    chance: () => 0.08,
    cooldown: 156,
    title: { zh: "邻国要求你的货币升值", en: "Neighbours demand a stronger currency from you" },
    body: () => ({
      zh: "你的出口商抢走了邻国的订单。各国财长在灯湾大饭店开会，要你同意联合干预、让本币升值——否则就加关税。",
      en: "Your exporters are winning everyone's orders. Finance ministers meet at the Lampbay Grand Hotel: agree to a joint push for a stronger currency, or face tariffs.",
    }),
    history: {
      zh: "史实原型：1985 年 9 月的广场协议，五国联合干预使美元贬值；日元两年内大幅升值，日本随后以低利率对冲，助长了 1980 年代末的资产泡沫。",
      en: "Real precedent: the Plaza Accord of September 1985, a five-nation push to weaken the dollar; the yen soared over two years, and Japan's offsetting low rates fed its late-1980s asset bubble.",
    },
    choices: [
      c("agree", "签字", "Sign", "汇率 −8 换来和平；国内会想用宽松对冲", "Currency −8 in exchange for peace; the temptation will be to offset with easy money"),
      c("refuse", "拒绝", "Refuse", "关税来了：出口需求下降", "Tariffs come: export demand falls"),
    ],
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "agree") {
        m.fx -= 8;
        m.bubble = clamp(m.bubble + 0.06, 0, 1);
        sway(g, { pressure: -5 });
      } else {
        m.demand -= 0.4;
        sway(g, { trust: 2 });
      }
    },
  },

  hedgeFundCollapse: {
    kind: "history",
    when: (g) => me(g).bubble > 0.4,
    chance: () => 0.006,
    cooldown: 156,
    title: { zh: "恒远资本爆仓", en: "Hengyuan Capital blows up" },
    body: () => ({
      zh: "那家号称「永不亏损」的对冲基金一个月亏掉九成。它欠着全国每一家大银行的钱，交易对手都在等你开口。",
      en: "The hedge fund that 'never loses' has lost nine-tenths in a month. It owes every big bank in the country, and they are all waiting for you to speak.",
    }),
    history: {
      zh: "史实原型：1998 年 9 月，长期资本管理公司（LTCM）巨亏，纽约联储出面组织 14 家机构出资约 36 亿美元接管；美联储随后连续三次降息。",
      en: "Real precedent: in September 1998 Long-Term Capital Management collapsed; the New York Fed brokered a $3.6 billion takeover by 14 institutions, and the Fed then cut rates three times.",
    },
    choices: [
      c("broker", "关起门来让银行们自己出钱", "Lock the bankers in a room until they pay", "公信力 −20；银行小伤，信誉 +3", "−20 capital; banks take a small hit, trust +3"),
      c("cut", "降息 0.5% 稳住市场", "Cut half a point to calm markets", "市场松口气，泡沫也松口气", "Markets relax — and so does the froth"),
      c("fail", "让它倒", "Let it fail", "银行受重伤，股市大跌", "Banks badly hurt, stocks tumble"),
    ],
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "broker") {
        m.bank -= 0.05;
        sway(g, { points: -20, trust: 3 });
      } else if (choice === "cut") {
        m.rate = Math.max(0, m.rate - 0.5);
        m.bubble = clamp(m.bubble + 0.06, 0, 1);
      } else {
        m.bank -= 0.2;
        m.equity *= 0.85;
        g.crises += 1;
      }
      m.bank = clamp(m.bank, 0.05, 1);
    },
  },

  investmentBankWeekend: {
    kind: "history",
    when: (g) => me(g).bank < 0.62 && g.crises >= 1,
    chance: () => 0.1,
    cooldown: 156,
    title: { zh: "第三家投行的周末", en: "The weekend of the third investment bank" },
    body: () => ({
      zh: "星期五收盘后，全国第三大投行的回购融资断了。周一亚洲开盘前必须有答案：救、找买家，还是让它倒？",
      en: "After Friday's close the third-largest investment bank lost its repo funding. You need an answer before Asia opens on Monday: rescue, find a buyer, or let it go?",
    }),
    history: {
      zh: "史实原型：2008 年 9 月 15 日雷曼兄弟破产，美国政府拒绝出资救助，全球信贷市场随即冻结；两天后美联储向 AIG 提供了 850 亿美元贷款。",
      en: "Real precedent: Lehman Brothers failed on 15 September 2008 after the US government refused to fund a rescue; credit markets froze worldwide, and two days later the Fed lent AIG $85 billion.",
    },
    choices: [
      c("buyer", "撮合收购（公信力 −40）", "Broker a takeover (−40 capital)", "如果你有足够的政治资本，这是最干净的出路", "With enough political capital, the cleanest way out"),
      c("rescue", "公共资金救助", "Rescue it with public money", "银行稳住；国债 +8，民意 −10，道德风险", "Banks steady; debt +8, approval −10, moral hazard"),
      c("fail", "让它倒——市场需要纪律", "Let it fail: markets need discipline", "金融恐慌，需求骤降", "Financial panic; demand collapses"),
    ],
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "buyer" && g.points >= 40) {
        g.points -= 40;
        m.bank += 0.2;
      } else if (choice === "rescue" || choice === "buyer") {
        if (choice === "buyer") pushNews(g, { zh: "没人愿意接盘——你的政治资本不够。最后只能动用公共资金。", en: "No buyer would come — you lacked the political capital. Public money it is." }, "bad");
        m.bank += 0.35;
        m.debt += 8;
        m.bubble = clamp(m.bubble + 0.05, 0, 1);
        sway(g, { approval: -10 });
      } else {
        m.bank -= 0.25;
        m.demand -= 1.4;
        m.equity *= 0.75;
        g.crises += 1;
        sway(g, { approval: -12 });
      }
      m.bank = clamp(m.bank, 0.05, 1);
    },
  },

  currencyReform: {
    kind: "history",
    when: (g) => me(g).pi > 22,
    chance: () => 0.4,
    cooldown: 52,
    title: { zh: "印钞厂日夜不停", en: "The presses run day and night" },
    body: () => ({
      zh: "工人领了工资就往商店跑，晚一个小时价格就变了。有人递来一份方案：发行新货币，一万旧币换一新币，发行总量写进法律。",
      en: "Workers run to the shops with their wages before prices change by the hour. Someone hands you a plan: a new currency, ten thousand old for one new, with the total issue fixed in law.",
    }),
    history: {
      zh: "史实原型：1923 年德国恶性通胀，物价每几天翻一番；同年 11 月发行地租马克（Rentenmark），1 万亿旧马克兑 1 地租马克并严格限量，通胀迅速止住。",
      en: "Real precedent: Germany's hyperinflation of 1923, when prices doubled every few days; in November the Rentenmark was issued at one per trillion old marks with a strict cap, and the inflation stopped almost at once.",
    },
    choices: [
      c("reform", "发行新货币，总量入法", "Issue a new currency, capped by law", "预期重置；利率 +3，信誉 +20，民意 −5", "Expectations reset; rates +3, trust +20, approval −5"),
      c("print", "继续印——工资总得发", "Keep printing: wages must be paid", "预期 +3", "Expectations +3"),
    ],
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "reform") {
        m.piE = prof(g).piStar + 3;
        m.pi = Math.min(m.pi, 12);
        m.rate += 3;
        sway(g, { trust: 20, approval: -5 });
      } else m.piE += 3;
    },
  },

  goldSuspension: {
    kind: "history",
    // The suspending country is Dawei, so a Dawei governor never receives this news.
    when: (g) => g.player !== "dawei",
    chance: () => 0.0015,
    cooldown: 400,
    title: { zh: "大卫国宣布停止兑换黄金", en: "Dawei suspends gold convertibility" },
    body: () => ({
      zh: "世界储备货币一夜之间不再能换成黄金。各国汇率开始自由摇摆，你得决定：跟着浮动，还是想办法钉住？",
      en: "Overnight the world's reserve currency can no longer be exchanged for gold. Exchange rates everywhere start to swing; float with them, or try to hold a peg?",
    }),
    history: {
      zh: "史实原型：1971 年 8 月 15 日，尼克松宣布暂停美元兑换黄金，布雷顿森林体系走向终结；1973 年起主要货币转向浮动汇率。",
      en: "Real precedent: on 15 August 1971 President Nixon suspended the dollar's convertibility into gold, ending the Bretton Woods system; the major currencies floated from 1973.",
    },
    onFire: (g) => {
      for (const id of COUNTRY_ORDER) g.countries[id].fx += (nextRandom(g) - 0.5) * 10;
    },
    choices: [
      c("float", "顺势浮动", "Float with the rest", "短期颠簸；有「自由浮动」国策时信誉 +4", "A bumpy start; trust +4 if you have the free float"),
      c("peg", "钉住一篮子货币", "Peg to a basket", "汇率稳定，储备 −3，利率自主性下降", "A stable rate, reserves −3, less room for your own policy"),
    ],
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "float") sway(g, { trust: has(g, "floating") ? 4 : -2 });
      else {
        m.reserves = Math.max(0, m.reserves - 3);
        m.fx = 100;
        sway(g, { trust: 2 });
      }
    },
  },

  bulbMania: {
    kind: "history",
    when: (g) => me(g).bubble > 0.3,
    chance: () => 0.004,
    cooldown: 208,
    title: { zh: "蓝鸢尾球茎狂热", en: "Blue iris bulb mania" },
    body: () => ({
      zh: "一种罕见的蓝鸢尾球茎价格三个月涨了二十倍，酒馆里人人都在买卖还没开花的期货。一颗球茎已经能换一栋河边的房子。",
      en: "A rare blue iris bulb has risen twentyfold in three months; every tavern trades futures on flowers that have not bloomed. One bulb now buys a house by the river.",
    }),
    history: {
      zh: "史实原型：1636–1637 年荷兰郁金香狂热，稀有球茎的价格一度抵得上阿姆斯特丹运河边的一栋房子，1637 年 2 月行情突然崩溃。",
      en: "Real precedent: the Dutch tulip mania of 1636–37, when a rare bulb could fetch the price of a canal house in Amsterdam; the market collapsed suddenly in February 1637.",
    },
    choices: [
      c("warn", "公开警告这是泡沫", "Warn publicly that it is a bubble", "泡沫 −0.1，信誉 +1", "Froth −0.1, trust +1"),
      c("ignore", "花的事，跟央行无关", "Flowers are not the bank's business", "泡沫 +0.08", "Froth +0.08"),
    ],
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "warn") {
        m.bubble = clamp(m.bubble - 0.1, 0, 1);
        sway(g, { trust: 1 });
      } else m.bubble = clamp(m.bubble + 0.08, 0, 1);
    },
  },

  goldRush: {
    kind: "history",
    when: always,
    chance: () => 0.0015,
    cooldown: 400,
    title: { zh: "北境发现大金矿", en: "A great gold strike in the north" },
    body: () => ({
      zh: "诺德岚的河床里淘出了拳头大的金块。黄金涌进铸币厂，货币变多了——东西没变多。",
      en: "Nuggets the size of a fist are coming out of Nordlan's riverbeds. Gold floods the mints; there is more money, not more goods.",
    }),
    history: {
      zh: "史实原型：1848 年加利福尼亚发现金矿，此后十多年世界黄金产量成倍增长，带来了一轮温和的全球物价上涨。",
      en: "Real precedent: the 1848 California gold discovery multiplied world gold output over the following decade and brought a mild worldwide rise in prices.",
    },
    onFire: (g) => {
      for (const id of COUNTRY_ORDER) {
        g.countries[id].piE += 0.4;
        g.countries[id].demand += 0.15;
      }
      g.countries.nordlan.reserves += 4;
    },
    choices: [
      c("lean", "加息 0.25%，吸收多出来的钱", "Hike a quarter to soak it up", "通胀压力减轻", "Eases the inflation pressure"),
      c("enjoy", "享受这份运气", "Enjoy the luck", "增长更快，物价更高", "Faster growth, higher prices"),
    ],
    resolve: (g, choice) => {
      if (choice === "lean") me(g).rate += 0.25;
      else sway(g, { approval: 3 });
    },
  },
};
