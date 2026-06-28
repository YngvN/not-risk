import { WebSocketServer, WebSocket } from 'ws';
import os from 'os';
import { LobbyManager } from './LobbyManager';
import { GameServer } from './GameServer';
import type { ClientMsg, ServerMsg } from './types';
import type { PlayerId } from '../src/engine/types';

const PORT = Number(process.env.PORT ?? 8080);

function getLanIp(): string {
  const ifaces = os.networkInterfaces();
  for (const iface of Object.values(ifaces)) {
    for (const alias of iface ?? []) {
      if (alias.family === 'IPv4' && !alias.internal) return alias.address;
    }
  }
  return '127.0.0.1';
}

const serverIp = getLanIp();
const wss = new WebSocketServer({ port: PORT });

const wsToPlayer = new Map<WebSocket, PlayerId>();
const playerToWs = new Map<PlayerId, WebSocket>();

function send(playerId: PlayerId, msg: ServerMsg): void {
  const ws = playerToWs.get(playerId);
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function broadcast(msg: ServerMsg): void {
  const data = JSON.stringify(msg);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  });
}

const lobby = new LobbyManager(send, broadcast);
const game = new GameServer(broadcast, send);
let gameStarted = false;

/** Full server reset — clears all state so a fresh lobby can begin. */
function resetServer(): void {
  gameStarted = false;
  game.reset();
  lobby.reset();
  wsToPlayer.clear();
  playerToWs.clear();
  console.log('[fRISKy server] Session reset — ready for new lobby.');
}

wss.on('connection', ws => {
  ws.on('message', raw => {
    let msg: ClientMsg;
    try { msg = JSON.parse(String(raw)); }
    catch { return; }

    const playerId = wsToPlayer.get(ws);

    switch (msg.type) {
      case 'JOIN': {
        if (gameStarted) {
          // Reconnect: match by name + color
          const dropped = lobby.players.find(
            p => !p.connected && p.name === msg.name && p.color === msg.color,
          );
          if (dropped) {
            wsToPlayer.set(ws, dropped.id);
            playerToWs.set(dropped.id, ws);
            lobby.reconnect(dropped.id);
            const state = game.getState();
            if (state) send(dropped.id, { type: 'STATE', state });
            game.resume();
          } else {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Game already in progress' } satisfies ServerMsg));
          }
          return;
        }

        const id = lobby.join(msg.name, msg.color, serverIp, PORT);
        if (id) {
          wsToPlayer.set(ws, id);
          playerToWs.set(id, ws);
        } else {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Lobby is full' } satisfies ServerMsg));
        }
        break;
      }

      case 'READY': {
        if (playerId) lobby.setReady(playerId);
        break;
      }

      case 'START': {
        if (!playerId || playerId !== lobby.adminId || gameStarted) return;
        gameStarted = true;
        game.start(lobby.players, msg.config);
        break;
      }

      case 'ACTION': {
        if (playerId) game.handleAction(playerId, msg.action);
        break;
      }

      case 'DISCONNECT_CHOICE': {
        if (!playerId || playerId !== lobby.adminId) return;
        const dropped = lobby.players.find(p => !p.connected);
        if (!dropped) return;
        if (msg.choice === 'ai') {
          game.handToAI(dropped.id);
          game.resume();
        }
        // 'pause' keeps the game paused until the player reconnects
        break;
      }
    }
  });

  ws.on('close', () => {
    const playerId = wsToPlayer.get(ws);
    wsToPlayer.delete(ws);
    if (!playerId) return;
    playerToWs.delete(playerId);

    if (!gameStarted) {
      // Pre-game: remove slot immediately — no reconnect window in the lobby.
      const remaining = lobby.removePlayer(playerId);
      if (remaining === null) {
        console.log('[fRISKy server] Last player left lobby — resetting.');
        resetServer();
      }
    } else {
      lobby.disconnect(playerId, newAdminId => {
        if (!newAdminId) {
          console.log('[fRISKy server] All players left — resetting session.');
          resetServer();
        }
      });
      game.pause();
    }
  });
});

console.log(`\n[fRISKy server] Listening on ws://${serverIp}:${PORT}`);
console.log(`[fRISKy server] Deep link: frisky://join?host=${serverIp}&port=${PORT}\n`);
