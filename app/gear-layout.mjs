/**
 * Distribute requested lines across four pieces, with three different stats per
 * piece. Least-filled pieces keep the assignment balanced even for four or more
 * requested stat types; sorting each piece preserves the recommendation order.
 * @template {{ stat: string, count: number }} T
 * @param {ReadonlyArray<T>} targets
 * @returns {T[][]}
 */
export function createGearLayout(targets) {
  if (targets.some(({ count }) => !Number.isInteger(count) || count < 1 || count > 4)
    || targets.reduce((sum, { count }) => sum + count, 0) > 12
    || new Set(targets.map(({ stat }) => stat)).size !== targets.length) {
    throw new Error("Overload targets must use unique stats, 1–4 lines each, and at most 12 lines.");
  }

  /** @type {T[][]} */
  const pieces = Array.from({ length: 4 }, () => []);
  const order = new Map(targets.map(({ stat }, index) => [stat, index]));
  for (const target of [...targets].sort((a, b) => b.count - a.count)) {
    const available = [0, 1, 2, 3].sort((a, b) => pieces[a].length - pieces[b].length || a - b);
    for (const index of available.slice(0, target.count)) pieces[index].push(target);
  }
  for (const piece of pieces) {
    piece.sort((a, b) => (order.get(a.stat) ?? 0) - (order.get(b.stat) ?? 0));
  }
  return pieces;
}
