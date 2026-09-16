import assert from "node:assert/strict";
import test from "node:test";
import { checkImage, collectImageTargets } from "../scripts/check-artwork.mjs";

test("accepts a working GET when an image host rejects HEAD", async () => {
  const methods = [];
  const result = await checkImage("https://images.example/art.png", {
    fetchImage: async (_url, { method }) => {
      methods.push(method);
      return new Response(null, { status: method === "HEAD" ? 405 : 200, headers: { "content-type": "image/png" } });
    },
  });
  assert.equal(result.ok, true);
  assert.deepEqual(methods, ["HEAD", "GET"]);
});

test("does not accept a 404 placeholder image or an HTML fallback", async () => {
  for (const [status, type] of [[404, "image/webp"], [200, "text/html"]]) {
    const result = await checkImage("https://images.example/missing.png", {
      fetchImage: async () => new Response(null, { status, headers: { "content-type": type } }),
      pause: async () => {},
    });
    assert.equal(result.ok, false);
  }
});

test("retries transient host errors without masking persistent failures", async () => {
  let calls = 0;
  const result = await checkImage("https://images.example/art.png", {
    fetchImage: async () => new Response(null, { status: ++calls < 3 ? 503 : 200, headers: { "content-type": "image/png" } }),
    pause: async () => {},
  });
  assert.equal(result.ok, true);
  assert.equal(calls, 3);
});

test("checks fallback icons as well as artwork without a fixed roster count", () => {
  const targets = collectImageTargets([
    { id: "a", name: "A", artwork: "https://example/a.png", image: "https://example/icon.png" },
    { id: "b", name: "B", artwork: "https://example/b.png", image: "https://example/icon.png" },
  ]);
  assert.equal(targets.length, 3);
  assert.equal(targets.find(({ url }) => url.endsWith("/icon.png")).usages.length, 2);
  assert.throws(() => collectImageTargets([{ id: "x", name: "X", artwork: "https://example/a.png" }]));
});
