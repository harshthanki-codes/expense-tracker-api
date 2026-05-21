import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { logger } from './config/logger';
import { swaggerSpec } from './config/swagger';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { respond } from './lib/response';

import { authRouter } from './modules/auth/auth.router';
import { usersRouter } from './modules/users/users.router';
import { transactionsRouter } from './modules/transactions/transactions.router';
import { categoriesRouter } from './modules/categories/categories.router';
import analyticsRouter from './modules/analytics/analytics.router';

export function createApp() {
  const app = express();

  // Security headers first
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));

  // Compression and body parsing
  app.use(compression());
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: false }));

  // Structured HTTP request logging — off in test to reduce noise
  if (env.NODE_ENV !== 'test') {
    app.use(pinoHttp({ logger }));
  }

  // Docs — mounted before the API prefix so /docs is always reachable
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

  // General rate limiter on all API routes
  app.use(env.API_PREFIX, generalLimiter);

  // API routes
  app.use(`${env.API_PREFIX}/auth`, authRouter);
  app.use(`${env.API_PREFIX}/users`, usersRouter);
  app.use(`${env.API_PREFIX}/transactions`, transactionsRouter);
  app.use(`${env.API_PREFIX}/categories`, categoriesRouter);
  app.use(`${env.API_PREFIX}/analytics`, analyticsRouter);

  // Health check — no auth, no rate limit, used by load balancers and CI
  app.get('/health', (_req, res) => {
    respond.ok(res, { status: 'ok', uptime: process.uptime() });
  });

  // 404 catch-all
  app.use((_req, res) => {
    respond.error(res, 'Route not found', 404);
  });

  // Central error handler — must be last
  app.use(errorHandler);

  return app;
}
