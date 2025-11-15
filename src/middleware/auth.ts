/**
 * Authentication middleware using Django REST Framework token authentication
 */
import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../types/env';
import { getDbClient } from '../db/client';

/**
 * Middleware to authenticate requests using DRF token
 */
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Token ')) {
    throw new HTTPException(401, {
      message: 'Authentication required. Provide a valid token in the Authorization header.',
    });
  }

  const token = authHeader.substring(6); // Remove 'Token ' prefix
  
  try {
    const sql = getDbClient(c.env);
    
    // Query to get user info from auth_token table (Django REST Framework tokens)
    const result = await sql`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.is_active,
        u.is_staff,
        u.is_superuser
      FROM authtoken_token t
      INNER JOIN auth_user u ON t.user_id = u.id
      WHERE t.key = ${token}
      AND u.is_active = true
    `;

    if (!result || result.length === 0) {
      throw new HTTPException(401, {
        message: 'Invalid or expired token',
      });
    }

    // Store user info in context for use in routes
    c.set('user', result[0]);
    
    await next();
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Authentication error:', error);
    throw new HTTPException(401, {
      message: 'Authentication failed',
    });
  }
}

/**
 * Optional authentication - doesn't fail if no token provided
 */
export async function optionalAuthMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (authHeader && authHeader.startsWith('Token ')) {
    const token = authHeader.substring(6);
    
    try {
      const sql = getDbClient(c.env);
      
      const result = await sql`
        SELECT 
          u.id,
          u.username,
          u.email,
          u.is_active,
          u.is_staff,
          u.is_superuser
        FROM authtoken_token t
        INNER JOIN auth_user u ON t.user_id = u.id
        WHERE t.key = ${token}
        AND u.is_active = true
      `;

      if (result && result.length > 0) {
        c.set('user', result[0]);
      }
    } catch (error) {
      console.error('Optional auth error:', error);
      // Don't throw error for optional auth
    }
  }
  
  await next();
}
