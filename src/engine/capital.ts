import type { GameState, PlayerId } from './types';
import type { VictoryCondition } from './victory';

/** Minimum enemy HQs to capture to win, by total player count. */
const HQ_THRESHOLD: Record<number, number> = {
  2: 1, 3: 2, 4: 2, 5: 3, 6: 3,
};

/**
 * Mode 3 — Capital Risk victory condition.
 * A player wins if they have captured the required number of enemy HQs
 * AND still control their own HQ territory at the moment of the check.
 */
export class CapitalVictory implements VictoryCondition {
  check(state: GameState): PlayerId | null {
    const totalPlayers = state.players.filter(p => p.alive).length + state.players.filter(p => !p.alive).length;
    const required = HQ_THRESHOLD[state.players.length] ?? 2;

    for (const player of state.players) {
      if (!player.alive) continue;
      if (player.capturedHqPlayerIds.length < required) continue;

      // Must still hold own HQ territory
      if (!player.hqTerritoryId) continue;
      if (state.territories[player.hqTerritoryId]?.owner !== player.id) continue;

      return player.id;
    }
    return null;
  }
}
