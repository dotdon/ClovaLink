/**
 * Redis-based rate limiter with in-memory fallback
 */

import { getRedisClient } from './redis';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store as fallback when Redis is unavailable
const memoryStore: RateLimitStore = {};

// Clean up expired entries every 5 minutes (only for memory store)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    Object.keys(memoryStore).forEach((key) => {
      if (memoryStore[key].resetTime < now) {
        delete memoryStore[key];
      }
    });
  }, 5 * 60 * 1000);
}

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  identifier?: string; // Custom identifier (defaults to IP)
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Rate limit check using Redis (with in-memory fallback)
 */
export async function rateLimit(
  identifier: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  
  if (redis) {
    return await rateLimitRedis(identifier, options, redis);
  } else {
    return rateLimitMemory(identifier, options);
  }
}

/**
 * Redis-based rate limiting
 */
async function rateLimitRedis(
  identifier: string,
  options: RateLimitOptions,
  redis: NonNullable<ReturnType<typeof getRedisClient>>
): Promise<RateLimitResult> {
  const { windowMs, maxRequests } = options;
  const now = Date.now();
  const key = `rate:${identifier}`;
  const windowSeconds = Math.ceil(windowMs / 1000);

  try {
    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline();
    
    // Increment counter
    pipeline.incr(key);
    // Set expiry if key is new
    pipeline.expire(key, windowSeconds);
    // Get TTL to calculate reset time
    pipeline.ttl(key);
    
    const results = await pipeline.exec();
    
    if (!results || results.length < 3) {
      throw new Error('Redis pipeline failed');
    }

    // Check for errors in pipeline results
    const countResult = results[0];
    const expireResult = results[1];
    const ttlResult = results[2];
    
    if (countResult[0] || expireResult[0] || ttlResult[0]) {
      throw new Error('Redis pipeline command failed');
    }

    const count = countResult[1] as number;
    const ttl = ttlResult[1] as number;
    const resetTime = now + (ttl * 1000);

    if (count > maxRequests) {
      const retryAfter = Math.ceil(ttl);
      return {
        success: false,
        remaining: 0,
        resetTime,
        retryAfter,
      };
    }

    return {
      success: true,
      remaining: maxRequests - count,
      resetTime,
    };
  } catch (error) {
    console.error('Redis rate limit error, falling back to memory:', error);
    return rateLimitMemory(identifier, options);
  }
}

/**
 * In-memory rate limiting (fallback)
 */
function rateLimitMemory(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const { windowMs, maxRequests } = options;
  const now = Date.now();
  const key = identifier;

  // Get or create entry
  let entry = memoryStore[key];

  if (!entry || entry.resetTime < now) {
    // Create new window
    entry = {
      count: 1,
      resetTime: now + windowMs,
    };
    memoryStore[key] = entry;
    return {
      success: true,
      remaining: maxRequests - 1,
      resetTime: entry.resetTime,
    };
  }

  // Increment count
  entry.count += 1;

  if (entry.count > maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }

  return {
    success: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from various headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
  
  // For authenticated users, use user ID for more accurate rate limiting
  // This will be set by middleware after authentication
  const userId = request.headers.get('x-user-id');
  
  return userId ? `user:${userId}` : `ip:${ip}`;
}

