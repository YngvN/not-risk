/**
 * Xorshift32 — a minimal, reproducible PRNG.
 * Given the same seed it always produces the same sequence, making dice
 * results deterministic and auditable (E9.4).
 */
export function nextRng(seed: number): { value: number; nextSeed: number } {
  // Xorshift must never have a zero state
  let s = (seed >>> 0) || 1;
  s ^= s << 13;
  s ^= s >> 17;
  s ^= s << 5;
  const unsigned = s >>> 0;
  return { value: unsigned / 0x100000000, nextSeed: unsigned };
}

/**
 * Rolls `count` dice [1–6] using the seeded PRNG, sorted descending.
 * Returns the dice values and the advanced seed for recording in the event log.
 */
export function rollWithSeed(
  count: number,
  seed: number,
): { dice: number[]; nextSeed: number } {
  const dice: number[] = [];
  let s = seed;
  for (let i = 0; i < count; i++) {
    const { value, nextSeed } = nextRng(s);
    dice.push(Math.floor(value * 6) + 1);
    s = nextSeed;
  }
  return { dice: dice.sort((a, b) => b - a), nextSeed: s };
}

/** Generates a random initial seed from the platform entropy source. */
export function randomSeed(): number {
  const buf = new Uint32Array(1);
  // React Native does not expose crypto.getRandomValues — fall back to Math.random.
  try {
    (globalThis as any).crypto?.getRandomValues(buf);
  } catch {
    /* ignore */
  }
  return (buf[0] || Math.floor(Math.random() * 0x100000000)) >>> 0;
}
