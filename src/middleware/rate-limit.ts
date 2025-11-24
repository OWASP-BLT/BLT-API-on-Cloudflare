/**
 * Simple in-memory rate limiting middleware
 * For production, consider using Cloudflare's built-in rate limiting or KV storage
 */
import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60000, // 1 minute
  maxRequests: 100, // 100 requests per minute
};

// Simple in-memory store (note: this resets on worker restart)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(config: Partial<RateLimitConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };

  return async (c: Context, next: Next) => {
    const clientId = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const now = Date.now();
    
    let record = requestCounts.get(clientId);
    
    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + finalConfig.windowMs,
      };
      requestCounts.set(clientId, record);
    }

    record.count++;

    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      for (const [key, value] of requestCounts.entries()) {
        if (now > value.resetTime) {
          requestCounts.delete(key);
        }
      }
    }

    if (record.count > finalConfig.maxRequests) {
      throw new HTTPException(429, {
        message: 'Too many requests. Please try again later.',
      });
    }

    // Add rate limit headers
    c.res.headers.set('X-RateLimit-Limit', finalConfig.maxRequests.toString());
    c.res.headers.set('X-RateLimit-Remaining', Math.max(0, finalConfig.maxRequests - record.count).toString());
    c.res.headers.set('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000).toString());

    await next();
  };
}
