import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { safeAppPath } from "./redirect.ts";

describe("safeAppPath", () => {
  it("keeps an in-app path", () => {
    assert.equal(safeAppPath("/play?seat=1#desk"), "/play?seat=1#desk");
  });

  it("replaces missing values with the home path", () => {
    assert.equal(safeAppPath(undefined), "/");
    assert.equal(safeAppPath("   "), "/");
  });

  it("rejects off-origin and protocol-relative targets", () => {
    assert.equal(safeAppPath("https://evil.example/phish"), "/");
    assert.equal(safeAppPath("//evil.example/phish"), "/");
    assert.equal(safeAppPath("javascript:alert(1)"), "/");
    assert.equal(safeAppPath("/\\evil.example"), "/");
  });
});
