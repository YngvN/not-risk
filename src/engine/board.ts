import { TERRITORIES, ContinentId, TerritoryId } from '../constants/riskWorldTerritories';
import type { TerritoryState } from './types';

export const CONTINENT_BONUSES: Record<ContinentId, number> = {
  na: 5,
  sa: 2,
  eu: 5,
  af: 3,
  as: 7,
  au: 2,
};

export function getAdjacentIds(id: TerritoryId): TerritoryId[] {
  return TERRITORIES.find(t => t.id === id)?.adjacentTo ?? [];
}

export function areAdjacent(a: TerritoryId, b: TerritoryId): boolean {
  return getAdjacentIds(a).includes(b);
}

export function getContinentTerritories(continent: ContinentId): TerritoryId[] {
  return TERRITORIES.filter(t => t.continent === continent).map(t => t.id);
}

export function getOwnedContinents(
  territories: Record<TerritoryId, TerritoryState>,
  playerId: string,
): ContinentId[] {
  const continents: ContinentId[] = ['na', 'sa', 'eu', 'af', 'as', 'au'];
  return continents.filter(c =>
    getContinentTerritories(c).every(id => territories[id]?.owner === playerId),
  );
}

/** BFS through owned territories reachable from `start` (inclusive). */
export function getConnectedOwned(
  start: TerritoryId,
  owner: string,
  territories: Record<TerritoryId, TerritoryState>,
): Set<TerritoryId> {
  const visited = new Set<TerritoryId>();
  const queue: TerritoryId[] = [start];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    if (territories[current]?.owner !== owner) continue;
    visited.add(current);
    for (const neighbor of getAdjacentIds(current)) {
      if (!visited.has(neighbor)) queue.push(neighbor);
    }
  }
  return visited;
}

export function getTerritoryCount(
  territories: Record<TerritoryId, TerritoryState>,
  playerId: string,
): number {
  return Object.values(territories).filter(t => t.owner === playerId).length;
}
