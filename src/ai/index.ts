import type { GameState, GameAction, TerritoryId } from '../engine/types';
import { getAdjacentIds } from '../engine/board';
import { pickClaimAction, pickPlaceSetupAction } from './setup';
import { pickReinforceAction } from './reinforce';
import { pickAttackAction } from './attack';
import { pickFortifyAction } from './fortify';

export type { AIDifficulty } from './types';

/** Pick the least-exposed owned territory to set as HQ (capital mode). */
function pickHQAction(state: GameState, playerId: string): GameAction {
  const owned = Object.values(state.territories)
    .filter(t => t.owner === playerId)
    .map(t => t.id as TerritoryId);

  // Prefer territory with fewest adjacent enemies (most interior = hardest to capture)
  const scored = owned.map(id => {
    const exposed = getAdjacentIds(id).filter(adj => {
      const t = state.territories[adj as TerritoryId];
      return t && t.owner !== null && t.owner !== playerId;
    }).length;
    return { id, exposed };
  });
  scored.sort((a, b) => a.exposed - b.exposed);
  return { type: 'SELECT_HQ', territoryId: scored[0]?.id ?? owned[0] };
}

/**
 * Returns the next action for the active AI player given the current state.
 * Returns null if the active player is not AI or the phase needs no action.
 */
export function pickAIAction(state: GameState): GameAction | null {
  const player = state.players.find(p => p.id === state.activePlayerId);
  if (!player?.isAI) return null;

  const difficulty = player.aiDifficulty ?? 'easy';
  const playerId = player.id;

  switch (state.phase) {
    case 'SETUP':
      return state.setupSubPhase === 'CLAIMING'
        ? pickClaimAction(state, playerId, difficulty)
        : pickPlaceSetupAction(state, playerId, difficulty);

    case 'HQ_SELECTION':
      return pickHQAction(state, playerId);

    case 'REINFORCE':
      return pickReinforceAction(state, playerId, difficulty);

    case 'ATTACK':
      return pickAttackAction(state, playerId, difficulty);

    case 'FORTIFY':
      return pickFortifyAction(state, playerId, difficulty);

    default:
      return null;
  }
}
