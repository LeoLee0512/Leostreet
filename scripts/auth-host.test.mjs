import assert from "node:assert/strict";
import { test } from "node:test";
import { isAllowedAuthHost, isAllowedForwardedProto } from "./auth-host.mjs";

test("preview and loopback hosts are accepted", () => {
  assert.equal(isAllowedAuthHost("abc.grok-sandbox.com"), true);
  assert.equal(isAllowedAuthHost("play.grok.me:443"), true);
  assert.equal(isAllowedAuthHost("localhost:8080"), true);
  assert.equal(isAllowedAuthHost("[::1]:8080"), true);
});

test("an arbitrary forwarded host is rejected", () => {
  assert.equal(isAllowedAuthHost("evil.example"), false);
  assert.equal(isAllowedAuthHost("grok.me.evil.example"), false);
  assert.equal(isAllowedAuthHost(""), false);
});

test("only http and https are forwarded protocols", () => {
  assert.equal(isAllowedForwardedProto("https"), true);
  assert.equal(isAllowedForwardedProto("http, https"), true);
  assert.equal(isAllowedForwardedProto("javascript"), false);
});
