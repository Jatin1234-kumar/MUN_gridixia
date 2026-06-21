import Redis from 'ioredis';
import { config } from '../config';
import { createLogger } from '../utils/logger';

const log = createLogger('redis');

let sharedConnection: Redis | null = null;

export function getBullMQConnection() {
  return { url: config.redis.url };
}

export function getSharedRedisConnection(): Redis {
  if (!sharedConnection) {
    sharedConnection = new Redis(config.redis.url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    sharedConnection.on('connect', () => log.info('Redis connected'));
    sharedConnection.on('error', (err) => log.error('Redis error', { error: err.message }));
  }
  return sharedConnection;
}

export async function closeRedisConnection(): Promise<void> {
  if (sharedConnection) {
    await sharedConnection.quit();
    sharedConnection = null;
    log.info('Redis connection closed');
  }
}
