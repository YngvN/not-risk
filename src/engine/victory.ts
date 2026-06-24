import type { GameState, PlayerId } from './types';
import { getTerritoryCount } from './board';
import { checkMission } from './missions';

export interface VictoryCondition {
  check(state: GameState): PlayerId | null;
}

/** Mode 1 — Classic Conquest: first player to own all 42 territories wins. */
export class ClassicConquestVictory implements VictoryCondition {
  check(state: GameState): PlayerId | null {
    const total = Object.keys(state.territories).length;
    for (const player of state.players) {
      if (!player.alive) continue;
      if (getTerritoryCount(state.territories, player.id) === total) return player.id;
    }
    return null;
  }
}

/**
 * Mode 2 — Secret Mission: active player wins when their mission predicate is
 * satisfied at the start of their reinforcement turn (default timing per E7.4).
 * Destroy-player missions are also re-evaluated after any elimination.
 */
export class SecretMissionVictory implements VictoryCondition {
  check(state: GameState): PlayerId | null {
    const active = state.players.find(p => p.id === state.activePlayerId);
    if (!active?.alive || !active.mission) return null;
    if (checkMission(active.id, active.mission, state)) return active.id;
    return null;
  }

  /** Check all alive players' destroy missions — called after any elimination. */
  checkDestroyMissions(state: GameState): PlayerId | null {
    for (const player of state.players) {
      if (!player.alive || !player.mission) continue;
      if (player.mission.type === 'DESTROY_PLAYER' && checkMission(player.id, player.mission, state)) {
        return player.id;
      }
    }
    return null;
  }
}

// Re-export CapitalVictory so the victory module is the single import point.
export { CapitalVictory } from './capital';
