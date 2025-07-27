/**
 * API Security utilities for the Next.js application
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Rate limiting configuration
 */
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

/**
 * Simple in-memory rate limiter (use Redis in production)
 */
class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();

  check(identifier: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const record = this.requests.get(identifier);

    if (!record || now > record.resetTime) {
      // Reset or create new record
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return true;
    }

    if (record.count >= config.maxRequests) {
      return false; // Rate limit exceeded
    }

    record.count++;
    return true;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

const rateLimiter = new RateLimiter();

// Cleanup old entries every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);
}

/**
 * Apply rate limiting to API requests
 */
export function withRateLimit(config: RateLimitConfig = { windowMs: 60000, maxRequests: 100 }) {
  return (handler: (req: NextRequest) => Promise<NextResponse>) => {
    return async (req: NextRequest): Promise<NextResponse> => {
      const identifier = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      
      if (!rateLimiter.check(identifier, config)) {
        return NextResponse.json(
          { error: 'Çok fazla istek gönderildi. Lütfen bekleyin.' },
          { status: 429 }
        );
      }

      return handler(req);
    };
  };
}

/**
 * Validate request method
 */
export function validateMethod(allowedMethods: string[]) {
  return (handler: (req: NextRequest) => Promise<NextResponse>) => {
    return async (req: NextRequest): Promise<NextResponse> => {
      if (!allowedMethods.includes(req.method)) {
        return NextResponse.json(
          { error: 'Method not allowed' },
          { status: 405 }
        );
      }

      return handler(req);
    };
  };
}

/**
 * Validate content type for POST/PUT requests
 */
export function validateContentType(expectedType: string = 'application/json') {
  return (handler: (req: NextRequest) => Promise<NextResponse>) => {
    return async (req: NextRequest): Promise<NextResponse> => {
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentType = req.headers.get('content-type');
        if (!contentType || !contentType.includes(expectedType)) {
          return NextResponse.json(
            { error: 'Invalid content type' },
            { status: 400 }
          );
        }
      }

      return handler(req);
    };
  };
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

/**
 * Compose multiple middleware functions
 */
export function compose(...middlewares: Array<(handler: any) => any>) {
  return (handler: (req: NextRequest) => Promise<NextResponse>) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}

/**
 * Default secure API handler
 */
export function createSecureHandler(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    methods?: string[];
    rateLimit?: RateLimitConfig;
    requireAuth?: boolean;
  } = {}
) {
  const {
    methods = ['GET', 'POST'],
    rateLimit = { windowMs: 60000, maxRequests: 100 },
    requireAuth = true,
  } = options;

  let secureHandler = handler;

  // Apply middleware in reverse order (compose pattern)
  secureHandler = validateContentType()(secureHandler);
  secureHandler = validateMethod(methods)(secureHandler);
  secureHandler = withRateLimit(rateLimit)(secureHandler);

  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const response = await secureHandler(req);
      return addSecurityHeaders(response);
    } catch (error) {
      // Log error securely (without exposing sensitive data)
      console.error('API Error:', {
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString(),
        // Don't log the actual error details in production
      });

      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.' },
          { status: 500 }
        )
      );
    }
  };
}