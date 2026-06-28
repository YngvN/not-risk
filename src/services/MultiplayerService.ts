import type { GameState, GameAction } from '../engine/types';
import type { ClientMsg, ServerMsg, LobbyPlayer } from '../../server/types';
import type { PlayerColor } from '../engine/types';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

type Handler<T extends ServerMsg> = (msg: T) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HandlerMap = Map<string, Set<Handler<any>>>;

/**
 * Thin typed wrapper around React Native's built-in WebSocket API.
 * Use MultiplayerContext in components — this class is the raw transport layer.
 */
export class MultiplayerService {
  private ws: WebSocket | null = null;
  private readonly handlers: HandlerMap = new Map();
  private _status: ConnectionStatus = 'disconnected';
  private statusListeners: Set<(s: ConnectionStatus) => void> = new Set();

  get status(): ConnectionStatus { return this._status; }

  private setStatus(s: ConnectionStatus): void {
    this._status = s;
    this.statusListeners.forEach(fn => fn(s));
  }

  onStatusChange(fn: (s: ConnectionStatus) => void): () => void {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  /** Subscribe to a specific server message type. Returns an unsubscribe function. */
  on<T extends ServerMsg['type']>(
    type: T,
    handler: Handler<Extract<ServerMsg, { type: T }>>,
  ): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  private emit(msg: ServerMsg): void {
    this.handlers.get(msg.type)?.forEach(fn => fn(msg));
  }

  connect(host: string, port: number): void {
    this.disconnect();
    this.setStatus('connecting');
    const ws = new WebSocket(`ws://${host}:${port}`);
    this.ws = ws;

    ws.onopen = () => this.setStatus('connected');
    ws.onclose = () => this.setStatus('disconnected');
    ws.onerror = () => this.setStatus('error');
    ws.onmessage = ({ data }) => {
      try {
        const msg: ServerMsg = JSON.parse(String(data));
        this.emit(msg);
      } catch {
        // Ignore malformed messages
      }
    };
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
    this.setStatus('disconnected');
  }

  /** Send a typed message to the server. */
  send(msg: ClientMsg): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  // ── Convenience helpers ───────────────────────────────────────────────────

  join(name: string, color: PlayerColor): void {
    this.send({ type: 'JOIN', name, color });
  }

  markReady(): void {
    this.send({ type: 'READY' });
  }

  sendAction(action: GameAction): void {
    this.send({ type: 'ACTION', action });
  }
}

/** Singleton instance shared across the app. */
export const multiplayerService = new MultiplayerService();

// Re-export server types needed by UI components so they don't import from server/
export type { LobbyPlayer, GameStartConfig } from '../../server/types';
