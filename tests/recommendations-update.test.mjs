import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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
      assert.equal(record.verifiedAt, "2026-10-23");
      assert.ok(record.sources?.length, `${name}: individual source required`);
      assert.doesNotMatch(record.note, /개별 스킬 검증 전/);
    }
  }
});

test("bunny builds distinguish fixed burst charge time from ordinary full-charge attacks", () => {
  const guilty = byName(overloads, "Guilty: Mighty Bunny");
  const sin = byName(overloads, "Sin: Swift Bunny");
  for (const record of [guilty, sin]) {
    assert.ok(record.primary.some(({ stat }) => stat === "chargeSpeed"));
    assert.ok(record.primary.some(({ stat, count }) => stat === "maxAmmo" && count === 2));
    assert.match(record.note, /1~2줄/);
    assert.match(record.note, /고정/);
    assert.equal(record.primary.length, 4);
    assert.equal(record.primary.reduce((sum, { count }) => sum + count, 0), 12,
      "include ammunition in the complete twelve-line example");
  }
  assert.ok(guilty.avoid.includes("chargeDamage"));
  assert.ok(sin.alternatives.includes("chargeDamage"));
});

test("mechanic-specific advice replaces misleading weapon defaults", () => {
  const diesel = byName(overloads, "Diesel: Winter Sweets");
  assert.ok(!diesel.primary.some(({ stat }) => stat === "chargeSpeed"));
  assert.ok(diesel.primary.some(({ stat }) => stat === "critRate"));
  assert.equal(byName(cubes, "Diesel: Winter Sweets").primary, "resilience");
  assert.equal(byName(cubes, "Label").primary, "tempering");
  assert.equal(byName(cubes, "Maxwell: Ordinary Mechanic").primary, "vigor");
  assert.match(byName(cubes, "Mint").note, /3초/);
  assert.equal(byName(overloads, "Belorta: Pumpkin Witch").priority, "skip");
  assert.equal(byName(overloads, "Belorta: Pumpkin Witch").confidence, "mechanic");
});

test("review dates remain record-specific and generic recommendations disclose their limits", () => {
  for (const records of [overloads, cubes]) {
    assert.equal(byName(records, "Dorothy").verifiedAt, "2026-08-20");
    assert.equal(byName(records, "Privaty").verifiedAt, "2026-09-16");
    const generic = byName(records, "Product 08");
    assert.equal(generic.confidence, "mechanic");
    assert.equal(generic.verifiedAt, "2026-08-20");
    assert.match(generic.note, /개별 스킬 검증 전.*범용안/);
    for (const record of records.filter(({ verifiedAt }) => verifiedAt === "2026-10-23")) {
      assert.ok(record.sources?.length, `${record.name}: a new review date requires evidence`);
    }
  }
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
      assert.ok(["nikke.gg", "www.prydwen.gg"].includes(parsed.hostname));
    }
  }
});
