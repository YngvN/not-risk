import type { GameState, GameAction, TerritoryId, AIDifficulty } from '../engine/types';
import { getContinentTerritories, getAdjacentIds } from '../engine/board';
import { CONTINENT_PRIORITY } from './evaluate';
import type { ContinentId } from '../constants/riskWorldTerritories';

/** Seeded shuffle so setup choices are deterministic in replay. */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick a territory to claim during SETUP → CLAIMING. */
export function pickClaimAction(
  state: GameState,
  playerId: string,
  difficulty: AIDifficulty,
): GameAction {
  const unclaimed = Object.values(state.territories)
    .filter(t => t.owner === null)
    .map(t => t.id as TerritoryId);

  if (difficulty === 'easy') {
    return { type: 'CLAIM_TERRITORY', territoryId: seededShuffle(unclaimed, state.rngSeed)[0] };
  }

  // Medium / Hard: prefer the highest-priority continent where we already have presence,
  // then fall back to the highest-priority continent with available territories.
  const ownedByUs = new Set(
    Object.values(state.territories)
      .filter(t => t.owner === playerId)
      .map(t => t.id as TerritoryId),
  );

  const continentScores = CONTINENT_PRIORITY.map((c: ContinentId) => {
    const cTerrs = getContinentTerritories(c);
    const ours = cTerrs.filter(id => ownedByUs.has(id as TerritoryId)).length;
    const available = cTerrs.filter(id => unclaimed.includes(id as TerritoryId));
    return { c, ours, available, priority: CONTINENT_PRIORITY.indexOf(c) };
  }).filter(cs => cs.available.length > 0);

  continentScores.sort((a, b) => b.ours * 3 - b.priority - (a.ours * 3 - a.priority));

  const target = continentScores[0];
  if (target) {
    const adjFirst = target.available.filter(id =>
      getAdjacentIds(id as TerritoryId).some(n => ownedByUs.has(n as TerritoryId)),
    ) as TerritoryId[];
    const pool = adjFirst.length > 0 ? adjFirst : target.available as TerritoryId[];
    return { type: 'CLAIM_TERRITORY', territoryId: seededShuffle(pool, state.rngSeed)[0] };
  }

  return { type: 'CLAIM_TERRITORY', territoryId: seededShuffle(unclaimed, state.rngSeed)[0] };
}

/** Pick a territory to place a setup army on during SETUP → PLACING. */
export function pickPlaceSetupAction(
  state: GameState,
  playerId: string,
  difficulty: AIDifficulty,
): GameAction {
  const owned = Object.values(state.territories)
    .filter(t => t.owner === playerId)
    .map(t => t.id as TerritoryId);

  if (difficulty === 'easy') {
    return { type: 'PLACE_SETUP_ARMY', territoryId: seededShuffle(owned, state.rngSeed)[0] };
  }

  // Prefer borders (territories adjacent to enemies or unclaimed).
  const borders = owned.filter(id =>
    getAdjacentIds(id).some(adj => {
      const t = state.territories[adj as TerritoryId];
      return !t || t.owner !== playerId;
    }),
  );

  const pool = borders.length > 0 ? borders : owned;
  // Stack on the border territory with the fewest armies.
  const sorted = [...pool].sort((a, b) => state.territories[a].armies - state.territories[b].armies);
  return { type: 'PLACE_SETUP_ARMY', territoryId: sorted[0] };
}
