import type { BattleResult } from './types';

function rollDice(count: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1)
    .sort((a, b) => b - a);
}

/** Compare sorted dice pairs; defender wins ties. Returns army losses. */
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
 * Rolls dice for both sides and returns the full battle result.
 * `captured` is set by the caller based on remaining defender armies.
 */
export function battle(attackerDiceCount: number, defenderDiceCount: number): BattleResult {
  const attackerDice = rollDice(attackerDiceCount);
  const defenderDice = rollDice(defenderDiceCount);
  const { attackerLosses, defenderLosses } = resolvePairs(attackerDice, defenderDice);
  return { attackerDice, defenderDice, attackerLosses, defenderLosses, captured: false };
}
