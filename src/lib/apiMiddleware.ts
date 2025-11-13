import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit, getClientIdentifier, RateLimitOptions } from './rateLimit';
import { errorResponse, unauthorizedResponse, forbiddenResponse } from './apiResponse';

export interface ApiMiddlewareOptions {
  requireAuth?: boolean;
  requireRole?: 'ADMIN' | 'MANAGER' | 'USER';
  rateLimit?: RateLimitOptions;
  allowedMethods?: string[];
}

/**
 * API middleware wrapper for common functionality:
 * - Authentication
 * - Rate limiting
 * - Method validation
 * - Error handling
 */
export function withApiMiddleware(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  options: ApiMiddlewareOptions = {}
) {
  const {
    requireAuth = true,
    requireRole,
    rateLimit: rateLimitOptions,
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  } = options;

  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      // Check HTTP method
      const method = req.method;
      if (!allowedMethods.includes(method)) {
        return errorResponse(
          `Method ${method} not allowed`,
          405,
          `Only ${allowedMethods.join(', ')} methods are allowed`
        );
      }

      // Authentication check (do this first before rate limiting)
      let session = null;
      if (requireAuth) {
        session = await getServerSession(authOptions);

        if (!session?.user?.id) {
          return unauthorizedResponse('Authentication required');
        }

        // Role check
        if (requireRole && session.user.role !== requireRole) {
          return forbiddenResponse(`Requires ${requireRole} role`);
        }

        // Add user ID to headers for rate limiting
        req.headers.set('x-user-id', session.user.id);
      }

      // Rate limiting (after auth so we can use user ID)
      let limitResult = null;
      if (rateLimitOptions) {
        try {
          const identifier = getClientIdentifier(req);
          limitResult = await rateLimit(identifier, rateLimitOptions);

          if (!limitResult.success) {
            const response = errorResponse(
              'Too many requests',
              429,
              `Rate limit exceeded. Please try again in ${limitResult.retryAfter} seconds.`
            );
            response.headers.set('Retry-After', String(limitResult.retryAfter || 60));
            response.headers.set('X-RateLimit-Limit', String(rateLimitOptions.maxRequests));
            response.headers.set('X-RateLimit-Remaining', String(limitResult.remaining));
            response.headers.set('X-RateLimit-Reset', String(limitResult.resetTime));
            return response;
          }
        } catch (rateLimitError) {
          // If rate limiting fails, log but continue (fail open)
          console.error('[API Middleware] Rate limit error:', rateLimitError);
          // Continue without rate limiting rather than blocking the request
        }
      }

      // Call the actual handler
      const response = await handler(req, context);
      
      // Add rate limit headers if rate limiting was enabled
      if (limitResult && rateLimitOptions) {
        response.headers.set('X-RateLimit-Limit', String(rateLimitOptions.maxRequests));
        response.headers.set('X-RateLimit-Remaining', String(limitResult.remaining));
        response.headers.set('X-RateLimit-Reset', String(limitResult.resetTime));
      }
      
      return response;
    } catch (error) {
      console.error('[API Middleware] Error:', error);
      return errorResponse(
        'Internal server error',
        500,
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    }
  };
}

/**
 * Default rate limit configurations
 */
export const defaultRateLimits = {
  // Strict rate limit for authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 requests per 15 minutes
  },
  // Standard rate limit for most API endpoints
  standard: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  },
  // Relaxed rate limit for read operations
  read: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 120, // 120 requests per minute
  },
  // Strict rate limit for write operations
  write: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
  },
};

