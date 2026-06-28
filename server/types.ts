import type { GameState, GameAction, PlayerId, PlayerColor, GameMode, AIDifficulty } from '../src/engine/types';
import type { SetupMode } from '../src/engine/setup';

export type { GameState, GameAction, PlayerId };

export interface LobbyPlayer {
  id: PlayerId;
  name: string;
  color: PlayerColor;
  isAdmin: boolean;
  isReady: boolean;
  connected: boolean;
}

/** Config sent by the admin when starting a game. */
export interface GameStartConfig {
  mode: GameMode;
  setupMode: SetupMode;
  randomPlacement: boolean;
  /** Players who sit at the host device — no WebSocket of their own. */
  localSlots: Array<{ name: string; color: PlayerColor }>;
  aiSlots: Array<{ name: string; color: PlayerColor; difficulty: AIDifficulty }>;
}

// ── Client → Server ───────────────────────────────────────────────────────────

export type ClientMsg =
  | { type: 'JOIN'; name: string; color: PlayerColor }
  | { type: 'READY' }
  | { type: 'START'; config: GameStartConfig }
  | { type: 'ACTION'; action: GameAction }
  | { type: 'DISCONNECT_CHOICE'; choice: 'ai' | 'pause' };

// ── Server → Client ───────────────────────────────────────────────────────────

export type ServerMsg =
  | { type: 'WELCOME'; yourId: PlayerId; isAdmin: boolean; serverIp: string; serverPort: number }
  | { type: 'LOBBY'; players: LobbyPlayer[] }
  | { type: 'GAME_START'; state: GameState; playerIdMap: Record<string, string>; localGamePlayerIds: string[] }
  | { type: 'STATE'; state: GameState }
  | { type: 'PLAYER_DROPPED'; playerId: PlayerId; isAdmin: boolean; waitSeconds: number }
  | { type: 'PLAYER_RECONNECTED'; playerId: PlayerId }
  | { type: 'HOST_CHANGED'; newAdminId: PlayerId }
  | { type: 'GAME_PAUSED' }
  | { type: 'GAME_RESUMED' }
  | { type: 'ERROR'; message: string };
