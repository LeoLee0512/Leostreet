import type { SandboxGame, Txt } from "./types.ts";
import { PROFILES } from "./countries.ts";

/**
 * 史实对照: real central bankers' terms, for the end-of-term comparison.
 * Figures are rounded annual averages over each term (consumer-price
 * inflation, unemployment rate) — approximate by design, for orientation only.
 * This is the one place real names appear in the sandbox, as history.
 */
export interface Governor {
  name: Txt;
  bank: Txt;
  years: string;
  pi: number;
  u: number;
  note: Txt;
}

export const GOVERNORS: Governor[] = [
  {
    name: { zh: "亚瑟·伯恩斯", en: "Arthur Burns" },
    bank: { zh: "美联储", en: "Federal Reserve" },
    years: "1970–1978",
    pi: 6.5,
    u: 6.2,
    note: { zh: "政治压力下保持宽松，通胀在 1970 年代一路走高。", en: "Kept money easy under political pressure; inflation climbed through the 1970s." },
  },
  {
    name: { zh: "保罗·沃尔克", en: "Paul Volcker" },
    bank: { zh: "美联储", en: "Federal Reserve" },
    years: "1979–1987",
    pi: 6.2,
    u: 7.6,
    note: { zh: "以两次衰退为代价，把两位数通胀打了下来。", en: "Broke double-digit inflation at the cost of two recessions." },
  },
  {
    name: { zh: "艾伦·格林斯潘", en: "Alan Greenspan" },
    bank: { zh: "美联储", en: "Federal Reserve" },
    years: "1987–2006",
    pi: 3.1,
    u: 5.4,
    note: { zh: "「大缓和」时期的掌舵人；任期末的房地产泡沫至今仍有争议。", en: "Steered the 'Great Moderation'; the housing bubble at its end is still debated." },
  },
  {
    name: { zh: "默文·金", en: "Mervyn King" },
    bank: { zh: "英格兰银行", en: "Bank of England" },
    years: "2003–2013",
    pi: 2.6,
    u: 6.2,
    note: { zh: "从「无聊」的通胀目标制，走进了 2007 年的挤兑和 2008 年的危机。", en: "From 'boring' inflation targeting into the 2007 run and the 2008 crisis." },
  },
  {
    name: { zh: "本·伯南克", en: "Ben Bernanke" },
    bank: { zh: "美联储", en: "Federal Reserve" },
    years: "2006–2014",
    pi: 2.1,
    u: 6.9,
    note: { zh: "研究大萧条的学者，亲手应对了 2008 年金融危机，首创大规模量化宽松。", en: "A scholar of the Depression who fought the 2008 crisis and pioneered large-scale QE." },
  },
  {
    name: { zh: "马里奥·德拉吉", en: "Mario Draghi" },
    bank: { zh: "欧洲央行", en: "European Central Bank" },
    years: "2011–2019",
    pi: 1.2,
    u: 10.2,
    note: { zh: "一句「不惜一切代价」稳住了欧元，但通胀长期低于目标。", en: "'Whatever it takes' saved the euro, but inflation stayed below target." },
  },
  {
    name: { zh: "黑田东彦", en: "Haruhiko Kuroda" },
    bank: { zh: "日本银行", en: "Bank of Japan" },
    years: "2013–2023",
    pi: 0.8,
    u: 3,
    note: { zh: "收益率曲线控制与巨量购债，十年间也没能让通胀稳定在 2%。", en: "Yield-curve control and huge purchases, yet a decade without stable 2% inflation." },
  },
];

export interface TermSummary {
  avgPi: number;
  avgU: number;
}

export function summarize(g: SandboxGame): TermSummary {
  const n = Math.max(1, g.history.length);
  return {
    avgPi: g.history.reduce((a, s) => a + s.pi, 0) / n,
    avgU: g.history.reduce((a, s) => a + s.u, 0) / n,
  };
}

/**
 * The real term closest to yours, comparing inflation's distance from target
 * and unemployment's distance from its natural rate (2% / 5% for the real ones).
 */
export function closestGovernor(g: SandboxGame): Governor {
  const p = PROFILES[g.player];
  const t = summarize(g);
  const mine = [t.avgPi - p.piStar, t.avgU - p.uStar];
  let best = GOVERNORS[0]!;
  let bestD = Infinity;
  for (const gov of GOVERNORS) {
    const d = (mine[0]! - (gov.pi - 2)) ** 2 + 0.5 * (mine[1]! - (gov.u - 5)) ** 2;
    if (d < bestD) {
      bestD = d;
      best = gov;
    }
  }
  return best;
}
