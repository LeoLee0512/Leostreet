import { test } from "node:test";
import assert from "node:assert/strict";
import { createRun, finish } from "./engine.ts";
import { SCENARIOS } from "./scenarios.ts";
import { missionConditions, missionTimeline } from "./mission.ts";
import { createCivic, getRecoveryRating } from "./civic.ts";
test("displayed mission conditions agree with actual final scoring for each scenario and role", () => {
  for (const scenario of SCENARIOS)
    for (const role of ["governor", "fund", "retail", "trader"] as const)
      for (const pressure of [0, 0.55, 1.1])
        for (const equity of [35, 60, 100]) {
          const r = createRun(scenario.id, role, "solo", "sprint", 12);
          r.pressure = pressure;
          r.pegBroken = pressure >= 1;
          r.equity = equity;
          r.book = equity;
          const conditions = missionConditions(r);
          assert.ok(conditions.length);
          const met = conditions.every((c) => c.met);
          finish(r);
          assert.equal(met, r.won, `${scenario.id}/${role}/${pressure}/${equity}`);
        }
});
test("time progress cannot falsely jump to full completion on an early loss", () => {
  const r = createRun("panic07", "governor", "solo", "sprint", 1);
  r.done = true;
  r.won = false;
  assert.equal(missionTimeline(r, 900).fraction, 0.5);
  assert.equal(missionTimeline(r, 900).remaining, 900);
  assert.equal(missionTimeline(r, -10).fraction, 0);
  assert.equal(missionTimeline(r, 99999).fraction, 1);
});
test("a pressure boundary and market requirement are independently visible", () => {
  const r = createRun("panic07", "governor", "solo", "sprint", 1);
  r.pressure = 0.55;
  r.equity = 57;
  assert.equal(missionConditions(r).find((c) => c.id === "pressure")!.met, true);
  assert.equal(missionConditions(r).find((c) => c.id === "market")!.met, false);
});

test("three-star social recovery does not hide a failed financial objective", () => {
  const run = createRun("panic07", "governor", "solo", "sprint", 1);
  const civic = createCivic(run);
  civic.recentLiving = Array.from({ length: 12 }, () => ({ income: 90, employment: 92 }));
  civic.enacted = ["wageCompact", "sharedWarehouses"];
  run.equity = 80;
  run.pressure = 0.7;
  assert.equal(getRecoveryRating(civic).stars, 3);
  finish(run);
  assert.equal(run.won, false);
  assert.deepEqual(
    missionConditions(run)
      .filter((c) => !c.met)
      .map((c) => c.id),
    ["pressure"],
  );
});
test("rounding never makes a failed boundary look met", () => {
  const run = createRun("panic07", "governor", "solo", "sprint", 1);
  run.equity = 57.9999;
  run.pressure = 0.550001;
  assert.equal(missionConditions(run).find((c) => c.id === "market")!.current, "< 58");
  assert.match(missionConditions(run).find((c) => c.id === "pressure")!.current, /^> /);
});
