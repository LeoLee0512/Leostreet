import { COUNTRY_ORDER, PROFILES, initialMacro } from "./countries.ts";
import { FOCUS_BY_ID, focusAvailable } from "./focus.ts";
import { EVENTS, eventFor } from "./events/index.ts";
import type { Action, CountryId, FocusId, Letter, Macro, NewsItem, SandboxGame, Txt } from "./types.ts";

/**
 * The sandbox economy: a small New-Keynesian loop per country, coupled through
 * world rates, world demand and exchange rates.
 *
 *   stance  = (i − πᵉ) − r* − QE + reserve ratio + risk   (felt with a ~5-month lag)
 *   gap'    = −0.9·gap − 1.1·stance + fiscal + world + fx + shocks
 *   π       → πᵉ + 0.35·gap + pass-through·depreciation + supply
 *   πᵉ      → trust-weighted mix of target and current inflation
 *
 * Everything random draws from the game's own seed, so a run replays exactly.
 */
export const WEEK = 1 / 52;
export const YEARS = 10;
const MAX_NEWS = 40;
const MAX_HISTORY = YEARS * 52 + 1;

export function nextRandom(g: SandboxGame): number {
  // mulberry32
  let t = (g.rng = (g.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function gauss(g: SandboxGame): number {
  const u = Math.max(1e-9, nextRandom(g));
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * nextRandom(g));
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function has(g: SandboxGame, id: FocusId): boolean {
  return g.focusDone.includes(id);
}

export function createGame(player: CountryId, seed = Date.now() >>> 0, endless = false): SandboxGame {
  const countries = Object.fromEntries(COUNTRY_ORDER.map((id) => [id, initialMacro(id)])) as Record<CountryId, Macro>;
  const g: SandboxGame = {
    version: 1,
    seed,
    rng: seed >>> 0,
    week: 0,
    length: YEARS * 52,
    endless,
    decades: [],
    decadeMark: { loss: 0, crises: 0 },
    player,
    countries,
    points: 40,
    approval: 60,
    pressure: 35,
    capitalControls: false,
    macroCap: false,
    focusDone: [],
    focusActive: null,
    guidance: null,
    rateLog: [countries[player].rate],
    event: null,
    cooldown: {},
    news: [],
    history: [],
    loss: 0,
    crises: 0,
    lowApprovalWeeks: 0,
    over: null,
  };
  pushNews(g, { zh: `你宣誓就任${PROFILES[player].currency.zh}的守护者。第一次议息会议就在眼前。`, en: `You are sworn in as guardian of the ${PROFILES[player].currency.en}. The first rate meeting is close.` }, "info");
  record(g);
  return g;
}

export function pushNews(g: SandboxGame, text: Txt, tone: NewsItem["tone"]) {
  g.news.unshift({ week: g.week, text, tone });
  if (g.news.length > MAX_NEWS) g.news.length = MAX_NEWS;
}

function record(g: SandboxGame) {
  const m = g.countries[g.player];
  g.history.push({
    w: g.week,
    rate: round2(m.rate),
    pi: round2(m.pi),
    u: round2(m.u),
    growth: round2(m.growth),
    fx: round2(m.fx),
    trust: Math.round(m.trust),
  });
  if (g.history.length > MAX_HISTORY) g.history.shift();
}

const round2 = (v: number) => Math.round(v * 100) / 100;

export interface World {
  rate: number;
  pi: number;
  gap: number;
}

/** GDP-weighted averages of everyone else: the weather the player sails in. */
export function worldOf(g: SandboxGame, except?: CountryId): World {
  let w = 0;
  const acc = { rate: 0, pi: 0, gap: 0 };
  for (const id of COUNTRY_ORDER) {
    if (id === except) continue;
    const m = g.countries[id];
    const k = PROFILES[id].weight;
    acc.rate += m.rate * k;
    acc.pi += m.pi * k;
    acc.gap += m.gap * k;
    w += k;
  }
  return { rate: acc.rate / w, pi: acc.pi / w, gap: acc.gap / w };
}

/** Extra yield investors want: debt, doubt, thin reserves, sick banks. */
export function riskPremium(g: SandboxGame, id: CountryId): number {
  const m = g.countries[id];
  const mine = id === g.player;
  let r =
    Math.max(0, (m.debt - 90) / 40) +
    ((100 - m.trust) / 100) * 0.9 +
    (m.reserves < 5 ? (5 - m.reserves) * 0.25 : 0) +
    (m.bank < 0.6 ? (0.6 - m.bank) * 3 : 0);
  if (mine && has(g, "floating")) r -= 0.2;
  if (mine && g.capitalControls) r *= 0.5;
  return Math.max(0, r);
}

function stepCountry(g: SandboxGame, id: CountryId, world: World) {
  const p = PROFILES[id];
  const m = g.countries[id];
  const mine = id === g.player;
  const risk = riskPremium(g, id);

  // Shocks: persistent demand and supply disturbances.
  m.demand = m.demand * 0.97 + gauss(g) * 0.12;
  m.supply = m.supply * 0.95 + gauss(g) * 0.05;

  // Policy stance, felt with a lag.
  let ease = m.qe * 0.06 * (mine && has(g, "yieldCurve") ? 1.5 : 1);
  if (mine && g.guidance?.kind === "dovish") ease += 0.5;
  const rrrTight = (m.rrr - p.rrrBase) * 0.15;
  const target = m.rate - m.piE - p.rStar - ease + rrrTight + risk * 0.4;
  m.stance += (target - m.stance) * WEEK * 2.2;

  // Demand side.
  const fiscal = (m.deficit - p.deficitNorm) * 0.3;
  const external = p.openness * (0.5 * world.gap - 0.05 * (m.fx - 100));
  const wealth = ((m.equity - 100) / 100) * 0.6;
  const bankDrag = m.bank < 0.6 ? (0.6 - m.bank) * 8 : 0;
  const controls = mine && g.capitalControls ? 0.3 : 0;
  const before = m.gap;
  m.gap += WEEK * (-0.9 * m.gap - 1.1 * m.stance + fiscal + external + wealth + m.demand * 3 - bankDrag - controls);
  m.gap = clamp(m.gap, -15, 10);
  m.growth += (p.gStar + (m.gap - before) / WEEK - m.growth) * WEEK * 6;

  // Prices and expectations.
  const pass = p.passthrough * (mine && has(g, "floating") ? 0.7 : 1);
  const imported = clamp(-m.fxYoY * pass, -3, 6);
  const piTarget = m.piE + 0.35 * m.gap + imported + m.supply * 4;
  m.pi += (piTarget - m.pi) * WEEK * 1.4;
  let anchor = (m.trust / 100) * 0.9;
  if (mine && has(g, "targeting")) anchor = Math.min(0.95, anchor + 0.08);
  if (mine && g.guidance?.kind === "hawkish") anchor = Math.min(0.97, anchor + 0.1);
  m.piE += (anchor * p.piStar + (1 - anchor) * m.pi - m.piE) * WEEK * 1.1;
  m.u += (p.uStar - 0.45 * m.gap - m.u) * WEEK * 3;
  m.u = clamp(m.u, 1, 35);

  // Exchange rate and reserves.
  const realDiff = m.rate - m.pi - (world.rate - world.pi);
  const fxTarget = 100 * (1 + 0.04 * realDiff - 0.07 * risk - 0.01 * (m.pi - world.pi));
  const vol = (mine && g.capitalControls ? 0.4 : 1) * (0.6 + risk * 0.4);
  const fxBefore = m.fx;
  m.fx += (fxTarget - m.fx) * WEEK * 3 + gauss(g) * vol * 0.12;
  m.fx = clamp(m.fx, 20, 250);
  const weeklyPct = ((m.fx - fxBefore) / fxBefore) * 100;
  m.fxYoY += (weeklyPct * 52 - m.fxYoY) * WEEK * 2;
  m.reserves += WEEK * (-0.3 * p.openness * m.gap + (mine && has(g, "reserveBuild") ? 1 : 0));
  m.reserves = Math.max(0, m.reserves);

  // Credit, bubbles, banks.
  const cap = mine && g.macroCap ? 3 : 0;
  const creditTarget = 6 - 3 * m.stance + 2 * m.bubble - rrrTight * 4 - cap;
  m.credit += (creditTarget - m.credit) * WEEK * 2;
  const reform = mine && has(g, "bankReform") ? 0.6 : 1;
  m.bubble += WEEK * (0.12 * reform * ((m.credit - 6) / 6) - 0.25 * m.bubble * Math.max(0, m.stance) * 0.5 - 0.04 * m.bubble);
  m.bubble = clamp(m.bubble, 0, 1);
  const equityTarget = 100 * (1 + m.bubble * 0.6 + m.gap * 0.03 - m.stance * 0.05);
  m.equity += (equityTarget - m.equity) * WEEK * 4 + gauss(g) * 0.8;
  m.equity = Math.max(10, m.equity);
  const heal = 0.25 + (mine && has(g, "depositInsurance") ? 0.1 : 0) + (mine && has(g, "stressTests") ? 0.1 : 0);
  m.bank += WEEK * heal * (1 - m.bank);
  // Fast tightening hurts banks holding long assets.
  if (mine && g.rateLog.length > 26) {
    const climb = m.rate - g.rateLog[g.rateLog.length - 27]!;
    if (climb > 2) m.bank -= WEEK * (climb - 2) * 0.15;
  }
  if (mine && has(g, "bankReform")) m.bank = Math.max(m.bank, 0.35);
  m.bank = clamp(m.bank, 0.05, 1);

  // Public finances.
  const deficitTarget = p.deficitNorm - (mine && has(g, "fiscalRule") ? 1 : 0);
  m.deficit += (deficitTarget - 0.5 * m.gap - m.deficit) * WEEK * 1.5;
  m.debt += WEEK * (m.deficit + (m.debt * (m.rate + risk - m.pi - m.growth)) / 100);
  m.debt = clamp(m.debt, 0, 400);
  m.qe = Math.max(0, m.qe + m.qePace * WEEK);
  if (m.qe === 0 && m.qePace < 0) m.qePace = 0;

  // Market trust drifts toward a level earned by keeping inflation near target.
  if (mine) {
    let trustTarget = 45 + 30 * (1 - Math.min(1, Math.abs(m.piE - p.piStar) / 3)) + 15 * (1 - Math.min(1, Math.abs(m.pi - p.piStar) / 4));
    if (has(g, "independence")) trustTarget += 8;
    if (has(g, "targeting")) trustTarget += 6;
    m.trust += (trustTarget - m.trust) * WEEK * 0.8;
    m.trust = clamp(m.trust, 0, 100);
  } else {
    m.trust += (55 + 25 * (1 - Math.min(1, Math.abs(m.pi - p.piStar) / 4)) - m.trust) * WEEK * 0.5;
  }
}

/** The other central banks: a Taylor rule at a meeting every six weeks, plus crisis lending. */
function aiPolicy(g: SandboxGame, id: CountryId) {
  const p = PROFILES[id];
  const m = g.countries[id];
  if (g.week % 6 === 0) {
    const taylor = p.rStar + m.pi + 0.5 * (m.pi - p.piStar) + 0.5 * m.gap;
    const move = clamp(Math.round((taylor - m.rate) * 4) / 4, -0.5, 0.5);
    m.rate = clamp(m.rate + move, 0, 30);
    m.qePace = m.rate <= 0.25 && m.pi < p.piStar - 1 ? 3 : m.qe > 0 && m.pi > p.piStar ? -2 : 0;
  }
  if (m.bank < 0.45) {
    m.bank += 0.25;
    m.debt += 3;
  }
  // Bubbles burst on their own when money tightens.
  if (m.bubble > 0.55 && m.stance > 0.3 && nextRandom(g) < 0.015) burst(g, id);
}

function burst(g: SandboxGame, id: CountryId) {
  const m = g.countries[id];
  m.bank -= 0.35 * m.bubble;
  m.equity *= 1 - 0.35 * m.bubble;
  m.demand -= 0.4 * m.bubble;
  m.bubble *= 0.3;
  if (id !== g.player) {
    pushNews(g, { zh: `${nameOf(id).zh}资产泡沫破裂，银行股暴跌。`, en: `An asset bubble bursts in ${nameOf(id).en}; bank shares plunge.` }, "bad");
  }
}

export function nameOf(id: CountryId): Txt {
  const names: Record<CountryId, Txt> = {
    lion: { zh: "狮子国", en: "the Lion Kingdom" },
    dawei: { zh: "大卫国", en: "Dawei" },
    ramona: { zh: "拉莫娜国", en: "Ramona" },
    nordlan: { zh: "诺德岚", en: "Nordlan" },
    serein: { zh: "瑟林共和国", en: "the Serein Republic" },
    velden: { zh: "维岚邦联", en: "the Velden League" },
  };
  return names[id];
}

function politics(g: SandboxGame) {
  const p = PROFILES[g.player];
  const m = g.countries[g.player];
  const electionYear = Math.floor(g.week / 52) % 4 === 3;
  const approvalTarget =
    72 - 6 * Math.abs(m.pi - p.piStar) - 5 * Math.max(0, m.u - p.uStar) - (m.bank < 0.5 ? 10 : 0) - (m.growth < 0 ? 6 : 0);
  g.approval += (clamp(approvalTarget, 0, 100) - g.approval) * WEEK * 3;
  let pressureTarget =
    28 + 8 * Math.max(0, m.u - p.uStar) + 6 * Math.max(0, m.rate - (p.rStar + p.piStar)) + (electionYear ? 15 : 0) + Math.max(0, m.debt - 90) * 0.2;
  if (has(g, "independence")) pressureTarget -= 20;
  if (has(g, "fiscalRule")) pressureTarget -= 5;
  g.pressure += (clamp(pressureTarget, 0, 100) - g.pressure) * WEEK * 3;

  g.points += 0.6 + (m.trust / 100) * 0.8 + (has(g, "transparency") ? 0.3 : 0);
  g.points = Math.min(999, g.points);

  if (g.focusActive) {
    g.focusActive.left -= 1;
    if (g.focusActive.left <= 0) {
      const done = g.focusActive.id;
      g.focusDone.push(done);
      g.focusActive = null;
      pushNews(g, { zh: `国策完成：${FOCUS_BY_ID[done].name.zh}。`, en: `Focus complete: ${FOCUS_BY_ID[done].name.en}.` }, "good");
    }
  }

  if (g.guidance && g.week >= g.guidance.until) {
    pushNews(g, { zh: "前瞻指引到期，承诺兑现。市场记住了。", en: "Forward guidance expires, promise kept. Markets remember." }, "good");
    m.trust = Math.min(100, m.trust + 4);
    g.guidance = null;
  }

  g.lowApprovalWeeks = g.approval < 20 && g.pressure > 80 ? g.lowApprovalWeeks + 1 : 0;
}

/** Advance one week. Returns a new game; the input is not modified. */
export function stepWeek(prev: SandboxGame): SandboxGame {
  if (prev.over || prev.event) return prev;
  const g: SandboxGame = structuredClone(prev);
  g.week += 1;
  for (const id of COUNTRY_ORDER) stepCountry(g, id, worldOf(g, id));
  for (const id of COUNTRY_ORDER) if (id !== g.player) aiPolicy(g, id);
  politics(g);

  const m = g.countries[g.player];
  const p = PROFILES[g.player];
  g.rateLog.push(m.rate);
  if (g.rateLog.length > 60) g.rateLog.shift();
  g.loss += (m.pi - p.piStar) ** 2 + 0.5 * (m.u - p.uStar) ** 2;

  if (m.bubble > 0.55 && m.stance > 0.3 && nextRandom(g) < 0.015) {
    burst(g, g.player);
    pushNews(g, { zh: "楼市与股市泡沫破裂，银行坏账飙升。", en: "Housing and equity froth bursts; bad loans soar at the banks." }, "bad");
  }

  if (!g.event) g.event = eventFor(g);
  record(g);
  if (g.endless && g.week % DECADE === 0) decadeReview(g);

  if (m.pi > 40) end(g, "hyperinflation");
  else if (g.lowApprovalWeeks >= 10) end(g, "fired");
  else if (!g.endless && g.week >= g.length) end(g, "term");
  return g;
}

const DECADE = YEARS * 52;

/** Endless terms: grade each decade on its own, so one bad stretch does not haunt the rest. */
function decadeReview(g: SandboxGame) {
  const mark = g.decadeMark ?? { loss: 0, crises: 0 };
  const avgLoss = (g.loss - mark.loss) / DECADE + (g.crises - mark.crises) * 0.4;
  const letter = letterOf(avgLoss);
  (g.decades ??= []).push({ letter, avgLoss });
  g.decadeMark = { loss: g.loss, crises: g.crises };
  const n = g.decades.length;
  pushNews(
    g,
    { zh: `第 ${n} 个十年评级：${letter}。新的十年开始了。`, en: `Decade ${n} review: ${letter}. A new decade begins.` },
    letter === "S" || letter === "A" ? "good" : letter === "D" ? "bad" : "info",
  );
}

function end(g: SandboxGame, reason: SandboxGame["over"]) {
  g.over = reason;
  g.event = null;
  const text: Record<NonNullable<SandboxGame["over"]>, Txt> = {
    term: { zh: "十年任期届满。历史会给你打分。", en: "Your ten-year term is over. History will grade you." },
    retired: { zh: "你选择卸任，把央行交给继任者。", en: "You step down and hand the bank to your successor." },
    fired: { zh: "政府以「失去公众信任」为由解除了你的职务。", en: "The government dismisses you for 'losing the public's confidence'." },
    hyperinflation: { zh: "恶性通胀。货币已经没人要了，你被迫辞职。", en: "Hyperinflation. Nobody will hold the money any more; you resign." },
  };
  pushNews(g, text[reason!], reason === "term" ? "info" : "bad");
}

export interface ActResult {
  game: SandboxGame;
  ok: boolean;
  msg?: Txt;
}

const fail = (game: SandboxGame, zh: string, en: string): ActResult => ({ game, ok: false, msg: { zh, en } });

/** Apply a player action. Returns a new game; the input is not modified. */
export function act(prev: SandboxGame, a: Action): ActResult {
  if (prev.over) return fail(prev, "任期已经结束。", "Your term is over.");
  if (prev.event && a.type !== "choose") return fail(prev, "先处理眼前的事件。", "Deal with the event in front of you first.");
  const g: SandboxGame = structuredClone(prev);
  const m = g.countries[g.player];
  switch (a.type) {
    case "rate": {
      const next = clamp(Math.round((m.rate + a.delta) * 100) / 100, 0, 40);
      if (next === m.rate) return fail(prev, "利率已到边界。", "The rate is at its limit.");
      if (g.guidance?.kind === "dovish" && next > g.guidance.rate) {
        g.guidance = null;
        m.trust = Math.max(0, m.trust - 12);
        pushNews(g, { zh: "你违背了「维持低利率」的承诺。市场不会忘。", en: "You broke your pledge to keep rates low. Markets will not forget." }, "bad");
      }
      if (g.guidance?.kind === "hawkish" && next < g.guidance.rate && m.pi > PROFILES[g.player].piStar + 0.5) {
        g.guidance = null;
        m.trust = Math.max(0, m.trust - 12);
        pushNews(g, { zh: "通胀未回目标就降息，鹰派承诺破产。", en: "Cutting before inflation is back at target: the hawkish pledge is dead." }, "bad");
      }
      // Lurching moves make markets nervous.
      if (Math.abs(a.delta) > 0.75) m.trust = Math.max(0, m.trust - (Math.abs(a.delta) - 0.75) * 4);
      m.rate = next;
      return { game: g, ok: true };
    }
    case "rrr": {
      const next = clamp(m.rrr + a.delta, 0, 25);
      if (next === m.rrr) return fail(prev, "准备金率已到边界。", "The reserve ratio is at its limit.");
      m.rrr = next;
      return { game: g, ok: true };
    }
    case "qe": {
      if (a.pace > 0 && !has(g, "qeTools")) return fail(prev, "需要先完成国策「量化宽松工具」。", "Complete the 'Quantitative easing toolkit' focus first.");
      if (a.pace < 0 && m.qe <= 0) return fail(prev, "账上没有可卖的债券。", "There are no bonds on the books to sell.");
      m.qePace = a.pace;
      return { game: g, ok: true };
    }
    case "guidance": {
      if (!has(g, "guidance")) return fail(prev, "需要先完成国策「前瞻指引」。", "Complete the 'Forward guidance' focus first.");
      if (g.guidance) return fail(prev, "已有一项承诺在生效。", "A pledge is already in force.");
      if (g.points < 25) return fail(prev, "公信力不足（需要 25）。", "Not enough political capital (25 needed).");
      g.points -= 25;
      g.guidance = { kind: a.kind, until: g.week + 26, rate: m.rate };
      pushNews(
        g,
        a.kind === "dovish"
          ? { zh: "你承诺：未来半年不加息。", en: "You pledge: no hikes for six months." }
          : { zh: "你承诺：通胀回到目标之前不降息。", en: "You pledge: no cuts until inflation is back at target." },
        "info",
      );
      return { game: g, ok: true };
    }
    case "intervene": {
      if (a.side === "buy") {
        if (m.reserves < 1) return fail(prev, "外汇储备不够了。", "Not enough foreign reserves.");
        m.reserves -= 1;
        m.fx += 1.6;
      } else {
        m.reserves += 1;
        m.fx -= 1.6;
      }
      return { game: g, ok: true };
    }
    case "capitalControls": {
      if (a.on === g.capitalControls) return { game: prev, ok: true };
      if (a.on) {
        if (g.points < 30) return fail(prev, "公信力不足（需要 30）。", "Not enough political capital (30 needed).");
        g.points -= 30;
        m.trust = Math.max(0, m.trust - 6);
        pushNews(g, { zh: "资本管制生效：资金出不去了，外国投资者也在观望。", en: "Capital controls in force: money cannot leave, and foreign investors hold back." }, "info");
      }
      g.capitalControls = a.on;
      return { game: g, ok: true };
    }
    case "macroCap": {
      if (!has(g, "macroprudential")) return fail(prev, "需要先完成国策「宏观审慎」。", "Complete the 'Macroprudential policy' focus first.");
      g.macroCap = a.on;
      return { game: g, ok: true };
    }
    case "focus": {
      if (g.focusActive) return fail(prev, "已有一项国策在推进。", "A focus is already in progress.");
      if (!focusAvailable(g.focusDone, a.id)) return fail(prev, "前置国策尚未完成。", "Its prerequisites are not done.");
      const node = FOCUS_BY_ID[a.id];
      if (g.points < node.cost) return fail(prev, `公信力不足（需要 ${node.cost}）。`, `Not enough political capital (${node.cost} needed).`);
      g.points -= node.cost;
      g.focusActive = { id: a.id, left: node.weeks };
      return { game: g, ok: true };
    }
    case "retire": {
      if (!g.endless) return fail(prev, "十年任期期间不能主动卸任。", "You cannot step down during a ten-year term.");
      g.event = null;
      end(g, "retired");
      return { game: g, ok: true };
    }
    case "coordinate": {
      if (!has(g, "intlCoop")) return fail(prev, "需要先完成国策「国际央行合作」。", "Complete the 'Central-bank cooperation' focus first.");
      if ((g.cooldown.coordinate ?? 0) > g.week) return fail(prev, "各国央行刚刚联合行动过，半年内不会再来。", "The central banks acted together recently; not again within six months.");
      if (g.points < 40) return fail(prev, "公信力不足（需要 40）。", "Not enough political capital (40 needed).");
      g.points -= 40;
      g.cooldown.coordinate = g.week + 26;
      const step = a.dir === "cut" ? -0.5 : 0.5;
      const joined: CountryId[] = [];
      const refused: CountryId[] = [];
      for (const id of COUNTRY_ORDER) {
        if (id === g.player) continue;
        const o = g.countries[id];
        const q = PROFILES[id];
        const rule = q.rStar + o.pi + 0.5 * (o.pi - q.piStar) + 0.5 * o.gap;
        const willing = a.dir === "cut" ? rule < o.rate + 0.75 : rule > o.rate - 0.75;
        if (willing) {
          o.rate = clamp(o.rate + step, 0, 30);
          joined.push(id);
        } else refused.push(id);
      }
      m.rate = clamp(m.rate + step, 0, 40);
      m.trust = clamp(m.trust + (joined.length >= 3 ? 3 : 0), 0, 100);
      const list = (ids: CountryId[], en: boolean) => ids.map((id) => (en ? nameOf(id).en : nameOf(id).zh)).join(en ? ", " : "、") || (en ? "nobody" : "无");
      pushNews(
        g,
        {
          zh: `联合${a.dir === "cut" ? "降息" : "加息"}：${list(joined, false)}加入；${list(refused, false)}拒绝。`,
          en: `Joint ${a.dir === "cut" ? "cut" : "hike"}: ${list(joined, true)} joined; ${list(refused, true)} declined.`,
        },
        joined.length >= 3 ? "good" : "info",
      );
      return { game: g, ok: true };
    }
    case "requestSwap": {
      if (!has(g, "swapLines")) return fail(prev, "需要先完成国策「国际互换额度」。", "Complete the 'Swap lines' focus first.");
      if ((g.cooldown.swap ?? 0) > g.week) return fail(prev, "互换额度一年只能动用一次。", "Swap lines can be drawn once a year.");
      if (g.points < 20) return fail(prev, "公信力不足（需要 20）。", "Not enough political capital (20 needed).");
      g.points -= 20;
      g.cooldown.swap = g.week + 52;
      m.reserves += 5;
      pushNews(g, { zh: "外国央行通过互换额度向你提供了 5% GDP 的外汇。", en: "Foreign central banks provide 5% of GDP in foreign currency through the swap lines." }, "good");
      return { game: g, ok: true };
    }
    case "choose": {
      if (!g.event) return fail(prev, "没有待处理的事件。", "No event to answer.");
      const def = EVENTS[g.event.key];
      const choice = g.event.choices.find((c) => c.id === a.choice);
      if (!def || !choice) return fail(prev, "无效的选项。", "Not a valid option.");
      if (choice.requires && !has(g, choice.requires)) return fail(prev, "这个选项需要先完成相应国策。", "That option needs its focus first.");
      def.resolve(g, a.choice);
      g.event = null;
      return { game: g, ok: true };
    }
  }
}

export interface Grade {
  letter: Letter;
  avgLoss: number;
}

export function letterOf(avgLoss: number): Letter {
  return avgLoss < 1.5 ? "S" : avgLoss < 3 ? "A" : avgLoss < 6 ? "B" : avgLoss < 12 ? "C" : "D";
}

/** Average weekly welfare loss → a letter grade. Crises count per decade, so long endless terms are not penalised for their length. */
export function gradeOf(g: SandboxGame): Grade {
  const avgLoss = g.loss / Math.max(1, g.week) + (g.crises * 0.4 * DECADE) / Math.max(DECADE, g.week);
  const forced = g.over === "fired" || g.over === "hyperinflation";
  return { letter: forced ? "D" : letterOf(avgLoss), avgLoss };
}

export function dateOf(week: number): { year: number; week: number } {
  return { year: Math.floor(week / 52) + 1, week: (week % 52) + 1 };
}
