import IORedis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

export const redis = new IORedis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => (times > 5 ? null : Math.min(times * 200, 2000)),
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error({ err }, 'Redis error'));
