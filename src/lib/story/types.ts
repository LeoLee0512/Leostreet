
/**
 * Story mode: ten crises out of financial history, retold in the Leo world.
 *
 * Each scenario is a real, documented episode — the briefings state the actual
 * history with dates and figures, because that history IS the lesson. What the
 * player fights in-game is the Leo-world staging of it, with a fictional fund
 * on the other side of the trade, because putting a living person's decisions
 * into a scripted opponent is not something a game should do.
 *
 * The ten are ordered as a ladder: you clear one to open the next, and each
 * teaches a mechanism the one before it did not.
 */
export type StoryId =
  | "panic07"
  | "southsea"
  | "railway"
  | "baht"
  | "panic73"
  | "crash29"
  | "blackmon"
  | "pound"
  | "baring"
  | "ltcm"
  | "euro"
  | "hkd"
  | "lehman"
  | "depression";

/**
 * The shape of the crisis, which decides the vocabulary and which levers the
 * war room offers. The arithmetic underneath is shared — what differs is what
 * the numbers are called and which cards you are allowed to play.
 */
export type CrisisKind = "peg" | "run" | "mania" | "leverage" | "sovereign" | "depression";

/**
 * Who you are in the crisis, from the bottom of the market to the top.
 * The same scenario is a different game from each of these chairs.
 */
export type StoryRole = "retail" | "trader" | "fund" | "governor";

/** Which end of the trade your objective sits on. */
export type StorySide = "defend" | "attack" | "neutral";

/** 個人 or 組隊: one seat alone, or a five-seat desk. */
export type StoryMode = "solo" | "team";

/**
 * How long a run of this scenario is meant to take.
 *
 * Only the large set-pieces offer the choice. The tiers are not a difficulty
 * setting — the same crisis, the same arithmetic, told at four depths:
 * `sprint` skips the detail, `epic` restores as much of the record as the
 * game can carry.
 */
export type StoryLength = "sprint" | "standard" | "deep" | "epic";

/** Narrative depth, derived from the length. 0 = headlines only, 3 = the file. */
export type Detail = 0 | 1 | 2 | 3;

/** How a role's objective is checked when the scenario ends. */
export type ObjectiveKind =
  /** Keep the line intact until the last day. */
  | "holdPeg"
  /** Force the line to break. */
  | "breakPeg"
  /** Finish with at least `target` return on your own book. */
  | "profit"
  /** Finish with net worth still at or above `target` of where you started. */
  | "survive"
  /**
   * The line holds, the market survives, AND the panic is actually calmed —
   * pressure has to be back under `target` at the close. For the crises where
   * merely reaching Friday is not the same as having fixed anything.
   */
  | "contain"
  /**
   * End with the market index at or above `target`, and it does not matter
   * what happened to the line.
   *
   * For the one crisis where holding the line was the mistake: a country was
   * allowed to lose its gold parity in 1931-33, and was not allowed to lose
   * its banks. Scoring that seat on the line would teach the opposite of what
   * the record says.
   */
  | "revive";

export interface Objective {
  side: StorySide;
  kind: ObjectiveKind;
  /**
   * Return for `profit`, surviving fraction for `survive`, the pressure
   * ceiling for `contain`, unused otherwise.
   */
  target: number;
  /**
   * Extra condition: the index must still be at or above this at the end.
   * Hong Kong's governor is told they have to save the market as well as the
   * peg, so that promise is checked rather than merely written.
   */
  equityFloor?: number;
  titleZh: string;
  titleEn: string;
  /** 你要做什么 — the day-to-day job. */
  howZh: string;
  howEn: string;
  /** 怎么赢 — the exact condition, in plain words. */
  winZh: string;
  winEn: string;
  /** The trap this seat walks into if it plays naively. */
  trapZh: string;
  trapEn: string;
}

/** A scripted wave of selling. Scenarios escalate through these. */
export interface StoryPhase {
  /** Scenario day this wave lands on, 1-based, at `standard` length. */
  day: number;
  titleZh: string;
  titleEn: string;
  bodyZh: string;
  bodyEn: string;
  /** Pressure added to the line, in units where 1.0 breaks it outright. */
  pressure: number;
  /** Extra downward push on the equity board, as a fraction. */
  equityShock?: number;
  /**
   * Detail floor. A wave marked 2 exists only in the 一个半小时 and 三小时
   * tellings — it is a real day of the record that the short version skips.
   */
  minDetail?: Detail;
}

/** What one thing in this crisis is called, so the HUD never lies. */
export interface Lexicon {
  /** The thing being defended: 汇率钉住 / 清算所 / 回购市场. */
  lineZh: string;
  lineEn: string;
  /** The number shown beside the gauge. */
  gaugeZh: string;
  gaugeEn: string;
  /** The sentence printed the moment it goes. */
  breakZh: string;
  breakEn: string;
  /** The rate lever, which is not always a policy rate. */
  rateZh: string;
  rateEn: string;
  /** The pot the defender spends from. */
  potZh: string;
  potEn: string;
  /** Spending from that pot. */
  spendZh: string;
  spendEn: string;
  /** Buying the market outright, where history allowed it. */
  buyZh: string;
  buyEn: string;
  /**
   * What the board the defence damages is actually called. It is a stock
   * index in most of these and the company's own solvency in 1720, and a HUD
   * that calls the second one "the market" is teaching something false.
   */
  marketZh?: string;
  marketEn?: string;
  /** What shorting the line means from a seat that is not defending it. */
  shortLineZh?: string;
  shortLineEn?: string;
  /** What the other side of the player's own book is called. */
  shortEqZh?: string;
  shortEqEn?: string;
}

/** One line of a phone call. */
export interface CallLine {
  zh: string;
  en: string;
}

/** What you can say back, and what saying it costs. */
export interface CallOption {
  id: string;
  zh: string;
  en: string;
  /**
   * Applied the moment you say it. `pressure` is an absolute delta,
   * `equityMul` and `bookMul` are multipliers, `reserves` is in millions.
   */
  effect?: {
    pressure?: number;
    equityMul?: number;
    reserves?: number;
    bookMul?: number;
    credibility?: number;
  };
  /** What the caller says after you answer. */
  replyZh: string;
  replyEn: string;
  tone: "info" | "good" | "bad";
}

/**
 * A phone call.
 *
 * Inbound calls ring at you and have to be dealt with before the day can be
 * committed. Outbound calls are yours to place, or not — the information is
 * worth having and the minute it costs is real.
 */
export interface CallScript {
  id: string;
  /** Scenario day it lands on, 1-based, at `standard` length. */
  day: number;
  direction: "in" | "out";
  /** Detail floor, same rule as a phase: deeper tellings get more of these. */
  minDetail?: Detail;
  /** Who is on the other end. */
  fromZh: string;
  fromEn: string;
  /** Their job, under the name. */
  roleZh: string;
  roleEn: string;
  /** Only rings for these seats. Omitted means every seat. */
  seats?: StoryRole[];
  lines: CallLine[];
  options: CallOption[];
}

/** A named thing the player can be awarded. Mirrors `lengths.ts`. */
export interface Achievement {
  id: string;
  nameZh: string;
  nameEn: string;
  blurbZh: string;
  blurbEn: string;
}

/** The defender's standing orders when the player is not in that chair. */
export interface AutoDefence {
  /** Share of the remaining pot spent each step. */
  spend?: number;
  /** Standard-calendar day the defender makes a first, partial move on the rate. */
  nudgeOnDay?: number;
  nudgeTo?: number;
  /** Standard-calendar day it reaches for `hikeTo`, which defaults to the ceiling. */
  hikeOnDay?: number;
  hikeTo?: number;
  /** Buys the market from this day, at this share of the remaining pot. */
  buyFrom?: number;
  buy?: number;
  /** Makes the one public commitment on this day. */
  pledgeOn?: number;
}

export interface Scenario {
  id: StoryId;
  kind: CrisisKind;
  nameZh: string;
  nameEn: string;
  /** The real year, shown as a badge. */
  year: string;
  /** Difficulty grade, 1 (简单) to 10 (深渊). Ties are allowed. */
  grade: number;
  /** Position on the ladder, 1-based. You clear `n` to open `n+1`. */
  order: number;
  /**
   * Whether this is one of the large set-pieces that offers the four
   * durations. The shorter scenarios are single events and run at one length.
   */
  major: boolean;
  /** 前情提要 — where you are, in the world's own voice. */
  briefZh: string;
  briefEn: string;
  /** 史实 — what actually happened, stated plainly. */
  historyZh: string;
  historyEn: string;
  /**
   * The rest of the record, restored at the deeper tellings. Each entry is one
   * more documented fact the 半小时 version has no room for.
   */
  historyDeepZh?: string[];
  historyDeepEn?: string[];
  /** What this crisis teaches, which is why it is in the game. */
  lessonZh: string;
  lessonEn: string;
  lexicon: Lexicon;
  /** Per-crisis seat names: a governor is a clearing-house chairman in 1907. */
  seatLabel?: Partial<Record<StoryRole, { zh: string; en: string }>>;
  /** The defended rate, in local units per reserve currency. */
  pegRate: number;
  /** How far the rate may drift before the line counts as broken, as a fraction. */
  band: number;
  /** Headline reserves, in millions. */
  reserves: number;
  /**
   * Reserves already committed away in forwards and therefore NOT usable.
   * Thailand's hidden forward book is the whole reason its defence collapsed.
   */
  committedForward: number;
  /** Policy rate at the open. */
  startRate: number;
  /** The ceiling the defender may raise to before the economy is wrecked. */
  maxRate: number;
  /** Whether the defender may buy equities outright — Hong Kong's answer. */
  allowEquityDefence: boolean;
  /**
   * Whether the defender may make one unbacked promise — "whatever it takes".
   * It works only if the pot behind it is still credible; bluffing costs.
   */
  allowPledge?: boolean;
  /** Whether the defender may close the market for a day. */
  allowHalt?: boolean;
  /**
   * How much pressure a unit of the pot buys back, as a share of the pot.
   * A private rescue syndicate in 1907 spends far better than a central bank
   * selling into a one-way forward market in 1997.
   */
  reserveEfficiency?: number;
  /** Ceiling on the share of a new wave the rate lever can absorb, 0..1. */
  rateDefenceCap?: number;
  /**
   * Whether the lever ratchets: the defence is measured from the HIGHEST
   * setting ever reached, the cost from the current one.
   *
   * True where the lever removes something permanently rather than pricing it.
   * A margin requirement raised in 1929 takes leverage out of the system and
   * that leverage does not come back when the requirement is eased — so a
   * board that tightens early and eases into the fall keeps the protection
   * and stops forcing the liquidation, which is exactly the right answer and
   * exactly what nobody did.
   */
  rateRatchets?: boolean;
  /** How hard the rate lever leans on the equity board, per day. */
  rateDragK?: number;
  /**
   * How much the market lifts per unit of the pot spent buying it. Default 1.15.
   *
   * Low where the instrument is blunt. Open-market purchases into a banking
   * collapse do work — that is the whole argument of the monetary history —
   * and they work slowly, against a system that is destroying deposits faster
   * than the central bank is creating them.
   */
  buyPotency?: number;
  /** What a believed public commitment does to the market. Default 0.05. */
  pledgeRelief?: number;
  /** How many scenario days the defence has to last, at `standard`. */
  days: number;
  /**
   * How hard the crisis leans into its back half, 0 = flat.
   *
   * The same total weight, redistributed: the opening sessions give ground and
   * the closing ones carry several times what they used to. Every one of these
   * episodes got worse as it went on, and a crisis whose last hour feels like
   * its first hour is not telling the truth about any of them.
   */
  escalation?: number;
  /**
   * Whether the run ends the moment the line goes. Defaults to true.
   *
   * False where losing the line is a turning point rather than an ending —
   * leaving gold in 1931 is the beginning of the recovery, not the end of the
   * scenario, and stopping the clock there would score it backwards.
   */
  endsOnBreak?: boolean;
  /** Relief the market gets once the line is gone, for the scenarios that continue. */
  breakRelief?: number;
  /**
   * The single most valuable thing in the game, awarded for winning this
   * crisis at the three-hour telling and nowhere else.
   */
  crown?: Achievement;
  /**
   * How the engine plays the defender when the player is sitting somewhere
   * else. Without this nobody defends, every line falls on schedule, and a
   * player taking the attacker's seat wins scenarios history records as held.
   * Written as data rather than code so it scales onto a longer telling's
   * calendar the same way a scripted wave does.
   */
  autoDefence?: AutoDefence;
  phases: StoryPhase[];
  calls: CallScript[];
  /** What history recorded, revealed on the result screen. */
  historicalOutcome: "broke" | "held";
  /**
   * What to say about that outcome, where the generic line would mislead.
   *
   * "历史上这条防线没有守住" is a fair summary of 1992 and a false one of
   * 1933, where the line breaking was the right answer arriving late.
   */
  outcomeNoteZh?: string;
  outcomeNoteEn?: string;
  objectives: Record<StoryRole, Objective>;
}

/** Live state of one scenario run. */
export interface StoryRun {
  scenarioId: StoryId;
  role: StoryRole;
  mode: StoryMode;
  length: StoryLength;
  detail: Detail;
  /** Resolved decision count for this telling. */
  days: number;
  /**
   * Per-step scale for anything that accrues per decision rather than per
   * event — baseline noise, the rate lever's drag on the market. 1 in the
   * reference telling, smaller when the clock is cut more finely.
   */
  tempo: number;
  /** Baseline pressure per quiet step, set so the crisis weighs the same at every length. */
  drift: number;
  /** Scale on scripted waves, for the same reason. */
  waveScale: number;
  /** How hard this run leans into its back half. */
  escalation: number;
  /** Normaliser that keeps the escalated total equal to the flat one. */
  escNorm: number;
  /** The seed the plan was drawn from. Replaying it replays this exact history. */
  seed: number;
  /** What was different about this run, for the debrief. */
  divergences: { zh: string; en: string }[];
  /** Scale on scripted market shocks, for the same reason. */
  shockScale: number;
  /** Waves resolved onto this telling's calendar. */
  phases: StoryPhase[];
  /** Calls resolved onto this telling's calendar. */
  calls: CallScript[];
  /** Ids of calls already dealt with. */
  callsDone: string[];
  day: number;
  /** 0 → line intact, ≥1 → broken. */
  pressure: number;
  /** Usable reserves in millions; headline minus what is committed forward. */
  reserves: number;
  /** Reserves burned so far, for the debrief. */
  spent: number;
  rate: number;
  /** Market rate. Drifts past the band once the line goes. */
  spot: number;
  pegBroken: boolean;
  /** Equity index, 100 at the open. */
  equity: number;
  /** The player's own book value, 100 at the open. */
  book: number;
  /** Player's currency short, as a fraction of their book. */
  shortCcy: number;
  /** Player's equity short, as a fraction of their book. */
  shortEquity: number;
  /** The highest the lever has been set to, for the scenarios where it ratchets. */
  rateHigh: number;
  /** 0..1. Spent by bluffing and by closing the market; never refunded. */
  credibility: number;
  /** The one promise, once used. */
  pledged: boolean;
  /** Days the market was closed. */
  halts: number;
  /** Multiplier applied to tomorrow's wave, left behind by a halt. */
  carryOver: number;
  /** A live market closure persists until the next historical wave. */
  marketHalted?: boolean;
  log: StoryLogItem[];
  done: boolean;
  won: boolean;
  /** Wall-clock ms the run has been open, for the debrief. */
  startedAt: number;
  finishedAt: number;
}

export interface StoryLogItem {
  day: number;
  zh: string;
  en: string;
  tone: "info" | "good" | "bad";
}
