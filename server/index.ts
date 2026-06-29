import http from 'http';
import fs from 'fs';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import os from 'os';

const LABEL_OVERRIDES_PATH = path.join(
  process.cwd(),
  'src', 'constants', 'labelPositionsOverrides.json',
);
import { LobbyManager } from './LobbyManager';
import { GameServer } from './GameServer';
import type { ClientMsg, ServerMsg } from './types';
import type { PlayerId } from '../src/engine/types';

const PORT = Number(process.env.PORT ?? 8080);

function getLanIp(): string {
  const candidates: string[] = [];
  for (const iface of Object.values(os.networkInterfaces())) {
    for (const alias of iface ?? []) {
      if (alias.family !== 'IPv4' || alias.internal) continue;
      if (alias.address === '0.0.0.0') continue;
      if (alias.address.startsWith('169.254.')) continue;
      candidates.push(alias.address);
    }
  }
  const lan = candidates.find(a =>
    a.startsWith('192.168.') ||
    a.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(a),
  );
  return lan ?? candidates[0] ?? '127.0.0.1';
}

const serverIp = getLanIp();

// Serve a helpful HTML page when someone opens the address in a browser.
// This happens when the phone camera taps the QR code text as a link.
function joinPage(ip: string, port: number): string {
  const deepLink = `frisky://join?host=${ip}&port=${port}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Join fRISKy game</title>
  <style>
    body { font-family: -apple-system, sans-serif; text-align: center;
           padding: 2rem; background: #1a1a2e; color: #eee; }
    h1   { color: #6c63ff; }
    .addr { font-size: 1.5rem; font-weight: bold; letter-spacing: .05em;
            background: #16213e; padding: .75rem 1.5rem; border-radius: 8px;
            display: inline-block; margin: 1rem 0; }
    a.btn { display: inline-block; margin-top: 1.5rem; padding: .75rem 2rem;
            background: #6c63ff; color: #fff; border-radius: 8px;
            text-decoration: none; font-size: 1.1rem; }
  </style>
</head>
<body>
  <h1>fRISKy LAN game</h1>
  <p>Open the <strong>fRISKy</strong> app, go to <strong>LAN → Join</strong> and enter:</p>
  <div class="addr">${ip}:${port}</div>
  <br />
  <a class="btn" href="${deepLink}">Open in app</a>
  <p style="margin-top:2rem;font-size:.85rem;opacity:.6">
    (The "Open in app" link only works if the app is installed as a native build.)
  </p>
</body>
</html>`;
}

// Use a real HTTP server so browser visits get a helpful page instead of
// the raw WebSocket 426 "Upgrade Required" error.
const httpServer = http.createServer((req, res) => {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Label-position editor: save overrides to project file so Metro hot-reloads
  if (req.method === 'POST' && req.url === '/save-labels') {
    let body = '';
    req.on('data', chunk => { body += String(chunk); });
    req.on('end', () => {
      try {
        const positions = JSON.parse(body);
        fs.writeFileSync(LABEL_OVERRIDES_PATH, JSON.stringify(positions, null, 2) + '\n');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        console.log(`[fRISKy server] Saved ${Object.keys(positions).length} label override(s).`);
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Discovery endpoint — returns JSON so clients can find servers on the LAN
  if (req.url === '/discover') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({
      host: lobby.hostName,
      playerCount: lobby.players.filter(p => p.connected).length,
      started: gameStarted,
    }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(joinPage(serverIp, PORT));
});

const wss = new WebSocketServer({ server: httpServer });

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

        const joined = lobby.join(msg.name, msg.color);
        if (joined) {
          const { id, isAdmin } = joined;
          wsToPlayer.set(ws, id);
          playerToWs.set(id, ws);
          // WELCOME is sent AFTER playerToWs is set so send() can find the socket.
          send(id, { type: 'WELCOME', yourId: id, isAdmin, serverIp, serverPort: PORT });
        } else {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Lobby is full' } satisfies ServerMsg));
        }
        break;
      }

      case 'READY': {
        if (playerId) lobby.setReady(playerId);
        break;
      }

      case 'SET_CONFIG': {
        if (playerId && playerId === lobby.adminId) lobby.setConfig(msg.config);
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

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n[fRISKy server] Listening on port ${PORT}`);
  console.log(`[fRISKy server] LAN  : http://${serverIp}:${PORT}  (open in browser for join instructions)`);
  console.log(`[fRISKy server] Local: http://localhost:${PORT}`);
  console.log(`[fRISKy server] → Enter "${serverIp}" on phones, "localhost" in the app on this machine\n`);
});
