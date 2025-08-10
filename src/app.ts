import express from 'express';
import routes from './app/routes';
import { requestId } from './app/middlewares/request-id';
import { errorHandler } from './app/middlewares/error-handler';
import { authOptional } from './app/middlewares/auth';
import { corsMw } from './app/middlewares/cors';
import { rateLimitMw } from './app/middlewares/rate-limit';
import { mountSwagger } from './app/swagger';

const isTest = process.env.NODE_ENV === 'test';

export function createApp() {
  const app = express();

  app.set('trust proxy', true);

  // Body parsing middleware first
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));

  // CORS before routes
  app.use(corsMw);

  // Request ID and auth
  app.use(requestId);
  app.use(authOptional);

  // Rate limiting before routes (with test condition)
  if (!isTest) {
    app.use(rateLimitMw);
  }

  // Routes
  app.use('/api', routes);

  // Health endpoint
  app.get('/health', (_req, res) => res.json({ ok: true }));

  // Error handler last
  app.use(errorHandler);

  // Swagger only in non-test
  if (!isTest) {
    mountSwagger(app);
  }

  return app;
}

export default createApp;
