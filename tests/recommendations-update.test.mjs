import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { applyReview, loadReviews, validateReviews } from "../scripts/reviewed-recommendations.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const [roster, overloads, cubes] = await Promise.all([
  readJson("app/roster.json"), readJson("app/overloads.json"), readJson("app/cubes.json"),
]);
const byName = (records, name) => {
  const record = records.find((entry) => entry.name === name);
  assert.ok(record, `${name}: missing recommendation`);
  return record;
};

test("released September and October units have sourced individual recommendations", () => {
  for (const name of ["Guilty: Mighty Bunny", "Sin: Swift Bunny", "Belorta: Pumpkin Witch"]) {
    assert.ok(roster.some((entry) => entry.name === name));
    for (const records of [overloads, cubes]) {
      const record = byName(records, name);
      assert.equal(record.verifiedAt, name === "Belorta: Pumpkin Witch" ? "2026-10-23" : "2026-10-30");
      assert.ok(record.sources?.length, `${name}: individual source required`);
      assert.doesNotMatch(record.note, /개별 스킬 검증 전/);
    }
  }
});

test("bunny builds distinguish fixed burst charge time from ordinary full-charge attacks", () => {
  const guilty = byName(overloads, "Guilty: Mighty Bunny");
  const sin = byName(overloads, "Sin: Swift Bunny");
  for (const record of [guilty, sin]) {
    assert.ok(!record.primary.some(({ stat }) => stat === "chargeSpeed"));
    assert.ok(record.primary.some(({ stat, count }) => stat === "maxAmmo" && count === 1));
    assert.match(record.note, /1~2줄/);
    assert.match(record.note, /고정/);
    assert.equal(record.primary.length, 3);
    assert.equal(record.primary.reduce((sum, { count }) => sum + count, 0), 9,
      "do not invent fixed targets for optional filler lines");
  }
  assert.ok(!guilty.avoid.includes("chargeDamage"));
  assert.ok(guilty.alternatives.includes("chargeDamage"));
  assert.ok(guilty.alternatives.includes("chargeSpeed"));
  assert.ok(sin.alternatives.includes("chargeDamage"));
  for (const name of [guilty.name, sin.name]) {
    const cube = byName(cubes, name);
    assert.equal(cube.primary, "crush");
    assert.match(cube.note, /Engage/);
    assert.match(cube.note, /Stance/);
  }
});

test("anniversary follow-up uses published targets while preserving Marian's conditional ammo requirements", () => {
  const marian = byName(overloads, "Marian: Queen");
  assert.equal(marian.mode, "PvE");
  assert.equal(marian.verifiedAt, "2026-11-09");
  assert.match(marian.note, /1~4줄/);
  assert.match(marian.note, /68\.93%/);
  assert.match(marian.note, /SR 소장품 15레벨/);
  assert.match(marian.note, /자동 지연/);
  assert.doesNotMatch(marian.note, /출시 전|미공개|Tier 11/);
  assert.equal(marian.primary.reduce((sum, { count }) => sum + count, 0), 9);
  assert.deepEqual(marian.alternatives, ["critRate", "critDamage"]);
  assert.equal(byName(cubes, marian.name).primary, "bastion");
  assert.deepEqual(byName(cubes, marian.name).alternatives, ["resilience", "destruction"]);
  assert.deepEqual(byName(cubes, marian.name).pvp, ["tempering", "vigor", "bastion"]);
  for (const records of [overloads, cubes]) {
    const rapunzel = byName(records, "Rapunzel: Sanctuary");
    assert.equal(rapunzel.confidence, "guide");
    assert.equal(rapunzel.verifiedAt, "2026-11-09");
    assert.doesNotMatch(rapunzel.note, /미공개|출시 초기/);
  }
  const build = byName(overloads, "Rapunzel: Sanctuary");
  assert.equal(build.reviewStatus, "reviewed");
  assert.deepEqual(build.primary, [
    { stat: "element", count: 4, grade: "ideal" },
    { stat: "attack", count: 4, grade: "ideal" },
    { stat: "maxAmmo", count: 1, grade: "ideal" },
  ]);
  assert.deepEqual(build.alternatives, ["critDamage", "critRate"]);
  assert.match(build.note, /풀 차지 상태에 한정/);
  assert.match(build.note, /모든 팀에서 필수 투자는 아닙니다/);
  const cube = byName(cubes, build.name);
  assert.equal(cube.reviewStatus, "reviewed");
  assert.equal(cube.primary, "resilience");
  assert.deepEqual(cube.alternatives, ["bastion", "destruction"]);
  assert.deepEqual(cube.pvp, ["tempering", "vigor", "bastion"]);
  assert.match(cube.note, /완성 편성.*보장하지 않습니다/);
});

test("Scarlet Goddeath distinguishes normal-attack crit buffs from skill hits and cube level tradeoffs", () => {
  const build = byName(overloads, "Scarlet: Goddeath");
  const cube = byName(cubes, build.name);
  assert.ok(roster.some(({ name }) => name === build.name));
  assert.equal(build.verifiedAt, "2026-11-09");
  assert.equal(cube.verifiedAt, "2026-11-09");
  assert.equal(build.reviewStatus, "reviewed");
  assert.equal(build.primary.reduce((sum, { count }) => sum + count, 0), 8);
  assert.ok(build.alternatives.includes("critRate"));
  assert.ok(build.alternatives.includes("critDamage"));
  assert.ok(!build.avoid.includes("critRate"));
  assert.ok(!build.primary.some(({ stat }) => stat === "maxAmmo" || stat === "chargeSpeed"));
  assert.match(build.note, /발도 추가타와 버스트 단일 타격/);
  assert.equal(cube.primary, "piercing");
  assert.deepEqual(cube.alternatives, ["resilience", "bastion", "destruction"]);
  assert.match(cube.note, /13레벨 미만.*15레벨/);
  assert.deepEqual(cube.pvp, ["tempering", "vigor", "bastion"]);
});

test("mechanic-specific advice replaces misleading weapon defaults", () => {
  const diesel = byName(overloads, "Diesel: Winter Sweets");
  assert.ok(!diesel.primary.some(({ stat }) => stat === "chargeSpeed"));
  assert.ok(diesel.primary.some(({ stat }) => stat === "critRate"));
  assert.equal(byName(cubes, "Diesel: Winter Sweets").primary, "resilience");
  assert.equal(byName(cubes, "Label").primary, "tempering");
  assert.equal(byName(cubes, "Maxwell: Ordinary Mechanic").primary, "vigor");
  assert.match(byName(cubes, "Mint").note, /3초/);
  const belorta = byName(overloads, "Belorta: Pumpkin Witch");
  assert.deepEqual(belorta.primary, [{ stat: "maxAmmo", count: 1, grade: "ideal" }]);
  assert.equal(belorta.confidence, "guide");
  assert.match(belorta.note, /1~2줄/);
});

test("every character has individual source evidence or an explicit lack-of-guidance status", () => {
  for (const records of [overloads, cubes]) {
    for (const record of records) {
      assert.ok(record.sources?.length, `${record.name}: individual source evidence required`);
      assert.doesNotMatch(record.note, /개별 스킬 검증 전.*범용안/);
      if (record.reviewStatus === "unavailable") {
        assert.ok(records === overloads ? record.primary.length === 0 : record.primary === null);
      }
    }
  }
});

test("source reviews and shipped records agree without silently losing a reviewed character", async () => {
  const reviews = await loadReviews(roster);
  for (const [name, review] of reviews) for (const [kind, records] of [["overload", overloads], ["cube", cubes]]) {
    if (!review[kind]) continue;
    const record = byName(records, name);
    assert.equal(record.verifiedAt, review.checkedAt);
    assert.equal(record.reviewStatus, review[kind].reviewStatus);
    assert.deepEqual(record.primary, review[kind].primary);
    assert.equal(record.note, review[kind].note);
    assert.deepEqual(record.sources, review.sources);
  }
});

test("rebuilding cannot refresh a date or overwrite an independently reviewed section", () => {
  const previous = { name: "Example", verifiedAt: "2026-08-20", primary: "resilience" };
  assert.deepEqual(applyReview(previous, undefined, "cube"), previous);
  assert.deepEqual(applyReview(previous, { overload: {} }, "cube"), previous);
  assert.equal(applyReview(previous, { checkedAt: "2026-10-23", sources: [], cube: { primary: "vigor" } }, "cube").verifiedAt, "2026-10-23");
});

test("no-target guidance does not invent reroll targets for Admi, Volume, and basic Privaty", () => {
  for (const name of ["Admi", "Volume", "Privaty"]) {
    const build = byName(overloads, name);
    assert.deepEqual(build.primary, []);
    assert.equal(build.reviewStatus, "no-target");
    assert.equal(build.priority, "skip");
  }
  assert.equal(byName(cubes, "Volume").primary, "vigor");
  assert.ok(byName(cubes, "Admi").pvp.includes("adjutant"));
});

test("Dorothy's last-bullet rotation excludes magazine inflation", () => {
  const build = byName(overloads, "Dorothy");
  const cube = byName(cubes, "Dorothy");
  assert.ok(build.avoid.includes("maxAmmo"));
  assert.ok(!build.primary.some(({ stat }) => stat === "maxAmmo"));
  assert.equal(cube.primary, "resilience");
  assert.ok(![cube.primary, ...cube.alternatives].some((id) => ["bastion", "wingman"].includes(id)));
});

test("invalid evidence and contradictory review statuses fail before generation", () => {
  const base = {
    name: "Example", checkedAt: "2026-10-23",
    sources: [{ label: "Individual guide", url: "https://www.prydwen.gg/nikke/characters/example" }],
    overload: { primary: [], alternatives: [], avoid: [], priority: "skip", mode: "PvE", note: "No specific targets.", confidence: "guide", reviewStatus: "no-target" },
  };
  const names = new Set(["Example"]);
  assert.equal(validateReviews([base], names).size, 1);
  for (const host of ["gamewith.jp", "nikkehub.com"]) {
    assert.equal(validateReviews([{ ...base, sources: [{ label: "Guide", url: `https://${host}/guide` }] }], names).size, 1);
  }
  for (const records of [
    [base, base], [{ ...base, name: "Missing" }], [{ ...base, checkedAt: "2026-02-30" }],
    [{ ...base, sources: [] }], [{ ...base, sources: [{ label: "Bad", url: "javascript:alert(1)" }] }],
    ...["https://unverified.test/guide", "https://gamewith.jp.unverified.test/guide", "http://nikkehub.com/guide", "https://user@gamewith.jp/guide"].map((url) => [{ ...base, sources: [{ label: "Bad", url }] }]),
    [{ ...base, overload: { ...base.overload, reviewStatus: "reviewed" } }],
    [{ ...base, cube: { primary: "vigor", alternatives: [], mode: "PvE", note: "Missing advice", reviewStatus: "unavailable" } }],
  ]) assert.throws(() => validateReviews(records, names));
});

test("recommendation sources use labelled secure links without duplicates", () => {
  for (const record of [...overloads, ...cubes]) {
    if (!record.sources) continue;
    assert.ok(record.sources.length > 0);
    assert.equal(new Set(record.sources.map(({ url }) => url)).size, record.sources.length);
    for (const { label, url } of record.sources) {
      assert.ok(typeof label === "string" && label.trim().length > 0);
      const parsed = new URL(url);
      assert.equal(parsed.protocol, "https:");
      assert.equal(parsed.username, "");
      assert.equal(parsed.password, "");
      assert.ok(["nikke.gg", "www.prydwen.gg", "gamewith.jp", "nikkehub.com"].includes(parsed.hostname));
    }
  }
});
