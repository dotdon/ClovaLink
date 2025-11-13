import Redis from 'ioredis';

let redis: Redis | null = null;

/**
 * Get or create Redis client singleton
 */
export function getRedisClient(): Redis | null {
  // If Redis is not available, return null (will fallback to in-memory)
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.warn('REDIS_URL not configured, rate limiting will use in-memory storage');
    return null;
  }

  if (!redis) {
    try {
      redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        reconnectOnError(err) {
          const targetErrors = ['READONLY', 'ECONNREFUSED'];
          return targetErrors.some((targetError) => err.message.includes(targetError));
        },
      });

      redis.on('error', (err) => {
        console.error('Redis error:', err);
      });

      redis.on('connect', () => {
        console.log('✓ Redis connected');
      });

      redis.on('ready', () => {
        console.log('✓ Redis ready');
      });

      // Wait for connection before using
      if (redis.status !== 'ready' && redis.status !== 'connect') {
        // Connection will be established on first command
        // Don't wait here to avoid blocking
      }

      redis.on('close', () => {
        console.warn('⚠ Redis connection closed');
      });
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      return null;
    }
  }

  return redis;
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

