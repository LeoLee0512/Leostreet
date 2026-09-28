import type { CountryId, Stock } from "./types.ts";

export type StockSeed = Omit<Stock, "history" | "open" | "prevClose" | "fair">;

const COLOR: Record<string, string> = {
  tech: "#2F6B62",
  fin: "#3D5A80",
  re: "#6B5A3E",
  energy: "#C45C4A",
  health: "#4A6B8A",
  consumer: "#8A5A3A",
  industrials: "#4A5560",
  media: "#5A4A6B",
  materials: "#7A6A4A",
  util: "#3A6A6A",
  transport: "#4A5A7A",
  agri: "#5A7A3A",
};

const SECTOR_DEFAULTS: Record<string, Pick<StockSeed, "vol" | "beta" | "drift" | "dividendYield" | "duration" | "pe">> = {
  tech: { vol: 0.38, beta: 1.25, drift: 0.1, dividendYield: 0, duration: 12, pe: 28 },
  fin: { vol: 0.22, beta: 0.9, drift: 0.07, dividendYield: 0.03, duration: -3, pe: 12 },
  re: { vol: 0.26, beta: 0.95, drift: 0.06, dividendYield: 0.028, duration: 8, pe: 16 },
  energy: { vol: 0.36, beta: 1.1, drift: 0.07, dividendYield: 0.02, duration: 3, pe: 14 },
  health: { vol: 0.34, beta: 0.95, drift: 0.09, dividendYield: 0.01, duration: 10, pe: 26 },
  consumer: { vol: 0.28, beta: 1.05, drift: 0.06, dividendYield: 0.02, duration: 5, pe: 20 },
  industrials: { vol: 0.25, beta: 1.1, drift: 0.06, dividendYield: 0.018, duration: 4, pe: 15 },
  media: { vol: 0.4, beta: 1.2, drift: 0.08, dividendYield: 0, duration: 9, pe: 32 },
  materials: { vol: 0.3, beta: 1.15, drift: 0.05, dividendYield: 0.022, duration: 4, pe: 13 },
  util: { vol: 0.16, beta: 0.55, drift: 0.04, dividendYield: 0.038, duration: 14, pe: 17 },
  transport: { vol: 0.32, beta: 1.2, drift: 0.06, dividendYield: 0.015, duration: 5, pe: 14 },
  agri: { vol: 0.28, beta: 0.85, drift: 0.05, dividendYield: 0.02, duration: 6, pe: 15 },
};

function s(
  ticker: string,
  nameZh: string,
  nameEn: string,
  sector: string,
  country: CountryId,
  price: number,
  extra: Partial<StockSeed> = {},
): StockSeed {
  const d = SECTOR_DEFAULTS[sector] ?? SECTOR_DEFAULTS.tech!;
  return {
    ticker,
    name: nameZh,
    nameZh,
    nameEn,
    sector,
    country,
    color: COLOR[sector] ?? "#2F6B62",
    price,
    ...d,
    ...extra,
  };
}

/** 50 tech names, each a different industry direction. */
const TECH: StockSeed[] = [
  s("GOLD", "金狮科技", "LeoTech", "tech", "leo", 186, { vol: 0.36, beta: 1.35, drift: 0.11, duration: 14, pe: 28, theme: "ai-chips" }),
  s("QBIT", "量子鬃", "Qubit Mane", "tech", "leo", 94, { theme: "quantum", vol: 0.48, duration: 16, pe: 44 }),
  s("CYBR", "狮盾网络", "LionShield", "tech", "leo", 71, { theme: "cyber", vol: 0.34, duration: 9, pe: 26 }),
  s("BOTS", "金鬃机器人", "Mane Bots", "tech", "leo", 128, { theme: "robotics", vol: 0.42, duration: 13, pe: 36 }),
  s("CLDX", "云鬃", "Cloud Mane", "tech", "leo", 112, { theme: "cloud", vol: 0.33, duration: 12, pe: 30 }),
  s("SEMI", "狮芯", "Lion Semi", "tech", "leo", 155, { theme: "foundry", vol: 0.4, duration: 11, pe: 22 }),
  s("AUTO", "街车智驾", "Street Pilot", "tech", "leo", 63, { theme: "adas", vol: 0.45, duration: 14, pe: 40 }),
  s("VRNX", "鬃镜", "Mane Lens", "tech", "leo", 41, { theme: "xr", vol: 0.5, duration: 15, pe: 48 }),
  s("SATL", "狮星", "Lion Sat", "tech", "leo", 88, { theme: "satellite", vol: 0.38, duration: 10, pe: 27 }),
  s("EDGE", "边鬃算力", "Edge Mane", "tech", "leo", 57, { theme: "edge", vol: 0.36, duration: 11, pe: 29 }),
  s("NEST", "巢云软件", "Nest SaaS", "tech", "leo", 79, { theme: "saas", vol: 0.3, duration: 13, pe: 34, dividendYield: 0 }),
  s("LEDG", "账鬃支付", "Ledger Rails", "tech", "leo", 52, { theme: "payments", vol: 0.35, duration: 8, pe: 24 }),
  s("PHOT", "光鬃", "Photonics", "tech", "leo", 101, { theme: "photonics", vol: 0.41, duration: 12, pe: 31 }),
  s("MEMX", "忆鬃存储", "Mane Memory", "tech", "leo", 46, { theme: "memory", vol: 0.44, duration: 7, pe: 18 }),
  s("EDAX", "绘鬃电子", "Mane EDA", "tech", "leo", 134, { theme: "eda", vol: 0.32, duration: 11, pe: 33 }),
  s("SPCE", "空鬃发射", "Mane Launch", "tech", "leo", 39, { theme: "space", vol: 0.52, duration: 15, pe: 0 }),
  s("DRNE", "鬃蜂无人机", "Mane Drone", "tech", "leo", 28, { theme: "drones", vol: 0.46, duration: 10, pe: 25 }),
  s("VOX", "声鬃", "Voice Mane", "tech", "leo", 67, { theme: "speech", vol: 0.37, duration: 12, pe: 38 }),
  s("EYES", "瞳鬃视觉", "Mane Vision", "tech", "leo", 83, { theme: "cv", vol: 0.39, duration: 13, pe: 35 }),
  s("COOL", "冷鬃液冷", "Mane Cool", "tech", "leo", 54, { theme: "cooling", vol: 0.31, duration: 8, pe: 21 }),
  s("DAIX", "大卫智算", "David AI", "tech", "david", 6120, { theme: "ai-models", vol: 0.44, duration: 15, pe: 42 }),
  s("DSEM", "大卫晶圆", "David Wafer", "tech", "david", 9800, { theme: "semiconductor", vol: 0.38, duration: 10, pe: 20 }),
  s("DCYS", "大卫网安", "David Cyber", "tech", "david", 4050, { theme: "soc", vol: 0.33, duration: 8, pe: 24 }),
  s("DRBT", "大卫机甲", "David Mech", "tech", "david", 7200, { theme: "humanoid", vol: 0.47, duration: 14, pe: 39 }),
  s("DCLD", "大卫云", "David Cloud", "tech", "david", 5550, { theme: "hybrid-cloud", vol: 0.32, duration: 12, pe: 29 }),
  s("DQNT", "大卫量子", "David Quantum", "tech", "david", 3100, { theme: "ion-trap", vol: 0.55, duration: 17, pe: 60 }),
  s("DDRV", "大卫智驾", "David Drive", "tech", "david", 2680, { theme: "auto", vol: 0.43, duration: 13, pe: 36 }),
  s("DLDG", "大卫清算", "David Rails", "tech", "david", 3480, { theme: "fintech", vol: 0.3, duration: 7, pe: 22 }),
  s("DPHN", "大卫光子", "David Photon", "tech", "david", 4910, { theme: "si-photonics", vol: 0.4, duration: 11, pe: 28 }),
  s("DMRY", "大卫闪存", "David Flash", "tech", "david", 2210, { theme: "nand", vol: 0.45, duration: 6, pe: 16 }),
  s("DSAT", "大卫星链", "David Link", "tech", "david", 3760, { theme: "satcom", vol: 0.37, duration: 10, pe: 26 }),
  s("DEDG", "大卫边缘", "David Edge", "tech", "david", 2590, { theme: "5g-ran", vol: 0.35, duration: 9, pe: 25 }),
  s("DVRX", "大卫幻镜", "David XR", "tech", "david", 1840, { theme: "industrial-xr", vol: 0.5, duration: 14, pe: 45 }),
  s("DSPC", "大卫航天", "David Orbit", "tech", "david", 1620, { theme: "habitat", vol: 0.51, duration: 16, pe: 0 }),
  s("DBAT", "大卫电池", "David Cell", "tech", "david", 2970, { theme: "battery", vol: 0.36, duration: 8, pe: 19 }),
  s("ANAI", "拉莫娜大模型", "Ramona Models", "tech", "ramona", 8400, { theme: "llm", vol: 0.46, duration: 16, pe: 48 }),
  s("ASEM", "拉莫娜光刻", "Ramona Litho", "tech", "ramona", 12600, { theme: "lithography", vol: 0.35, duration: 11, pe: 27 }),
  s("ACYS", "拉莫娜密盾", "Ramona Cipher", "tech", "ramona", 5100, { theme: "zero-trust", vol: 0.32, duration: 8, pe: 23 }),
  s("ARBT", "拉莫娜协作臂", "Ramona Arm", "tech", "ramona", 6900, { theme: "industrial-robot", vol: 0.34, duration: 9, pe: 24 }),
  s("ACLD", "拉莫娜数据中心", "Ramona DC", "tech", "ramona", 9300, { theme: "datacenter", vol: 0.29, duration: 12, pe: 26 }),
  s("AQNT", "拉莫娜冷原子", "Ramona Atom", "tech", "ramona", 4200, { theme: "photonic-q", vol: 0.54, duration: 18, pe: 70 }),
  s("ADRV", "拉莫娜车路", "Ramona Road", "tech", "ramona", 3600, { theme: "v2x", vol: 0.41, duration: 12, pe: 33 }),
  s("ALDG", "拉莫娜钱包", "Ramona Wallet", "tech", "ramona", 4800, { theme: "wallet", vol: 0.33, duration: 7, pe: 21 }),
  s("APHN", "拉莫娜波导", "Ramona Wave", "tech", "ramona", 6400, { theme: "fiber", vol: 0.39, duration: 11, pe: 30 }),
  s("AMRY", "拉莫娜堆叠", "Ramona Stack", "tech", "ramona", 2750, { theme: "hbm", vol: 0.48, duration: 8, pe: 17 }),
  s("ASAT", "拉莫娜测控", "Ramona Track", "tech", "ramona", 4100, { theme: "sat-ops", vol: 0.36, duration: 10, pe: 25 }),
  s("AEDG", "拉莫娜传感", "Ramona Sense", "tech", "ramona", 3300, { theme: "sensors", vol: 0.34, duration: 9, pe: 22 }),
  s("AVRX", "拉莫娜沉浸", "Ramona Immerse", "tech", "ramona", 2500, { theme: "spatial", vol: 0.49, duration: 14, pe: 41 }),
  s("ASPC", "拉莫娜入轨", "Ramona Ascent", "tech", "ramona", 1980, { theme: "launch", vol: 0.53, duration: 15, pe: 0 }),
  s("ABAT", "拉莫娜固态电", "Ramona Solid", "tech", "ramona", 4550, { theme: "solid-state", vol: 0.4, duration: 10, pe: 28 }),
];

const REST_NAMED: StockSeed[] = [
  s("BLUE", "蓝鲸银行", "Blue Whale", "fin", "leo", 44, { vol: 0.22, beta: 0.85, drift: 0.07, dividendYield: 0.032, duration: -4, pe: 11 }),
  s("OAK", "橡树地产", "Oak Realty", "re", "leo", 68, { vol: 0.28, beta: 0.95, drift: 0.06, dividendYield: 0.028, duration: 9, pe: 16 }),
  s("BOLT", "闪电能源", "Bolt Energy", "energy", "leo", 54, { vol: 0.42, beta: 1.1, drift: 0.08, dividendYield: 0.018, duration: 3, pe: 14 }),
  s("NOVA", "新星药业", "Nova Pharma", "health", "leo", 97, { vol: 0.4, beta: 0.9, drift: 0.1, duration: 12, pe: 32 }),
  s("LAMP", "街灯零售", "Lamp Retail", "consumer", "leo", 31, { vol: 0.3, beta: 1.05, drift: 0.05, dividendYield: 0.022, duration: 5, pe: 19 }),
  s("STEEL", "钢铁巨人", "Steel Giant", "industrials", "leo", 75, { vol: 0.26, beta: 1.15, drift: 0.06, dividendYield: 0.02, duration: 4, pe: 13 }),
  s("PIXL", "像素传媒", "Pixel Media", "media", "leo", 22, { vol: 0.48, beta: 1.25, drift: 0.09, duration: 11, pe: 41 }),
];

type Row = [string, string, string, number];

const FIN: Row[] = [
  ["HARB", "港湾信托", "Harbor Trust", 38],
  ["PEARL", "珍珠保险", "Pearl Insure", 29],
  ["COINB", "狮币清算", "Leo Clearing", 51],
  ["NORTH", "北门证券", "North Gate", 33],
  ["RIVER", "河岸银行", "River Bank", 27],
  ["CROWN", "王冠资管", "Crown AM", 62],
  ["DOCKB", "码头信用社", "Dock Credit", 18],
  ["MINT", "铸币局金融", "Mint Finance", 44],
  ["IVY", "常春藤保险", "Ivy Cover", 36],
  ["PINE", "松果租赁", "Pine Lease", 24],
  ["DBNK", "大卫央行概念", "David Bank Co", 2100],
  ["DTRS", "大卫信托", "David Trust", 1680],
  ["DINS", "大卫互助险", "David Mutual", 1420],
  ["DBRK", "大卫券商", "David Broker", 2550],
  ["DCLR", "大卫托管", "David Custody", 1890],
  ["DFND", "大卫对冲母", "David FoF", 3200],
  ["ABNK", "拉莫娜商业银行", "Ramona Comm", 2800],
  ["ATRS", "拉莫娜家族办", "Ramona Family", 4100],
  ["AINS", "拉莫娜再保险", "Ramona Re", 1900],
  ["ABRK", "拉莫娜投行", "Ramona IB", 3600],
  ["ACLR", "拉莫娜结算", "Ramona Settle", 2400],
  ["AFND", "拉莫娜养老金", "Ramona Pension", 3100],
];

const RE: Row[] = [
  ["LOFT", "阁楼开发", "Loft Dev", 55],
  ["DOCKR", "仓栈地产", "Dock Yards", 41],
  ["PARK", "公园物业", "Park Prop", 88],
  ["MALL", "廊桥商业", "Arcade Mall", 47],
  ["HILL", "山脊住宅", "Ridge Homes", 63],
  ["QUAY", "堤岸写字楼", "Quay Offices", 72],
  ["DRES", "大卫住宅", "David Homes", 5400],
  ["DCOM", "大卫商场", "David Malls", 3900],
  ["DIND", "大卫产业园", "David Parks", 4600],
  ["DLOG", "大卫仓储", "David Logistics RE", 2800],
  ["ARES", "拉莫娜公寓", "Ramona Flats", 6200],
  ["ACOM", "拉莫娜步行街", "Ramona Walk", 4500],
  ["AIND", "拉莫娜科创园", "Ramona Parks", 5800],
];

const EN: Row[] = [
  ["WIND", "街风电", "Street Wind", 26],
  ["SOLR", "狮阳", "Lion Solar", 19],
  ["GRID", "街网电力", "Street Grid", 42],
  ["OILX", "港油", "Harbor Crude", 61],
  ["GASX", "蓝焰气", "Blue Flame", 34],
  ["NUKE", "稳核电", "Steady Atom", 77],
  ["DWIN", "大卫风场", "David Wind", 1500],
  ["DSOL", "大卫光伏", "David Solar", 1320],
  ["DOIL", "大卫原油", "David Oil", 4100],
  ["DGRD", "大卫电网", "David Grid", 2700],
  ["AWIN", "拉莫娜潮电", "Ramona Tidal", 1800],
  ["ASOL", "拉莫娜屋顶", "Ramona Roof", 1400],
  ["AOIL", "拉莫娜石化", "Ramona Petro", 3900],
];

const HC: Row[] = [
  ["CURE", "治愈生物", "Cure Bio", 84],
  ["GENE", "剪基因", "Gene Snip", 112],
  ["VACC", "街苗", "Street Vax", 47],
  ["DIAG", "明诊器械", "Clear Dx", 65],
  ["HOSP", "狮医院集团", "Lion Hospitals", 39],
  ["PILL", "老药铺", "Old Pill", 22],
  ["DCUR", "大卫抗体", "David Ab", 5400],
  ["DGEN", "大卫基因", "David Gene", 6100],
  ["DHO", "大卫诊所", "David Clinic", 2100],
  ["ACUR", "拉莫娜细胞", "Ramona Cell", 7200],
  ["AGEN", "拉莫娜测序", "Ramona Seq", 4800],
  ["AHO", "拉莫娜康养", "Ramona Care", 2600],
];

const CON: Row[] = [
  ["BREAD", "街角面包", "Corner Bread", 16],
  ["COFF", "狮咖", "Lion Cafe", 21],
  ["SHOE", "靴廊", "Boot Row", 18],
  ["TOY", "木马玩具", "Hobby Horse", 14],
  ["GROC", "满篮超市", "Full Basket", 27],
  ["FASH", "鬃毛时装", "Mane Fashion", 33],
  ["DCOF", "大卫咖啡", "David Cafe", 980],
  ["DGRC", "大卫折扣", "David Mart", 1540],
  ["DFSH", "大卫成衣", "David Wear", 1760],
  ["ACOF", "拉莫娜茶馆", "Ramona Tea", 1200],
  ["AGRC", "拉莫娜生鲜", "Ramona Fresh", 1680],
  ["AFSH", "拉莫娜丝绸", "Ramona Silk", 2400],
];

const IND: Row[] = [
  ["RAIL", "街铁", "Street Rail", 48],
  ["SHIP", "港船", "Harbor Ship", 36],
  ["CRAN", "起重坊", "Crane Works", 29],
  ["CEMT", "白水泥", "White Cement", 23],
  ["TOOL", "狮钳", "Lion Tools", 31],
  ["WIRE", "铜线厂", "Copper Wire", 27],
  ["DRAI", "大卫重工", "David Heavy", 3100],
  ["DSHP", "大卫船坞", "David Yard", 2600],
  ["DCEM", "大卫建材", "David Build", 1900],
  ["ARAI", "拉莫娜轨道", "Ramona Rail", 3400],
  ["ASHP", "拉莫娜港口机械", "Ramona PortCo", 2200],
  ["ACEM", "拉莫娜窑", "Ramona Kiln", 1700],
];

const MED: Row[] = [
  ["PLAY", "街戏", "Street Play", 17],
  ["TUNE", "狮电台", "Lion Radio", 13],
  ["INK", "油墨报业", "Ink Press", 11],
  ["DPLY", "大卫流媒体", "David Stream", 2100],
  ["DINK", "大卫通讯社", "David Wire", 980],
  ["APLY", "拉莫娜剧场", "Ramona Stage", 1500],
  ["AINK", "拉莫娜杂志", "Ramona Mag", 720],
];

const MAT: Row[] = [
  ["COPP", "红铜", "Red Copper", 44],
  ["LITH", "锂湖", "Lith Lake", 58],
  ["GOLDX", "沙金", "Sand Gold", 91],
  ["DCOP", "大卫铜矿", "David Copper", 2800],
  ["DLIT", "大卫锂", "David Lithium", 3600],
  ["ACOP", "拉莫娜稀土", "Ramona Rare", 4100],
  ["ALIT", "拉莫娜石墨", "Ramona Graphite", 1900],
];

const UTIL: Row[] = [
  ["WATR", "清泉供水", "Clear Water", 32],
  ["HEAT", "暖街热力", "Warm Street", 28],
  ["DWAT", "大卫水务", "David Water", 1700],
  ["AWAT", "拉莫娜水利", "Ramona Water", 2100],
];

const TRANS: Row[] = [
  ["TAXI", "狮的士", "Lion Cab", 15],
  ["FERRY", "渡轮", "Street Ferry", 21],
  ["AIRX", "鬃航", "Mane Air", 49],
  ["DTAX", "大卫出行", "David Ride", 1100],
  ["DAIR", "大卫航空", "David Air", 2900],
  ["ATAX", "拉莫娜公交", "Ramona Bus", 860],
  ["AAIR", "拉莫娜航空", "Ramona Air", 3300],
];

const AGRI: Row[] = [
  ["WHEAT", "金麦", "Gold Wheat", 19],
  ["MILK", "街奶", "Street Milk", 14],
  ["FISH", "港渔", "Harbor Fish", 22],
  ["DWHT", "大卫农场", "David Farm", 980],
  ["AWHT", "拉莫娜果园", "Ramona Orchard", 1240],
];

function countryOfName(zh: string): CountryId {
  if (zh.startsWith("大卫")) return "david";
  if (zh.startsWith("拉莫娜") || zh.startsWith("安娜")) return "ramona";
  return "leo";
}

function pack(sector: string, rows: Row[]): StockSeed[] {
  return rows.map(([ticker, zh, en, px]) => s(ticker, zh, en, sector, countryOfName(zh), px));
}

const MORE = [
  ...pack("fin", FIN),
  ...pack("re", RE),
  ...pack("energy", EN),
  ...pack("health", HC),
  ...pack("consumer", CON),
  ...pack("industrials", IND),
  ...pack("media", MED),
  ...pack("materials", MAT),
  ...pack("util", UTIL),
  ...pack("transport", TRANS),
  ...pack("agri", AGRI),
];

function padTo200(list: StockSeed[]): StockSeed[] {
  const used = new Set(list.map((x) => x.ticker));
  const extras: Array<[string, string, string, string, CountryId, number]> = [
    ["FARM2", "南田", "South Field", "agri", "leo", 12],
    ["SEED", "种鬃", "Seed Mane", "agri", "leo", 17],
    ["BEEF", "街牛", "Street Beef", "agri", "leo", 20],
    ["RICE", "河米", "River Rice", "agri", "david", 740],
    ["OLIVE", "拉莫娜橄榄", "Ramona Olive", "agri", "ramona", 980],
    ["COAL", "黑煤", "Black Coal", "energy", "leo", 25],
    ["URN", "黄饼", "Yellow Cake", "energy", "leo", 66],
    ["HYD", "氢鬃", "Mane Hydro", "energy", "leo", 37],
    ["DCOA", "大卫煤化", "David Coal", "energy", "david", 1600],
    ["AHYD", "拉莫娜氢谷", "Ramona H2", "energy", "ramona", 2100],
    ["CHEM", "狮化", "Lion Chem", "materials", "leo", 40],
    ["GLAS", "街玻", "Street Glass", "materials", "leo", 18],
    ["PAPR", "白纸业", "White Paper", "materials", "leo", 15],
    ["DCHM", "大卫化工", "David Chem", "materials", "david", 2300],
    ["ACHM", "拉莫娜涂料", "Ramona Coat", "materials", "ramona", 1700],
    ["MOVE", "搬鬃物流", "Mane Move", "transport", "leo", 24],
    ["PORT", "深港", "Deep Port", "transport", "leo", 53],
    ["DMOV", "大卫货运", "David Freight", "transport", "david", 1880],
    ["AMOV", "拉莫娜冷链", "Ramona Cold", "transport", "ramona", 1540],
    ["BOND", "街债ETF概念", "Street BondCo", "fin", "leo", 19],
    ["REIT", "街REIT", "Street REIT", "re", "leo", 34],
    ["DREI", "大卫REIT", "David REIT", "re", "david", 2200],
    ["AREI", "拉莫娜REIT", "Ramona REIT", "re", "ramona", 2600],
    ["LABX", "灯塔实验室", "Beacon Lab", "health", "leo", 73],
    ["DLAB", "大卫CRO", "David CRO", "health", "david", 3400],
    ["ALAB", "拉莫娜IVD", "Ramona IVD", "health", "ramona", 2900],
    ["SOAP", "鬃皂", "Mane Soap", "consumer", "leo", 11],
    ["DSOAP", "大卫日化", "David Home", "consumer", "david", 860],
    ["ASOAP", "拉莫娜香氛", "Ramona Scent", "consumer", "ramona", 1120],
    ["GEAR", "齿坊", "Gear Works", "industrials", "leo", 28],
    ["DGEAR", "大卫轴承", "David Bearing", "industrials", "david", 1740],
    ["AGEAR", "拉莫娜泵阀", "Ramona Pump", "industrials", "ramona", 1510],
    ["ADS", "街招", "Street Ads", "media", "leo", 25],
    ["DADS", "大卫广告", "David Ads", "media", "david", 1320],
    ["AADS", "拉莫娜公关", "Ramona PR", "media", "ramona", 980],
    ["PWR", "夜电", "Night Power", "util", "leo", 36],
    ["DPWR", "大卫热电", "David Power", "util", "david", 2400],
    ["APWR", "拉莫娜核电运维", "Ramona NukeOps", "util", "ramona", 3100],
    ["CABLE", "海缆", "Sea Cable", "tech", "leo", 48],
    ["RADIO", "射频鬃", "RF Mane", "tech", "leo", 59],
    ["CHIP2", "封测坊", "OSAT Lane", "tech", "leo", 35],
    ["TOOL2", "量测仪", "Metrology", "tech", "leo", 81],
    ["MASK", "掩模厂", "Mask Works", "tech", "leo", 92],
    ["FAN", "鬃扇", "Mane Fans", "tech", "leo", 27],
    ["TAPE", "胶带封测", "Tape Out", "tech", "leo", 16],
    ["GLUE", "固晶胶", "Die Attach", "tech", "leo", 23],
    ["WAF2", "再生晶圆", "Reclaim Wafer", "tech", "leo", 31],
    ["PACK", "先进封装", "Adv Pack", "tech", "leo", 64],
    ["ION", "离子注入", "Ion Implant", "tech", "leo", 77],
    ["CMPX", "化学机械抛", "CMP Co", "tech", "leo", 44],
  ];
  const out = [...list];
  for (const [ticker, zh, en, sector, country, px] of extras) {
    if (used.has(ticker)) continue;
    used.add(ticker);
    out.push(s(ticker, zh, en, sector, country, px));
    if (out.length >= 200) break;
  }
  return out;
}

export const STOCK_SEED: StockSeed[] = padTo200([...TECH, ...REST_NAMED, ...MORE]);

export const TECH_TICKERS = TECH.map((x) => x.ticker);

export function listingOf(st: Pick<StockSeed, "country">): CountryId {
  return st.country ?? "leo";
}
