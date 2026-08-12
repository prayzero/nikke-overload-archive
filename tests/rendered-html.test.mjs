import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const output = new URL("../dist/client/", import.meta.url);

test("exports the complete static archive", async () => {
  const html = await readFile(new URL("index.html", output), "utf8");

  assert.match(html, /<html[^>]+lang="ko"/i);
  assert.match(html, /<title>NIKKE \/\/ OVERLOAD ARCHIVE<\/title>/i);
  assert.match(html, /전체 니케 빌드 아카이브/);
  assert.match(html, /196/);
  assert.match(html, /빌드 보기/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("writes every referenced CSS and JavaScript asset at the artifact root", async () => {
  const html = await readFile(new URL("index.html", output), "utf8");
  const assetUrls = [...html.matchAll(/(?:href|src)="([^"]+\/_next\/[^"]+\.(?:css|js))"/g)]
    .map((match) => new URL(match[1], "https://example.test/"));

  assert.ok(assetUrls.length >= 2);
  await Promise.all(
    assetUrls.map((assetUrl) => {
      const nextIndex = assetUrl.pathname.indexOf("/_next/");
      assert.notEqual(nextIndex, -1);
      return access(new URL(assetUrl.pathname.slice(nextIndex + 1), output));
    }),
  );
});

test("includes Pages and social assets", async () => {
  await Promise.all([
    access(new URL(".nojekyll", output)),
    access(new URL("og.png", output)),
    access(new URL("../../.github/workflows/deploy-pages.yml", output)),
    access(new URL("public/og.png", root)),
  ]);
});

test("maps full-body artwork for every playable Nikke", async () => {
  const roster = JSON.parse(await readFile(new URL("app/roster.json", root), "utf8"));

  assert.equal(roster.length, 196);
  assert.equal(roster.filter((nikke) => nikke.artwork).length, 196);
  assert.ok(
    roster.every((nikke) =>
      nikke.artwork.startsWith("https://static.wikia.nocookie.net/"),
    ),
  );
});

test("provides one validated overload build for every playable Nikke", async () => {
  const roster = JSON.parse(await readFile(new URL("app/roster.json", root), "utf8"));
  const builds = JSON.parse(await readFile(new URL("app/overloads.json", root), "utf8"));
  const validStats = new Set([
    "attack", "element", "maxAmmo", "chargeSpeed", "chargeDamage",
    "hitRate", "critRate", "critDamage", "defense",
  ]);

  assert.equal(builds.length, roster.length);
  assert.deepEqual(
    builds.map((build) => build.name).sort(),
    roster.map((nikke) => nikke.name).sort(),
  );
  assert.equal(new Set(builds.map((build) => build.name)).size, roster.length);
  assert.ok(builds.every((build) => build.primary.length === 3));
  assert.ok(builds.every((build) => build.primary.every(({ stat, count }) => validStats.has(stat) && count >= 1 && count <= 4)));
  assert.ok(builds.every((build) => build.primary.every(({ stat }) => !build.avoid.includes(stat))));
});
