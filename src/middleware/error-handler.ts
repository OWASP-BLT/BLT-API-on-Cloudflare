/**
 * Global error handling middleware
 */
import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';

export async function errorHandler(c: Context, next: Next): Promise<Response> {
  try {
    await next();
    return c.res;
  } catch (err) {
    if (err instanceof HTTPException) {
      return c.json(
        {
          error: err.message,
          status: err.status,
        },
        err.status
      );
    }

    console.error('Unhandled error:', err);
    
    return c.json(
      {
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      500
    );
  }
}
