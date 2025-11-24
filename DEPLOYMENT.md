# Deployment Guide

This guide will help you deploy the OWASP BLT API to Cloudflare Pages (with Functions).

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Wrangler CLI**: Already included in `node_modules` via npm install
3. **PostgreSQL Database**: Set up a database (recommended: Neon, Supabase, or Hyperdrive)

## Architecture

This API is deployed as a **Cloudflare Pages project** with **Pages Functions**:
- Static assets are served from the `/public` directory
- API logic runs via Pages Functions in the `/functions` directory
- The `[[path]].ts` catch-all function routes all requests to the Hono app

## Step 1: Set Up Database

### Option A: Neon (Recommended)

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string (starts with `postgres://`)
4. Neon provides a serverless HTTP API that works great with Cloudflare Workers

### Option B: Cloudflare Hyperdrive

1. In Cloudflare dashboard, go to Workers > Hyperdrive
2. Create a new Hyperdrive configuration
3. Enter your PostgreSQL connection details
4. Get the Hyperdrive ID
5. Update `wrangler.toml`:

```toml
[[hyperdrive]]
binding = "DB"
id = "your-hyperdrive-id"
```

### Option C: Direct PostgreSQL Connection

Any PostgreSQL database with public access will work, but may have higher latency.

## Step 2: Configure Cloudflare

### Login to Cloudflare

```bash
npx wrangler login
```

### Set Environment Variables

For Pages deployments, set environment variables in the Cloudflare dashboard:
1. Go to Pages > your project > Settings > Environment variables
2. Add the following variables:
   - `DATABASE_URL` - PostgreSQL connection string
   - `JWT_SECRET` - Secret for JWT authentication (optional)
   - `ALLOWED_ORIGINS` - Comma-separated list of allowed origins for CORS

Alternatively, use Wrangler CLI for Pages:

```bash
# Set environment variables for Pages
npx wrangler pages secret put DATABASE_URL --project-name=owasp-blt-api
npx wrangler pages secret put JWT_SECRET --project-name=owasp-blt-api
npx wrangler pages secret put ALLOWED_ORIGINS --project-name=owasp-blt-api
```

## Step 3: Configure wrangler.toml

The `wrangler.toml` is pre-configured for Pages deployment:

```toml
name = "owasp-blt-api"
compatibility_date = "2024-11-15"
compatibility_flags = ["nodejs_compat"]

# Pages build output directory
pages_build_output_dir = "./public"

[vars]
ENVIRONMENT = "production"
```

Key points:
- `pages_build_output_dir` tells Cloudflare where static assets are located
- The `/functions` directory contains the API logic
- No `main` field needed (that's for Workers-only deployments)

## Step 4: Deploy

### Option A: Deploy via Git (Recommended)

1. Push your code to GitHub/GitLab
2. In Cloudflare dashboard, go to Pages > Create a project
3. Connect your repository
4. Configure build settings:
   - Build command: (leave empty)
   - Build output directory: `public`
5. Set environment variables in the dashboard
6. Deploy!

### Option B: Deploy via Wrangler CLI

```bash
# Type check before deploying
npm run type-check

# Deploy to Cloudflare Pages
npx wrangler pages deploy ./public --project-name=owasp-blt-api
```

After successful deployment, you'll see your Pages URL:
```
✨ Deployment complete!
  https://owasp-blt-api.pages.dev
  https://<branch>.<project>.pages.dev
```

## Step 5: Test Deployment

Test your deployment:

```bash
# Health check
curl https://owasp-blt-api.your-subdomain.workers.dev/

# API info
curl https://owasp-blt-api.your-subdomain.workers.dev/api

# Get stats
curl https://owasp-blt-api.your-subdomain.workers.dev/api/stats
```

## Step 6: Custom Domain (Optional)

### Using Cloudflare DNS

1. In Cloudflare dashboard, go to Workers > your worker
2. Click "Add Custom Domain"
3. Enter your domain (e.g., `api.blt.owasp.org`)
4. Cloudflare will automatically configure DNS

### Using Routes

Add to `wrangler.toml`:

```toml
routes = [
  { pattern = "api.yourdomain.com/*", custom_domain = true }
]
```

## Monitoring and Logs

### View Logs

```bash
# Tail logs in real-time
npx wrangler tail
```

### Cloudflare Dashboard

1. Go to Workers > your worker
2. Click "Metrics" to view:
   - Request volume
   - Error rate
   - CPU time
   - Duration

### Set Up Alerts

1. In Cloudflare dashboard, go to Notifications
2. Create alerts for:
   - High error rate
   - CPU time limit approaching
   - Request volume spikes

## Performance Optimization

### Enable Caching

Add caching headers in routes that serve static data:

```typescript
c.res.headers.set('Cache-Control', 'public, max-age=300');
```

### Use Hyperdrive

For the best database performance, use Cloudflare Hyperdrive which provides:
- Connection pooling
- Query caching
- Reduced latency

### Monitor Database Performance

- Use Neon's dashboard to monitor query performance
- Add database indexes for frequently queried fields
- Use `EXPLAIN ANALYZE` for slow queries

## Scaling Considerations

Cloudflare Workers automatically scale, but consider:

1. **Database Connections**: Use connection pooling (Hyperdrive or Neon)
2. **Rate Limiting**: Already implemented, adjust limits in `src/middleware/rate-limit.ts`
3. **Caching**: Implement caching for frequently accessed data
4. **Database Replicas**: Use read replicas for high traffic

## Rollback

If you need to rollback to a previous version:

```bash
# List deployments
npx wrangler deployments list

# Rollback to a specific deployment
npx wrangler rollback <deployment-id>
```

## Troubleshooting

### Database Connection Issues

- Verify DATABASE_URL secret is set correctly
- Check database allows connections from Cloudflare IPs
- Test connection string locally first

### CORS Issues

- Verify ALLOWED_ORIGINS is set
- Check that origins don't have trailing slashes
- Test with `curl -H "Origin: https://yourdomain.com"`

### Rate Limiting Too Aggressive

- Adjust limits in `src/middleware/rate-limit.ts`
- Consider using Cloudflare's built-in rate limiting

### High CPU Time

- Review database queries for efficiency
- Add indexes to frequently queried fields
- Consider caching expensive operations

## Security Checklist

- [ ] DATABASE_URL is set as a secret (not in wrangler.toml)
- [ ] ALLOWED_ORIGINS is configured for production domains
- [ ] Rate limiting is enabled and configured
- [ ] Authentication tokens are validated
- [ ] HTTPS only (automatic with Cloudflare)
- [ ] Error messages don't leak sensitive information

## Support

For deployment issues:
- Check [Cloudflare Workers docs](https://developers.cloudflare.com/workers/)
- Check [Wrangler docs](https://developers.cloudflare.com/workers/wrangler/)
- Open an issue on [GitHub](https://github.com/OWASP-BLT/OWASP-BLT-API/issues)
