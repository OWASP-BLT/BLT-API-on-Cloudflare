/**
 * CORS middleware for handling cross-origin requests
 */
import type { Context, Next } from 'hono';
import type { Env } from '../types/env';

export async function corsMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const origin = c.req.header('Origin');
  const allowedOrigins = c.env.ALLOWED_ORIGINS 
    ? c.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['*'];

  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204, {
      'Access-Control-Allow-Origin': allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin)) 
        ? (origin || '*') 
        : allowedOrigins[0],
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Credentials': 'true',
    });
  }

  await next();

  // Add CORS headers to response
  c.res.headers.set(
    'Access-Control-Allow-Origin',
    allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))
      ? (origin || '*')
      : allowedOrigins[0]
  );
  c.res.headers.set('Access-Control-Allow-Credentials', 'true');
  c.res.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS'
  );
  c.res.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );
}
