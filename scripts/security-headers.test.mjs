import assert from "node:assert/strict";
import { test } from "node:test";
import { securityHeaders } from "./security-headers.mjs";

test("preview responses get nosniff without a frame policy", () => {
  const headers = securityHeaders({});
  assert.equal(headers["x-content-type-options"], "nosniff");
  assert.equal(headers["content-security-policy"], undefined);
});

test("published responses can only be framed by Grok", () => {
  const headers = securityHeaders({ GROK_PROJECT_ID: "proj-1" });
  assert.match(headers["content-security-policy"], /frame-ancestors/);
  assert.match(headers["content-security-policy"], /https:\/\/\*\.grok\.com/);
  assert.doesNotMatch(headers["content-security-policy"], /evil/);
});
