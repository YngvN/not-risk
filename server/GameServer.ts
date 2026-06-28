import type { GameState, GameAction, PlayerId } from '../src/engine/types';
import { dispatch as engineDispatch } from '../src/engine/stateMachine';
import { createGame } from '../src/engine/setup';
import { pickAIAction } from '../src/ai';
import type { LobbyPlayer, ServerMsg, GameStartConfig } from './types';

const AI_DELAY_MS: Record<string, number> = {
  SETUP: 350,
  HQ_SELECTION: 400,
  REINFORCE: 600,
  ATTACK: 500,
  FORTIFY: 500,
};

/**
 * Authoritative game state machine for the companion server.
 *
 * ID note: LobbyManager assigns lobby IDs (p1, p2, …). The engine assigns game
 * IDs (player_0, player_1, …) based on playerConfig order. This class maintains
 * the mapping so action senders (identified by lobby ID) can be validated against
 * the active game player (identified by game ID).
 */
export class GameServer {
  private state: GameState | null = null;
  private paused = false;
  private aiTimer: ReturnType<typeof setTimeout> | null = null;

  /** lobby ID → game ID (e.g. "p1" → "player_0") */
  private lobbyToGame = new Map<PlayerId, string>();
  /** game IDs that are local humans controlled by the admin socket */
  private localGameIds = new Set<string>();
  /** lobby ID of the admin (first joiner) */
  private adminLobbyId: PlayerId | null = null;

  constructor(
    private readonly broadcast: (msg: ServerMsg) => void,
    private readonly sendToPlayer: (playerId: PlayerId, msg: ServerMsg) => void,
  ) {}

  start(lobbyPlayers: LobbyPlayer[], config: GameStartConfig): void {
    const playerConfigs = [
      ...lobbyPlayers.map(p => ({ name: p.name, color: p.color })),
      ...config.localSlots.map(s => ({ name: s.name, color: s.color })),
      ...config.aiSlots.map(ai => ({
        name: ai.name,
        color: ai.color,
        isAI: true as const,
        aiDifficulty: ai.difficulty,
      })),
    ];

    this.state = createGame(config.mode, playerConfigs, config.setupMode, config.randomPlacement);

    // Build lobby → game ID map from lobby player order
    this.lobbyToGame.clear();
    lobbyPlayers.forEach((lp, i) => this.lobbyToGame.set(lp.id, `player_${i}`));

    this.adminLobbyId = lobbyPlayers.find(p => p.isAdmin)?.id ?? lobbyPlayers[0]?.id ?? null;

    // Local player game IDs sit right after lobby players in the config
    this.localGameIds.clear();
    const localStart = lobbyPlayers.length;
    for (let i = 0; i < config.localSlots.length; i++) {
      this.localGameIds.add(`player_${localStart + i}`);
    }

    const playerIdMap: Record<string, string> = Object.fromEntries(this.lobbyToGame);
    const localGamePlayerIds = Array.from(this.localGameIds);

    this.broadcast({ type: 'GAME_START', state: this.state, playerIdMap, localGamePlayerIds });
    this.scheduleAiIfNeeded();
  }

  /**
   * Validates and applies a game action.
   * The admin socket is allowed to act for local-human player slots as well as
   * their own slot, so the host device can play for everyone sitting at it.
   */
  handleAction(fromLobbyId: PlayerId, action: GameAction): void {
    if (!this.state || this.paused) return;

    const senderGameId = this.lobbyToGame.get(fromLobbyId);
    if (!senderGameId) return;

    const activeId = this.state.activePlayerId;
    const isOwnTurn = activeId === senderGameId;
    const isLocalTurn = this.localGameIds.has(activeId) && fromLobbyId === this.adminLobbyId;

    if (!isOwnTurn && !isLocalTurn) {
      this.sendToPlayer(fromLobbyId, { type: 'ERROR', message: 'Not your turn' });
      return;
    }

    this.applyAction(action);
  }

  pause(): void {
    this.paused = true;
    this.clearAiTimer();
    this.broadcast({ type: 'GAME_PAUSED' });
  }

  resume(): void {
    this.paused = false;
    this.broadcast({ type: 'GAME_RESUMED' });
    this.scheduleAiIfNeeded();
  }

  /** Converts a dropped human player's slot to AI control. */
  handToAI(lobbyPlayerId: PlayerId): void {
    if (!this.state) return;
    const gameId = this.lobbyToGame.get(lobbyPlayerId);
    if (!gameId) return;
    this.state = {
      ...this.state,
      players: this.state.players.map(p =>
        p.id === gameId ? { ...p, isAI: true, aiDifficulty: 'medium' } : p,
      ),
    };
    this.broadcast({ type: 'STATE', state: this.state });
    this.scheduleAiIfNeeded();
  }

  /** Resets all game state so the server can host a new game session. */
  reset(): void {
    this.clearAiTimer();
    this.state = null;
    this.paused = false;
    this.lobbyToGame.clear();
    this.localGameIds.clear();
    this.adminLobbyId = null;
  }

  getState(): GameState | null { return this.state; }
  isStarted(): boolean { return this.state !== null; }

  private applyAction(action: GameAction): void {
    if (!this.state) return;
    this.state = engineDispatch(action, this.state);
    this.broadcast({ type: 'STATE', state: this.state });
    this.scheduleAiIfNeeded();
  }

  private scheduleAiIfNeeded(): void {
    if (!this.state || this.paused || this.state.phase === 'GAME_OVER') return;
    const active = this.state.players.find(p => p.id === this.state!.activePlayerId);
    if (!active?.isAI) return;

    const delay = AI_DELAY_MS[this.state.phase] ?? 500;
    const snapshot = this.state;

    this.clearAiTimer();
    this.aiTimer = setTimeout(() => {
      if (this.state !== snapshot) return;
      const action = pickAIAction(this.state!);
      if (action) this.applyAction(action);
    }, delay);
  }

  private clearAiTimer(): void {
    if (this.aiTimer) { clearTimeout(this.aiTimer); this.aiTimer = null; }
  }
}
