import type { GameState } from './types';
import { getTerritoryCount, getOwnedContinents, CONTINENT_BONUSES } from './board';

/** Calculates total armies a player receives at the start of their reinforcement phase. */
export function calcReinforcements(playerId: string, state: GameState): number {
  const territoryCount = getTerritoryCount(state.territories, playerId);
  const base = Math.max(3, Math.floor(territoryCount / 3));
  const ownedContinents = getOwnedContinents(state.territories, playerId);
  const continentBonus = ownedContinents.reduce((sum, c) => sum + CONTINENT_BONUSES[c], 0);
  return base + continentBonus;
}
