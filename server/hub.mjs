import { WebSocket, WebSocketServer } from 'ws';
import { rows, sql } from './db.mjs';
import { session } from './security.mjs';

export function startHub(server, origin, signal) {
  const hub = new WebSocketServer({ noServer: true, maxPayload: 1024 });
  server.on('upgrade', async (request, socket, head) => {
    if (request.url !== '/events') return;
    const user = await session(request);
    if (request.headers.origin !== origin || user?.role !== 'admin') {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      return;
    }
    hub.handleUpgrade(request, socket, head, ws => {
      ws.expiresAt = user.exp * 1000;
      ws.alive = true;
      ws.on('pong', () => { ws.alive = true; });
      ws.on('error', () => ws.terminate());
      ws.send(JSON.stringify({ type: 'connected' }));
    });
  });

  const heartbeat = setInterval(() => {
    for (const ws of hub.clients) {
      if (!ws.alive || Date.now() >= ws.expiresAt) {
        ws.terminate();
      } else {
        ws.alive = false;
        ws.ping();
      }
    }
  }, 15000);

  async function publish() {
    if (signal.aborted) return;
    try {
      const pending = await rows(sql, `SELECT id,event_type AS type,payload,created_at AS createdAt
        FROM notifications WHERE published_at IS NULL ORDER BY id LIMIT 100`);
      for (const entry of pending) {
        const message = JSON.stringify(entry);
        for (const ws of hub.clients) {
          if (ws.readyState !== WebSocket.OPEN) continue;
          if (ws.bufferedAmount > 65536) ws.terminate();
          else ws.send(message, error => { if (error) ws.terminate(); });
        }
        await rows(sql, 'UPDATE notifications SET published_at=CURRENT_TIMESTAMP(3) WHERE id=?', [entry.id]);
      }
    } catch (error) {
      console.error('Outbox polling failed', error);
    } finally {
      if (!signal.aborted) setTimeout(publish, 500).unref();
    }
  }

  signal.addEventListener('abort', () => {
    clearInterval(heartbeat);
    for (const ws of hub.clients) ws.terminate();
    hub.close();
  }, { once: true });
  void publish();
}
