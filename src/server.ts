import 'dotenv/config';
import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { logger } from './config/logger';

async function bootstrap() {
  await redis.connect();
  await prisma.$connect();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV, docs: `http://localhost:${env.PORT}/docs` },
      'Server started',
    );
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown initiated');
    server.close(async () => {
      await prisma.$disconnect();
      redis.disconnect();
      logger.info('Server shut down gracefully');
      process.exit(0);
    });

    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
      logger.error('Forced exit after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception — shutting down');
    shutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled rejection — shutting down');
    shutdown('unhandledRejection');
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
