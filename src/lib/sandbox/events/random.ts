import { COUNTRY_ORDER } from "../countries.ts";
import { has, nameOf, nextRandom, pushNews } from "../sim.ts";
import { type EventDef, always, c, clamp, me, prof, sway } from "./kit.ts";

/** Everyday texture: the small surprises that fill a governor's week. */
export const RANDOM_EVENTS: Record<string, EventDef> = {
  strikeWave: {
    kind: "random",
    when: (g) => me(g).pi > prof(g).piStar + 1,
    chance: () => 0.006,
    cooldown: 78,
    title: { zh: "罢工潮", en: "A wave of strikes" },
    body: () => ({
      zh: "码头、铁路和纺织厂相继停工，工会要求工资按物价上涨补偿。他们说：涨价的不是我们。",
      en: "Docks, railways and textile mills walk out; the unions want wages to catch up with prices. 'We did not raise the prices,' they say.",
    }),
    choices: [
      c("firm", "表态：央行不会为工资螺旋买单", "Say the bank will not finance a wage spiral", "预期 −0.2，信誉 +3，民意 −4", "Expectations −0.2, trust +3, approval −4"),
      c("quiet", "保持沉默", "Say nothing", "工资照涨，预期 +0.5", "Wages rise anyway; expectations +0.5"),
    ],
    onFire: (g) => {
      me(g).supply += 0.15;
    },
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "firm") {
        m.piE -= 0.2;
        sway(g, { trust: 3, approval: -4 });
      } else m.piE += 0.5;
    },
  },

  bumperHarvest: {
    kind: "random",
    when: always,
    chance: () => 0.004,
    cooldown: 104,
    title: { zh: "百年一遇的丰收", en: "The harvest of a century" },
    body: () => ({
      zh: "麦子和甜菜多到粮仓装不下，面包价格一个月跌了一成。农民在抱怨，城里人在笑。",
      en: "Wheat and beet overflow the granaries and bread falls a tenth in a month. The farmers complain; the towns are smiling.",
    }),
    onFire: (g) => {
      me(g).supply -= 0.3;
    },
    choices: [
      c("look", "暂时性的，看穿它", "It is temporary: look through it", "什么都不做", "Do nothing"),
      c("cut", "顺势降息 0.25%", "Cut a quarter while prices are soft", "增长 +，之后通胀可能回弹", "Growth up; inflation may bounce later"),
    ],
    resolve: (g, choice) => {
      if (choice === "cut") me(g).rate = Math.max(0, me(g).rate - 0.25);
    },
  },

  portFire: {
    kind: "random",
    when: always,
    chance: () => 0.003,
    cooldown: 156,
    title: { zh: "港口大火", en: "Fire at the port" },
    body: () => ({
      zh: "最大的港口仓库区烧了两天两夜，半个国家的进口货在里面。保险公司的电话打到了央行。",
      en: "The biggest dockside warehouses burned for two days and nights with half the nation's imports inside. The insurers are calling the central bank.",
    }),
    onFire: (g) => {
      const m = me(g);
      m.demand -= 0.3;
      m.supply += 0.2;
    },
    choices: [
      c("lend", "给保险业开流动性窗口（公信力 −10）", "Open a liquidity window for insurers (−10 capital)", "银行 +0.05，恐慌不蔓延", "Banks +0.05; the panic does not spread"),
      c("none", "这是保险公司自己的事", "That is the insurers' problem", "两家保险公司倒闭，银行 −0.08", "Two insurers fail; banks −0.08"),
    ],
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "lend") {
        m.bank = clamp(m.bank + 0.05, 0, 1);
        sway(g, { points: -10 });
      } else m.bank = clamp(m.bank - 0.08, 0.05, 1);
    },
  },

  statsScandal: {
    kind: "random",
    when: always,
    chance: () => 0.003,
    cooldown: 208,
    title: { zh: "统计局数据丑闻", en: "A statistics scandal" },
    body: () => ({
      zh: "报纸揭露统计局把过去两年的通胀数据「修饰」低了。你一直在用这些数字做决定。",
      en: "A newspaper reveals the statistics office has been 'smoothing' inflation figures down for two years. You have been setting policy on those numbers.",
    }),
    onFire: (g) => {
      sway(g, { trust: has(g, "transparency") ? -3 : -6 });
      me(g).piE += 0.3;
    },
    choices: [
      c("publish", "公布修正后的真实数字", "Publish the corrected numbers", "信誉 +4，民意 −3", "Trust +4, approval −3"),
      c("cover", "低调处理", "Keep it quiet", "一半可能就此过去，一半可能更糟", "Half the time it blows over; half the time it gets worse"),
    ],
    resolve: (g, choice) => {
      if (choice === "publish") sway(g, { trust: 4, approval: -3 });
      else if (nextRandom(g) < 0.5) {
        sway(g, { trust: -10 });
        pushNews(g, { zh: "第二篇报道出来了：央行早就知道。", en: "A second story runs: the central bank knew." }, "bad");
      }
    },
  },

  pressGaffe: {
    kind: "random",
    when: always,
    chance: () => 0.004,
    cooldown: 78,
    title: { zh: "记者会口误", en: "A slip at the press conference" },
    body: () => ({
      zh: "你在回答问题时说了一句「我们并不急于控制通胀」。十分钟后，汇率跌了一个点。",
      en: "Answering a question, you said 'we are in no hurry to control inflation'. Ten minutes later the currency is down a point.",
    }),
    onFire: (g) => {
      sway(g, { trust: has(g, "transparency") ? -1 : -3 });
      me(g).fx -= 1;
    },
    choices: [
      c("clarify", "当晚发声明澄清（公信力 −10）", "Issue a clarification tonight (−10 capital)", "信誉 +3", "Trust +3"),
      c("let", "越描越黑，不理它", "Explaining makes it worse: leave it", "什么都不做", "Do nothing"),
    ],
    resolve: (g, choice) => {
      if (choice === "clarify") sway(g, { points: -10, trust: 3 });
    },
  },

  newRailway: {
    kind: "random",
    when: always,
    chance: () => 0.003,
    cooldown: 208,
    title: { zh: "跨省铁路贯通", en: "The trunk railway opens" },
    body: () => ({
      zh: "穿山铁路终于通车，内陆的煤和粮食两天就能到港。工厂在扩建，地价在上涨。",
      en: "The mountain railway is finally through; inland coal and grain reach the port in two days. Factories expand and land prices rise.",
    }),
    onFire: (g) => {
      const m = me(g);
      m.demand += 0.3;
      m.supply -= 0.15;
    },
    choices: [
      c("welcome", "这是好的增长", "This is good growth", "民意 +3", "Approval +3"),
      c("lean", "提防地价泡沫，加息 0.25%", "Watch the land boom: hike a quarter", "泡沫 −0.04", "Froth −0.04"),
    ],
    resolve: (g, choice) => {
      if (choice === "welcome") sway(g, { approval: 3 });
      else {
        me(g).rate += 0.25;
        me(g).bubble = clamp(me(g).bubble - 0.04, 0, 1);
      }
    },
  },

  migrationWave: {
    kind: "random",
    when: always,
    chance: () => 0.002,
    cooldown: 208,
    title: { zh: "移民潮", en: "A wave of migrants" },
    body: () => ({
      zh: "邻国歉收，成千上万的人越过边境找工作。短期内失业会上升，长期看劳动力更多了。",
      en: "After failed harvests next door, thousands cross the border looking for work. Unemployment rises for now; the workforce grows for good.",
    }),
    onFire: (g) => {
      const m = me(g);
      m.u += 0.6;
      m.demand += 0.2;
      m.supply -= 0.1;
    },
    choices: [
      c("steady", "利率不动，让市场吸收", "Hold rates and let the market absorb them", "无", "Nothing"),
      c("ease", "降息 0.25%，帮助吸纳就业", "Cut a quarter to help absorb them", "失业更快回落", "Unemployment falls faster"),
    ],
    resolve: (g, choice) => {
      if (choice === "ease") me(g).rate = Math.max(0, me(g).rate - 0.25);
    },
  },

  privateNotes: {
    kind: "random",
    when: always,
    chance: () => 0.003,
    cooldown: 208,
    title: { zh: "私人银行券热潮", en: "A craze for private banknotes" },
    body: () => ({
      zh: "一家新式商号发行自己的「金星券」，号称比官方货币更硬。年轻人在抢，老银行家在摇头。",
      en: "A new trading house issues its own 'Gold Star notes', claimed to be harder than the official money. The young are buying; old bankers shake their heads.",
    }),
    onFire: (g) => {
      me(g).bubble = clamp(me(g).bubble + 0.05, 0, 1);
      sway(g, { trust: -2 });
    },
    choices: [
      c("regulate", "纳入监管，要求足额准备", "Regulate: require full reserves", "公信力 −15，信誉 +3", "−15 capital, trust +3"),
      c("ban", "直接取缔", "Ban them outright", "民意 −4，泡沫 −0.05", "Approval −4, froth −0.05"),
      c("ignore", "任其自生自灭", "Let them live or die", "泡沫 +0.05", "Froth +0.05"),
    ],
    resolve: (g, choice) => {
      const m = me(g);
      if (choice === "regulate") sway(g, { points: -15, trust: 3 });
      else if (choice === "ban") {
        sway(g, { approval: -4 });
        m.bubble = clamp(m.bubble - 0.05, 0, 1);
      } else m.bubble = clamp(m.bubble + 0.05, 0, 1);
    },
  },

  influenza: {
    kind: "random",
    when: always,
    chance: () => 0.002,
    cooldown: 208,
    title: { zh: "流感季", en: "A bad flu season" },
    body: () => ({
      zh: "一场凶猛的流感让工厂缺了三成工人，剧院和集市关门两个月。",
      en: "A fierce flu keeps a third of factory workers home; theatres and markets close for two months.",
    }),
    onFire: (g) => {
      const m = me(g);
      m.demand -= 0.5;
      m.supply += 0.2;
    },
    choices: [
      c("cut", "降息 0.5% 托底", "Cut half a point to cushion it", "需求回升更快", "Demand recovers faster"),
      c("wait", "两个月就过去了", "It will pass in two months", "无", "Nothing"),
    ],
    resolve: (g, choice) => {
      if (choice === "cut") me(g).rate = Math.max(0, me(g).rate - 0.5);
    },
  },

  stateVisit: {
    kind: "random",
    when: always,
    chance: () => 0.003,
    cooldown: 156,
    title: { zh: "外国央行行长来访", en: "A foreign governor comes to call" },
    body: (g) => {
      const guest = COUNTRY_ORDER.find((id) => id !== g.player)!;
      return {
        zh: `${nameOf(guest).zh}央行行长带着一份提议来访：双方开一条小额货币互换额度，作为友谊的象征。`,
        en: `The governor from ${nameOf(guest).en} arrives with an offer: a small currency swap line between your banks, as a token of friendship.`,
      };
    },
    choices: [
      c("accept", "签署互换协议", "Sign the swap agreement", "外汇储备 +2，信誉 +2", "Reserves +2, trust +2"),
      c("decline", "婉拒", "Politely decline", "无", "Nothing"),
    ],
    resolve: (g, choice) => {
      if (choice === "accept") {
        me(g).reserves += 2;
        sway(g, { trust: 2 });
      }
    },
  },
};
