// Cloudflare Pages Function - catch-all route
// This file exports the main application handler for all routes
import app from '../src/index';

// Export the Hono app as a Pages Function
export const onRequest = app.fetch;
