import { createServer } from 'node:http';
import next from 'next';
import { api } from './api.mjs';
import { mongo, rows, sql } from './db.mjs';
import { startHub } from './hub.mjs';
import { initializeReports, startReports } from './reports.mjs';

const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOST || '127.0.0.1';
const origin = new URL(process.env.APP_ORIGIN || 'http://localhost:' + port).origin;
if (Buffer.byteLength(process.env.JWT_SECRET || '') < 32) throw new Error('Set JWT_SECRET to at least 32 bytes');
const abort = new AbortController();
const nextUpgradeServer = createServer();
const app = next({ dev: !process.argv.includes('--production'), hostname, port, httpServer: nextUpgradeServer });
await rows(sql, 'SELECT 1 FROM live_priority LIMIT 1');
await mongo.connect();
await initializeReports();
await app.prepare();
const nextHandler = app.getRequestHandler();
const server = createServer((request,response) => {
  const url = new URL(request.url,origin);
  const handler = url.pathname.startsWith('/api/') ? api(request,response,url,origin) : nextHandler(request,response);
  Promise.resolve(handler).catch(error => {
    console.error(error);
    if (!response.headersSent) response.writeHead(500);
    response.end();
  });
});
startHub(server,origin,abort.signal);
server.on('upgrade', (request,socket,head) => {
  if (request.url !== '/events' && !nextUpgradeServer.emit('upgrade',request,socket,head)) socket.destroy();
});
startReports(abort.signal);
server.listen(port,hostname,() => console.log('Disaster Relief is listening at ' + origin));
for (const signal of ['SIGINT','SIGTERM']) {
  process.once(signal, async () => {
    abort.abort();
    server.close();
    await Promise.allSettled([sql.end(),mongo.close(),app.close()]);
    process.exit(0);
  });
}
