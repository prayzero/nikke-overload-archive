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
  const assetUrls = [...html.matchAll(/(?:href|src)="([^"]+\.(?:css|js))"/g)]
    .map((match) => new URL(match[1], "https://example.test/"))
    .filter((assetUrl) => assetUrl.pathname.includes("/_next/"));

  assert.ok(assetUrls.length >= 2);
  await Promise.all(
    assetUrls.map((assetUrl) => {
      const nextIndex = assetUrl.pathname.indexOf("/_next/");
      assert.notEqual(nextIndex, -1);
      return access(new URL(assetUrl.pathname.slice(nextIndex + 1), output));
    }),
  );
});

test("includes hardened metadata and Pages assets", async () => {
  const html = await readFile(new URL("index.html", output), "utf8");
  const manifest = JSON.parse(await readFile(new URL("manifest.webmanifest", output), "utf8"));
  const cspMeta = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"\/>/i);
  const canonical = html.match(/rel="canonical" href="([^"]+)"/i)?.[1];
  const openGraphUrl = html.match(/property="og:url" content="([^"]+)"/i)?.[1];

  assert.ok(cspMeta);
  assert.match(html.slice(0, 180), /<head><meta charSet="utf-8"\/><meta http-equiv="Content-Security-Policy"/i);
  assert.ok(html.indexOf(cspMeta[0]) < html.indexOf("<script"));
  assert.match(cspMeta[1], /script-src 'self' 'sha256-/);
  assert.doesNotMatch(cspMeta[1], /unsafe-inline/);
  assert.match(html, /name="referrer" content="no-referrer"/i);
  assert.ok(canonical);
  assert.equal(openGraphUrl, canonical);
  assert.equal(new URL(canonical).pathname.endsWith("/"), true);
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    const configuredSiteUrl = `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "")}/`;
    assert.equal(canonical, configuredSiteUrl);
  }
  assert.match(html, /property="og:image:width" content="1200"/i);
  assert.match(html, /property="og:image:height" content="630"/i);
  assert.equal(manifest.icons.length, 2);
  assert.ok(manifest.icons.every(({ src }) => src.startsWith("/nikke-overload-archive/")));

  await Promise.all([
    access(new URL(".nojekyll", output)),
    access(new URL("og.png", output)),
    access(new URL("favicon.ico", output)),
    access(new URL("icon.png", output)),
    access(new URL("icon-512.png", output)),
    access(new URL("manifest.webmanifest", output)),
    access(new URL("robots.txt", output)),
    access(new URL("sitemap.xml", output)),
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
  const validGrades = new Set(["essential", "ideal", "filler"]);

  assert.equal(builds.length, roster.length);
  assert.deepEqual(
    builds.map((build) => build.name).sort(),
    roster.map((nikke) => nikke.name).sort(),
  );
  assert.equal(new Set(builds.map((build) => build.name)).size, roster.length);
  assert.ok(builds.every((build) => build.primary.length === 3));
  assert.ok(builds.every((build) => build.primary.every(({ stat, count, grade }) =>
    validStats.has(stat) && count >= 1 && count <= 4 && validGrades.has(grade))));
  assert.ok(builds.every((build) =>
    build.primary.reduce((total, { count }) => total + count, 0) <= 12));
  assert.ok(builds.every((build) => new Set(build.primary.map(({ stat }) => stat)).size === 3));
  assert.ok(builds.every((build) => build.alternatives.every((stat) => validStats.has(stat))));
  assert.ok(builds.every((build) => build.avoid.every((stat) => validStats.has(stat))));
  assert.ok(builds.every((build) => new Set(build.alternatives).size === build.alternatives.length));
  assert.ok(builds.every((build) => new Set(build.avoid).size === build.avoid.length));
  assert.ok(builds.every((build) => {
    const primaryStats = new Set(build.primary.map(({ stat }) => stat));
    const alternatives = new Set(build.alternatives);
    const avoid = new Set(build.avoid);

    return [...primaryStats].every((stat) => !alternatives.has(stat) && !avoid.has(stat))
      && [...alternatives].every((stat) => !avoid.has(stat));
  }));
});
