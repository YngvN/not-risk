import type { GameState, GameAction, TerritoryId, AIDifficulty } from '../engine/types';
import { getContinentTerritories, getAdjacentIds, CONTINENT_BONUSES } from '../engine/board';
import { CONTINENT_PRIORITY } from './evaluate';
import { captureProb } from './dice';
import type { ContinentId } from '../constants/riskWorldTerritories';

/** Minimum capture probability required to initiate an attack per difficulty. */
const CAPTURE_THRESHOLD: Record<AIDifficulty, number> = {
  easy: 0.65,
  medium: 0.55,
  hard: 0.45,
};

/**
 * Fraction of available armies to move in after a capture.
 * 1.0 = move everything except the mandatory minimum left on the source.
 */
const OCCUPY_FRACTION: Record<AIDifficulty, number> = {
  easy: 0.5,
  medium: 0.85,
  hard: 1.0,
};

/** Score how valuable it would be to capture territory `to` from `from`. */
function scoreAttack(
  state: GameState,
  playerId: string,
  from: TerritoryId,
  to: TerritoryId,
): number {
  const prob = captureProb(state.territories[from].armies, state.territories[to].armies);
  let score = prob * 10;

  for (const c of CONTINENT_PRIORITY) {
    const cTerrs = getContinentTerritories(c);
    if (!cTerrs.includes(to)) continue;
    const ours = cTerrs.filter(id => state.territories[id as TerritoryId]?.owner === playerId).length;
    const total = cTerrs.length;
    if (ours === total - 1) {
      // One away from completing the continent — very high priority
      score += (CONTINENT_BONUSES[c as ContinentId] ?? 0) * 20;
    } else {
      score += (ours / total) * (CONTINENT_BONUSES[c as ContinentId] ?? 0) * 5;
    }
    break;
  }

  return score;
}

interface Candidate { from: TerritoryId; to: TerritoryId; score: number; prob: number }

function findAttacks(state: GameState, playerId: string, difficulty: AIDifficulty): Candidate[] {
  const threshold = CAPTURE_THRESHOLD[difficulty];
  const candidates: Candidate[] = [];

  for (const ts of Object.values(state.territories)) {
    if (ts.owner !== playerId || ts.armies < 2) continue;
    for (const adjId of getAdjacentIds(ts.id as TerritoryId)) {
      const adj = state.territories[adjId as TerritoryId];
      if (!adj || adj.owner === playerId || adj.owner === null) continue;
      const prob = captureProb(ts.armies, adj.armies);
      if (prob < threshold) continue;
      candidates.push({
        from: ts.id as TerritoryId,
        to: adjId as TerritoryId,
        score: scoreAttack(state, playerId, ts.id as TerritoryId, adjId as TerritoryId),
        prob,
      });
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}

/** Pick the next ATTACK / OCCUPY / END_ATTACK action. */
export function pickAttackAction(
  state: GameState,
  playerId: string,
  difficulty: AIDifficulty,
): GameAction {
  // Resolve a pending capture first
  if (state.captureContext) {
    const { minArmies, maxArmies } = state.captureContext;
    const armies = Math.max(
      minArmies,
      Math.round(minArmies + (maxArmies - minArmies) * OCCUPY_FRACTION[difficulty]),
    );
    return { type: 'OCCUPY', armies };
  }

  const attacks = findAttacks(state, playerId, difficulty);
  if (attacks.length === 0) return { type: 'END_ATTACK' };

  const { from, to } = attacks[0];
  const attackerDice = Math.min(3, state.territories[from].armies - 1);
  return { type: 'ATTACK', from, to, attackerDice };
}
