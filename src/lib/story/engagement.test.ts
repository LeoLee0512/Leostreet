import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  COLLECTION_KEY,
  REPORT_LIMIT,
  applyAppearance,
  readAppearance,
  readCollection,
  recordStoryReport,
  reportShareText,
  toggleStoryWish,
  type StoryReportInput,
} from "./engagement.ts";

const data = new Map<string, string>();
const storage = {
  getItem: (key: string) => data.get(key) ?? null,
  setItem: (key: string, value: string) => {
    data.set(key, value);
  },
};
beforeEach(() => {
  data.clear();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
});
const input = (overrides: Partial<StoryReportInput> = {}): StoryReportInput => ({
  scenarioId: "panic07",
  scenarioNameZh: "第一关",
  scenarioNameEn: "Chapter one",
  won: true,
  stars: 2,
  income: 85,
  employment: 92,
  seed: 7,
  length: "sprint",
  elapsedSeconds: 1800,
  completedAt: 10000,
  ...overrides,
});

describe("personal story collection", () => {
  it("keeps reports from every crisis on the ladder, including the Victorian three", () => {
    for (const scenarioId of ["railway", "panic73", "baring"] as const) {
      const record = recordStoryReport(input({ scenarioId, seed: scenarioId.length, completedAt: 20000 + scenarioId.length }));
      assert.ok(record.reports.some((r) => r.scenarioId === scenarioId), scenarioId);
    }
  });
  it("records one stable finish once even when the debrief mounts twice", () => {
    const first = recordStoryReport(input());
    const raw = data.get(COLLECTION_KEY);
    assert.equal(first.reports.length, 1);
    assert.deepEqual(recordStoryReport(input()), first);
    assert.equal(data.get(COLLECTION_KEY), raw);
    assert.equal(readCollection().bestByScenario.panic07?.id, first.reports[0]?.id);
  });
  it("keeps distinct replays of the same seed with stable completion times", () => {
    recordStoryReport(input());
    recordStoryReport(input({ completedAt: 20000 }));
    assert.equal(readCollection().reports.length, 2);
    assert.equal(readCollection().reports[0]?.completedAt, 20000);
  });
  it("keeps the latest 30 results while preserving a best result that aged out", () => {
    recordStoryReport(input({ stars: 3, income: 140 }));
    for (let i = 1; i <= 45; i++) recordStoryReport(input({ seed: i + 7, completedAt: 10000 + i }));
    const saved = readCollection();
    assert.equal(saved.reports.length, REPORT_LIMIT);
    assert.equal(saved.reports[0]?.completedAt, 10045);
    assert.equal(saved.reports.at(-1)?.completedAt, 10016);
    assert.equal(saved.bestByScenario.panic07?.completedAt, 10000);
  });
  it("ranks wins before stars and never overwrites a win with a losing high income", () => {
    recordStoryReport(input({ income: 60, stars: 1 }));
    recordStoryReport(input({ seed: 8, completedAt: 10001, won: false, stars: 3, income: 200 }));
    assert.equal(readCollection().bestByScenario.panic07?.seed, 7);
    recordStoryReport(input({ seed: 9, completedAt: 10002, won: true, stars: 2, income: 50 }));
    assert.equal(readCollection().bestByScenario.panic07?.seed, 9);
  });
  it("validates every payload and keeps corruption out of records", () => {
    for (const bad of [
      input({ stars: 4 }),
      input({ employment: 101 }),
      input({ income: NaN }),
      input({ elapsedSeconds: -1 }),
      input({ completedAt: 0 }),
      input({ scenarioId: "__proto__" }),
      input({ scenarioNameZh: "" }),
    ]) {
      assert.equal(recordStoryReport(bad).reports.length, 0);
    }
    data.set(COLLECTION_KEY, "broken json");
    assert.equal(readCollection().reports.length, 0);
    data.set(COLLECTION_KEY, JSON.stringify({ version: 2, reports: [input()] }));
    assert.equal(readCollection().reports.length, 0);
    data.set(
      COLLECTION_KEY,
      JSON.stringify({
        version: 1,
        reports: [input(), input(), null, { id: "forged" }],
        bestByScenario: { depression: input(), panic07: input({ income: -9 }) },
        appearance: "gold",
        wishlist: ["buy-power", "new-stories", "new-stories"],
      }),
    );
    const read = readCollection();
    assert.equal(read.reports.length, 1);
    assert.deepEqual(Object.keys(read.bestByScenario), ["panic07"]);
    assert.equal(read.appearance, "naval");
    assert.deepEqual(read.wishlist, ["new-stories"]);
  });
  it("persists free appearance and wishes without touching gameplay keys", () => {
    data.set("leo-street-story-v1", "original progression");
    data.set("leo-street-active-story-v1", "original simulation");
    assert.equal(applyAppearance("slate"), true);
    assert.equal(readAppearance(), "slate");
    toggleStoryWish("desk-styles");
    assert.deepEqual(readCollection().wishlist, ["desk-styles"]);
    toggleStoryWish("desk-styles");
    assert.deepEqual(readCollection().wishlist, []);
    assert.equal(data.get("leo-street-story-v1"), "original progression");
    assert.equal(data.get("leo-street-active-story-v1"), "original simulation");
  });
  it("survives unavailable or full storage without reporting a successful appearance save", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("quota");
        },
      },
    });
    assert.equal(readCollection().reports.length, 0);
    assert.equal(applyAppearance("slate"), false);
    assert.equal(recordStoryReport(input()).reports.length, 1);
    assert.equal(readCollection().reports.length, 0);
  });
  it("exports truthful report text only and includes no personal or payment data", () => {
    const r = recordStoryReport(input()).reports[0]!;
    assert.match(reportShareText(r), /复苏 2\/3 星/);
    assert.match(reportShareText(r, true), /Employment 92.0%/);
    assert.match(reportShareText(r, true), /not a verified ranking/);
    assert.doesNotMatch(reportShareText(r), /http|立即购买|限时|排行榜第一/);
  });
});

it("preserves final condition evidence while older reports stay readable", () => {
  recordStoryReport(input());
  assert.equal(readCollection().reports[0].conditions, undefined);
  const conditions = [
    { id: "pressure", zh: "挤兑压力", en: "Panic", current: "70.0", target: "≤ 55", met: false },
  ];
  recordStoryReport(input({ won: false, stars: 3, completedAt: 20000, conditions }));
  assert.deepEqual(readCollection().reports[0].conditions, conditions);
  conditions[0].current = "0";
  assert.equal(readCollection().reports[0].conditions![0].current, "70.0");
});
