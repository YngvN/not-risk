import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
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
  multiplayerMode: 'none' | 'multiplayer';
  dispatch: (action: GameAction) => void;
  startGame: (playerConfigs: PlayerConfig[], mode?: GameMode, setupMode?: SetupMode, randomPlacement?: boolean, rules?: GameRules) => void;
  resetGame: () => void;
  resumeGame: () => Promise<void>;
  /** Called by MultiplayerContext to push authoritative server state into the game. */
  applyNetworkState: (state: GameState) => void;
  /** Pass a send function to route dispatch over the network, or null to go back to local. */
  setMultiplayerDispatch: (fn: ((action: GameAction) => void) | null) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState | null>(null);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [multiplayerMode, setMultiplayerMode] = useState<'none' | 'multiplayer'>('none');
  // When set, dispatch sends over the network instead of running locally.
  const networkDispatch = useRef<((action: GameAction) => void) | null>(null);

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
    if (networkDispatch.current) {
      networkDispatch.current(action);
    } else {
      setState(prev => {
        if (!prev) return prev;
        const next = engineDispatch(action, prev);
        // If the state machine rejected the action (same reference), return a new
        // shallow copy so the AI useEffect always re-fires and can pick a different
        // action rather than silently freezing.
        return next === prev ? { ...prev } : next;
      });
    }
  }, []);

  // AI turn runner: fires only in local (non-multiplayer) mode.
  // In multiplayer mode, the server runs AI turns.
  useEffect(() => {
    if (!state || state.phase === 'GAME_OVER') return;
    if (multiplayerMode === 'multiplayer') return;
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
  }, [state, dispatch, multiplayerMode]);

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

  const applyNetworkState = useCallback((newState: GameState) => {
    setState(newState);
  }, []);

  const setMultiplayerDispatch = useCallback((fn: ((action: GameAction) => void) | null) => {
    networkDispatch.current = fn;
    setMultiplayerMode(fn ? 'multiplayer' : 'none');
  }, []);

  return (
    <GameContext.Provider value={{
      state, hasSavedGame, multiplayerMode,
      dispatch, startGame, resetGame, resumeGame,
      applyNetworkState, setMultiplayerDispatch,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
