/**
 * Precomputed attack capture-probability table using exact Risk dice math.
 * Built once at module load via Markov-chain dynamic programming; never recalculated at runtime.
 *
 * Per-round outcomes [attackerLoss, defenderLoss, probability] for every
 * (attackerDice, defenderDice) combination that can occur in Risk:
 *
 *   (1,1): defender wins ties → P(def wins) = 21/36
 *   (2,1): max-of-2 vs 1     → P(att wins) = 125/216
 *   (3,1): max-of-3 vs 1     → P(att wins) = 855/1296
 *   (1,2): 1 vs max-of-2     → P(att wins) = 55/216
 *   (2,2): 2 comparisons     → known exact fractions over 1296
 *   (3,2): 2 comparisons     → known exact fractions over 7776
 */
const ROUND: Record<string, ReadonlyArray<readonly [number, number, number]>> = {
  '1,1': [[1, 0, 21 / 36],    [0, 1, 15 / 36]],
  '2,1': [[1, 0, 91 / 216],   [0, 1, 125 / 216]],
  '3,1': [[1, 0, 441 / 1296], [0, 1, 855 / 1296]],
  '1,2': [[1, 0, 161 / 216],  [0, 1, 55 / 216]],
  '2,2': [[2, 0, 581 / 1296], [1, 1, 420 / 1296], [0, 2, 295 / 1296]],
  '3,2': [[2, 0, 2275 / 7776],[1, 1, 2611 / 7776],[0, 2, 2890 / 7776]],
};

const MAX_A = 50;

/** P(attacker captures | a armies on attacker territory, d armies defending) */
const TABLE: number[][] = (() => {
  const p: number[][] = Array.from({ length: MAX_A + 1 }, () => new Array(MAX_A + 1).fill(0));
  for (let a = 0; a <= MAX_A; a++) p[a][0] = 1; // already captured
  for (let a = 2; a <= MAX_A; a++) {
    for (let d = 1; d <= MAX_A; d++) {
      const attDice = Math.min(a - 1, 3);
      const defDice = Math.min(d, 2);
      const outcomes = ROUND[`${attDice},${defDice}`];
      let prob = 0;
      for (const [al, dl, rp] of outcomes) {
        const na = a - al;
        const nd = d - dl;
        prob += rp * (nd <= 0 ? 1 : na < 2 ? 0 : p[na][nd]);
      }
      p[a][d] = prob;
    }
  }
  return p;
})();

/**
 * Probability the attacker captures a territory, assuming they attack until
 * they win or run out of armies.
 *
 * @param attackerArmies - Total armies on the attacking territory (must be ≥ 2 to attack).
 * @param defenderArmies - Armies currently defending the target territory.
 */
export function captureProb(attackerArmies: number, defenderArmies: number): number {
  if (defenderArmies <= 0) return 1;
  if (attackerArmies < 2) return 0;
  return TABLE[Math.min(attackerArmies, MAX_A)][Math.min(defenderArmies, MAX_A)];
}
