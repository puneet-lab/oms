import { config as loadEnv } from 'dotenv';
loadEnv();

import http from 'http';
import createApp from './app';

const PORT = Number(process.env.PORT) || 3000;

const app = createApp();
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`API listening on :${PORT}`);
});

// graceful shutdown
let closing = false;
function shutdown() {
  if (closing) return;
  closing = true;
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
