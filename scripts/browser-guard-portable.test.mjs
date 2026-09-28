import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { test } from "node:test";
import { checkedOutputPath } from "./browser-guard.mjs";

test("screenshot allowlist resolves native absolute roots on Windows and Linux", () => {
  assert.equal(checkedOutputPath("/workspace/screenshots/test.png", ["/workspace"]), resolve("/workspace/screenshots/test.png"));
});
test("native path normalization still rejects parent traversal and sibling prefixes", () => {
  const moduleUrl = pathToFileURL(resolve("scripts/browser-guard.mjs")).href;
  for (const target of ["/workspace/../outside.png", "/workspace-elsewhere/test.png", "/workspace"]) {
    const script = `import {checkedOutputPath} from ${JSON.stringify(moduleUrl)}; checkedOutputPath(${JSON.stringify(target)}, ['/workspace']);`;
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8" });
    assert.equal(result.status, 1, target);
    assert.match(result.stderr, /must be under/);
  }
});
