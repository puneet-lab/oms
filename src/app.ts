import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

export function createApp() {
  const app = express();
  app.use(express.json(), cors(), helmet());
  app.get('/health', (_req, res) => res.status(200).json({ ok: true }));
  return app;
}
