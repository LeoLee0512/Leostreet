import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { useStory, readActiveRun } from "./store.ts";
import { canPause, decisionSeconds, marketResponse, createCabinet, enactRoute } from "./realtime.ts";
import { createRun } from "./engine.ts";
import { scenarioOf } from "./scenarios.ts";
import { isUnlocked, LADDER, gradeOf } from "./difficulty.ts";
import type { StoryLength } from "./types.ts";

const memory = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => memory.set(k, v),
  removeItem: (k: string) => memory.delete(k),
} });
function start(length: StoryLength = "standard") {
  useStory.getState().brief("baht", "governor", "solo", length, 123);
  useStory.getState().begin();
  return useStory.getState();
}
beforeEach(() => { useStory.getState().exit(); memory.clear(); });

describe("real-time decision contract", () => {
  it("allocates the declared market duration across every decision point", () => {
    for (const [length, minutes] of [["sprint", 30], ["standard", 60], ["deep", 90], ["epic", 180]] as const) {
      const run = createRun("baht", "governor", "solo", length, 1);
      assert.ok(Math.abs(decisionSeconds(run) * run.days - minutes * 60) < 1e-8);
      assert.equal(canPause(length), length !== "sprint");
    }
  });
  it("does not allow the half-hour run to pause", () => {
    start("sprint").togglePause();
    assert.equal(useStory.getState().paused, false);
    const before = useStory.getState().secondsLeft;
    useStory.getState().advanceTime(10);
    assert.equal(useStory.getState().secondsLeft, before - 10);
  });
  it("freezes time and effects while allowing long-run decisions", () => {
    start().togglePause();
    const original = JSON.stringify(useStory.getState().run);
    const left = useStory.getState().secondsLeft;
    useStory.getState().setDraft({ spend: 1000 });
    useStory.getState().commitDay();
    useStory.getState().advanceTime(999);
    assert.equal(useStory.getState().secondsLeft, left);
    assert.equal(JSON.stringify(useStory.getState().run), original);
    assert.equal(useStory.getState().submitted, "orders");
  });
  it("executes orders immediately without advancing time or charging twice", () => {
    start();
    useStory.getState().setDraft({ spend: 100 });
    useStory.getState().commitDay();
    assert.equal(useStory.getState().run!.spent, 100);
    useStory.getState().setDraft({ spend: 5000 });
    assert.equal(useStory.getState().run!.day, 1);
    useStory.getState().advanceTime(useStory.getState().secondsLeft);
    assert.equal(useStory.getState().run!.day, 2);
    assert.equal(useStory.getState().run!.spent, 100);
  });
  it("records timeouts as silence even while an inbound call is ringing", () => {
    start();
    const st = useStory.getState();
    const call = st.run!.calls.find((c) => c.direction === "in")!;
    call.day = 1;
    useStory.setState({ phone: { script: call, status: "ringing", delay: 900, picked: null } });
    st.advanceTime(st.secondsLeft);
    assert.ok(useStory.getState().run!.callsDone.includes(call.id));
    assert.equal(useStory.getState().cabinet.silences, 1);
    assert.ok(useStory.getState().run!.log.some((l) => l.zh.includes("市场猜测，非事实")));
  });
  it("explicit silence never spends an unsubmitted draft or queued policy", () => {
    start().togglePause();
    useStory.getState().setDraft({ spend: 5000 });
    useStory.getState().choosePolicy("backstop");
    useStory.getState().keepSilent();
    useStory.getState().togglePause();
    useStory.getState().advanceTime(useStory.getState().secondsLeft);
    assert.equal(useStory.getState().run!.spent, 0);
    assert.equal(useStory.getState().cabinet.route, null);
    assert.equal(useStory.getState().cabinet.silences, 1);
  });
  it("does not let later policy submission erase telephone silence", () => {
    start();
    const call = useStory.getState().run!.calls.find((c) => c.direction === "in")!;
    useStory.setState({ phone: { script: call, status: "live", delay: 900, picked: null } });
    useStory.getState().decline();
    useStory.getState().commitDay();
    useStory.getState().advanceTime(useStory.getState().secondsLeft);
    assert.equal(useStory.getState().cabinet.silences, 1);
  });
  it("defers telephone effects and new information until resume", () => {
    start();
    const call = useStory.getState().run!.calls.find((c) => c.direction === "in")!;
    useStory.setState({ phone: { script: call, status: "live", delay: 900, picked: null } });
    useStory.getState().togglePause();
    const before = JSON.stringify(useStory.getState().run);
    useStory.getState().say(call.options[0]!.id);
    assert.equal(JSON.stringify(useStory.getState().run), before);
    assert.equal(useStory.getState().phone!.status, "live");
    useStory.getState().togglePause();
    assert.ok(useStory.getState().run!.callsDone.includes(call.id));
    assert.equal(useStory.getState().phone!.status, "reply");
  });
  it("processes elapsed time across deadlines rather than silently pausing in background", () => {
    const st = start();
    const duration = st.secondsLeft;
    st.advanceTime(duration * 2 + 3);
    assert.equal(useStory.getState().run!.day, 3);
    assert.ok(Math.abs(useStory.getState().secondsLeft - (duration - 3)) < 1e-8);
    assert.equal(useStory.getState().cabinet.silences, 2);
  });
  it("ignores invalid elapsed times", () => {
    const st = start();
    for (const n of [NaN, Infinity, -100, 0]) st.advanceTime(n);
    assert.equal(useStory.getState().run!.day, 1);
  });
  it("preserves paused decisions when restoring and charges unpaused absence", () => {
    start().togglePause();
    useStory.getState().choosePolicy("coordinate");
    useStory.getState().persistRun();
    assert.ok(readActiveRun());
    useStory.setState({ screen: "idle", run: null });
    assert.equal(useStory.getState().resumeRun(), true);
    assert.equal(useStory.getState().paused, true);
    assert.equal(useStory.getState().queuedPolicy, "coordinate");
    useStory.getState().togglePause();
    const saved = readActiveRun()!;
    saved.savedAt -= (saved.secondsLeft + 1) * 1000;
    memory.set("leo-street-active-story-v1", JSON.stringify(saved));
    useStory.getState().resumeRun();
    assert.equal(useStory.getState().run!.day, 2);
  });
  it("rejects corrupt active saves", () => {
    memory.set("leo-street-active-story-v1", '{"version":1}');
    assert.equal(readActiveRun(), null);
  });
  it("completes a winnable first crisis through the real-time store and settles only once", () => {
    useStory.getState().brief("panic07", "governor", "solo", "sprint", 1);
    useStory.getState().begin();
    let safety = 100;
    while (useStory.getState().screen === "playing" && safety-- > 0) {
      let st = useStory.getState();
      while (st.phone) {
        if (st.phone.status === "ringing") st.pickUp();
        st = useStory.getState();
        if (st.phone?.status === "connecting") st.connected();
        st = useStory.getState();
        if (st.phone?.status === "live") st.say((st.phone.script.options.find((o) => o.tone === "good") ?? st.phone.script.options[0]!).id);
        st = useStory.getState();
        if (st.phone?.status === "reply") st.hangUp();
        st = useStory.getState();
      }
      st.setDraft({ rate: scenarioOf("panic07").maxRate, spend: st.run!.reserves * 0.25 });
      st.commitDay(); st.advanceTime(st.secondsLeft);
    }
    assert.ok(safety > 0);
    assert.equal(useStory.getState().screen, "debrief");
    assert.equal(useStory.getState().run!.won, true);
    assert.equal(readActiveRun(), null);
    assert.ok(JSON.parse(memory.get("leo-street-story-v1")!).cleared.includes("panic07"));
    const final = [...memory];
    useStory.getState().advanceTime(9999);
    assert.deepEqual([...memory], final);
  });
});

describe("market beliefs and coordination routes", () => {
  it("replays the same conjecture from the same seed and marks it as conjecture", () => {
    const a = createRun("baht", "governor", "solo");
    const b = structuredClone(a);
    const x = marketResponse(a, createCabinet(), true, 40);
    const y = marketResponse(b, createCabinet(), true, 40);
    assert.deepEqual(x, y); assert.deepEqual(a, b);
    assert.ok(a.log[0]!.zh.includes("非事实"));
  });
  it("charges a route once, enacts it after the delay and excludes the alternatives", () => {
    const run = createRun("baht", "governor", "solo");
    const scenario = scenarioOf("baht");
    const initial = run.reserves;
    let cabinet = enactRoute(run, createCabinet(), scenario, "backstop");
    assert.equal(cabinet.enacted, false);
    assert.ok(run.reserves < initial);
    const paid = run.reserves;
    run.day += 1; run.pressure = 0.5;
    cabinet = enactRoute(run, cabinet, scenario, "coordinate");
    assert.equal(cabinet.route, "backstop");
    assert.equal(cabinet.enacted, true);
    assert.equal(run.reserves, paid);
    assert.equal(run.pressure, 0.3);
    assert.ok(cabinet.publicTrust < 65);
  });
  it("rejects an unfunded policy without creating an obligation", () => {
    const run = createRun("baht", "governor", "solo"); run.reserves = 0;
    const cabinet = enactRoute(run, createCabinet(), scenarioOf("baht"), "backstop");
    assert.equal(cabinet.route, null);
    assert.equal(run.spent, 0);
  });
  it("puts Great Depression last without locking an already-cleared stage", () => {
    assert.equal(LADDER.at(-1), "depression");
    assert.equal(gradeOf(10).nameZh, "炼狱");
    assert.equal(scenarioOf("depression").nameZh, "大萧条");
    assert.ok(isUnlocked("depression", ["depression"]));
  });
});
