/**
 * Database client for PostgreSQL connection
 * Uses Neon serverless driver which is compatible with Cloudflare Workers
 */
import { neon, neonConfig } from '@neondatabase/serverless';
import type { Env } from '../types/env';

// Enable fetch mode for Cloudflare Workers compatibility
neonConfig.fetchConnectionCache = true;

export function getDbClient(env: Env) {
  const connectionString = env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  return neon(connectionString);
}

export type DbClient = ReturnType<typeof getDbClient>;
