import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameState, GameAction, PlayerColor, GameMode, GameRules } from '../engine/types';
import { DEFAULT_RULES } from '../engine/types';
import { createGame, type PlayerConfig, type SetupMode } from '../engine/setup';
import { dispatch as engineDispatch } from '../engine/stateMachine';
import { Colors } from '../constants/colors';
import { pickAIAction } from '../ai';

const SAVE_KEY = '@risk_game_state';

export const PLAYER_COLOR_HEX: Record<PlayerColor, string> = {
  red:    Colors.light.playerRed,
  blue:   Colors.light.playerBlue,
  green:  Colors.light.playerGreen,
  yellow: Colors.light.playerYellow,
  black:  Colors.light.playerBlack,
  pink:   Colors.light.playerPink,
};

interface GameContextValue {
  state: GameState | null;
  hasSavedGame: boolean;
  dispatch: (action: GameAction) => void;
  startGame: (playerConfigs: PlayerConfig[], mode?: GameMode, setupMode?: SetupMode, randomPlacement?: boolean, rules?: GameRules) => void;
  resetGame: () => void;
  resumeGame: () => Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState | null>(null);
  const [hasSavedGame, setHasSavedGame] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SAVE_KEY).then(raw => setHasSavedGame(raw !== null));
  }, []);

  useEffect(() => {
    if (state) {
      AsyncStorage.setItem(SAVE_KEY, JSON.stringify(state));
      setHasSavedGame(true);
    }
  }, [state]);

  const dispatch = useCallback((action: GameAction) => {
    setState(prev => (prev ? engineDispatch(action, prev) : prev));
  }, []);

  // AI turn runner: fires whenever state changes and the active player is an AI.
  useEffect(() => {
    if (!state || state.phase === 'GAME_OVER') return;
    const activePlayer = state.players.find(p => p.id === state.activePlayerId);
    if (!activePlayer?.isAI) return;

    const delay = state.phase === 'SETUP' ? 350
      : state.phase === 'REINFORCE' ? 600
      : 500;

    const timer = setTimeout(() => {
      const action = pickAIAction(state);
      if (action) dispatch(action);
    }, delay);

    return () => clearTimeout(timer);
  }, [state, dispatch]);

  const startGame = useCallback((
    playerConfigs: PlayerConfig[],
    mode: GameMode = 'classic',
    setupMode: SetupMode = 'claim',
    randomPlacement = false,
    rules: GameRules = DEFAULT_RULES,
  ) => {
    setState(createGame(mode, playerConfigs, setupMode, randomPlacement, rules));
  }, []);

  const resetGame = useCallback(() => {
    setState(null);
    AsyncStorage.removeItem(SAVE_KEY);
    setHasSavedGame(false);
  }, []);

  const resumeGame = useCallback(async () => {
    const raw = await AsyncStorage.getItem(SAVE_KEY);
    if (raw) setState(JSON.parse(raw) as GameState);
  }, []);

  return (
    <GameContext.Provider value={{ state, hasSavedGame, dispatch, startGame, resetGame, resumeGame }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
