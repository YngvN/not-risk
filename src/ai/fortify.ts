import type { GameState, GameAction, TerritoryId, AIDifficulty } from '../engine/types';
import { getAdjacentIds, getConnectedOwned } from '../engine/board';

function borderExposure(id: TerritoryId, state: GameState, playerId: string): number {
  return getAdjacentIds(id).filter(adj => {
    const t = state.territories[adj as TerritoryId];
    return t && t.owner !== null && t.owner !== playerId;
  }).length;
}

/** Pick a FORTIFY or END_FORTIFY action. */
export function pickFortifyAction(
  state: GameState,
  playerId: string,
  difficulty: AIDifficulty,
): GameAction {
  if (difficulty === 'easy') return { type: 'END_FORTIFY' };

  const owned = Object.values(state.territories).filter(t => t.owner === playerId);

  // Source: interior territory (no adjacent enemies) with the most surplus armies.
  const sources = owned
    .filter(t => t.armies >= 2 && borderExposure(t.id as TerritoryId, state, playerId) === 0)
    .sort((a, b) => b.armies - a.armies);

  for (const source of sources) {
    const connected = getConnectedOwned(source.id as TerritoryId, playerId, state.territories);
    connected.delete(source.id as TerritoryId);

    const targets = [...connected]
      .filter(id => borderExposure(id, state, playerId) > 0)
      .sort((a, b) => {
        const expDiff = borderExposure(b, state, playerId) - borderExposure(a, state, playerId);
        return expDiff !== 0 ? expDiff : state.territories[a].armies - state.territories[b].armies;
      });

    if (targets.length > 0) {
      const toMove = source.armies - 1;
      if (toMove > 0) {
        return { type: 'FORTIFY', from: source.id as TerritoryId, to: targets[0] as TerritoryId, armies: toMove };
      }
    }
  }

  return { type: 'END_FORTIFY' };
}
