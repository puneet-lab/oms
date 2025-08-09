import express from 'express';
import routes from './app/routes';
import { requestId } from './app/middlewares/request-id';
import { errorHandler } from './app/middlewares/error-handler';
import { authOptional } from './app/middlewares/auth';
import { corsMw } from './app/middlewares/cors';
import { rateLimitMw } from './app/middlewares/rate-limit';

export function createApp() {
  const app = express();

  app.set('trust proxy', true);
  app.use(express.json({ limit: '1mb' }));
  app.use(requestId);
  app.use(authOptional);
  app.use('/api', routes);
  app.use(errorHandler);
  app.use(express.urlencoded({ extended: false }));
  app.use(corsMw);
  app.use(rateLimitMw);

  // Public health endpoint
  app.get('/health', (_req, res) => res.json({ ok: true }));

  // TODO: add middlewares (requestId, cors, rateLimit, errorHandler)
  // TODO: mount API routes once src/app/routes.ts exists:
  // import { routes } from "./app/routes";
  // app.use("/api", routes);

  return app;
}

export default createApp;
