// The permanent game disclaimer (owner, 2026-10-02). These tests fail if any place that must show it loses it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { GAME_DISCLAIMER, gameDisclaimer } from "./disclaimer.ts";
import { reportShareText } from "./story/engagement.ts";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

test("the disclaimer text is exactly the owner's wording", () => {
  assert.equal(GAME_DISCLAIMER.zh, "此为游戏，切勿当成投资建议，出现一切问题后果自负。");
  assert.match(GAME_DISCLAIMER.en, /^This is a game\. Never treat it as investment advice\./);
  assert.equal(gameDisclaimer(), GAME_DISCLAIMER.zh);
  assert.equal(gameDisclaimer(true), GAME_DISCLAIMER.en);
});

test("every shared run report ends with the disclaimer, in both languages", () => {
  const report = {
    scenarioNameZh: "南海泡沫", scenarioNameEn: "South Sea Bubble", won: true, stars: 2, income: 101.5,
    employment: 92, length: "standard", elapsedSeconds: 3600, seed: 7,
  } as unknown as Parameters<typeof reportShareText>[0];
  assert.ok(reportShareText(report).endsWith(GAME_DISCLAIMER.zh));
  assert.ok(reportShareText(report, true).endsWith(GAME_DISCLAIMER.en));
});

test("both the web root and the desktop root mount the always-visible strip", () => {
  assert.match(read("src/routes/__root.tsx"), /<GameDisclaimer \/>/);
  assert.match(read("src/desktop.tsx"), /<GameDisclaimer\/>/);
  const strip = read("src/components/game/GameDisclaimer.tsx");
  assert.match(strip, /GAME_DISCLAIMER\[lang\]/);
  assert.match(strip, /fixed inset-x-0 bottom-0/);
  assert.doesNotMatch(strip, /onClick=|useState\(|\bhidden\b|opacity-0|\binvisible\b/, "the strip must not be closable or hideable");
});

test("the desktop installer shows the disclaimer before installing", () => {
  assert.match(read("desktop/setup.iss"), /^InfoBeforeFile=免责声明\.txt\r?$/m);
  const text = read("desktop/免责声明.txt");
  assert.ok(text.includes(GAME_DISCLAIMER.zh) && text.includes(GAME_DISCLAIMER.en));
});
