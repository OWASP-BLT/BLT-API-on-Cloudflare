/**
 * OWASP BLT API - Cloudflare Workers
 * 
 * A full-featured REST API for the OWASP Bug Logging Tool (BLT) project
 * Designed to run efficiently on Cloudflare Workers with PostgreSQL backend
 */
import { Hono } from 'hono';
import type { Env } from './types/env';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/error-handler';
import { rateLimit } from './middleware/rate-limit';

// Import route handlers
import issues from './routes/issues';
import users from './routes/users';
import domains from './routes/domains';
import organizations from './routes/organizations';
import leaderboard from './routes/leaderboard';
import hunts from './routes/hunts';
import stats from './routes/stats';

// Create main app
const app = new Hono<{ Bindings: Env }>();

// Apply global middleware
app.use('*', errorHandler);
app.use('*', corsMiddleware);
app.use('*', rateLimit());

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    name: 'OWASP BLT API',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    documentation: 'https://github.com/OWASP-BLT/OWASP-BLT-API',
  });
});

// API version and info
app.get('/api', (c) => {
  return c.json({
    name: 'OWASP BLT API',
    version: '1.0.0',
    description: 'REST API for OWASP Bug Logging Tool',
    endpoints: {
      issues: '/api/issues',
      users: '/api/users',
      domains: '/api/domains',
      organizations: '/api/organizations',
      leaderboard: '/api/leaderboard',
      hunts: '/api/hunts',
      stats: '/api/stats',
    },
    features: [
      'PostgreSQL backend via Neon/Hyperdrive',
      'Token-based authentication',
      'CORS support',
      'Rate limiting',
      'Pagination',
      'Comprehensive filtering and search',
    ],
  });
});

// Mount route handlers
app.route('/api/issues', issues);
app.route('/api/users', users);
app.route('/api/domains', domains);
app.route('/api/organizations', organizations);
app.route('/api/leaderboard', leaderboard);
app.route('/api/hunts', hunts);
app.route('/api/stats', stats);

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    path: c.req.path,
  }, 404);
});

// Export for Cloudflare Workers
export default app;
