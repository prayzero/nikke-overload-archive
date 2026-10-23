import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createGearLayout } from "../app/gear-layout.mjs";

function assertLayout(targets) {
  const layout = createGearLayout(targets);
  assert.equal(layout.length, 4);
  for (const piece of layout) {
    assert.ok(piece.length <= 3, "each gear piece has only three slots");
    assert.equal(new Set(piece.map(({ stat }) => stat)).size, piece.length);
  }
  const placed = layout.flat();
  assert.equal(placed.length, targets.reduce((sum, { count }) => sum + count, 0));
  for (const target of targets) {
    assert.equal(placed.filter(({ stat }) => stat === target.stat).length, target.count);
  }
  return layout;
}

test("renders all four Bunny overload stats within the twelve gear slots", () => {
  const targets = [
    { stat: "element", count: 4 }, { stat: "attack", count: 4 },
    { stat: "chargeSpeed", count: 2 }, { stat: "maxAmmo", count: 2 },
  ];
  const before = structuredClone(targets);
  assertLayout(targets);
  assert.deepEqual(targets, before);
});

test("preserves counts and per-piece uniqueness for every feasible four-stat allocation", () => {
  for (let a = 0; a <= 4; a++) for (let b = 0; b <= 4; b++) {
    for (let c = 0; c <= 4; c++) for (let d = 0; d <= 4; d++) {
      if (a + b + c + d > 12) continue;
      assertLayout([a, b, c, d].map((count, index) => ({ stat: `s${index}`, count }))
        .filter(({ count }) => count > 0));
    }
  }
});

test("lays out every shipped recommendation without dropping a target", async () => {
  const builds = JSON.parse(await readFile(new URL("../app/overloads.json", import.meta.url), "utf8"));
  for (const { primary } of builds) assertLayout(primary);
});

test("rejects impossible or duplicate targets instead of hiding a line", () => {
  for (const targets of [
    [{ stat: "attack", count: 5 }], [{ stat: "attack", count: 1.5 }],
    [{ stat: "attack", count: 0 }],
    [{ stat: "attack", count: 1 }, { stat: "attack", count: 1 }],
    ["a", "b", "c", "d"].map((stat) => ({ stat, count: 4 })),
  ]) assert.throws(() => createGearLayout(targets));
});
