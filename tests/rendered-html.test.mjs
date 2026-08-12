import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const output = new URL("../dist/client/", import.meta.url);

test("exports the complete static archive", async () => {
  const html = await readFile(new URL("index.html", output), "utf8");

  assert.match(html, /<html[^>]+lang="ko"/i);
  assert.match(html, /<title>NIKKE \/\/ OVERLOAD ARCHIVE<\/title>/i);
  assert.match(html, /전체 니케 아카이브/);
  assert.match(html, /196/);
  assert.match(html, /오버로드 보기/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("includes Pages and social assets", async () => {
  await Promise.all([
    access(new URL(".nojekyll", output)),
    access(new URL("og.png", output)),
    access(new URL("../../.github/workflows/deploy-pages.yml", output)),
    access(new URL("public/og.png", root)),
  ]);
});
