/**
 * Cloudflare Workers environment bindings and variables
 */
export interface Env {
  // Database connection (via Hyperdrive or direct connection)
  DB?: any; // Hyperdrive binding
  DATABASE_URL?: string; // Direct PostgreSQL connection string
  
  // Authentication
  JWT_SECRET: string;
  
  // CORS
  ALLOWED_ORIGINS?: string;
  
  // Environment
  ENVIRONMENT?: string;
}
