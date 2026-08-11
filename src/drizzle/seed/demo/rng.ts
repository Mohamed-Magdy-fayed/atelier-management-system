/**
 * Seeded pseudo-random generator for the demo profile.
 *
 * `Math.random()` is banned here: the same command has to produce the same
 * database across days of re-recording, or footage shot on Tuesday will not
 * match footage shot on Thursday.
 */

export type Rng = {
  /** Float in [0, 1). */
  next: () => number;
  /** Integer in [min, max], inclusive. */
  int: (min: number, max: number) => number;
  /** One element of a non-empty list. */
  pick: <T>(items: readonly T[]) => T;
  /** One element, chosen by relative weight. Weights need not sum to 1. */
  weighted: <T>(entries: readonly (readonly [T, number])[]) => T;
  /** True with the given probability. */
  chance: (probability: number) => boolean;
};

/** mulberry32 — small, fast, and stable across Node versions. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };

  const int = (min: number, max: number) =>
    min + Math.floor(next() * (max - min + 1));

  const pick = <T>(items: readonly T[]): T => {
    const item = items[int(0, items.length - 1)];
    if (item === undefined) {
      throw new Error("createRng().pick called with an empty list");
    }
    return item;
  };

  const weighted = <T>(entries: readonly (readonly [T, number])[]): T => {
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let threshold = next() * total;
    for (const [value, weight] of entries) {
      threshold -= weight;
      if (threshold <= 0) return value;
    }
    const last = entries.at(-1);
    if (!last) {
      throw new Error("createRng().weighted called with an empty list");
    }
    return last[0];
  };

  return { next, int, pick, weighted, chance: (p) => next() < p };
}
