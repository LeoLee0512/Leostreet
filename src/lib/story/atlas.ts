import type { SectorId } from "./economy";

export type AtlasPoint = readonly [number, number];
export type AtlasLayer = "economy" | "livelihoods" | "supply";

/** The engraved sheet is 2400×1500 atlas units; the playable core sits at its heart. */
export const ATLAS_SHEET = { w: 2400, h: 1500, cx: 1200, cy: 750 } as const;

/** Entirely fictional geography, authored for the game's three-sector economy. */
export const ATLAS_REGIONS: {
  id: SectorId;
  zh: string;
  en: string;
  center: AtlasPoint;
  boundary: readonly AtlasPoint[];
}[] = [
  {
    id: "materials",
    zh: "苍岭省",
    en: "Cangling",
    center: [750, 710],
    boundary: [
      [568, 667],
      [590, 624],
      [642, 610],
      [669, 574],
      [730, 566],
      [772, 587],
      [825, 570],
      [880, 597],
      [903, 640],
      [955, 653],
      [948, 700],
      [970, 730],
      [937, 761],
      [890, 771],
      [858, 806],
      [808, 797],
      [770, 815],
      [725, 790],
      [685, 800],
      [656, 765],
      [605, 748],
      [590, 713],
    ],
  },
  {
    id: "industry",
    zh: "河湾省",
    en: "Riverbend",
    center: [824, 931],
    boundary: [
      [656, 765],
      [685, 800],
      [725, 790],
      [770, 815],
      [808, 797],
      [858, 806],
      [890, 771],
      [937, 761],
      [970, 730],
      [1010, 763],
      [1041, 762],
      [1031, 802],
      [1066, 837],
      [1055, 884],
      [1021, 917],
      [1030, 942],
      [986, 968],
      [938, 959],
      [910, 991],
      [860, 982],
      [834, 999],
      [775, 987],
      [755, 951],
      [710, 932],
      [690, 895],
      [642, 873],
      [630, 825],
    ],
  },
  {
    id: "transport",
    zh: "潮门省",
    en: "Tidemarch",
    center: [1132, 860],
    boundary: [
      [1041, 762],
      [1082, 730],
      [1131, 736],
      [1155, 720],
      [1188, 735],
      [1199, 766],
      [1232, 779],
      [1218, 805],
      [1239, 820],
      [1218, 848],
      [1243, 860],
      [1254, 893],
      [1291, 912],
      [1273, 939],
      [1292, 955],
      [1258, 974],
      [1217, 972],
      [1189, 1002],
      [1150, 1004],
      [1116, 1038],
      [1078, 1022],
      [1062, 997],
      [1023, 999],
      [986, 968],
      [1030, 942],
      [1021, 917],
      [1055, 884],
      [1066, 837],
      [1031, 802],
    ],
  },
];

/** The Lion Kingdom mainland: the playable core plus its outer provinces. */
export const ATLAS_LAND: readonly AtlasPoint[] = [
  [-80, -80],
  [1180, -80],
  [1160, 120],
  [1100, 260],
  [1122, 420],
  [1100, 488],
  [1128, 515],
  [1107, 560],
  [1143, 593],
  [1129, 623],
  [1161, 658],
  [1140, 696],
  [1155, 720],
  [1188, 735],
  [1199, 766],
  [1232, 779],
  [1218, 805],
  [1239, 820],
  [1218, 848],
  [1243, 860],
  [1254, 893],
  [1291, 912],
  [1273, 939],
  [1292, 955],
  [1258, 974],
  [1217, 972],
  [1189, 1002],
  [1150, 1004],
  [1116, 1038],
  [1078, 1022],
  [1062, 997],
  [1023, 999],
  [986, 968],
  [938, 959],
  [910, 991],
  [860, 982],
  [834, 999],
  [775, 987],
  [740, 1060],
  [680, 1140],
  [600, 1190],
  [520, 1230],
  [430, 1240],
  [340, 1210],
  [260, 1160],
  [180, 1190],
  [100, 1240],
  [-80, 1220],
];

export type AtlasCountry = "lion" | "ramona" | "dawei" | "serein" | "velden";

/** Non-playable provinces: scenery in the survey manner, never simulated. */
export interface AtlasNeighborRegion {
  id: string;
  zh: string;
  en: string;
  country: AtlasCountry;
  center: AtlasPoint;
  boundary: readonly AtlasPoint[];
  capital?: AtlasPoint;
}

export const ATLAS_NEIGHBORS: AtlasNeighborRegion[] = [
  // — 狮子国 Lion Kingdom, outer provinces of the home mainland —
  {
    id: "panbei",
    zh: "磐北省",
    en: "Panbei",
    country: "lion",
    center: [790, 350],
    capital: [800, 320],
    boundary: [
      [568, 667],
      [540, 580],
      [500, 470],
      [480, 300],
      [500, 140],
      [520, -60],
      [1180, -60],
      [1160, 120],
      [1100, 260],
      [1122, 420],
      [1100, 470],
      [1030, 540],
      [990, 610],
      [955, 653],
      [903, 640],
      [880, 597],
      [825, 570],
      [772, 587],
      [730, 566],
      [669, 574],
      [642, 610],
      [590, 624],
    ],
  },
  {
    id: "xilei",
    zh: "西垒省",
    en: "Xilei",
    country: "lion",
    center: [400, 800],
    capital: [380, 820],
    boundary: [
      [568, 667],
      [450, 640],
      [300, 620],
      [150, 600],
      [-80, 560],
      [-80, 1220],
      [100, 1240],
      [180, 1190],
      [140, 1140],
      [180, 1080],
      [300, 1060],
      [430, 1090],
      [560, 1080],
      [640, 1050],
      [700, 1020],
      [775, 987],
      [755, 951],
      [710, 932],
      [690, 895],
      [642, 873],
      [630, 825],
      [656, 765],
      [605, 748],
      [590, 713],
    ],
  },
  {
    id: "weize",
    zh: "苇泽省",
    en: "Weize",
    country: "lion",
    center: [672, 1112],
    capital: [660, 1130],
    boundary: [
      [775, 987],
      [700, 1020],
      [640, 1050],
      [560, 1080],
      [520, 1230],
      [600, 1190],
      [680, 1140],
      [740, 1060],
    ],
  },
  // — 大卫国 Dawei, the cold northern crownland across the strait —
  {
    id: "tiejie",
    zh: "铁岬省",
    en: "Tiejie",
    country: "dawei",
    center: [1560, 300],
    capital: [1560, 330],
    boundary: [
      [1440, -60],
      [1470, 60],
      [1440, 140],
      [1480, 220],
      [1450, 300],
      [1490, 380],
      [1450, 430],
      [1480, 500],
      [1460, 550],
      [1540, 570],
      [1640, 540],
      [1660, 420],
      [1640, 280],
      [1660, 140],
      [1620, -60],
    ],
  },
  {
    id: "shuangyuan",
    zh: "霜原省",
    en: "Shuangyuan",
    country: "dawei",
    center: [1850, 260],
    capital: [1860, 240],
    boundary: [
      [1620, -60],
      [1660, 140],
      [1640, 280],
      [1660, 420],
      [1640, 540],
      [1750, 520],
      [1900, 540],
      [2000, 480],
      [2050, 320],
      [2020, 160],
      [2060, -60],
    ],
  },
  {
    id: "baigang",
    zh: "白港省",
    en: "Baigang",
    country: "dawei",
    center: [2180, 330],
    capital: [2090, 545],
    boundary: [
      [2060, -60],
      [2020, 160],
      [2050, 320],
      [2000, 480],
      [1900, 540],
      [1950, 600],
      [2080, 550],
      [2200, 590],
      [2280, 540],
      [2330, 430],
      [2280, 300],
      [2330, 170],
      [2270, 60],
      [2320, -60],
    ],
  },
  // — 拉莫娜国 Ramona, the warm southern shore beyond the Quiet Sea —
  {
    id: "chengtan",
    zh: "橙滩省",
    en: "Chengtan",
    country: "ramona",
    center: [960, 1500],
    capital: [960, 1470],
    boundary: [
      [820, 1600],
      [780, 1480],
      [860, 1420],
      [960, 1450],
      [1060, 1390],
      [1120, 1460],
      [1100, 1600],
    ],
  },
  {
    id: "jinyang",
    zh: "金阳省",
    en: "Jinyang",
    country: "ramona",
    center: [1300, 1490],
    capital: [1300, 1460],
    boundary: [
      [1060, 1390],
      [1180, 1430],
      [1300, 1380],
      [1440, 1420],
      [1480, 1500],
      [1440, 1600],
      [1100, 1600],
      [1120, 1460],
    ],
  },
  {
    id: "nuanfan",
    zh: "暖帆省",
    en: "Nuanfan",
    country: "ramona",
    center: [1830, 1480],
    capital: [1830, 1440],
    boundary: [
      [1440, 1420],
      [1580, 1360],
      [1720, 1400],
      [1860, 1350],
      [2000, 1400],
      [2120, 1360],
      [2180, 1440],
      [2140, 1600],
      [1440, 1600],
      [1480, 1500],
    ],
  },
];

/** Neighbor continents, extruded like the home mainland but purely scenic. */
export const ATLAS_NEIGHBOR_LANDS: readonly (readonly AtlasPoint[])[] = [
  // Dawei crownland, north-east across the strait.
  [
    [1420, -80],
    [1460, 60],
    [1430, 140],
    [1470, 220],
    [1440, 300],
    [1480, 380],
    [1440, 430],
    [1470, 500],
    [1450, 560],
    [1520, 600],
    [1620, 570],
    [1700, 610],
    [1820, 560],
    [1950, 600],
    [2080, 550],
    [2200, 590],
    [2280, 540],
    [2330, 430],
    [2280, 300],
    [2330, 170],
    [2270, 60],
    [2320, -80],
  ],
  // Ramona, the warm southern shore.
  [
    [820, 1600],
    [780, 1480],
    [860, 1420],
    [960, 1450],
    [1060, 1390],
    [1180, 1430],
    [1300, 1380],
    [1440, 1420],
    [1580, 1360],
    [1720, 1400],
    [1860, 1350],
    [2000, 1400],
    [2120, 1360],
    [2180, 1440],
    [2140, 1600],
  ],
];

/** Islands: the strait chain, the Serein archipelago, the Velden league. */
export const ATLAS_ISLANDS: readonly (readonly AtlasPoint[])[] = [
  // Strait chain east of Tidemarch.
  [
    [1352, 692],
    [1371, 679],
    [1390, 701],
    [1381, 725],
    [1358, 716],
  ],
  [
    [1384, 760],
    [1401, 746],
    [1410, 762],
    [1399, 780],
  ],
  [
    [1336, 1007],
    [1359, 999],
    [1370, 1016],
    [1355, 1041],
    [1337, 1030],
  ],
  // Serein Republic, a far south-western archipelago.
  [
    [140, 1330],
    [190, 1310],
    [230, 1330],
    [210, 1360],
    [160, 1360],
  ],
  [
    [260, 1380],
    [310, 1365],
    [340, 1390],
    [300, 1415],
    [265, 1405],
  ],
  [
    [150, 1420],
    [190, 1410],
    [210, 1430],
    [180, 1450],
    [150, 1440],
  ],
  [
    [330, 1430],
    [365, 1420],
    [385, 1440],
    [360, 1460],
    [335, 1450],
  ],
  // Velden League, far eastern isles.
  [
    [2280, 760],
    [2320, 745],
    [2350, 770],
    [2330, 800],
    [2290, 795],
  ],
  [
    [2360, 850],
    [2400, 840],
    [2420, 865],
    [2390, 890],
    [2360, 880],
  ],
];

export const ATLAS_RAIL: readonly AtlasPoint[] = [
  [300, 760],
  [440, 735],
  [560, 718],
  [682, 706],
  [721, 727],
  [731, 780],
  [782, 830],
  [842, 879],
  [906, 888],
  [967, 872],
  [1044, 897],
  [1108, 906],
  [1176, 915],
  [1218, 931],
];

/** The northern spur climbs from Cangling into the Panbei plateau. */
export const ATLAS_RAIL_SPUR: readonly AtlasPoint[] = [
  [682, 706],
  [700, 590],
  [740, 470],
  [790, 380],
  [820, 320],
];

export const ATLAS_RIVER: readonly AtlasPoint[] = [
  [800, -40],
  [828, 120],
  [806, 260],
  [846, 400],
  [817, 534],
  [806, 601],
  [834, 635],
  [824, 682],
  [845, 720],
  [830, 765],
  [864, 801],
  [857, 844],
  [884, 883],
  [936, 911],
  [951, 943],
  [986, 968],
];

/** A western stream watering Xilei and the Weize marsh. */
export const ATLAS_RIVER_WEST: readonly AtlasPoint[] = [
  [420, 560],
  [400, 680],
  [440, 800],
  [410, 920],
  [470, 1010],
  [520, 1090],
  [540, 1180],
];

/** Overseas trade routes: dashed arcs with a mid-arc label anchor. */
export const ATLAS_ROUTES: {
  id: string;
  zh: string;
  en: string;
  points: readonly AtlasPoint[];
  labelAt: AtlasPoint;
}[] = [
  {
    id: "east",
    zh: "海 外 航 线",
    en: "Overseas shipping",
    points: [
      [1218, 931],
      [1420, 900],
      [1650, 862],
      [1900, 836],
      [2280, 792],
    ],
    labelAt: [1800, 892],
  },
  {
    id: "north",
    zh: "北 方 航 线",
    en: "Northern crossing",
    points: [
      [1218, 931],
      [1360, 780],
      [1520, 660],
      [1750, 600],
      [2050, 560],
    ],
    labelAt: [1640, 668],
  },
  {
    id: "south",
    zh: "南 方 航 线",
    en: "Southern crossing",
    points: [
      [1218, 931],
      [1300, 1050],
      [1350, 1180],
      [1400, 1300],
      [1500, 1360],
    ],
    labelAt: [1326, 1170],
  },
];

/** Gazetteer for the HTML overlay and the engraved fallback alike. */
export type AtlasLabelKind = "country" | "power" | "province" | "sea" | "route";
export interface AtlasLabel {
  kind: AtlasLabelKind;
  zh: string;
  en: string;
  at: AtlasPoint;
}
export const ATLAS_LABELS: AtlasLabel[] = [
  { kind: "country", zh: "狮 子 国", en: "LION KINGDOM", at: [780, 130] },
  { kind: "country", zh: "大 卫 国", en: "DAWEI", at: [1900, 110] },
  { kind: "country", zh: "拉 莫 娜 国", en: "RAMONA", at: [1480, 1540] },
  { kind: "power", zh: "瑟林共和国", en: "SEREIN REPUBLIC", at: [250, 1400] },
  { kind: "power", zh: "维岚邦联", en: "VELDEN LEAGUE", at: [2350, 830] },
  { kind: "sea", zh: "沉 静 海", en: "The Quiet Sea", at: [1750, 960] },
  { kind: "sea", zh: "沉 冰 海 峡", en: "The Rime Strait", at: [1330, 520] },
  ...ATLAS_NEIGHBORS.map((r) => ({
    kind: "province" as const,
    zh: r.zh,
    en: r.en,
    at: r.center,
  })),
  ...ATLAS_ROUTES.map((r) => ({
    kind: "route" as const,
    zh: r.zh,
    en: r.en,
    at: r.labelAt,
  })),
];

/** Country washes for the political layer, in muted register with the sheet. */
export const ATLAS_COUNTRY_TINT: Record<AtlasCountry, string> = {
  lion: "#c9b37e",
  ramona: "#c98f66",
  dawei: "#8b98a8",
  serein: "#9aa07a",
  velden: "#a08d92",
};

export function atlasContains(point: AtlasPoint, polygon: readonly AtlasPoint[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!,
      b = polygon[j]!;
    if (
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}
