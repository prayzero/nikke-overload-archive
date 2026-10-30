import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { access, readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

// Exercise the production export in an isolated, headless browser context.
// All requests to the site's origin are fulfilled from local build files.
// No user profile, saved roster, visible browser window, or live site is edited.
const output = new URL("../dist/client/", import.meta.url);
const roster = JSON.parse(await readFile(new URL("../app/roster.json", import.meta.url), "utf8"));
const catalog = JSON.parse(await readFile(new URL("../app/arena-presets.json", import.meta.url), "utf8"));
const html = await readFile(new URL("index.html", output), "utf8");
const site = new URL(html.match(/rel="canonical" href="([^"]+)"/)?.[1] ?? "https://archive.test/");
const ownedKey = "nikke-overload-archive:roster:v1";
const favoriteKey = "nikke-overload-archive:arena:v1";
const fixtureNames = new Set(catalog.presets.filter(({ id }) =>
  ["scarlet-trina-rosanna", "sanis-noah-emilia", "cinderella-blanc-rapunzel"].includes(id)).flatMap(({ members }) => members));
const fixtureIds = roster.filter(({ name }) => fixtureNames.has(name)).map(({ id }) => id);
const mimeTypes = { ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".html": "text/html", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".ico": "image/x-icon" };
let browser;

before(async () => {
  const paths = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].filter(Boolean);
  let executablePath;
  for (const path of paths) { try { await access(path); executablePath = path; break; } catch { /* Try the next installed browser. */ } }
  if (!executablePath) throw new Error("Install Chrome/Chromium or set CHROME_PATH for internal browser tests");
  browser = await chromium.launch({ executablePath, headless: true });
  await mkdir(new URL("../work/arena-browser/", import.meta.url), { recursive: true });
});
after(async () => { await browser?.close(); });

async function session(t, { owned = [], favoriteSave, blockSave = false, clipboardFails = false, viewport = { width: 1440, height: 1100 } } = {}) {
  const context = await browser.newContext({ viewport });
  t.after(() => context.close());
  const pageErrors = [];
  const page = await context.newPage();
  page.on("pageerror", (error) => pageErrors.push(error.message));
  t.after(() => assert.deepEqual(pageErrors, [], "No client runtime errors"));
  await context.route(`${site.origin}/**`, async (route) => {
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
    if (!pathname.startsWith(site.pathname)) return route.fulfill({ status: 404, body: "Unknown local asset" });
    const relative = pathname.slice(site.pathname.length) || "index.html";
    const file = new URL(relative, output);
    if (!file.href.startsWith(output.href)) return route.fulfill({ status: 403, body: "Invalid path" });
    try {
      const body = await readFile(file);
      const extension = relative.slice(relative.lastIndexOf("."));
      await route.fulfill({ status: 200, body, contentType: mimeTypes[extension] ?? "application/octet-stream" });
    } catch { await route.fulfill({ status: 404, body: "Missing local asset" }); }
  });
  await context.addInitScript(({ ownedKey, favoriteKey, owned, favoriteSave, blockSave, clipboardFails }) => {
    if (sessionStorage.getItem("fixture-ready") !== "yes") {
      localStorage.setItem(ownedKey, JSON.stringify({ version: 1, ownedIds: owned }));
      if (favoriteSave !== undefined) localStorage.setItem(favoriteKey, favoriteSave);
      sessionStorage.setItem("fixture-ready", "yes");
    }
    if (blockSave) Storage.prototype.setItem = () => { throw new Error("Storage disabled for test"); };
    if (clipboardFails) Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => { throw new Error("Clipboard denied for test"); } } });
  }, { ownedKey, favoriteKey, owned, favoriteSave, blockSave, clipboardFails });
  await page.goto(site.href, { waitUntil: "domcontentloaded" });
  await page.locator(".arena-readiness small").filter({ hasText: "보유" }).waitFor();
  await page.waitForFunction(() => !document.querySelector("#arena .arena-empty__code")?.textContent?.includes("SYNC"));
  return page;
}

test("empty ownership prompts registration without invented teams", async (t) => {
  const page = await session(t);
  assert.equal(await page.locator(".arena-teams .arena-team").count(), 0);
  assert.match(await page.locator("#arena").innerText(), /먼저 보유 니케를 등록/);
  assert.equal(await page.locator(".arena-review").count(), 0);
});

test("owned anniversary units show sourced pending reviews, update on removal and preserve detail focus", async (t) => {
  const owned = roster.filter(({ name }) => ["Marian: Queen", "Rapunzel: Sanctuary"].includes(name)).map(({ id }) => id);
  const page = await session(t, { owned });
  const panel = page.getByRole("region", { name: "보유 니케의 편성 검토" });
  await panel.waitFor();
  assert.equal(await panel.locator(".arena-review__card").count(), 2);
  assert.equal(await page.locator(".arena-teams .arena-team").count(), 0);
  assert.match(await page.locator(".arena-readiness").innerText(), /보유 2명 · 조건 충족 0조합/);
  for (const review of catalog.pendingReviews) {
    const nikke = roster.find(({ name }) => name === review.name);
    const card = panel.getByRole("article", { name: nikke.nameKo, exact: true });
    await card.getByText("스킬 조건과 확인 자료", { exact: true }).click();
    assert.match(await card.innerText(), /편성 검증 대기/);
    assert.match(await card.innerText(), /2026\.10\.30/);
    for (const note of review.notes) assert.ok((await card.innerText()).includes(note));
    assert.equal(await card.locator('a[target="_blank"][rel="noreferrer"]').count(), review.sourceIds.length);
  }
  const opener = panel.getByRole("button", { name: "라푼젤 : 생츄어리 검토 카드에서 장비 정보 보기" });
  await opener.click();
  await page.getByRole("dialog", { name: "라푼젤 : 생츄어리", exact: true }).waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "detached" });
  assert.ok(await opener.evaluate((element) => element === document.activeElement));
  await panel.screenshot({ path: fileURLToPath(new URL("../work/arena-browser/anniversary-review-desktop.png", import.meta.url)) });
  await page.setViewportSize({ width: 320, height: 1000 });
  await panel.scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await panel.screenshot({ path: fileURLToPath(new URL("../work/arena-browser/anniversary-review-mobile.png", import.meta.url)) });
  await page.getByRole("searchbox", { name: "니케 이름 검색" }).fill("Marian: Queen");
  await page.getByRole("button", { name: "마리안 : 퀸 보유 해제", exact: true }).click();
  await panel.getByRole("article", { name: "마리안 : 퀸", exact: true }).waitFor({ state: "detached" });
  assert.equal(await panel.locator(".arena-review__card").count(), 1);
  await page.reload({ waitUntil: "domcontentloaded" });
  await panel.getByRole("article", { name: "라푼젤 : 생츄어리", exact: true }).waitFor();
  assert.equal(await panel.locator(".arena-review__card").count(), 1);
});

test("released anniversary characters can be found, saved, and opened with their sourced builds", async (t) => {
  const page = await session(t);
  for (const name of ["Marian: Queen", "Rapunzel: Sanctuary"]) {
    const nikke = roster.find((entry) => entry.name === name);
    assert.ok(nikke, `${name} is released and present`);
    await page.getByRole("searchbox", { name: "니케 이름 검색" }).fill(name);
    await page.getByRole("button", { name: `${nikke.nameKo} 보유 등록`, exact: true }).click();
    await page.getByRole("button", { name: `${nikke.nameKo} 보유 해제`, exact: true }).waitFor();
    await page.getByRole("button", { name: new RegExp(`${nikke.nameKo}.*오버로드와 추천 큐브 세팅 보기`) }).click();
    const drawer = page.getByRole("dialog", { name: nikke.nameKo, exact: true });
    await drawer.waitFor();
    assert.match(await drawer.innerText(), /2026-10-30/);
    if (name === "Rapunzel: Sanctuary") {
      assert.match(await drawer.innerText(), /조건별 검토/);
      assert.match(await drawer.innerText(), /추천 옵션 · 줄 수 미지정/);
      assert.match(await drawer.innerText(), /차지 속도 · 우월 코드 · 장탄 수 · 차지 대미지/);
      assert.match(await drawer.innerText(), /출시 초기 참고안/);
      assert.deepEqual(await drawer.locator('.cube-option__name strong').allTextContents(), ["렐릭 베어 큐브", "렐릭 부스트 큐브", "렐릭 비거 큐브"]);
      assert.doesNotMatch(await drawer.innerText(), /재설정 비추천/);
      assert.equal(await drawer.locator('.gear-matrix article').count(), 0);
    } else {
      assert.equal(await drawer.locator('.gear-matrix article').count(), 4);
      assert.match(await drawer.innerText(), /출시 전 초기 분석/);
    }
    assert.ok(await drawer.locator('.recommendation-sources a').count() > 0);
    await page.getByRole("button", { name: "상세 닫기", exact: true }).click();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("searchbox", { name: "니케 이름 검색" }).fill(nikke.nameKo);
    await page.getByRole("button", { name: `${nikke.nameKo} 보유 해제`, exact: true }).waitFor();
  }
});

test("new cube information is reachable and readable on desktop and narrow mobile", async (t) => {
  const page = await session(t);
  await page.getByRole("link", { name: "새 큐브 정보" }).click();
  const section = page.getByRole("region", { name: "새 큐브 · Bezel 큐브" });
  assert.match(await section.innerText(), /로스트 섹터 30/);
  assert.match(await section.innerText(), /현재 HP를 회복하는 효과는 아닙니다/);
  assert.equal(await section.locator('.cube-update-levels article').count(), 3);
  assert.deepEqual(await section.locator('.cube-update-levels strong').allTextContents(), ["+4.01%", "+6.01%", "+8.02%"]);
  assert.equal(await section.locator('a[target="_blank"][rel="noreferrer"]').count(), 2);
  await section.screenshot({ path: fileURLToPath(new URL("../work/arena-browser/bezel-desktop.png", import.meta.url)) });
  await page.setViewportSize({ width: 320, height: 900 });
  await section.scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await section.screenshot({ path: fileURLToPath(new URL("../work/arena-browser/bezel-mobile.png", import.meta.url)) });
});

test("production UI renders three disjoint owned teams and persists ownership edits", async (t) => {
  const page = await session(t, { owned: fixtureIds });
  const teams = page.locator(".arena-teams .arena-team");
  assert.equal(await teams.count(), 3);
  const names = await page.locator(".arena-teams .arena-member__name").allTextContents();
  assert.equal(new Set(names).size, 15);
  assert.ok(names.every((name) => roster.some((nikke) => nikke.nameKo === name && fixtureIds.includes(nikke.id))));
  await page.getByRole("button", { name: "센티 보유 해제", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll(".arena-teams .arena-team").length < 3);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "센티 보유 등록", exact: true }).waitFor();
  assert.ok(await teams.count() < 3);
  await page.getByRole("button", { name: "센티 보유 등록", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll(".arena-teams .arena-team").length === 3);
  await page.locator("#arena").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll(".arena-teams img")]
    .filter((image) => { const rect = image.getBoundingClientRect(); return rect.top < innerHeight && rect.bottom > 0; })
    .every((image) => image.complete), undefined, { timeout: 10000 }).catch(() => {});
  await page.screenshot({ path: fileURLToPath(new URL("../work/arena-browser/desktop.png", import.meta.url)) });
});

test("favorite conditions unlock only after confirmation and survive reload", async (t) => {
  const preset = catalog.presets.find(({ id }) => id === "hero-blanc-jackal");
  const owned = roster.filter(({ name }) => preset.members.includes(name)).map(({ id }) => id);
  const page = await session(t, { owned });
  assert.equal(await page.locator(".arena-teams .arena-team").count(), 0);
  await page.getByRole("checkbox", { name: "센티", exact: true }).check();
  await page.getByRole("checkbox", { name: "헬름", exact: true }).check();
  await page.locator(".arena-teams .arena-team").waitFor();
  assert.equal(await page.locator(".arena-teams .arena-team").count(), 1);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".arena-teams .arena-team").waitFor();
  assert.ok(await page.getByRole("checkbox", { name: "헬름", exact: true }).isChecked());
  await page.getByRole("checkbox", { name: "센티", exact: true }).uncheck();
  await page.locator(".arena-teams").waitFor({ state: "detached" });
});

test("malformed or blocked favorite storage keeps the roster usable", async (t) => {
  const page = await session(t, { owned: fixtureIds, favoriteSave: "{broken", blockSave: true });
  assert.equal(await page.locator(".arena-teams .arena-team").count(), 3);
  assert.match(await page.locator(".arena-storage-message").innerText(), /읽지 못했습니다/);
  await page.getByRole("checkbox", { name: "센티", exact: true }).check();
  assert.match(await page.locator(".arena-storage-message").innerText(), /이번 화면에서만/);
});

test("denied clipboard offers complete text and character details retain focus", async (t) => {
  const pendingIds = roster.filter(({ name }) => catalog.pendingReviews.some((review) => review.name === name)).map(({ id }) => id);
  const page = await session(t, { owned: [...fixtureIds, ...pendingIds], clipboardFails: true });
  assert.equal(await page.locator(".arena-review__card").count(), 2);
  await page.getByRole("button", { name: /추천 3팀 복사/ }).click();
  const text = await page.getByRole("textbox", { name: "직접 복사할 추천 편성" }).inputValue();
  assert.equal((text.match(/\/ P5 /g) ?? []).length, 3);
  assert.equal((text.match(/첫 버스트:/g) ?? []).length, 3);
  assert.doesNotMatch(text, /마리안 : 퀸|라푼젤 : 생츄어리/);
  const opener = page.locator(".arena-teams .arena-member__button").first();
  await opener.click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "detached" });
  assert.ok(await opener.evaluate((element) => element === document.activeElement));
});

test("mobile layout preserves five slots without horizontal overflow", async (t) => {
  const page = await session(t, { owned: fixtureIds, viewport: { width: 375, height: 900 } });
  for (const width of [375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page.locator("#arena").evaluate((section) => ({
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      lineups: [...section.querySelectorAll(".arena-teams .arena-lineup")].map((list) => ({
        count: list.children.length, columns: getComputedStyle(list).gridTemplateColumns.split(" ").length,
      })),
    }));
    assert.equal(layout.overflow, false, `No overflow at ${width}px`);
    assert.ok(layout.lineups.every(({ count, columns }) => count === 5 && columns === 5));
  }
  await page.locator(".arena-teams").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll(".arena-teams img")]
    .filter((image) => { const rect = image.getBoundingClientRect(); return rect.top < innerHeight && rect.bottom > 0; })
    .every((image) => image.complete), undefined, { timeout: 10000 }).catch(() => {});
  await page.screenshot({ path: fileURLToPath(new URL("../work/arena-browser/mobile.png", import.meta.url)) });
});
