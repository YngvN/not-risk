import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { multiplayerService, type ConnectionStatus } from '../services/MultiplayerService';
import type { LobbyPlayer, GameStartConfig } from '../services/MultiplayerService';
import type { PlayerId, PlayerColor, GameAction, GameState } from '../engine/types';

interface DroppedPlayer {
  playerId: PlayerId;
  isAdmin: boolean;
  waitSeconds: number;
}

interface MultiplayerContextValue {
  status: ConnectionStatus;
  myId: PlayerId | null;
  /** Game-engine player ID for this device's primary player (e.g. "player_0"). */
  myGamePlayerId: string | null;
  /** Game-engine player IDs for local-human slots sitting at the host device. */
  localGamePlayerIds: string[];
  isAdmin: boolean;
  serverIp: string | null;
  serverPort: number;
  lobbyPlayers: LobbyPlayer[];
  lobbyConfig: GameStartConfig | null;
  droppedPlayer: DroppedPlayer | null;
  /** Connect to the server and announce ourselves with the given name/color. */
  connect: (host: string, port: number, name: string, color: PlayerColor) => void;
  disconnect: () => void;
  markReady: () => void;
  startGame: (config: GameStartConfig) => void;
  sendDisconnectChoice: (choice: 'ai' | 'pause') => void;
  /**
   * Registered by GameContext — called every time the server sends a STATE
   * or GAME_START update. Null when not in a game.
   */
  registerStateHandler: (fn: ((state: GameState) => void) | null) => void;
  /**
   * Called by GameContext.dispatch when in multiplayer mode instead of
   * running the local state machine.
   */
  sendAction: (action: GameAction) => void;
}

const MultiplayerContext = createContext<MultiplayerContextValue | null>(null);

export function MultiplayerProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [myId, setMyId] = useState<PlayerId | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [serverIp, setServerIp] = useState<string | null>(null);
  const [serverPort, setServerPort] = useState(8080);
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [lobbyConfig, setLobbyConfig] = useState<GameStartConfig | null>(null);
  const [droppedPlayer, setDroppedPlayer] = useState<DroppedPlayer | null>(null);
  const [myGamePlayerId, setMyGamePlayerId] = useState<string | null>(null);
  const [localGamePlayerIds, setLocalGamePlayerIds] = useState<string[]>([]);
  const myIdRef = useRef<PlayerId | null>(null);

  // Pending join info: sent to server once the connection opens
  const pendingJoin = useRef<{ name: string; color: PlayerColor } | null>(null);

  // Callback registered by GameContext to receive authoritative state
  const stateHandler = useRef<((state: GameState) => void) | null>(null);

  useEffect(() => {
    const unsubs = [
      multiplayerService.onStatusChange(s => {
        setStatus(s);
        if (s === 'connected' && pendingJoin.current) {
          multiplayerService.join(pendingJoin.current.name, pendingJoin.current.color);
        }
      }),

      multiplayerService.on('WELCOME', msg => {
        setMyId(msg.yourId);
        myIdRef.current = msg.yourId;
        setIsAdmin(msg.isAdmin);
        setServerIp(msg.serverIp);
        setServerPort(msg.serverPort);
      }),

      multiplayerService.on('LOBBY', msg => {
        setLobbyPlayers(msg.players);
        setLobbyConfig(msg.config);
      }),

      multiplayerService.on('HOST_CHANGED', msg => {
        setIsAdmin(prev => {
          return myId === msg.newAdminId ? true : prev;
        });
        setLobbyPlayers(prev =>
          prev.map(p => ({ ...p, isAdmin: p.id === msg.newAdminId })),
        );
      }),

      multiplayerService.on('PLAYER_DROPPED', msg => setDroppedPlayer(msg)),

      multiplayerService.on('PLAYER_RECONNECTED', () => setDroppedPlayer(null)),

      multiplayerService.on('GAME_START', msg => {
        setDroppedPlayer(null);
        const id = myIdRef.current;
        if (id && msg.playerIdMap[id]) setMyGamePlayerId(msg.playerIdMap[id]);
        setLocalGamePlayerIds(msg.localGamePlayerIds);
        stateHandler.current?.(msg.state);
      }),

      multiplayerService.on('STATE', msg => stateHandler.current?.(msg.state)),

      multiplayerService.on('GAME_RESUMED', () => setDroppedPlayer(null)),
    ];

    return () => unsubs.forEach(fn => fn());
  }, [myId]);

  const connect = useCallback((host: string, port: number, name: string, color: PlayerColor) => {
    pendingJoin.current = { name, color };
    multiplayerService.connect(host, port);
  }, []);

  const disconnect = useCallback(() => {
    multiplayerService.disconnect();
    setMyId(null);
    myIdRef.current = null;
    setMyGamePlayerId(null);
    setLocalGamePlayerIds([]);
    setIsAdmin(false);
    setServerIp(null);
    setLobbyPlayers([]);
    setLobbyConfig(null);
    setDroppedPlayer(null);
    pendingJoin.current = null;
  }, []);

  const markReady = useCallback(() => multiplayerService.markReady(), []);

  const startGame = useCallback((config: GameStartConfig) => {
    multiplayerService.send({ type: 'START', config });
  }, []);

  const sendDisconnectChoice = useCallback((choice: 'ai' | 'pause') => {
    multiplayerService.send({ type: 'DISCONNECT_CHOICE', choice });
  }, []);

  const registerStateHandler = useCallback((fn: ((state: GameState) => void) | null) => {
    stateHandler.current = fn;
  }, []);

  const sendAction = useCallback((action: GameAction) => {
    multiplayerService.sendAction(action);
  }, []);

  return (
    <MultiplayerContext.Provider value={{
      status, myId, myGamePlayerId, localGamePlayerIds,
      isAdmin, serverIp, serverPort,
      lobbyPlayers, lobbyConfig, droppedPlayer,
      connect, disconnect, markReady, startGame,
      sendDisconnectChoice, registerStateHandler, sendAction,
    }}>
      {children}
    </MultiplayerContext.Provider>
  );
}

export function useMultiplayer(): MultiplayerContextValue {
  const ctx = useContext(MultiplayerContext);
  if (!ctx) throw new Error('useMultiplayer must be used inside MultiplayerProvider');
  return ctx;
}
