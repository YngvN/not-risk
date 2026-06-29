import type { PlayerId, PlayerColor } from '../src/engine/types';
import type { LobbyPlayer, ServerMsg, GameStartConfig } from './types';

const MAX_PLAYERS = 6;
const RECONNECT_TIMEOUT_MS = 60_000;

interface Slot {
  player: LobbyPlayer;
  reconnectTimer?: ReturnType<typeof setTimeout>;
}

/** Manages pre-game lobby state: player slots, ready flags, admin role, and game config. */
export class LobbyManager {
  private readonly slots = new Map<PlayerId, Slot>();
  private nextId = 1;
  private _config: GameStartConfig | null = null;

  private readonly _send: (playerId: PlayerId, msg: ServerMsg) => void;
  private readonly _broadcast: (msg: ServerMsg) => void;

  constructor(
    send: (playerId: PlayerId, msg: ServerMsg) => void,
    broadcast: (msg: ServerMsg) => void,
  ) {
    this._send = send;
    this._broadcast = broadcast;
  }

  /** Clears all slots and resets the ID counter for a fresh lobby. */
  reset(): void {
    for (const { reconnectTimer } of this.slots.values()) {
      if (reconnectTimer) clearTimeout(reconnectTimer);
    }
    this.slots.clear();
    this.nextId = 1;
    this._config = null;
  }

  get config(): GameStartConfig | null { return this._config; }
  get hostName(): string {
    for (const { player } of this.slots.values()) {
      if (player.isAdmin) return player.name;
    }
    return 'Unknown';
  }

  /** Stores the host's current game config and broadcasts it to all players. */
  setConfig(config: GameStartConfig): void {
    this._config = config;
    this._broadcast({ type: 'LOBBY', players: this.players, config: this._config });
  }

  get isFull(): boolean { return this.slots.size >= MAX_PLAYERS; }

  /**
   * True when every connected player has marked ready and the stored config
   * would produce at least 2 total players (LAN + local + AI).
   */
  get allReady(): boolean {
    const connected = Array.from(this.slots.values())
      .map(s => s.player)
      .filter(p => p.connected);
    if (connected.length === 0 || !this._config) return false;
    const total = connected.length + this._config.localSlots.length + this._config.aiSlots.length;
    return total >= 2 && connected.every(p => p.isReady);
  }

  get adminId(): PlayerId | null {
    for (const [id, { player }] of this.slots) {
      if (player.isAdmin) return id;
    }
    return null;
  }
  get players(): LobbyPlayer[] {
    return Array.from(this.slots.values()).map(s => s.player);
  }

  /**
   * Registers a new player and broadcasts the updated lobby.
   * Returns the assigned PlayerId and isAdmin flag, or null if the lobby is full.
   * NOTE: WELCOME must be sent by the caller AFTER it has registered the player's
   * WebSocket in playerToWs — otherwise _send cannot find the socket.
   */
  join(name: string, color: PlayerColor): { id: PlayerId; isAdmin: boolean } | null {
    if (this.isFull) return null;

    const id: PlayerId = `p${this.nextId++}`;
    const isAdmin = this.slots.size === 0;
    this.slots.set(id, { player: { id, name, color, isAdmin, isReady: false, connected: true } });

    this._broadcast({ type: 'LOBBY', players: this.players, config: this._config });
    return { id, isAdmin };
  }

  setReady(playerId: PlayerId): void {
    const slot = this.slots.get(playerId);
    if (!slot) return;
    slot.player.isReady = true;
    this._broadcast({ type: 'LOBBY', players: this.players, config: this._config });
  }

  /**
   * Marks a player as disconnected and starts a reconnect timer for admins.
   * `onAdminExpired` is called if the admin never reconnects within the window.
   */
  disconnect(playerId: PlayerId, onAdminExpired: (newAdminId: PlayerId | null) => void): void {
    const slot = this.slots.get(playerId);
    if (!slot) return;

    slot.player.connected = false;
    this._broadcast({ type: 'PLAYER_DROPPED', playerId, isAdmin: slot.player.isAdmin, waitSeconds: RECONNECT_TIMEOUT_MS / 1000 });
    this._broadcast({ type: 'LOBBY', players: this.players, config: this._config });

    if (slot.player.isAdmin) {
      slot.reconnectTimer = setTimeout(() => {
        this.slots.delete(playerId);
        const newAdmin = this.promoteNextAdmin();
        onAdminExpired(newAdmin);
      }, RECONNECT_TIMEOUT_MS);
    }
  }

  /** Re-attaches a returning player and cancels any pending eviction timer. */
  reconnect(playerId: PlayerId): boolean {
    const slot = this.slots.get(playerId);
    if (!slot) return false;

    if (slot.reconnectTimer) {
      clearTimeout(slot.reconnectTimer);
      slot.reconnectTimer = undefined;
    }
    slot.player.connected = true;
    this._broadcast({ type: 'PLAYER_RECONNECTED', playerId });
    this._broadcast({ type: 'LOBBY', players: this.players, config: this._config });
    return true;
  }

  /**
   * Immediately removes a player from the lobby (used for pre-game disconnects).
   * Promotes a new admin if the removed player was admin.
   * Returns the new admin ID if promotion happened, null if lobby is now empty.
   */
  removePlayer(playerId: PlayerId): PlayerId | null {
    const slot = this.slots.get(playerId);
    if (!slot) return this.adminId;
    if (slot.reconnectTimer) clearTimeout(slot.reconnectTimer);
    const wasAdmin = slot.player.isAdmin;
    this.slots.delete(playerId);
    if (this.slots.size === 0) return null;
    if (wasAdmin) return this.promoteNextAdmin();
    this._broadcast({ type: 'LOBBY', players: this.players, config: this._config });
    return this.adminId;
  }

  private promoteNextAdmin(): PlayerId | null {
    for (const [id, slot] of this.slots) {
      if (slot.player.connected) {
        slot.player.isAdmin = true;
        this._broadcast({ type: 'HOST_CHANGED', newAdminId: id });
        this._broadcast({ type: 'LOBBY', players: this.players, config: this._config });
        return id;
      }
    }
    return null;
  }
}
