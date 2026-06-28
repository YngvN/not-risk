import type { BattleResult } from './types';
import { rollWithSeed } from './rng';

function resolvePairs(
  attackerDice: number[],
  defenderDice: number[],
): { attackerLosses: number; defenderLosses: number } {
  const comparisons = Math.min(attackerDice.length, defenderDice.length);
  let attackerLosses = 0;
  let defenderLosses = 0;
  for (let i = 0; i < comparisons; i++) {
    if (attackerDice[i] > defenderDice[i]) defenderLosses++;
    else attackerLosses++; // defender wins ties
  }
  return { attackerLosses, defenderLosses };
}

/**
 * Resolves one round of combat using the seeded PRNG (E9.4).
 * Returns the battle result and the advanced seed so the caller can
 * persist it in game state — enabling deterministic replay.
 */
export function battle(
  attackerDiceCount: number,
  defenderDiceCount: number,
  seed: number,
): { result: BattleResult; nextSeed: number } {
  const { dice: attackerDice, nextSeed: s1 } = rollWithSeed(attackerDiceCount, seed);
  const { dice: defenderDice, nextSeed: s2 } = rollWithSeed(defenderDiceCount, s1);
  const { attackerLosses, defenderLosses } = resolvePairs(attackerDice, defenderDice);
  return {
    result: { attackerDice, defenderDice, attackerLosses, defenderLosses, captured: false },
    nextSeed: s2,
  };
}
