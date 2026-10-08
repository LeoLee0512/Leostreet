import {
  createCivic,
  tickCivic,
  normalizeCivic,
  applyCivicAction,
  type CivicState,
  type CivicAction,
} from "./civic.ts";
import {
  advanceEconomy,
  buildProject,
  cancelProject,
  createEconomy,
  normalizeEconomy,
  normalizeEconomyOrders,
  applyEconomyOrders,
  SECTORS,
  type Economy,
  type EconomyOrders,
  type SectorId,
} from "./economy.ts";
import { create } from "zustand";
import { seededDraw } from "../game/math.ts";
import { recordBout } from "../game/honor.ts";
import { connectDelayMs, outboundCalls, ringingCalls } from "./calls.ts";
import { applyCall, applyImmediateOrders, createRun, stepDay, type DayOrders } from "./engine.ts";
import {
  canPause,
  createCabinet,
  decisionSeconds,
  enactRoute,
  marketResponse,
  stakeholderPressure,
  type CrisisCabinet,
  type PolicyId,
} from "./realtime.ts";
import { gradeOf } from "./difficulty.ts";
import { lengthOf, lengthsFor } from "./lengths.ts";
import { recordClear, type ClearResult } from "./progress.ts";
import { scenarioOf } from "./scenarios.ts";
import type {
  CallOption,
  CallScript,
  StoryId,
  StoryLength,
  StoryMode,
  StoryRole,
  StoryRun,
} from "./types.ts";

/** Real-time economy with independent historical deadlines and decision-only pause. */
export type StoryScreen = "idle" | "briefing" | "playing" | "debrief";

/**
 * A call in progress.
 *
 * `ringing` is the moment before you pick up. `connecting` is the half-second
 * of nothing — the one place in this game with a deliberate delay, because a
 * call that resolves the instant you click it is a dialog box wearing a
 * telephone's clothes. `live` is the conversation, `reply` is what they said
 * back before the line goes down.
 */
export interface PhoneCall {
  script: CallScript;
  /** ms this particular call takes to connect, drawn off the run's own stream. */
  delay: number;
  status: "ringing" | "connecting" | "live" | "reply";
  picked: CallOption | null;
}

interface StoryStore {
  screen: StoryScreen;
  scenarioId: StoryId;
  role: StoryRole;
  mode: StoryMode;
  length: StoryLength;
  run: StoryRun | null;
  /** Orders staged for the step the player has not committed yet. */
  draft: DayOrders;
  phone: PhoneCall | null;
  /** Set when the finished run cleared something. Read by the debrief. */
  clear: ClearResult | null;
  rngState: number;
  rev: number;
  paused: boolean;
  secondsLeft: number;
  elapsedSeconds: number;
  submitted: "orders" | "silence" | null;
  confirmedDraft: DayOrders;
  pendingReply: string | null;
  silentCall: boolean;
  queuedPolicy: PolicyId | null;
  cabinet: CrisisCabinet;
  economy: Economy;
  civic: CivicState;
  pendingCivic: CivicAction[];
  civicAction: (action: CivicAction) => void;
  acknowledge: () => void;
  economicDraft: EconomyOrders;
  pendingBuilds: SectorId[];
  pendingOrders: boolean;
  economicNotice: { zh: string; en: string; ok?: boolean } | null;
  setEconomy: (orders: Partial<EconomyOrders>) => void;
  construct: (sector: SectorId) => void;
  cancelConstruction: (id: number) => void;
  advanceTime: (seconds: number) => void;
  togglePause: () => void;
  keepSilent: () => void;
  choosePolicy: (id: PolicyId) => void;
  persistRun: () => void;
  resumeRun: () => boolean;

  /**
   * Open the briefing for a scenario.
   *
   * `seed` decides how this telling diverges from the record. The picker does
   * not pass one, so every fresh entry is a new run at the same crisis; the
   * debrief's 再打一次 passes the run's own seed back, so a defeat can be
   * replayed and studied exactly as it happened.
   */
  brief: (
    id: StoryId,
    role: StoryRole,
    mode: StoryMode,
    length?: StoryLength,
    seed?: number,
    opts?: { beginner?: boolean; tutorial?: boolean },
  ) => void;
  /**
   * Guided first crisis: the step the coach is on, or null outside the
   * tutorial. While it is set, time only moves when the player ends the turn.
   */
  tutorial: number | null;
  setTutorial: (step: number | null) => void;
  /** Beginner mode: jump to the next market reckoning instead of waiting for it. */
  skipToDeadline: () => void;
  /** Leave the briefing and start the first step. */
  begin: () => void;
  setDraft: (patch: DayOrders) => void;
  /** Commit this step's orders and advance. Blocked while the phone is ringing. */
  commitDay: () => void;

  /** Answer the call that is ringing. */
  pickUp: () => void;
  /** The line has connected — called by the UI once the delay has elapsed. */
  connected: () => void;
  /** Say one of the options. */
  say: (optionId: string) => void;
  /** Put the phone down and take the next call, if there is one. */
  hangUp: () => void;
  /** Refuse to take it. Not free: silence is an answer too. */
  decline: () => void;
  /** Place one of the calls available to you. */
  placeCall: (scriptId: string) => void;

  exit: () => void;
}

export const useStory = create<StoryStore>((set, get) => ({
  screen: "idle",
  scenarioId: "panic07",
  role: "governor",
  mode: "solo",
  length: "sprint",
  run: null,
  draft: {},
  phone: null,
  clear: null,
  rngState: 1,
  rev: 0,
  paused: false,
  secondsLeft: 0,
  elapsedSeconds: 0,
  submitted: null,
  confirmedDraft: {},
  pendingReply: null,
  silentCall: false,
  queuedPolicy: null,
  cabinet: createCabinet(),
  civic: createCivic(createRun("panic07", "governor", "solo", "sprint", 1)),
  pendingCivic: [],
  economy: createEconomy(),
  economicDraft: createEconomy().orders,
  pendingBuilds: [],
  pendingOrders: false,
  economicNotice: null,
  tutorial: null,

  brief: (id, role, mode, length, seed, opts) => {
    // A scenario that does not offer the long tellings falls back to the one
    // it does offer, rather than silently running a length it has no content
    // for.
    const allowed = lengthsFor(scenarioOf(id)).map((l) => l.id);
    const use = length && allowed.includes(length) ? length : allowed[0]!;
    const runSeed = (seed ?? (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0) >>> 0 || 1;
    const initialRun = createRun(id, role, mode, use, runSeed);
    if (opts?.beginner || opts?.tutorial) {
      initialRun.beginner = true;
      initialRun.assist = opts.tutorial ? TUTORIAL_ASSIST : assistFor(scenarioOf(id).grade);
    }
    set({
      tutorial: opts?.tutorial ? 0 : null,
      civic: createCivic(initialRun),
      pendingCivic: [],
      paused: false,
      secondsLeft: 0,
      elapsedSeconds: 0,
      submitted: null,
      confirmedDraft: {},
      pendingReply: null,
      silentCall: false,
      queuedPolicy: null,
      cabinet: createCabinet(),
      economy: createEconomy(),
      economicDraft: createEconomy().orders,
      pendingBuilds: [],
      pendingOrders: false,
      economicNotice: null,
      screen: "briefing",
      scenarioId: id,
      role,
      mode,
      length: use,
      run: initialRun,
      draft: defaultDraft(id),
      phone: null,
      clear: null,
      // Everything downstream of the plan — the day-to-day noise, how long the
      // phone rings — rides the same seed, so a replayed run is the same run.
      rngState: runSeed,
      rev: get().rev + 1,
    });
  },

  begin: () => {
    if (get().screen !== "briefing") return;
    set({ screen: "playing", secondsLeft: decisionSeconds(get().run!), rev: get().rev + 1 });
    ringNext(set, get);
    get().persistRun();
  },

  setDraft: (patch) => set({ draft: { ...get().draft, ...patch }, rev: get().rev + 1 }),
  setTutorial: (step) => set({ tutorial: step, rev: get().rev + 1 }),
  skipToDeadline: () => {
    const st = get();
    if (st.screen !== "playing" || st.paused || !st.run?.beginner) return;
    // Advance exactly to the reckoning, exactly as if the player had waited.
    get().advanceTime(st.secondsLeft + 1e-6);
  },

  // Orders execute immediately; pausing queues them until time resumes.
  commitDay: () => {
    if (get().screen !== "playing" || get().run?.done) return;
    set({
      submitted: "orders",
      confirmedDraft: { ...get().draft },
      pendingOrders: true,
      rev: get().rev + 1,
    });
    if (!get().paused) executeOrders(set, get);
    get().persistRun();
  },
  acknowledge: () => {
    const st = get();
    if (st.screen !== "playing") return;
    // A deliberate public response. Operating settings alone are not a statement.
    set({ submitted: "orders", rev: st.rev + 1 });
    if (!st.paused) {
      st.run!.log.unshift({
        day: st.run!.day,
        zh: "【公开回应】现行政策继续执行，将持续观察融资与民生变化。",
        en: "[Public response] Current policy remains in force; financing and livelihoods stay under review.",
        tone: "info",
      });
      st.run!.log = st.run!.log.slice(0, 60);
      set({ run: { ...st.run! } });
    }
    get().persistRun();
  },
  civicAction: (action) => {
    const st = get();
    if (st.screen !== "playing" || !st.run) return;
    if (st.paused) {
      const same = (a: CivicAction) =>
        a.type === action.type &&
        (a.type !== "caucus" || action.type !== "caucus" || a.faction === action.faction);
      set({ pendingCivic: [...st.pendingCivic.filter((a) => !same(a)), action].slice(-8) });
      get().persistRun();
      return;
    }
    const civic = structuredClone(st.civic),
      economy = structuredClone(st.economy),
      cabinet = { ...st.cabinet };
    const result = applyCivicAction(st.run, economy, cabinet, civic, action);
    set({ civic, economy, cabinet, run: { ...st.run }, economicNotice: result, rev: st.rev + 1 });
    get().persistRun();
  },
  keepSilent: () => {
    if (get().screen !== "playing") return;
    set({
      submitted: "silence",
      confirmedDraft: {},
      pendingOrders: false,
      queuedPolicy: null,
      pendingBuilds: [],
      economicDraft: structuredClone(get().economy.orders),
      rev: get().rev + 1,
    });
    get().persistRun();
  },
  choosePolicy: (id) => {
    if (get().screen !== "playing" || get().cabinet.route) return;
    set({ queuedPolicy: id, submitted: "orders", rev: get().rev + 1 });
    if (!get().paused) executeOrders(set, get);
    get().persistRun();
  },
  setEconomy: (orders) => {
    const st = get();
    if (st.screen !== "playing") return;
    const next = { ...st.economicDraft, ...orders };
    if (
      ![0, 1, 2].includes(next.tax) ||
      !SECTORS.every((s) => [1, 2, 4].includes(next.priorities?.[s.id]))
    )
      return;
    set({ economicDraft: next });
    if (!st.paused) {
      const economy = structuredClone(st.economy);
      const notice = applyEconomyOrders(st.run!, economy, next);
      set({
        economy,
        economicDraft: structuredClone(economy.orders),
        run: { ...st.run! },
        economicNotice: notice,
      });
    }
    get().persistRun();
  },
  construct: (sector) => {
    const st = get();
    if (st.screen !== "playing" || !SECTORS.some((s) => s.id === sector)) return;
    if (st.paused) {
      if (st.pendingBuilds.length < 3) set({ pendingBuilds: [...st.pendingBuilds, sector] });
      get().persistRun();
      return;
    }
    const economy = structuredClone(st.economy);
    const ok = buildProject(st.run!, economy, sector);
    set({
      economy,
      run: { ...st.run! },
      economicNotice: ok
        ? {
            zh: "扩建已拨款，进入单线施工队列。建设期间占用部分运输能力。",
            en: "Expansion funded and queued. Construction uses some distribution capacity.",
          }
        : {
            zh: "未开工：资金不足、队列已满或该行业已达产能上限。",
            en: "Not started: insufficient funds, full queue or sector capacity limit.",
          },
    });
    get().persistRun();
  },
  cancelConstruction: (id) => {
    const st = get();
    if (st.screen !== "playing" || st.paused) return;
    const economy = structuredClone(st.economy);
    const refund = cancelProject(st.run!, economy, id);
    set({
      economy,
      run: { ...st.run! },
      economicNotice: {
        zh: `已撤销，退回 ${Math.round(refund).toLocaleString()}；已施工部分与撤单成本不退。`,
        en: `Cancelled; ${Math.round(refund).toLocaleString()} refunded. Completed work and cancellation costs are retained.`,
      },
    });
    get().persistRun();
  },
  togglePause: () => {
    const st = get();
    if (st.screen !== "playing" || !pausable(st.run, st.length)) return;
    set({ paused: !st.paused, rev: st.rev + 1 });
    if (st.paused) {
      const economy = structuredClone(get().economy);
      const notice = applyEconomyOrders(st.run!, economy, get().economicDraft);
      set({ economy, economicDraft: structuredClone(economy.orders), economicNotice: notice });
      executeOrders(set, get);
      set({ pendingBuilds: [] });
      for (const sector of st.pendingBuilds) get().construct(sector);
      set({ pendingCivic: [] });
      for (const action of st.pendingCivic) get().civicAction(action);
    }
    if (st.paused && st.pendingReply) {
      set({ pendingReply: null });
      if (st.pendingReply === "__silence__") get().decline();
      else get().say(st.pendingReply);
    }
    get().persistRun();
  },
  advanceTime: (seconds) => {
    if (!Number.isFinite(seconds) || seconds <= 0 || get().paused || get().screen !== "playing")
      return;
    let remaining = seconds;
    while (remaining > 0 && get().screen === "playing") {
      const st = get();
      const spent = Math.min(remaining, st.secondsLeft, Math.max(1e-8, 5 - st.economy.remainder));
      remaining -= spent;
      const economy = structuredClone(st.economy);
      const cabinet = { ...st.cabinet };
      const civic = structuredClone(st.civic);
      advanceEconomy(st.run!, economy, cabinet, spent);
      if (economy.ticks > st.economy.ticks) tickCivic(st.run!, economy, cabinet, civic);
      set({
        economy,
        cabinet,
        civic,
        run: { ...st.run! },
        secondsLeft: Math.max(0, st.secondsLeft - spent),
        elapsedSeconds: st.elapsedSeconds + spent,
      });
      if (get().secondsLeft <= 0.000001) resolveDeadline(set, get);
    }
  },
  persistRun: () => {
    const st = get();
    if (st.screen !== "playing" || !st.run) return;
    try {
      localStorage.setItem(
        RUN_KEY,
        JSON.stringify({
          version: 1,
          run: st.run,
          draft: st.draft,
          phone: st.phone,
          rngState: st.rngState,
          secondsLeft: st.secondsLeft,
          elapsedSeconds: st.elapsedSeconds,
          paused: st.paused,
          submitted: st.submitted,
          confirmedDraft: st.confirmedDraft,
          pendingReply: st.pendingReply,
          civic: st.civic,
          pendingCivic: st.pendingCivic,
          economy: st.economy,
          economicDraft: st.economicDraft,
          pendingBuilds: st.pendingBuilds,
          pendingOrders: st.pendingOrders,
          queuedPolicy: st.queuedPolicy,
          silentCall: st.silentCall,
          cabinet: st.cabinet,
          savedAt: Date.now(),
        }),
      );
    } catch {
      /* browser storage unavailable */
    }
  },
  resumeRun: () => {
    const saved = readActiveRun();
    if (!saved) return false;
    const r = saved.run;
    set({
      ...saved,
      scenarioId: r.scenarioId,
      role: r.role,
      mode: r.mode,
      length: r.length,
      screen: "playing",
      clear: null,
      rev: get().rev + 1,
    });
    // Quitting or backgrounding an unpaused run is not a free pause.
    if (!saved.paused) executeOrders(set, get);
    if (!saved.paused) get().advanceTime(Math.max(0, (Date.now() - saved.savedAt) / 1000));
    return true;
  },

  pickUp: () => {
    const phone = get().phone;
    if (!phone || phone.status !== "ringing" || get().paused) return;
    set({ phone: { ...phone, status: "connecting" }, rev: get().rev + 1 });
  },

  connected: () => {
    const phone = get().phone;
    if (!phone || phone.status !== "connecting" || get().paused) return;
    set({ phone: { ...phone, status: "live" }, rev: get().rev + 1 });
  },

  say: (optionId) => {
    const { phone, run } = get();
    if (!phone || !run || phone.status !== "live") return;
    const option = phone.script.options.find((o) => o.id === optionId);
    if (!option) return;
    if (get().paused) {
      set({ pendingReply: optionId });
      get().persistRun();
      return;
    }
    applyCall(run, phone.script, option);
    set({
      run: { ...run },
      phone: { ...phone, status: "reply", picked: option },
      rev: get().rev + 1,
    });
  },

  hangUp: () => {
    if (get().paused || get().phone?.status !== "reply") return;
    set({ phone: null, rev: get().rev + 1 });
    ringNext(set, get);
  },

  decline: () => {
    const { phone, run, paused } = get();
    if (!phone || !run || phone.status === "reply" || run.done) return;
    if (paused) {
      set({ pendingReply: "__silence__" });
      get().persistRun();
      return;
    }
    if (!run.callsDone.includes(phone.script.id)) run.callsDone.push(phone.script.id);
    // Silence on a call is resolved with the market at the deadline, once.
    set({ run: { ...run }, phone: null, silentCall: true, pendingReply: null, rev: get().rev + 1 });
    ringNext(set, get);
  },

  placeCall: (scriptId) => {
    const { run, phone, rngState } = get();
    if (!run || run.done || phone || get().paused) return;
    const script = outboundCalls(run).find((c) => c.id === scriptId);
    if (!script) return;
    const { value, next } = seededDraw(rngState, 1);
    set({
      // Outbound skips the ringing beat — you already decided to call.
      phone: { script, delay: connectDelayMs(value), status: "connecting", picked: null },
      rngState: next,
      rev: get().rev + 1,
    });
  },

  exit: () => {
    clearActiveRun();
    set({
      screen: "idle",
      run: null,
      draft: {},
      phone: null,
      clear: null,
      paused: false,
      rev: get().rev + 1,
    });
  },
}));

/** Ring the next inbound call due at this step, if any. */
function ringNext(set: (patch: Partial<StoryStore>) => void, get: () => StoryStore) {
  const { run, rngState, phone } = get();
  if (!run || run.done || phone) return;
  const nextCall = ringingCalls(run)[0];
  if (!nextCall) return;
  const { value, next } = seededDraw(rngState, 1);
  set({
    phone: { script: nextCall, delay: connectDelayMs(value), status: "ringing", picked: null },
    rngState: next,
    rev: get().rev + 1,
  });
}

/** Write the finished run into the ladder and the honour record. */
function settle(run: StoryRun): ClearResult {
  const s = scenarioOf(run.scenarioId);
  const result = recordClear(run);
  recordBout({
    kind: "story",
    role: run.role,
    won: run.won,
    tag: run.scenarioId,
    note: `${gradeOf(s.grade).nameZh} · ${lengthOf(run.length).clockZh}`,
    // Every finished story run counts: unlike a practice match there is no
    // unrated way to play one.
    rated: true,
  });
  return result;
}

function defaultDraft(id: StoryId): DayOrders {
  return {
    rate: scenarioOf(id).startRate,
    spend: 0,
    buyEquity: 0,
    shortCcy: 0,
    shortEquity: 0,
    pledge: false,
    halt: false,
  };
}

function resolveDeadline(set: (patch: Partial<StoryStore>) => void, get: () => StoryStore) {
  const st = get();
  const run = st.run;
  if (!run || run.done) return;
  const missed = ringingCalls(run);
  if (
    st.phone &&
    st.phone.status !== "reply" &&
    !run.callsDone.includes(st.phone.script.id) &&
    !missed.some((c) => c.id === st.phone!.script.id)
  )
    missed.push(st.phone.script);
  for (const c of missed) {
    run.callsDone.push(c.id);
    run.log.unshift({
      day: run.day,
      zh: `【到期未回应】${c.fromZh}的事项被记为沉默。`,
      en: `[No response by deadline] ${c.fromEn}: silence recorded.`,
      tone: "bad",
    });
  }
  let cabinet = enactRoute(
    run,
    st.cabinet,
    scenarioOf(run.scenarioId),
    st.submitted === "orders" ? st.queuedPolicy : null,
  );
  const reaction = marketResponse(
    run,
    cabinet,
    st.submitted !== "orders" || missed.length > 0 || st.silentCall,
    st.rngState,
  );
  cabinet = reaction.cabinet;
  stakeholderPressure(run, cabinet);
  // Old standing rate remains in force; unsubmitted drafts never spend funds.
  const orders = {}; // Direct orders have already executed; never spend them again.
  const result = stepDay(run, orders, reaction.seed);
  const done = result.run.done;
  set({
    run: { ...result.run },
    rngState: result.rngState,
    cabinet,
    screen: done ? "debrief" : "playing",
    clear: done ? settle(result.run) : null,
    paused: false,
    phone: null,
    pendingReply: null,
    silentCall: false,
    submitted: null,
    confirmedDraft: {},
    queuedPolicy: null,
    draft: {
      rate: result.run.rate,
      // A beginner's spending slider stays where they left it; experts set it afresh each step.
      spend: result.run.beginner ? (st.draft.spend ?? 0) : 0,
      buyEquity: 0,
      shortCcy: result.run.shortCcy,
      shortEquity: result.run.shortEquity,
    },
    secondsLeft: done ? 0 : decisionSeconds(result.run),
    rev: st.rev + 1,
  });
  if (done) clearActiveRun();
  else {
    ringNext(set, get);
    get().persistRun();
  }
}

const RUN_KEY = "leo-street-active-story-v1";
type ActiveRun = Pick<
  StoryStore,
  | "run"
  | "draft"
  | "phone"
  | "rngState"
  | "secondsLeft"
  | "elapsedSeconds"
  | "paused"
  | "submitted"
  | "confirmedDraft"
  | "pendingReply"
  | "silentCall"
  | "queuedPolicy"
  | "cabinet"
  | "economy"
  | "economicDraft"
  | "pendingBuilds"
  | "pendingOrders"
  | "civic"
  | "pendingCivic"
> & { run: StoryRun; savedAt: number; version: number };
export function readActiveRun(): ActiveRun | null {
  try {
    const raw = typeof localStorage === "undefined" ? null : localStorage.getItem(RUN_KEY);
    if (!raw || raw.length > 2_000_000) return null;
    const s = JSON.parse(raw) as ActiveRun;
    const r = s.run;
    if (
      s.version !== 1 ||
      !r ||
      r.done ||
      scenarioOf(r.scenarioId).id !== r.scenarioId ||
      !["sprint", "standard", "deep", "epic"].includes(r.length) ||
      !Number.isFinite(s.savedAt) ||
      !Number.isFinite(s.secondsLeft) ||
      s.secondsLeft < 0 ||
      !Number.isFinite(s.elapsedSeconds) ||
      s.elapsedSeconds < 0 ||
      !Number.isFinite(s.rngState) ||
      !Number.isFinite(r.days) ||
      r.days < 1 ||
      !Number.isFinite(r.day) ||
      r.day < 1 ||
      r.day > r.days ||
      !Number.isFinite(r.reserves) ||
      !Number.isFinite(r.pressure) ||
      !s.cabinet ||
      !s.draft ||
      !s.confirmedDraft ||
      ![s.cabinet.banks, s.cabinet.business, s.cabinet.publicTrust, s.cabinet.silences].every(
        Number.isFinite,
      ) ||
      !Array.isArray(r.callsDone) ||
      !Array.isArray(r.calls) ||
      !Array.isArray(r.phases) ||
      !Array.isArray(r.log)
    )
      return null;
    // Older saves had no operating economy and queued all policy orders.
    if (!s.economy) {
      s.economy = createEconomy();
      s.economicDraft = structuredClone(s.economy.orders);
      s.pendingBuilds = [];
      s.pendingOrders = s.submitted === "orders";
    }
    s.economy = normalizeEconomy(s.economy);
    s.economicDraft = normalizeEconomyOrders(s.economicDraft);
    s.civic = normalizeCivic(s.civic, r);
    s.pendingCivic = Array.isArray(s.pendingCivic)
      ? s.pendingCivic
          .slice(0, 8)
          .filter(
            (a) =>
              a &&
              ((a.type === "reform" &&
                ["wageCompact", "sharedWarehouses", "openBooks"].includes(a.id)) ||
                (a.type === "caucus" &&
                  ["workers", "merchants", "financiers"].includes(a.faction)) ||
                (a.type === "petition" &&
                  Number.isSafeInteger(a.id) &&
                  a.id > 0 &&
                  ["support", "compromise", "decline", "silence"].includes(a.choice))),
          )
      : [];
    if (!validEconomySave(s)) return null;
    s.paused = Boolean(s.paused && pausable(r, r.length));
    s.secondsLeft = Math.min(s.secondsLeft, decisionSeconds(r));
    return s;
  } catch {
    return null;
  }
}
function clearActiveRun() {
  try {
    localStorage.removeItem(RUN_KEY);
  } catch {
    /* unavailable */
  }
}

function executeOrders(set: (patch: Partial<StoryStore>) => void, get: () => StoryStore) {
  const st = get();
  if (!st.run || st.paused) return;
  if (st.pendingOrders) applyImmediateOrders(st.run, st.confirmedDraft);
  const cabinet = enactRoute(st.run, st.cabinet, scenarioOf(st.scenarioId), st.queuedPolicy);
  set({
    run: { ...st.run },
    cabinet,
    queuedPolicy: null,
    confirmedDraft: {},
    pendingOrders: false,
    draft: st.pendingOrders
      ? { ...st.draft, spend: st.run.beginner ? st.draft.spend : 0, buyEquity: 0, pledge: false, halt: false }
      : st.draft,
  });
}
function validEconomySave(s: ActiveRun): boolean {
  const e = s.economy;
  const validOrders = (o: EconomyOrders) =>
    o &&
    [0, 1, 2].includes(o.tax) &&
    ["domestic", "imports", "exports"].includes(o.trade) &&
    SECTORS.every(
      (x) =>
        [1, 2, 4].includes(o.priorities?.[x.id]) &&
        ["balanced", "intensive", "labor"].includes(o.methods?.[x.id]),
    );
  return Boolean(
    e &&
    validOrders(e.orders) &&
    validOrders(s.economicDraft) &&
    [
      e.materials,
      e.goods,
      e.price,
      e.employment,
      e.income,
      e.bankHealth,
      e.revenue,
      e.lastRevenue,
      e.output,
      e.sales,
      e.demand,
      e.lastPressure,
      e.ticks,
      e.serial,
      e.completed,
      e.remainder,
    ].every((x) => Number.isFinite(x)) &&
    [
      e.methodCosts,
      e.tradeCash,
      e.imported,
      e.exported,
      e.materialOutput,
      e.materialUse,
      e.freight,
      e.lastTrade.materials,
      e.lastTrade.goods,
      e.lastTrade.cash,
    ].every(Number.isFinite) &&
    SECTORS.every(
      (x) =>
        Number.isFinite(e.methodCooldowns?.[x.id]) &&
        e.methodCooldowns[x.id] >= 0 &&
        e.methodCooldowns[x.id] <= 30,
    ) &&
    e.remainder >= 0 &&
    e.remainder < 5 &&
    SECTORS.every(
      (x) =>
        Number.isFinite(e.capacity?.[x.id]) &&
        e.capacity[x.id] >= 1 &&
        e.capacity[x.id] <= 2.5 &&
        Number.isFinite(e.utilization?.[x.id]) &&
        Number.isFinite(e.credit?.[x.id]),
    ) &&
    Array.isArray(e.history) &&
    e.history.length <= 36 &&
    e.history.every((x) => [x.output, x.income, x.price].every(Number.isFinite)) &&
    Array.isArray(e.projects) &&
    e.projects.length <= 3 &&
    e.projects.every(
      (p) =>
        SECTORS.some((x) => x.id === p.sector) &&
        [p.id, p.cost, p.left, p.total].every(Number.isFinite) &&
        p.cost >= 0 &&
        p.total === 45 &&
        p.left > 0 &&
        p.left <= 45,
    ) &&
    Array.isArray(s.pendingBuilds) &&
    s.pendingBuilds.length <= 3 &&
    s.pendingBuilds.every((x) => SECTORS.some((y) => y.id === x)) &&
    typeof s.pendingOrders === "boolean",
  );
}

/** How much of each wave a beginner is spared, by difficulty grade: the first rungs only. */
export function assistFor(grade: number): number {
  return grade <= 1 ? 0.4 : grade === 2 ? 0.3 : grade === 3 ? 0.2 : grade === 4 ? 0.1 : 0;
}
/** The guided first crisis is meant to be won: most of each wave is absorbed. */
export const TUTORIAL_ASSIST = 0.6;

/** Beginners may pause at any length; otherwise only the longer tellings pause. */
export function pausable(run: StoryRun | null | undefined, length: StoryLength): boolean {
  return canPause(length) || Boolean(run?.beginner);
}
