import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const roster = JSON.parse(await readFile(new URL("../app/roster.json", import.meta.url), "utf8"));

test("keeps all previously saved ownership IDs stable", async () => {
  for (const snapshot of ["2026-09-16", "2026-10-28", "2026-10-30"]) {
    const previous = JSON.parse(await readFile(new URL(`./fixtures/roster-ids-${snapshot}.json`, import.meta.url), "utf8"));
    for (const [name, id] of Object.entries(previous)) {
      assert.equal(roster.find((nikke) => nikke.name === name)?.id, id, `${name}: saved ownership ID changed since ${snapshot}`);
    }
  }
});

test("includes released September and October Nikkes with verified combat attributes", () => {
  const additions = [
    ["Guilty: Mighty Bunny", "24919", "길티 : 마이티 바니", "attacker", "SR", "3", "missilis"],
    ["Sin: Swift Bunny", "24918", "신 : 스위프트 바니", "attacker", "SR", "3", "missilis"],
    ["Belorta: Pumpkin Witch", "25019", "벨로타 : 펌킨 위치", "supporter", "RL", "2", "tetra"],
  ];
  for (const [name, id, nameKo, nikkeClass, weapon, burst, manufacturer] of additions) {
    const entry = roster.find((nikke) => nikke.name === name);
    assert.ok(entry, `${name}: missing released character`);
    assert.deepEqual(
      [entry.id, entry.nameKo, entry.class, entry.weapon, entry.burst, entry.manufacturer, entry.code],
      [id, nameKo, nikkeClass, weapon, burst, manufacturer, "water"],
    );
    assert.notEqual(entry.artwork, entry.image, `${name}: full-body and fallback images must be distinct`);
  }
});

test("every roster entry has complete supported attributes and usable HTTPS image URLs", () => {
  for (const nikke of roster) {
    assert.ok(nikke.id && nikke.name.trim() && nikke.nameKo.trim());
    assert.ok(["attacker", "defender", "supporter"].includes(nikke.class), nikke.name);
    assert.ok(["AR", "MG", "RL", "SG", "SMG", "SR"].includes(nikke.weapon), nikke.name);
    assert.ok(["1", "2", "3", "ALL"].includes(nikke.burst), nikke.name);
    assert.ok(["elysion", "missilis", "tetra", "pilgrim", "abnormal"].includes(nikke.manufacturer), nikke.name);
    assert.ok(["fire", "water", "wind", "electric", "iron"].includes(nikke.code), nikke.name);
    for (const source of [nikke.image, nikke.artwork]) assert.equal(new URL(source).protocol, "https:");
  }
});

test("Diesel no longer refers to the deleted full-body file", () => {
  const diesel = roster.find(({ id }) => id === "236");
  assert.ok(diesel);
  assert.equal(diesel.name, "Diesel");
  assert.match(new URL(diesel.artwork).pathname, /\/Diesel_FB\.png\/revision\//);
  assert.doesNotMatch(diesel.artwork, /Diesel_Full_Body/);
});

test("includes the two released fourth-anniversary Nikkes with verified attributes", () => {
  const additions = [
    ["Marian: Queen", "25132", "마리안 : 퀸", "attacker", "MG", "3"],
    ["Rapunzel: Sanctuary", "25134", "라푼젤 : 생츄어리", "supporter", "RL", "2"],
  ];
  for (const [name, id, nameKo, nikkeClass, weapon, burst] of additions) {
    const entry = roster.find((nikke) => nikke.name === name);
    assert.ok(entry, `${name}: missing released character`);
    assert.deepEqual(
      [entry.id, entry.nameKo, entry.class, entry.weapon, entry.burst, entry.manufacturer, entry.code],
      [id, nameKo, nikkeClass, weapon, burst, "pilgrim", "fire"],
    );
    assert.equal(new URL(entry.image).hostname, "sg-tools-cdn.blablalink.com");
  }
  assert.equal(new Set(roster.map(({ id }) => id)).size, roster.length, "IDs must remain unique");
  assert.equal(new Set(roster.map(({ name }) => name)).size, roster.length, "Names must remain unique");
});

test("anniversary roster uses verified portrait and full-body image sources", () => {
  const marian = roster.find(({ name }) => name === "Marian: Queen");
  const rapunzel = roster.find(({ name }) => name === "Rapunzel: Sanctuary");
  // The basic full-body asset became available after the October 30 review.
  assert.notEqual(marian.artwork, marian.image);
  assert.match(new URL(marian.image).pathname, /\/a447f201daaa56f38a438779cc967c77\.webp$/);
  assert.match(new URL(marian.artwork).pathname, /\/Marian_Queen_FB\.png\/revision\//);
  assert.match(new URL(rapunzel.artwork).pathname, /\/Rapunzel_Sanctuary_FB\.png\/revision\//);
  assert.doesNotMatch(marian.artwork, /Last_Affection|marian-queen_full/);
});

test("November 9 roster includes the released Scarlet Goddeath without replacing earlier Scarlet variants", () => {
  const scarlet = roster.find(({ name }) => name === "Scarlet: Goddeath");
  assert.ok(scarlet, "November 5 release must be available by the November 9 review");
  assert.deepEqual(
    [scarlet.id, scarlet.nameKo, scarlet.class, scarlet.weapon, scarlet.burst, scarlet.manufacturer, scarlet.code],
    ["25133", "홍련 : 신살", "attacker", "AR", "3", "pilgrim", "fire"],
  );
  assert.equal(new URL(scarlet.image).hostname, "sg-tools-cdn.blablalink.com");
  assert.match(new URL(scarlet.image).pathname, /\/2668d4ae685fe7ec154f20f2301120d3\.webp$/);
  assert.match(new URL(scarlet.artwork).pathname, /\/Scarlet_Goddeath_FB\.png\/revision\//);
  assert.equal(roster.find(({ name }) => name === "Scarlet")?.id, "265");
  assert.equal(roster.find(({ name }) => name === "Scarlet: Black Shadow")?.id, "8816");
  assert.equal(roster.length, 206);
  assert.deepEqual(roster.map(({ name }) => name), roster.map(({ name }) => name).sort((a, b) => a.localeCompare(b)));
});
