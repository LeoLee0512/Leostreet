import { create } from "zustand";

export type Lang = "zh" | "en";

const LANG_KEY = "leo-street-lang";

type Dict = Record<string, { zh: string; en: string }>;

const D: Dict = {
  "game.title": { zh: "狮子街传说", en: "Leo Street Legend" },
  "game.kicker": { zh: "LEO STREET", en: "LEO STREET" },

  "home.kicker": { zh: "灯湾公报", en: "THE LANTERN GAZETTE" },
  "home.issue": { zh: "战略特刊 · 风雨欲来", en: "STRATEGY EDITION · STORM APPROACHING" },
  "home.collection": { zh: "收藏与荣誉室", en: "Collection & Honors" },
  "home.footer": {
    zh: "可玩世界为架空演绎，真实历史单独标注。",
    en: "The playable world is fictional; real history is labeled separately.",
  },

  "title.name": { zh: "显示名", en: "Display name" },
  "title.nameHint": { zh: "留空则默认为 LEO", en: "Leave blank to play as LEO" },
  "title.id": { zh: "游戏 ID", en: "Player ID" },
  "title.idHint": {
    zh: "仅限大小写英文和数字。留空则随机 12 位。",
    en: "Letters and digits only. Blank = random 12-character ID.",
  },
  "title.idBad": { zh: "ID 只能包含 A–Z a–z 0–9", en: "ID may contain A–Z a–z 0–9 only" },
  "title.reroll": { zh: "随机", en: "Random" },
  "title.look": { zh: "性别", en: "Gender" },
  "title.male": { zh: "男", en: "Male" },
  "title.female": { zh: "女", en: "Female" },























  "title.idPh": { zh: "A–Z a–z 0–9", en: "A–Z a–z 0–9" },
  "title.namePh": { zh: "默认为 LEO", en: "Defaults to LEO" },

  "close": { zh: "关闭", en: "Close" },









  "sc.kicker": { zh: "LEO STREET · CRISIS FILES", en: "LEO STREET · CRISIS FILES" },
  "sc.title": { zh: "剧情战：{n} 场金融危机", en: "Story: {n} financial crises" },
  "sc.sub": {
    zh: "从 1720 年的南海泡沫到 2008 年的雷曼周末，真实危机按难度排成一条阶梯。每一关只教一个机制：挤兑、杠杆、反馈回路、双边操作、一句话的承诺、以及一条本来就该放手的防线。通关一关才开下一关。游戏里的国名与货币是虚构的，前情提要里的史实档案是真的。",
    en: "From the South Sea Bubble of 1720 to the Lehman weekend of 2008, real crises arranged as a ladder by difficulty. Each teaches a single mechanism: a run, leverage, a feedback loop, a double play, a one-sentence promise, and one line that was always meant to be let go. Clear one to open the next. The countries and currencies in play are invented; the record in each briefing is not.",
  },
  "sc.pick": { zh: "选一场危机", en: "Pick a crisis" },
  "sc.youDo": { zh: "你要做什么", en: "Your job" },
  "sc.youWin": { zh: "怎么赢", en: "How you win" },
  "sc.trap": { zh: "坑在哪", en: "The trap" },
  "sc.solo": { zh: "个人剧情战", en: "Solo" },
  "sc.team": { zh: "组队剧情战", en: "Team" },
  "sc.read": { zh: "看前情提要", en: "Read the briefing" },
  "sc.brief": { zh: "前情提要", en: "Briefing" },
  "sc.history": { zh: "史实档案", en: "The record" },
  "sc.peg": { zh: "防线", en: "The line" },
  "sc.reserves": { zh: "可用 / 账面", en: "Usable / headline" },
  "sc.forwardWarn": { zh: "其余已在远期合约里", en: "the rest is on the forward book" },
  "sc.days": { zh: "要撑几个决定", en: "Decisions to hold" },
  "sc.orders": { zh: "你的任务", en: "Your orders" },
  "sc.against": { zh: "对手：{n}", en: "Against: {n}" },
  "sc.start": { zh: "开始", en: "Begin" },

  "sr.day": { zh: "第 {n} 天 / 共 {of} 天", en: "Day {n} of {of}" },

  "sd.won": { zh: "任务达成", en: "Objective met" },
  "sd.lost": { zh: "任务失败", en: "Objective failed" },
  "sd.peg": { zh: "防线", en: "The line" },
  "sd.held": { zh: "守住了", en: "Held" },
  "sd.broke": { zh: "断了", en: "Broke" },
  "sd.lastedDays": { zh: "撑了几个决定", en: "Decisions lasted" },
  "sd.spent": { zh: "烧掉弹药", en: "Ammunition burned" },
  "sd.book": { zh: "我的收益", en: "My return" },
  "sd.sameAsHistory": { zh: "和历史一样", en: "Same as history" },
  "sd.brokeFromHistory": { zh: "你改写了结局", en: "You changed the ending" },
  "sd.historyBroke": { zh: "历史上，这条防线没有守住。", en: "In the record, this line did not hold." },
  "sd.historyHeld": { zh: "历史上，这条防线守住了。", en: "In the record, this line held." },
  "sd.lesson": { zh: "这一战教什么", en: "What this one teaches" },
  "sd.retry": { zh: "再打一次", en: "Run it again" },
  "sd.exit": { zh: "回到关卡列表", en: "Back to the chapters" },

  "sc.ladder": { zh: "危机阶梯 · {n} 场", en: "The ladder · {n} crises" },
  "sc.cleared": { zh: "已通关 {n}/{of}", en: "{n} of {of} cleared" },
  "sc.lockedHint": { zh: "先通关上一场「{n}」。", en: "Clear the one before it — {n} — first." },
  "sc.lockedAny": { zh: "阶梯还没走到这里。", en: "The ladder has not reached this one yet." },
  "sc.clearedTag": { zh: "已通关", en: "Cleared" },
  "sc.bestAt": { zh: "最深通关：{n}", en: "Best: {n}" },
  "sc.length": { zh: "篇幅", en: "How long" },
  "sc.lengthNote": {
    zh: "同一场危机，同一套数值。篇幅只改变你要做多少决定、能看到多少细节——不改变难度。",
    en: "The same crisis and the same numbers. The length changes how many decisions you make and how much detail you see — never how hard it is.",
  },
  "sc.lengthOne": { zh: "这一关只有半小时版本。它是单一事件，撑不起更长的篇幅。", en: "This one runs at the half-hour length only: it is a single event and will not carry a longer telling." },
  "sc.estimate": { zh: "目标 {t} · 本关约 {n} 分钟", en: "Target {t} · about {n} min here" },
  "sc.noAward": { zh: "半小时版本没有成就", en: "No achievement at this length" },
  "sc.award": { zh: "通关可得「{n}」", en: "Clearing this earns {n}" },
  "sc.titleNext": { zh: "再通关 {n} 场解锁「{t}」", en: "{n} more clears unlocks {t}" },
  "sc.titleAll": { zh: "阶梯走完了，称号已集齐。", en: "The ladder is finished. Every title is yours." },
  "sc.noTitle": { zh: "还没有称号。每通关两场解锁一个。", en: "No titles yet. One for every two crises cleared." },
  "sc.realNames": {
    zh: "游戏里的国名、货币、机构和对手都是虚构的。这一段不是——真实的年份、数字、地名和人名都在这里。",
    en: "The countries, currencies, institutions and opponents in the game are invented. This part is not: the real dates, figures, places and names are here.",
  },
  "sc.epicWarn": {
    zh: "⚠ 三小时版本极端困难：全程基本上要一直盯着盘、一直接电话、一直主动打电话问消息，而且危机会越到后面越凶。做好连坐三小时的准备。",
    en: "⚠ The three-hour telling is extremely hard: you will be watching the board, taking calls and chasing information more or less continuously, and the crisis gets worse the longer it runs. Sit down for three hours before you pick it.",
  },
  "sc.crownAt": { zh: "三小时通关可得全作最高称号「{n}」", en: "Clear the three-hour telling for the game's highest title: {n}" },
  "sc.escalates": { zh: "越到后面越凶：最后几个时段的压力是开局的两三倍。", en: "It gets worse: the closing sessions carry two or three times what the opening ones did." },
  "sd.divergence": { zh: "这一次有什么不同", en: "What was different this time" },
  "sd.crown": { zh: "至高称号", en: "The highest title" },
  "sd.lineGone": { zh: "放手了", en: "Let go" },

  "sr.sessionOf": { zh: "第 {d}/{of} 天 · {s}", en: "Day {d} of {of} · {s}" },

  "ph.incoming": { zh: "来电", en: "Incoming call" },
  "ph.outgoing": { zh: "去电", en: "Calling" },
  "ph.answer": { zh: "接听", en: "Answer" },
  "ph.connecting": { zh: "接通中", en: "Connecting" },
  "ph.hangUp": { zh: "挂断", en: "Hang up" },
  "ph.declineWarn": { zh: "不接也是一种回答，对方会记住。", en: "Not answering is an answer too, and they will remember it." },

  "sd.elapsed": { zh: "实际用时", en: "Time taken" },
  "sd.minutes": { zh: "{n} 分钟", en: "{n} min" },
  "sd.newTitle": { zh: "解锁称号", en: "Title unlocked" },
  "sd.newAward": { zh: "达成成就", en: "Achievement" },
  "sd.unlocked": { zh: "已解锁下一关：{n}", en: "Next crisis unlocked: {n}" },
  "sd.noAward": { zh: "半小时版本不计成就。换更长的篇幅再打一次，就能拿到。", en: "The half-hour telling carries no achievement. Run it at a longer length to earn one." },
  "sd.calls": { zh: "接了 {n} 通电话", en: "{n} calls handled" },














  "login.title": { zh: "登录方式", en: "Sign-in" },
  "login.scan": { zh: "扫码登录", en: "Scan to sign in" },
  "login.scanHint": { zh: "用任意相机对准下方图案即可（演示）。", en: "Point any camera at the pattern below (demo)." },
  "login.guest": { zh: "游客登录", en: "Guest" },
  "login.asScan": { zh: "已扫码登录", en: "Signed in by scan" },
  "login.asGuest": { zh: "游客模式", en: "Guest mode" },
  "login.switch": { zh: "切换账号", en: "Switch" },
  "login.demo": {
    zh: "演示环境：未接入真实 OAuth，点击下方按钮即可完成登录。",
    en: "Demo build: no real OAuth wired up — tap the button below to finish signing in.",
  },
  "login.ok": { zh: "完成登录", en: "Finish sign-in" },
  "login.cancel": { zh: "取消", en: "Cancel" },
  "login.scanName": { zh: "街坊{n}", en: "Neighbour {n}" },
  "login.guestName": { zh: "游客{n}", en: "Guest {n}" },





};

export const useI18n = create<{ lang: Lang; setLang: (l: Lang) => void }>((set) => ({
  lang: "zh",
  setLang: (lang) => {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignore */
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
      document.title = lang === "zh" ? "狮子街传说" : "Leo Street Legend";
    }
    set({ lang });
  },
}));

export function bootLang() {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === "en" || v === "zh") useI18n.getState().setLang(v);
    else if (typeof document !== "undefined") document.documentElement.lang = "zh-CN";
  } catch {
    /* ignore */
  }
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const lang = useI18n.getState().lang;
  const row = D[key];
  let s = row ? row[lang] : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}

export function useT() {
  const lang = useI18n((s) => s.lang);
  return (key: string, vars?: Record<string, string | number>) => {
    const row = D[key];
    let s = row ? row[lang] : key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    }
    return s;
  };
}

export function tx(pair: { zh: string; en: string } | string): string {
  const lang = useI18n.getState().lang;
  if (typeof pair === "string") return pair;
  return pair[lang];
}

/** Both languages at once — for persisted bilingual payloads (toasts, logs). */
export function tPair(key: string, vars?: Record<string, string | number>): { zh: string; en: string } {
  const row = D[key];
  const fill = (s: string) => {
    let out = s;
    if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
    return out;
  };
  return row ? { zh: fill(row.zh), en: fill(row.en) } : { zh: key, en: key };
}
