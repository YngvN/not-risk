import React, { createContext, useContext, useState, useCallback } from 'react';
import type { GameState, GameAction, PlayerColor } from '../engine/types';
import { createGame, type PlayerConfig, type SetupMode } from '../engine/setup';
import { dispatch as engineDispatch } from '../engine/stateMachine';
import { Colors } from '../constants/colors';

/** Maps PlayerColor to its hex value (same in light and dark). */
export const PLAYER_COLOR_HEX: Record<PlayerColor, string> = {
  red: Colors.light.playerRed,
  blue: Colors.light.playerBlue,
  green: Colors.light.playerGreen,
  yellow: Colors.light.playerYellow,
  black: Colors.light.playerBlack,
  pink: Colors.light.playerPink,
};

interface GameContextValue {
  state: GameState | null;
  dispatch: (action: GameAction) => void;
  startGame: (playerConfigs: PlayerConfig[], setupMode?: SetupMode, randomPlacement?: boolean) => void;
  resetGame: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState | null>(null);

  const dispatch = useCallback((action: GameAction) => {
    setState(prev => (prev ? engineDispatch(action, prev) : prev));
  }, []);

  const startGame = useCallback((playerConfigs: PlayerConfig[], setupMode: SetupMode = 'claim', randomPlacement = false) => {
    setState(createGame('classic', playerConfigs, setupMode, randomPlacement));
  }, []);

  const resetGame = useCallback(() => {
    setState(null);
  }, []);

  return (
    <GameContext.Provider value={{ state, dispatch, startGame, resetGame }}>
      {children}
    </GameContext.Provider>
  );
}

/** Hook to access game state and dispatch. Throws if used outside GameProvider. */
export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
