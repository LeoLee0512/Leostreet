import type { CallScript, Detail, Scenario, StoryRole, StoryRun } from "./types.ts";

/**
 * The telephone.
 *
 * Every one of these crises was fought on the phone. The sliders in the war
 * room are the decisions history recorded; the calls are how those decisions
 * actually reached the person making them — a desk head with a number, a
 * reporter with a sentence about to go to print, a bank that cannot fund
 * itself by three o'clock.
 *
 * The connect delay is not decoration. A call that resolves instantly is a
 * dialog box; a call that takes a beat to connect is a call, and the beat is
 * where the player notices their own pulse. It is deliberately short — long
 * enough to feel, short enough that nobody ever waits on it.
 */

/** Lower bound on the connect delay, in ms. Strictly above half a second. */
export const CONNECT_MIN_MS = 620;
/** Upper bound on the connect delay, in ms. Strictly under one and a half. */
export const CONNECT_MAX_MS = 1400;

/**
 * How long this call takes to connect, from one draw in [0,1).
 *
 * Pure, so the delay rides the run's own seeded stream and a replayed
 * scenario rings for the same length of time it rang the first time.
 */
export function connectDelayMs(draw: number): number {
  const d = Number.isFinite(draw) ? Math.min(Math.max(draw, 0), 1) : 0.5;
  return Math.round(CONNECT_MIN_MS + d * (CONNECT_MAX_MS - CONNECT_MIN_MS));
}

/** Calls this telling includes at all: deep enough, and meant for this chair. */
export function eligibleCalls(s: Scenario, detail: Detail, role: StoryRole): CallScript[] {
  return s.calls.filter((c) => (c.minDetail ?? 0) <= detail && (!c.seats || c.seats.includes(role)));
}

/** Inbound calls ringing right now. The day cannot be committed until they are answered. */
export function ringingCalls(run: StoryRun): CallScript[] {
  return run.calls.filter(
    (c) => c.direction === "in" && c.day === run.day && !run.callsDone.includes(c.id),
  );
}

/**
 * Outbound calls the player may place today.
 *
 * Offered from the step they unlock onward rather than on one step only: a
 * number you could have rung this morning is still a number you can ring this
 * afternoon, and losing a call because the clock ticked would be a trap made
 * of UI rather than of history.
 */
export function outboundCalls(run: StoryRun): CallScript[] {
  return run.calls.filter(
    (c) => c.direction === "out" && c.day <= run.day && !run.callsDone.includes(c.id),
  );
}

/** Whether anything is still ringing — the commit button is blocked while true. */
export function hasRinging(run: StoryRun): boolean {
  return ringingCalls(run).length > 0;
}
