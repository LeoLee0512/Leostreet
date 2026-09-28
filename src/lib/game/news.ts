import { id } from "./math.ts";
import type { CountryId, GameState, NewsItem, PendingShock } from "./types.ts";
import { asCountry, COUNTRY_IDS } from "./countries.ts";

type Tpl = {
  zh: { headline: string; body: string };
  en: { headline: string; body: string };
  ticker?: string;
  shock?: [number, number];
  rate?: [number, number];
  country?: CountryId;
};

const PUBLIC: Tpl[] = [
  {
    zh: { headline: "联储主席在街角咖啡店皱眉三秒", body: "记者坚称这与利率有关。债券先跳，成长股随后——这就是久期。" },
    en: { headline: "Fed chair frowns for three seconds at the cafe", body: "Bonds jump first, growth next. That is duration." },
    rate: [-0.0025, 0.005],
  },
  {
    zh: { headline: "狮子联储宣布维持利率不变", body: "声明里出现「视数据而定」。贴现率没动，高久期资产松一口气。" },
    en: { headline: "Leo Fed holds rates", body: "“Data dependent.” Discount rate unchanged; high-duration assets exhale." },
    rate: [-0.0005, 0.0005],
  },
  {
    zh: { headline: "金狮科技发布会：新芯片名叫小金鬃", body: "成长股吃的是久期。订单如果真，隐含波动会先涨。" },
    en: { headline: "LeoTech unveils a chip named Little Mane", body: "Growth lives on duration. If the orders are real, implied vol prints first." },
    ticker: "GOLD",
    shock: [0.04, 0.12],
  },
  {
    zh: { headline: "金狮科技云服务短暂掉线", body: "官方说是一只鸟撞了天线。高 Beta 比鸟掉得更快。" },
    en: { headline: "LeoTech cloud blips offline", body: "A bird hit the antenna, they say. High beta falls faster than birds." },
    ticker: "GOLD",
    shock: [-0.1, -0.03],
  },
  {
    zh: { headline: "蓝鲸银行季报：净息差回暖", body: "利率上行时银行往往是负久期。别把它当科技股来追。" },
    en: { headline: "Blue Whale NIM warms", body: "Banks often carry negative duration when hikes land. Do not chase it like tech." },
    ticker: "BLUE",
    shock: [0.02, 0.07],
  },
  {
    zh: { headline: "蓝鲸被罚：给漫画店放贷审核太松", body: "合规罚款不大。真正的风险在资产质量，不在标题。" },
    en: { headline: "Blue Whale fined for loose comic-shop loans", body: "The fine is small. Asset quality is the risk, not the headline." },
    ticker: "BLUE",
    shock: [-0.06, -0.02],
  },
  {
    zh: { headline: "橡树地产拿下河岸地块", body: "地产是利率的镜子。降息预期比喷泉更重要。" },
    en: { headline: "Oak wins a river parcel", body: "Property is a rate mirror. Easing expectations matter more than the fountain." },
    ticker: "OAK",
    shock: [0.03, 0.08],
  },
  {
    zh: { headline: "中城空置率意外抬头", body: "空置率新闻会叠加在贴现率上。高久期，双杀。" },
    en: { headline: "Midtown vacancy ticks up", body: "Vacancy stacks on the discount rate. High duration, two hits." },
    ticker: "OAK",
    shock: [-0.08, -0.02],
  },
  {
    zh: { headline: "原油管道检修，闪电能源受益", body: "期货盘先动。现货逻辑，不是估值逻辑。" },
    en: { headline: "Pipe maintenance lifts Bolt Energy", body: "Futures move first. This is spot logic, not multiples." },
    ticker: "BOLT",
    shock: [0.04, 0.11],
  },
  {
    zh: { headline: "暖冬预期压低燃料需求", body: "能源的 Beta 来自库存，不来自联储声明。" },
    en: { headline: "Warm winter talk caps fuel demand", body: "Energy beta lives in inventories, not in Fed statements." },
    ticker: "BOLT",
    shock: [-0.07, -0.02],
  },
  {
    zh: { headline: "新星药业三期数据优于预期", body: "事件驱动。波动率同时上升，买期权的人在付 Theta。" },
    en: { headline: "Nova Pharma Phase 3 beats", body: "Event-driven. Vol pops; option buyers pay theta." },
    ticker: "NOVA",
    shock: [0.06, 0.16],
  },
  {
    zh: { headline: "新星药业试验入组缓慢", body: "CEO 说科学需要耐心。Theta 不需要。" },
    en: { headline: "Nova enrollment slips", body: "The CEO asks for patience. Theta does not." },
    ticker: "NOVA",
    shock: [-0.12, -0.04],
  },
  {
    zh: { headline: "街灯零售同店销售超预期", body: "消费股久期中等。利率不是今天的主线。" },
    en: { headline: "Lamp Retail same-store sales beat", body: "Mid duration consumer. Rates are not today's story." },
    ticker: "LAMP",
    shock: [0.03, 0.09],
  },
  {
    zh: { headline: "钢铁巨人拿下桥梁大单", body: "工业跟涨。这是订单，不是贴现率。" },
    en: { headline: "Steel Giant wins a bridge bid", body: "Industrials follow. This is orders, not discount rates." },
    ticker: "STEEL",
    shock: [0.03, 0.08],
  },
  {
    zh: { headline: "像素传媒爆款剧被砍", body: "高波动传媒。期权卖方喜欢这种 Theta，买方不喜欢。" },
    en: { headline: "Pixel Media hit show cancelled", body: "High-vol media. Writers of theta like this. Buyers do not." },
    ticker: "PIXL",
    shock: [-0.14, -0.05],
  },
  {
    zh: { headline: "像素传媒海外发行权卖了个好价", body: "一次性收入。别把它贴现成永续增长。" },
    en: { headline: "Pixel sells overseas rights dear", body: "One-off revenue. Do not discount it as perpetual growth." },
    ticker: "PIXL",
    shock: [0.05, 0.13],
  },
  {
    zh: { headline: "大卫央行暗示维持高利率更久", body: "D股银行股先亮。高久期成长被贴现。时差让狮子街还在午睡。" },
    en: { headline: "David central bank hints higher for longer", body: "D-share banks bid. Duration growth discounted. Leo is still at lunch." },
    ticker: "DBNK",
    shock: [0.03, 0.08],
    country: "david" as CountryId,
  },
  {
    zh: { headline: "大卫智算拿下军工订单传闻", body: "未证实。波动先涨。D股科技的 Beta 比标题更大。" },
    en: { headline: "David AI rumored defense order", body: "Unverified. Vol prints first. D-share tech beta outruns the headline." },
    ticker: "DAIX",
    shock: [0.04, 0.12],
    country: "david" as CountryId,
  },
  {
    zh: { headline: "拉莫娜财政部上调进口关税", body: "R股本地工业受益，跨境贸易股挨打。关税是政策，不是情绪。" },
    en: { headline: "Ramona finance ministry lifts import tariffs", body: "Local industrials bid, cross-border names hit. Tariffs are policy, not mood." },
    ticker: "AIND",
    shock: [0.03, 0.09],
    country: "ramona" as CountryId,
  },
  {
    zh: { headline: "拉莫娜大模型发布会推迟", body: "高久期。消息面适合懂 Delta 的人。R股科技先掉。" },
    en: { headline: "Ramona Models delays its keynote", body: "High duration. News is for people who know delta. R-share tech prints red." },
    ticker: "ANAI",
    shock: [-0.1, -0.03],
    country: "ramona" as CountryId,
  },
  {
    zh: { headline: "指数权重再平衡，被动资金进场", body: "成交量放大。方向仍取决于你懂不懂因子。" },
    en: { headline: "Index rebalance, passive flows", body: "Volume up. Direction still depends on whether you know the factor." },
    shock: [-0.015, 0.02],
  },
  {
    zh: { headline: "风险偏好回暖，资金回流成长", body: "高久期资产的弹簧。如果利率没动，这波可能是真的。" },
    en: { headline: "Risk-on, growth bid", body: "High-duration spring. If rates did not move, this bid can be real." },
    shock: [0.01, 0.035],
  },
  {
    zh: { headline: "避险情绪升温", body: "黄金期货发亮。股票有点灰。负相关，不是神秘学。" },
    en: { headline: "Risk-off tone", body: "Bullion bright, equities grey. Negative correlation, not mysticism." },
    shock: [-0.04, -0.01],
  },
];

const EXCLUSIVE: Tpl[] = [
  {
    zh: { headline: "【专属】金狮即将上调全年指引", body: "供应链人士透露订单排到明年。公开新闻至少还有两小时。核对：这像指引，还是像传闻？" },
    en: { headline: "[EXCL] LeoTech to raise guidance", body: "Orders into next year, a supplier says. Public tape in two hours. Guidance — or gossip?" },
    ticker: "GOLD",
    shock: [0.06, 0.14],
  },
  {
    zh: { headline: "【专属】联储内部倾向 25 个基点降息", body: "还没写进声明。债券会先知道。久期多头的窗口。" },
    en: { headline: "[EXCL] Fed staff leans 25bp cut", body: "Not in the statement yet. Bonds will know first. A window for duration longs." },
    rate: [-0.004, -0.002],
  },
  {
    zh: { headline: "【专属】蓝鲸将回购 3% 股份", body: "董事会晚宴上的菜单比新闻稿早。回购是资本结构，不是营收。" },
    en: { headline: "[EXCL] Blue Whale to buy back 3%", body: "The dinner menu beat the press release. Buybacks are capital structure, not sales." },
    ticker: "BLUE",
    shock: [0.04, 0.09],
  },
  {
    zh: { headline: "【专属】橡树两栋楼的大租户要退租", body: "空置率即将叠加贴现率。地产空头的教材。" },
    en: { headline: "[EXCL] Oak's two big tenants to leave", body: "Vacancy about to stack on the discount rate. A textbook short for property." },
    ticker: "OAK",
    shock: [-0.1, -0.04],
  },
  {
    zh: { headline: "【专属】新星药业 FDA 会议纪要偏鹰", body: "补充材料要求被低估。事件期权的卖方会笑，如果你判断错方向。" },
    en: { headline: "[EXCL] Nova FDA minutes hawkish", body: "Extra filings underpriced. Event-option writers smile if you get the sign wrong." },
    ticker: "NOVA",
    shock: [-0.11, -0.05],
  },
  {
    zh: { headline: "【专属】原油库存将大幅低于预期", body: "管道流量数据比官方报告更早到达机房。" },
    en: { headline: "[EXCL] Crude inventories to miss low", body: "Flow data hits the cage before the official print." },
    ticker: "BOLT",
    shock: [0.05, 0.12],
  },
  {
    zh: { headline: "【专属】像素传媒被流媒体接触收购", body: "价格还在谈。消息面一旦公开就会非常吵。核对要约是否存在。" },
    en: { headline: "[EXCL] Streamer circling Pixel", body: "Price still in talks. The tape will be loud. Check whether an offer exists." },
    ticker: "PIXL",
    shock: [0.08, 0.18],
  },
];

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)] as T;
}

function lerp(rng: () => number, range?: [number, number]): number | undefined {
  if (!range) return undefined;
  return range[0] + rng() * (range[1] - range[0]);
}

export function maybeSpawnNews(
  s: GameState,
  rng: () => number,
): { news: NewsItem[]; pending: PendingShock[] } {
  if (s.tick < s.nextNewsTick) return { news: [], pending: [] };

  const exclusiveOk = s.shop.quantServer && s.shop.serverAt === "exchange";
  const useEx = exclusiveOk && rng() < 0.28;
  const tpl = useEx ? pick(rng, EXCLUSIVE) : pick(rng, PUBLIC);
  const rumor = useEx && rng() < 0.34;
  const shock = rumor ? (lerp(rng, tpl.shock) ?? 0) * (rng() < 0.5 ? 0 : -0.25) : lerp(rng, tpl.shock);
  const rateShock = rumor ? undefined : lerp(rng, tpl.rate);
  const delay = 2 + Math.floor(rng() * 3);
  const impactTick = s.tick + delay;
  const satellite = s.shop.satellite;
  const visibleTick = useEx ? s.tick : satellite ? impactTick - 1 : impactTick;
  let ticker = tpl.ticker;
  if (ticker && !s.stocks[ticker]) {
    const keys = Object.keys(s.stocks);
    ticker = keys[Math.floor(rng() * keys.length)];
  } else if (!ticker && rng() < 0.35) {
    const keys = Object.keys(s.stocks);
    ticker = keys[Math.floor(rng() * keys.length)];
  }

  const country: CountryId =
    tpl.country ??
    (ticker && s.stocks[ticker] ? asCountry(s.stocks[ticker]!.country) : COUNTRY_IDS[Math.floor(rng() * COUNTRY_IDS.length)]!);

  const item: NewsItem = {
    id: id("n"),
    tick: s.tick,
    headlineZh: tpl.zh.headline,
    headlineEn: tpl.en.headline,
    bodyZh: tpl.zh.body,
    bodyEn: tpl.en.body,
    exclusive: useEx,
    rumor,
    ticker,
    shock,
    rateShock,
    impactTick,
    visibleTick,
    applied: false,
    country,
  };

  const pending: PendingShock[] = rumor
    ? Math.abs(shock ?? 0) > 0.002
      ? [{ tick: impactTick, ticker, shock: shock ?? 0, rateShock }]
      : []
    : [{ tick: impactTick, ticker, shock: shock ?? 0, rateShock }];

  return { news: [item], pending };
}

export function nextNewsGap(rng: () => number, hour: number): number {
  const base = hour >= 9 && hour <= 15 ? 3 : 7;
  return base + Math.floor(rng() * 4);
}
