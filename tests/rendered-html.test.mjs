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
  const roster = JSON.parse(await readFile(new URL("app/roster.json", root), "utf8"));
  assert.ok(html.replace(/<!--[\s\S]*?-->/g, "").includes(`${roster.length}명의`));
  assert.match(html, /세팅 보기/);
  assert.match(html, /퀸\(니지마 마코토\)/);
  assert.match(html, /아마기 유키코/);
  assert.match(html, /아이기스/);
  assert.match(html, /드레이크 : 그레이트 빌런/);
  assert.match(html, /추천 오버로드와 큐브/);
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
  assert.match(cspMeta[1], /img-src[^;]+https:\/\/nikke-db-legacy\.pages\.dev/);
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

  assert.ok(roster.length >= 200);
  assert.equal(new Set(roster.map(({ id }) => id)).size, roster.length);
  assert.equal(new Set(roster.map(({ name }) => name)).size, roster.length);
  assert.equal(roster.filter((nikke) => nikke.artwork).length, roster.length);
  assert.ok(
    roster.every((nikke) =>
      nikke.artwork.startsWith("https://static.wikia.nocookie.net/"),
    ),
  );
  assert.ok(roster.every(({ image }) => /^https:\/\//.test(image)));
  assert.deepEqual(
    roster
      .filter(({ id }) => ["c870", "c871", "c872"].includes(id))
      .map(({ name }) => name)
      .sort(),
    ["Aigis", "Queen (Makoto Niijima)", "Yukiko Amagi"],
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
  assert.ok(builds.every((build) => build.primary.length >= 1 && build.primary.length <= 3));
  assert.ok(builds.every((build) => build.primary.every(({ stat, count, grade }) =>
    validStats.has(stat) && count >= 1 && count <= 4 && validGrades.has(grade))));
  assert.ok(builds.every((build) =>
    build.primary.reduce((total, { count }) => total + count, 0) <= 12));
  assert.ok(builds.every((build) => new Set(build.primary.map(({ stat }) => stat)).size === build.primary.length));
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

test("provides one validated cube recommendation for every playable Nikke", async () => {
  const roster = JSON.parse(await readFile(new URL("app/roster.json", root), "utf8"));
  const recommendations = JSON.parse(await readFile(new URL("app/cubes.json", root), "utf8"));
  const validCubeIds = new Set([
    "assault", "onslaught", "resilience", "bastion", "adjutant", "wingman",
    "quantum", "vigor", "endurance", "healing", "tempering", "assist",
    "destruction", "piercing", "crush", "cover", "divide",
  ]);
  const validConfidence = new Set(["guide", "mechanic"]);

  assert.equal(recommendations.length, roster.length);
  assert.deepEqual(
    recommendations.map(({ name }) => name).sort(),
    roster.map(({ name }) => name).sort(),
  );
  assert.equal(new Set(recommendations.map(({ name }) => name)).size, roster.length);
  assert.ok(recommendations.every(({ primary }) => validCubeIds.has(primary)));
  assert.ok(recommendations.every(({ alternatives }) =>
    Array.isArray(alternatives)
      && alternatives.every((cubeId) => validCubeIds.has(cubeId))
      && new Set(alternatives).size === alternatives.length));
  assert.ok(recommendations.every(({ primary, alternatives }) => !alternatives.includes(primary)));
  assert.ok(recommendations.every(({ mode, note }) =>
    typeof mode === "string" && mode.trim().length > 0
      && typeof note === "string" && note.trim().length > 0));
  assert.ok(recommendations.every(({ confidence }) => validConfidence.has(confidence)));
  assert.ok(recommendations.every(({ verifiedAt }) => /^\d{4}-\d{2}-\d{2}$/.test(verifiedAt)));
});

test("renders accessible cube guidance in the character detail drawer", async () => {
  const component = await readFile(new URL("app/roster-archive.tsx", root), "utf8");

  assert.match(component, /추천 큐브/);
  assert.match(component, /className="card-cube"/);
  assert.match(component, /className="cube-recommendation"/);
  assert.match(component, /aria-labelledby=\{`drawer-cube-title-/);
  assert.match(component, /aria-describedby=\{`drawer-cube-note-/);
  assert.match(component, /<ol className="cube-options" aria-label=/);
});
