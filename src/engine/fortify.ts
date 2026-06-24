import type { TerritoryId } from '../constants/riskWorldTerritories';
import type { TerritoryState } from './types';
import { getAdjacentIds, getConnectedOwned } from './board';

/**
 * Returns all territories the player can fortify into from `from`.
 * chain mode (default): BFS through any connected chain of owned territories.
 * adjacent mode: only directly adjacent owned territories.
 */
export function getFortifyTargets(
  from: TerritoryId,
  owner: string,
  territories: Record<TerritoryId, TerritoryState>,
  mode: 'chain' | 'adjacent' = 'chain',
): TerritoryId[] {
  if (mode === 'adjacent') {
    return getAdjacentIds(from).filter(id => id !== from && territories[id]?.owner === owner);
  }
  const connected = getConnectedOwned(from, owner, territories);
  connected.delete(from);
  return [...connected];
}
