import { createServer } from 'node:http';
const PORT = parseInt(process.env.PORT || '6400', 10);
const server = createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'GET' && (req.url === '/health' || req.url === '/ready')) {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', service: 'flowboard' }));
    return;
  }
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'not found' }));
});
server.listen(PORT, '127.0.0.1', () => {
  console.log('[flowboard] API listening on http://127.0.0.1:' + PORT);
  if (process.send) process.send('ready');
});
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
