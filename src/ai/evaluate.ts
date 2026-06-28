import type { GameState, TerritoryId } from '../engine/types';
import {
  getContinentTerritories,
  getOwnedContinents,
  getAdjacentIds,
  CONTINENT_BONUSES,
} from '../engine/board';
import type { ContinentId } from '../constants/riskWorldTerritories';

/** Continent priority: easiest to hold first. */
export const CONTINENT_PRIORITY: ContinentId[] = ['au', 'sa', 'na', 'eu', 'af', 'as'];

/** Score the board position for playerId. Higher = better for that player. */
export function evaluate(state: GameState, playerId: string): number {
  let score = 0;

  const owned = Object.values(state.territories).filter(t => t.owner === playerId);

  score += owned.length * 2;
  score += owned.reduce((s, t) => s + t.armies, 0) * 0.3;

  const ownedContinents = getOwnedContinents(state.territories, playerId);
  for (const c of ownedContinents) {
    score += CONTINENT_BONUSES[c] * 6;
  }

  for (const c of CONTINENT_PRIORITY) {
    const total = getContinentTerritories(c).length;
    const controlled = getContinentTerritories(c).filter(
      id => state.territories[id as TerritoryId]?.owner === playerId,
    ).length;
    if (controlled > 0 && controlled < total) {
      score += (controlled / total) * CONTINENT_BONUSES[c] * 3;
    }
  }

  const exposed = owned.filter(t =>
    getAdjacentIds(t.id as TerritoryId).some(
      adj => {
        const a = state.territories[adj as TerritoryId];
        return a && a.owner !== playerId;
      },
    ),
  ).length;
  score -= exposed * 0.5;

  const player = state.players.find(p => p.id === playerId);
  score += (player?.hand.length ?? 0) * 0.5;

  return score;
}
