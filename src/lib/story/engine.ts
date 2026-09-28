import { clamp, makeRng, seededDraw } from "../game/math.ts";
import { calendarDays, lengthOf, sessionsOf, stepScale, totalSteps } from "./lengths.ts";
import { eligibleCalls } from "./calls.ts";
import { DIVERGENCES } from "./crises/seats.ts";
import { scenarioOf, usableReserves } from "./scenarios.ts";
import type {
  CallOption,
  CallScript,
  Scenario,
  StoryLength,
  StoryMode,
  StoryPhase,
  StoryRole,
  StoryRun,
} from "./types.ts";

/**
 * The defence engine.
 *
 * One decision at a time. Pressure accumulates from scripted waves and from
 * the attacker's own book; the defender pushes back with the pot, with the
 * rate lever, and — only where history allows it — by buying the market, by
 * making one public commitment, or by closing the market for a day.
 *
 * The rule that makes this more than a slider game is the coupling: **the
 * lever that defends the line sells the market.** Whether that lever is a
 * policy rate (1992), a margin requirement (1929), austerity (2012) or the
 * share of the purchase price you lend your own buyers (1720), it is always
 * double-edged, and that is what every one of these crises has in common.
 */

/** Pressure at or above this and the line is gone. */
export const BREAK_AT = 1;

/** Baseline pressure per day in the reference telling, before scripted waves. */
const BASE_DRIFT = 0.08;

/**
 * How far a scripted wave may come out differently this time, either way.
 *
 * Small on purpose. The big events are guaranteed — the forward book still
 * leaks, the index still gaps, the bank still fails — but they never land at
 * exactly the weight or exactly the hour they landed in the record, and the
 * difference is enough to change who wins. History rhymes; it does not repeat
 * to three decimal places.
 */
const JITTER = 0.16;

/** How many of the divergence beats a run gets. */
const DIVERGENCE_COUNT = 2;

/** Default lean into the back half. Overridable per scenario. */
const BASE_ESCALATION = 1.7;

/**
 * Start a run.
 *
 * `seed` decides this telling of the crisis: how hard each documented wave
 * lands, whether it arrives a session early or late, and which two things
 * went differently from the record. Replaying the same seed replays the same
 * history exactly, which is what makes a defeat worth studying — and a new
 * seed is a new run at the same crisis, which is what stops the tenth attempt
 * being a memory test.
 */
export function createRun(
  scenarioId: StoryRun["scenarioId"],
  role: StoryRole,
  mode: StoryMode,
  length: StoryLength = "sprint",
  seed = 1,
): StoryRun {
  const s = scenarioOf(scenarioId);
  const spec = lengthOf(length);
  const steps = totalSteps(s, length);
  const rng = makeRng(seed >>> 0 || 1);
  const sessions = Math.max(1, Math.round(steps / Math.max(1, calendarDays(s, length))));
  const phases = planPhases(s, spec.detail, steps, rng, sessions);
  const divergences = planDivergences(phases, steps, rng);
  const drift = planDrift(s, phases, steps);
  const escalation = s.escalation ?? BASE_ESCALATION;
  return {
    scenarioId,
    role,
    mode,
    length,
    detail: spec.detail,
    days: steps,
    tempo: stepScale(s, length),
    drift,
    waveScale: planWaveScale(s, phases, steps),
    shockScale: planShockScale(s, phases),
    escalation,
    escNorm: planEscNorm(phases, drift, steps, escalation),
    seed,
    divergences: divergences.map((d) => ({ zh: d.titleZh, en: d.titleEn })),
    phases,
    calls: planCalls(s, spec.detail, role, steps),
    callsDone: [],
    day: 1,
    pressure: 0,
    reserves: usableReserves(s),
    spent: 0,
    rate: s.startRate,
    spot: s.pegRate,
    pegBroken: false,
    equity: 100,
    book: 100,
    shortCcy: 0,
    shortEquity: 0,
    rateHigh: s.startRate,
    credibility: 1,
    pledged: false,
    halts: 0,
    carryOver: 0,
    log: [],
    done: false,
    won: false,
    startedAt: Date.now(),
    finishedAt: 0,
  };
}

/* ------------------------------------------------------------------ */
/* Planning a telling                                                  */
/* ------------------------------------------------------------------ */

/**
 * Map a day on the scenario's own calendar onto a step of this telling.
 *
 * Days are written once, against the reference calendar, and land on the same
 * relative position however finely the clock is cut. A wave that already owns
 * its step moves to the next free one rather than stacking, because two total
 * assaults resolving in the same session reads as one.
 */
function stepOfDay(s: Scenario, day: number, steps: number): number {
  return clamp(Math.round(((day - 0.5) / Math.max(1, s.days)) * steps + 0.5), 1, steps);
}

function planPhases(
  s: Scenario,
  detail: number,
  steps: number,
  rng: () => number,
  sessions: number,
): StoryPhase[] {
  const taken = new Set<number>();
  return s.phases
    .filter((p) => (p.minDetail ?? 0) <= detail)
    .sort((a, b) => a.day - b.day)
    .map((p) => {
      // The event happens. How heavily it lands, and whether it lands a day
      // either side of where the record puts it, is this run's own.
      const weight = 1 + (rng() - 0.5) * 2 * JITTER;
      const shift = Math.round((rng() - 0.5) * 2) * sessions;
      let day = clamp(stepOfDay(s, p.day, steps) + shift, 1, steps);
      while (taken.has(day) && day < steps) day += 1;
      taken.add(day);
      return {
        ...p,
        day,
        pressure: p.pressure * weight,
        equityShock: p.equityShock === undefined ? undefined : p.equityShock * weight,
      };
    });
}

/**
 * The two things that went differently this time.
 *
 * Drawn from a shared pool rather than written per crisis, because what they
 * are is deliberately mundane: a paper running a day early, a neighbour
 * picking up the phone, a number published late. None of them is the story.
 * Each of them is enough to move the ending.
 */
function planDivergences(phases: StoryPhase[], steps: number, rng: () => number): StoryPhase[] {
  const pool = [...DIVERGENCES];
  const taken = new Set(phases.map((p) => p.day));
  const out: StoryPhase[] = [];
  for (let i = 0; i < DIVERGENCE_COUNT && pool.length > 0; i++) {
    const pick = pool.splice(Math.floor(rng() * pool.length), 1)[0]!;
    // Never on the opening step: a run that diverges before it starts reads as
    // a different scenario rather than as the same one going differently.
    let day = clamp(2 + Math.floor(rng() * Math.max(1, steps - 2)), 2, steps);
    while (taken.has(day) && day < steps) day += 1;
    if (taken.has(day)) continue;
    taken.add(day);
    out.push({ ...pick, day });
    phases.push({ ...pick, day });
  }
  phases.sort((a, b) => a.day - b.day);
  return out;
}

/**
 * How much heavier a step is for being late in the crisis.
 *
 * Raw shape only; `escNorm` scales it so the run carries the same total it
 * would have carried flat. What changes is the distribution: the first
 * sessions are quiet and the last ones are not survivable on the opening
 * settings.
 */
export function escalationAt(run: StoryRun, step: number): number {
  if (run.days <= 1) return 1;
  const t = clamp((step - 1) / (run.days - 1), 0, 1);
  return (1 + run.escalation * Math.pow(t, 1.6)) * run.escNorm;
}

/** Solve the normaliser so escalation redistributes weight without adding any. */
function planEscNorm(phases: StoryPhase[], drift: number, steps: number, escalation: number): number {
  let flat = 0;
  let leaned = 0;
  const byStep = new Map<number, number>();
  for (const p of phases) byStep.set(p.day, (byStep.get(p.day) ?? 0) + p.pressure);
  for (let step = 1; step <= steps; step++) {
    const w = byStep.get(step) ?? drift;
    const t = steps > 1 ? (step - 1) / (steps - 1) : 0;
    flat += w;
    leaned += w * (1 + escalation * Math.pow(t, 1.6));
  }
  return leaned > 0 ? flat / leaned : 1;
}

function planCalls(s: Scenario, detail: number, role: StoryRole, steps: number): CallScript[] {
  return eligibleCalls(s, detail as 0 | 1 | 2 | 3, role).map((c) => ({
    ...c,
    day: stepOfDay(s, c.day, steps),
  }));
}

/**
 * Baseline pressure per step, set so a crisis weighs the same in every
 * telling.
 *
 * The deeper tellings turn on extra waves out of the record. Left alone that
 * would quietly make the long version harder — the player would be punished
 * for choosing the version with more history in it. So the scripted waves keep
 * their full weight and the quiet days give ground: the total is held at what
 * the reference telling carries, and the extra detail shows up as texture
 * rather than as difficulty.
 */
/** The total weight of this crisis, as the reference telling carries it. */
function referenceTotal(s: Scenario): number {
  const base = s.phases.filter((p) => (p.minDetail ?? 0) === 0);
  // Drift only lands on steps with no scripted wave on them, so the reference
  // has to be counted the same way or the long tellings drift away from the
  // balance the tests pin.
  return base.reduce((a, p) => a + p.pressure, 0) + BASE_DRIFT * Math.max(0, s.days - base.length);
}

/** The budget the quiet steps share between them. Constant across tellings. */
function quietBudget(s: Scenario): number {
  const base = s.phases.filter((p) => (p.minDetail ?? 0) === 0);
  return BASE_DRIFT * Math.max(0, s.days - base.length);
}

function planDrift(s: Scenario, phases: StoryPhase[], steps: number): number {
  return quietBudget(s) / Math.max(1, steps - phases.length);
}

/**
 * Scale on the scripted waves, so a deeper telling is not a harder one.
 *
 * The longer tellings turn on waves out of the record that the short version
 * skips. Left alone the extra detail would quietly add weight, and a player
 * would be punished for choosing the version with more history in it. So the
 * crisis keeps the total it carries in the reference telling and the extra
 * waves share it out: more events, each slightly lighter, same fight.
 *
 * Relief written into the record — a joint intervention, a bankers' pool —
 * keeps its full size, because scaling the good news down with the bad would
 * teach that stepping in matters less the more closely you look.
 */
function planWaveScale(s: Scenario, phases: StoryPhase[], steps: number): number {
  const positive = phases.reduce((a, p) => a + Math.max(0, p.pressure), 0);
  if (positive <= 0) return 1;
  const negative = phases.reduce((a, p) => a + Math.min(0, p.pressure), 0);
  const room = referenceTotal(s) - planDrift(s, phases, steps) * Math.max(0, steps - phases.length) - negative;
  return clamp(room / positive, 0, 1);
}

/** Same idea for the equity board: the scripted falls total the same either way. */
function planShockScale(s: Scenario, phases: StoryPhase[]): number {
  const positive = (list: StoryPhase[]) =>
    list.reduce((a, p) => a + Math.max(0, p.equityShock ?? 0), 0);
  const here = positive(phases);
  if (here <= 0) return 1;
  const reference = positive(s.phases.filter((p) => (p.minDetail ?? 0) === 0));
  return reference > 0 ? reference / here : 1;
}

/* ------------------------------------------------------------------ */
/* The clock                                                           */
/* ------------------------------------------------------------------ */

/** Which calendar day of the crisis a step falls on, 1-based. */
export function calendarDayOf(run: StoryRun): number {
  return Math.ceil(run.day / sessionsOf(scenarioOf(run.scenarioId), run.length));
}

/** Which session within that day, 0-based. */
export function sessionOf(run: StoryRun): number {
  return (run.day - 1) % sessionsOf(scenarioOf(run.scenarioId), run.length);
}

/** Total calendar days in this telling, for the HUD. */
export function totalCalendarDays(run: StoryRun): number {
  return calendarDays(scenarioOf(run.scenarioId), run.length);
}

/* ------------------------------------------------------------------ */

function push(run: StoryRun, zh: string, en: string, tone: StoryRun["log"][number]["tone"] = "info") {
  run.log.unshift({ day: run.day, zh, en, tone });
  if (run.log.length > 60) run.log.length = 60;
}

/** Reserve spend that meaningfully moves the pressure, as a share of the pot. */
function reserveBite(s: Scenario, amount: number): number {
  // Spending is deliberately inefficient: burning a tenth of what you started
  // with buys back well under a tenth of the pressure. Reserves alone have
  // never held a line that the market has decided to test. How inefficient is
  // per crisis — a private syndicate putting real money out in public in 1907
  // buys far more than a central bank selling into a one-way forward market.
  const pot = Math.max(1, usableReserves(s));
  return (amount / pot) * (s.reserveEfficiency ?? 0.55);
}

/**
 * The share of an incoming wave the rate lever absorbs.
 *
 * Deliberately a *fraction of new pressure* and never a subtraction from
 * pressure already on the board. A rate makes it expensive to put fresh
 * positions on; it does nothing about the ones already there. And it tops out
 * well short of 1, because the thing all of these crises have in common is
 * that the ceiling was not enough — sterling went to 15% on the day it lost.
 */
export function rateDefence(s: Scenario, rate: number): number {
  const over = Math.max(0, rate - s.startRate);
  const room = Math.max(0.01, s.maxRate - s.startRate);
  const cap = s.rateDefenceCap ?? 0.6;
  return clamp((over / room) * cap, 0, cap);
}

/**
 * What that same lever does to the market, per step of the reference telling.
 *
 * Scaled so that sitting at the ceiling for a whole scenario costs a serious
 * share of the index rather than all of it — a defence has to hurt, but an
 * index pinned at the floor makes every later decision meaningless.
 */
export function rateEquityDrag(s: Scenario, rate: number): number {
  const over = Math.max(0, rate - s.startRate);
  return over * (s.rateDragK ?? 0.25);
}

/**
 * The defender, when the player is sitting somewhere else.
 *
 * Each crisis's defender plays the defence its real counterpart played, so a
 * player who takes the fund seat in Hong Kong is up against a competent
 * defence and should lose — which is what history records. Day thresholds are
 * written on the reference calendar and scaled onto whichever telling is
 * running, the same way a scripted wave is.
 */
export function autoDefence(run: StoryRun, s: Scenario): DayOrders {
  const a = s.autoDefence;
  if (!a) return {};
  const at = (day?: number) => typeof day === "number" && run.day >= stepOfDay(s, day, run.days);
  const rate = at(a.hikeOnDay)
    ? (a.hikeTo ?? s.maxRate)
    : at(a.nudgeOnDay)
      ? (a.nudgeTo ?? s.startRate)
      : s.startRate;
  return {
    spend: a.spend ? run.reserves * a.spend : 0,
    rate,
    buyEquity: a.buy && at(a.buyFrom) ? run.reserves * a.buy : 0,
    pledge: at(a.pledgeOn),
  };
}

export interface DayOrders {
  /** Reserves to sell today, in millions. */
  spend?: number;
  /** New setting for the rate lever. */
  rate?: number;
  /** Market bought outright with the pot — where history allowed it. */
  buyEquity?: number;
  /** The one public commitment. Ignored once spent. */
  pledge?: boolean;
  /** Close the market for this step. */
  halt?: boolean;
  /** Player's own short against the line, 0..2 of their book. */
  shortCcy?: number;
  /** Player's own equity short / hedge, 0..2 of their book. */
  shortEquity?: number;
}

/* ------------------------------------------------------------------ */
/* Phone calls                                                         */
/* ------------------------------------------------------------------ */

/**
 * Apply what the player just said on the phone.
 *
 * Calls are resolved immediately rather than folded into the day's step,
 * because that is what a call is: you say the sentence and the consequence is
 * already moving before you hang up.
 */
export function applyCall(run: StoryRun, script: CallScript, option: CallOption): StoryRun {
  if (run.done || run.callsDone.includes(script.id)) return run;
  run.callsDone.push(script.id);
  const e = option.effect;
  if (e) {
    if (typeof e.pressure === "number") run.pressure = Math.max(0, run.pressure + e.pressure);
    if (typeof e.equityMul === "number") run.equity = Math.max(5, run.equity * e.equityMul);
    if (typeof e.reserves === "number") {
      const delta = e.reserves;
      run.reserves = Math.max(0, run.reserves + delta);
      if (delta < 0) run.spent += Math.min(-delta, run.reserves + -delta);
    }
    if (typeof e.bookMul === "number") run.book = Math.max(1, run.book * e.bookMul);
    if (typeof e.credibility === "number") {
      run.credibility = clamp(run.credibility + e.credibility, 0, 1);
    }
  }
  push(
    run,
    `【电话·${script.fromZh}】${option.zh} —— ${option.replyZh}`,
    `[Call · ${script.fromEn}] ${option.en} — ${option.replyEn}`,
    option.tone,
  );
  return run;
}

/* ------------------------------------------------------------------ */
/* One step                                                            */
/* ------------------------------------------------------------------ */

/** Apply policy costs and direct effects without moving the historical clock. */
function applyDefenceOrders(run: StoryRun, defence: DayOrders, s: Scenario) {
  // --- the defender's orders -------------------------------------------
  if (typeof defence.rate === "number") {
    const wanted = clamp(defence.rate, s.startRate, s.maxRate);
    if (Math.abs(wanted - run.rate) > 1e-9) {
      const up = wanted > run.rate;
      run.rate = wanted;
      run.rateHigh = Math.max(run.rateHigh, wanted);
      push(
        run,
        `${s.lexicon.rateZh}调整至 ${(wanted * 100).toFixed(2)}%。${up ? "投机成本上去了，市场也会疼。" : "松了一口气，投机成本也降了。"}`,
        `${s.lexicon.rateEn} set to ${(wanted * 100).toFixed(2)}%. ${up ? "Speculation costs more; so does owning the market." : "Relief — and cheaper to bet against you."}`,
        up ? "info" : "bad",
      );
    }
  }

  const spend = Math.max(0, Math.min(defence.spend ?? 0, run.reserves));
  if (spend > 0) {
    run.reserves -= spend;
    run.spent += spend;
    push(
      run,
      `${s.lexicon.spendZh} ${Math.round(spend).toLocaleString()}（剩余 ${Math.round(run.reserves).toLocaleString()}）。`,
      `${s.lexicon.spendEn}: ${Math.round(spend).toLocaleString()} (${Math.round(run.reserves).toLocaleString()} left).`,
      run.reserves <= 0 ? "bad" : "info",
    );
  }

  const equityBuy = s.allowEquityDefence ? Math.max(0, Math.min(defence.buyEquity ?? 0, run.reserves)) : 0;
  if (equityBuy > 0) {
    run.reserves -= equityBuy;
    run.spent += equityBuy;
    // Buying the market is what turns the short futures leg against the attacker.
    run.equity *= 1 + (equityBuy / Math.max(1, usableReserves(s))) * (s.buyPotency ?? 1.15);
    push(
      run,
      `${s.lexicon.buyZh} ${Math.round(equityBuy).toLocaleString()}。空方的那条腿开始被轧。`,
      `${s.lexicon.buyEn}: ${Math.round(equityBuy).toLocaleString()}. The short leg starts to hurt.`,
      "good",
    );
  }

  // --- the one promise ---------------------------------------------------
  // It costs nothing and it is not free: an unbacked promise is a distress
  // signal, and the market prices it as one.
  if (defence.pledge && s.allowPledge && !run.pledged) {
    run.pledged = true;
    const backing = run.reserves / Math.max(1, usableReserves(s));
    if (backing >= 0.32 && run.credibility >= 0.5) {
      run.pressure = Math.max(0, run.pressure * 0.55);
      run.credibility = clamp(run.credibility + 0.05, 0, 1);
      run.equity *= 1 + (s.pledgeRelief ?? 0.05);
      push(
        run,
        "你公开承诺：不惜一切代价。所有人都看得到你背后还有多少弹药——所以他们信了。",
        "You commit publicly: whatever it takes. Everybody can see the ammunition still behind it, so they believe you.",
        "good",
      );
    } else {
      run.pressure += 0.18;
      run.credibility = clamp(run.credibility - 0.25, 0, 1);
      push(
        run,
        "你公开承诺：不惜一切代价。市场算了一下你还剩多少钱，把这句话当成了求救信号。",
        "You commit publicly: whatever it takes. The market does the arithmetic on what is left behind it and hears a distress call.",
        "bad",
      );
    }
  }

  // --- closing the market ------------------------------------------------
  let halted = Boolean(run.marketHalted);
  if (!halted && defence.halt && s.allowHalt && run.halts < 2 && !run.pegBroken) {
    halted = true;
    run.halts += 1;
    run.credibility = clamp(run.credibility - 0.2, 0, 1);
    run.carryOver += 0.55;
    push(
      run,
      "市场关闭一个时段。回路被掐断了——代价是没有人知道东西现在值多少钱，而这笔账明天要还。",
      "The market closes for a session. The loop is cut — at the price that nobody knows what anything is worth, and that bill arrives tomorrow.",
      "info",
    );
  }

  return { spend, halted };
}

/** Real-time desk: execution now, historical waves later; never charge twice. */
export function applyImmediateOrders(run: StoryRun, orders: DayOrders) {
  if (run.done || run.role !== "governor") return;
  const s = scenarioOf(run.scenarioId);
  const opening = run.equity;
  const { spend, halted } = applyDefenceOrders(run, orders, s);
  run.pressure = Math.max(0, run.pressure - reserveBite(s, spend));
  run.marketHalted = halted;
  run.book = Math.max(1, run.book * (1 + (run.equity / opening - 1) * 0.8));
}

/**
 * Advance one decision.
 *
 * Mutates and returns `run`. `rngState` keeps the noise seeded so a scenario
 * replays identically — a story you cannot re-run the same way is a story you
 * cannot learn from.
 */
export function stepDay(run: StoryRun, orders: DayOrders, rngState: number): { run: StoryRun; rngState: number } {
  if (run.done) return { run, rngState };
  const s = scenarioOf(run.scenarioId);
  const { value: noise, next } = seededDraw(rngState, 1);
  const tempo = run.tempo || 1;

  // Only the defender's seat commands the defence. From any other chair it is
  // run by the engine — otherwise nobody would be defending at all and every
  // line would fall on schedule regardless of history.
  const mine = run.role === "governor";
  const defence: DayOrders = mine ? orders : autoDefence(run, s);
  // Where the index opened. Books are marked against the step's move, never
  // against the cumulative deviation — doing the latter re-charged the player
  // for the same decline on every subsequent step.
  const eqOpen = run.equity;

  const { spend, halted } = applyDefenceOrders(run, defence, s);
  run.marketHalted = false;

  // --- the player's own book -------------------------------------------
  if (typeof orders.shortCcy === "number") run.shortCcy = clamp(orders.shortCcy, 0, 2);
  if (typeof orders.shortEquity === "number") run.shortEquity = clamp(orders.shortEquity, 0, 2);

  // --- the wave ---------------------------------------------------------
  // Closing the market does not make the sellers go away: whatever was due
  // today is still due, and it arrives on top of tomorrow.
  const due = run.phases.find((p) => p.day === run.day);
  if (halted && due) due.day = Math.min(run.days, run.day + 1);
  const phase = halted ? undefined : due;
  if (phase) {
    push(run, `【${phase.titleZh}】${phase.bodyZh}`, `[${phase.titleEn}] ${phase.bodyEn}`, "bad");
  }

  // A halt buys this step and charges the next one; a defender nobody believes
  // any more takes every wave a little harder.
  const carry = halted ? 1 : 1 + run.carryOver;
  if (!halted) run.carryOver = 0;
  const doubt = 1 + (1 - run.credibility) * 0.35;

  // Rates blunt what arrives now; the pot buys back what is already there.
  // Two different cards doing two different jobs, which is why neither alone
  // has ever been enough.
  const scripted = phase ? phase.pressure * (phase.pressure > 0 ? run.waveScale : 1) : run.drift;
  // Late sessions carry several times what the opening ones did. Same total,
  // redistributed — see `escalationAt`.
  const raw = halted ? 0 : scripted * escalationAt(run, run.day) + (noise - 0.5) * 0.05 * tempo;
  // Where the lever ratchets, what it already took out of the system stays
  // out — the protection is measured from the high-water mark, the pain from
  // where the lever is sitting today.
  const resist = rateDefence(s, s.rateRatchets ? Math.max(run.rate, run.rateHigh) : run.rate);
  const wave = raw > 0 ? raw * (1 - resist) * carry * doubt : raw;
  const buyback = reserveBite(s, spend);
  const before = run.pressure;
  run.pressure = Math.max(0, run.pressure + wave - buyback);

  // A seat whose own solvency IS the line relieves its own margin by cutting.
  const obj = s.objectives[run.role];
  if (obj.kind === "survive" && obj.side === "defend") {
    run.pressure = Math.max(0, run.pressure - run.shortEquity * 0.06 * tempo);
  }

  // --- the market board -------------------------------------------------
  const drag = halted
    ? 0
    : rateEquityDrag(s, run.rate) * tempo + (phase?.equityShock ?? 0) * run.shockScale;
  run.equity = Math.max(5, run.equity * (1 - drag) * (1 + (noise - 0.5) * 0.02 * tempo));

  // --- did it break? ----------------------------------------------------
  if (!run.pegBroken && run.pressure >= BREAK_AT) {
    run.pegBroken = true;
    // The move on the step the line goes. Historically brutal and immediate,
    // and scaled to what the line actually was: a peg gaps by a fifth, a
    // sovereign spread by a great deal more.
    run.spot = s.pegRate * (1 + Math.max(0.22, s.band * 1.6));
    push(run, s.lexicon.breakZh, s.lexicon.breakEn, s.endsOnBreak === false ? "good" : "bad");
    // Where losing the line is a turning point rather than an ending, the
    // constraint coming off is exactly the relief the economy needed.
    if (s.endsOnBreak === false) run.equity *= 1 + (s.breakRelief ?? 0.12);
  } else if (run.pegBroken) {
    run.spot *= 1 + 0.05 * noise;
  } else {
    // Inside the band the rate creeps toward the weak edge as pressure builds.
    run.spot = s.pegRate * (1 + s.band * clamp(run.pressure, 0, 1) * 0.9);
  }

  // --- mark the player's book ------------------------------------------
  const ccyMove = run.pegBroken && before < BREAK_AT ? 0.22 : run.pegBroken ? 0.05 * noise : 0;
  const eqMove = run.equity / Math.max(1e-6, eqOpen) - 1;
  run.book *= 1 + run.shortCcy * ccyMove;
  run.book *= 1 - run.shortEquity * eqMove;
  // An unhedged book rides the market down with everyone else.
  if (run.shortEquity < 0.2) run.book *= 1 + eqMove * 0.8;
  run.book = Math.max(1, run.book);

  // A line already gone cannot go again, and the pressure behind it has
  // nowhere left to push.
  if (run.pegBroken && s.endsOnBreak === false) run.pressure = Math.min(run.pressure, BREAK_AT);

  run.day += 1;
  if (run.day > run.days || (run.pegBroken && s.endsOnBreak !== false)) finish(run, s);
  return { run, rngState: next };
}

/** Score the run against the seat's own objective. */
export function finish(run: StoryRun, s: Scenario = scenarioOf(run.scenarioId)) {
  if (run.done) return;
  run.done = true;
  run.finishedAt = Date.now();
  const obj = s.objectives[run.role];
  switch (obj.kind) {
    case "holdPeg":
      // Some defences are only half won by holding the line — see the Hong
      // Kong governor, who is explicitly told to save the index too.
      run.won = !run.pegBroken && run.equity >= (obj.equityFloor ?? 0);
      break;
    case "breakPeg":
      run.won = run.pegBroken;
      break;
    case "profit":
      run.won = run.book / 100 - 1 >= obj.target;
      break;
    case "survive":
      // A seat that IS the line has to still be standing, not merely solvent
      // on paper: a fund liquidated at the worst price on the screen did not
      // survive, whatever its last mark says.
      run.won = run.book / 100 >= obj.target && (obj.side !== "defend" || !run.pegBroken);
      break;
    case "revive":
      // The one seat scored on what it saved rather than on what it held.
      run.won = run.equity >= obj.target;
      break;
    case "contain":
      // Reaching the last day is not the same as having fixed anything.
      run.won =
        !run.pegBroken && run.equity >= (obj.equityFloor ?? 0) && run.pressure <= obj.target;
      break;
  }
}

/** Decisions of defence left, for the HUD. */
export function daysLeft(run: StoryRun): number {
  return Math.max(0, run.days - run.day + 1);
}

/** 0..1, how close the line is to going. */
export function pegHealth(run: StoryRun): number {
  return clamp(1 - run.pressure / BREAK_AT, 0, 1);
}

/** Minutes the player has actually spent in this run. */
export function elapsedMinutes(run: StoryRun): number {
  const end = run.finishedAt || Date.now();
  return Math.max(0, Math.round((end - run.startedAt) / 60000));
}
