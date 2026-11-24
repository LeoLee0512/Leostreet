import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveParentEmbedderOrigin } from "./preview-embedder-origin.ts";

describe("resolveParentEmbedderOrigin", () => {
  it("trusts grok.com framing a sandbox preview", () => {
    assert.equal(
      resolveParentEmbedderOrigin(false, "https://grok.com/chat", null, "abc.grok-sandbox.com"),
      "https://grok.com",
    );
  });

  it("rejects an arbitrary site framing a sandbox preview", () => {
    assert.equal(
      resolveParentEmbedderOrigin(
        false,
        "https://evil.example/phish",
        "https://evil.example",
        "abc.grok-sandbox.com",
      ),
      null,
    );
  });

  it("trusts the remint parent that matches this guest", () => {
    assert.equal(
      resolveParentEmbedderOrigin(
        false,
        "https://user-app.grok.me/preview",
        null,
        "abc.preview.user-app.grok.me",
      ),
      "https://user-app.grok.me",
    );
  });

  it("stays quiet when the page is not framed", () => {
    assert.equal(
      resolveParentEmbedderOrigin(true, "https://grok.com/", null, "abc.grok-sandbox.com"),
      null,
    );
  });
});
