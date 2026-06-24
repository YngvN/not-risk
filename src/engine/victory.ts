import type { GameState, PlayerId } from './types';
import { getTerritoryCount } from './board';

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
