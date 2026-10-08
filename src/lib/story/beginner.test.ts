import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { TUTORIAL_ASSIST, assistFor, readActiveRun, useStory } from "./store.ts";
import { LADDER } from "./difficulty.ts";
import { scenarioOf } from "./scenarios.ts";
import type { StoryId } from "./types.ts";

const memory = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => memory.set(k, v),
    removeItem: (k: string) => memory.delete(k),
  },
});
beforeEach(() => {
  useStory.getState().exit();
  memory.clear();
});

function answerPhones() {
  let st = useStory.getState();
  while (st.phone) {
    if (st.phone.status === "ringing") st.pickUp();
    st = useStory.getState();
    if (st.phone?.status === "connecting") st.connected();
    st = useStory.getState();
    if (st.phone?.status === "live") st.say(st.phone.script.options[0]!.id);
    st = useStory.getState();
    if (st.phone?.status === "reply") st.hangUp();
    st = useStory.getState();
  }
}

/** Play a crisis doing nothing but end each turn; return the peak pressure. */
function idlePeak(id: StoryId, beginner: boolean): number {
  useStory.getState().brief(id, "governor", "solo", "sprint", 7, { beginner });
  useStory.getState().begin();
  let peak = 0;
  let safety = 200;
  while (useStory.getState().screen === "playing" && safety-- > 0) {
    answerPhones();
    const st = useStory.getState();
    st.advanceTime(st.secondsLeft + 1e-6);
    peak = Math.max(peak, useStory.getState().run!.pressure);
  }
  return peak;
}

describe("beginner mode in the crisis cabinet", () => {
  it("leaves the default telling untouched", () => {
    useStory.getState().brief("panic07", "governor", "solo", "sprint", 1);
    const run = useStory.getState().run!;
    assert.equal(run.assist, undefined);
    assert.equal(run.beginner, undefined);
    assert.equal(useStory.getState().tutorial, null);
  });

  it("softens only the first rungs of the ladder; the hard crises stay as they are", () => {
    const first = scenarioOf(LADDER[0]!).grade;
    assert.ok(assistFor(first) > 0);
    for (const id of LADDER) {
      const g = scenarioOf(id).grade;
      if (g >= 5) assert.equal(assistFor(g), 0, `${id} (grade ${g}) keeps full difficulty`);
    }
    for (let g = 1; g < 10; g++) assert.ok(assistFor(g) >= assistFor(g + 1), "never easier further up");
  });

  it("makes an early crisis gentler for a beginner", () => {
    const hard = idlePeak("panic07", false);
    const easy = idlePeak("panic07", true);
    assert.ok(easy < hard, `beginner peak ${easy} < expert peak ${hard}`);
  });

  it("lets a beginner pause even the half-hour telling, and keeps their spending slider", () => {
    useStory.getState().brief("panic07", "governor", "solo", "sprint", 3, { beginner: true });
    useStory.getState().begin();
    useStory.getState().togglePause();
    assert.equal(useStory.getState().paused, true);
    useStory.getState().togglePause();
    const pot = useStory.getState().run!.reserves;
    useStory.getState().setDraft({ spend: pot * 0.25 });
    useStory.getState().commitDay();
    assert.ok((useStory.getState().draft.spend ?? 0) > 0, "kept after executing");
    answerPhones();
    useStory.getState().skipToDeadline();
    assert.equal(useStory.getState().run!.day, 2);
    assert.ok((useStory.getState().draft.spend ?? 0) > 0, "kept across the reckoning");
  });

  it("does not let an expert skip ahead", () => {
    useStory.getState().brief("panic07", "governor", "solo", "sprint", 3);
    useStory.getState().begin();
    const before = useStory.getState().secondsLeft;
    useStory.getState().skipToDeadline();
    assert.equal(useStory.getState().secondsLeft, before);
  });

  it("starts the tutorial at step 0, heavily assisted, and survives a save and resume", () => {
    useStory.getState().brief("panic07", "governor", "solo", "sprint", 5, { tutorial: true });
    assert.equal(useStory.getState().tutorial, 0);
    assert.equal(useStory.getState().run!.assist, TUTORIAL_ASSIST);
    useStory.getState().begin();
    assert.equal(readActiveRun()?.run.beginner, true);
  });

  it("lets the guided first crisis be won by following the coach's three moves", () => {
    useStory.getState().brief("panic07", "governor", "solo", "sprint", 11, { tutorial: true });
    useStory.getState().begin();
    const s = scenarioOf("panic07");
    let safety = 100;
    while (useStory.getState().screen === "playing" && safety-- > 0) {
      answerPhones();
      const st = useStory.getState();
      st.setDraft({ rate: s.maxRate, spend: (s.reserves - s.committedForward) * 0.25 });
      st.commitDay();
      useStory.getState().skipToDeadline();
    }
    assert.equal(useStory.getState().run!.won, true);
  });
});
