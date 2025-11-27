# OWASP BLT API

A full-featured REST API for the [OWASP Bug Logging Tool (BLT)](https://github.com/OWASP-BLT/BLT) project, designed to run efficiently on Cloudflare Workers with PostgreSQL backend.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OWASP-BLT/BLT-API-on-Cloudflare)

## Features

- 🚀 **Cloudflare Workers** - Edge-optimized for global low-latency access
- 🗄️ **PostgreSQL Backend** - Compatible with Neon, Hyperdrive, and standard PostgreSQL
- 🔐 **Token Authentication** - Django REST Framework compatible authentication
- 🛡️ **Security** - CORS support, rate limiting, and secure database connections
- 📄 **Comprehensive API** - Full coverage of BLT features including:
  - Issues/Bugs management
  - User profiles and authentication
  - Domains and organizations
  - Bug bounty hunts
  - Leaderboards (global, monthly, organization)
  - Statistics and analytics
  - Points and rewards system
- ⚡ **Performance** - Optimized queries with pagination and efficient database access
- 📱 **RESTful** - Clean, intuitive REST API design

## Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account (for deployment)
- PostgreSQL database (Neon, Supabase, or any PostgreSQL instance)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .dev.vars

# Configure your database connection
# Edit .dev.vars with your DATABASE_URL and other settings
```

### Development

```bash
# Start local development server
npm run dev

# Access the API at http://localhost:8787
```

### Deployment

```bash
# Deploy to Cloudflare Workers
npm run deploy

# Set production secrets
wrangler secret put DATABASE_URL
wrangler secret put JWT_SECRET
wrangler secret put ALLOWED_ORIGINS
```

## Configuration

### Environment Variables

Configure these in `.dev.vars` for local development or as Cloudflare secrets for production:

- `DATABASE_URL` - PostgreSQL connection string (required)
- `JWT_SECRET` - Secret key for JWT tokens (optional, if using JWT)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins (default: *)
- `ENVIRONMENT` - Environment name (development/production)

### Database Setup

This API is designed to work with the existing OWASP BLT Django PostgreSQL database. No schema changes are required.

For optimal performance on Cloudflare Workers, consider using:
- **Neon** - Serverless PostgreSQL with HTTP API
- **Cloudflare Hyperdrive** - Connection pooling for PostgreSQL
- **Supabase** - PostgreSQL with built-in API features

## API Documentation

### Base URL

```
https://your-worker.workers.dev/api
```

### Authentication

Most endpoints support optional authentication using Django REST Framework tokens:

```
Authorization: Token <your-token>
```

### Endpoints

#### Issues

- `GET /api/issues` - List all issues (with pagination, filtering)
- `GET /api/issues/:id` - Get issue details
- `POST /api/issues/:id/like` - Like/unlike an issue (auth required)
- `POST /api/issues/:id/flag` - Flag/unflag an issue (auth required)

**Query Parameters:**
- `page` - Page number (default: 1)
- `per_page` - Results per page (default: 20, max: 100)
- `status` - Filter by status (open/closed)
- `domain` - Filter by domain URL
- `search` - Search in description and URL

#### Users

- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile (auth required, own profile only)
- `GET /api/users/:id/issues` - Get user's issues
- `GET /api/users/:id/points` - Get user's points history

#### Domains

- `GET /api/domains` - List all domains
- `GET /api/domains/:id` - Get domain details
- `GET /api/domains/:id/issues` - Get issues for a domain

#### Organizations

- `GET /api/organizations` - List all organizations
- `GET /api/organizations/:id` - Get organization details
- `GET /api/organizations/:id/repositories` - Get organization repositories
- `GET /api/organizations/:id/members` - Get organization members

#### Leaderboard

- `GET /api/leaderboard` - Get global leaderboard
  - Query params: `type=users|organizations`, `month`, `year`
- `GET /api/leaderboard/monthly` - Get monthly winners by year

#### Bug Hunts

- `GET /api/hunts` - List all bug hunts
  - Query params: `filter=active|upcoming|previous`, `search`
- `GET /api/hunts/:id` - Get hunt details
- `GET /api/hunts/:id/issues` - Get issues for a hunt

#### Statistics

- `GET /api/stats` - Get overall platform statistics
- `GET /api/stats/activity` - Get recent activity statistics
- `GET /api/stats/issues-by-label` - Get issue count by label
- `GET /api/stats/top-domains` - Get top domains by issue count

### Response Format

All API responses follow this format:

**Success Response:**
```json
{
  "count": 100,
  "next": "/api/issues?page=2",
  "previous": null,
  "results": [...]
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "details": "Additional details if available"
}
```

### Rate Limiting

Default rate limits:
- 100 requests per minute per IP

Rate limit headers:
- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Unix timestamp when limit resets

## Architecture

### Tech Stack

- **Runtime:** Cloudflare Workers (V8 isolates)
- **Framework:** Hono (lightweight web framework)
- **Database:** PostgreSQL via @neondatabase/serverless
- **Language:** TypeScript
- **Validation:** Zod

### Project Structure

```
src/
├── index.ts              # Main application entry
├── types/
│   ├── env.ts           # Environment types
│   └── models.ts        # Database model types
├── middleware/
│   ├── auth.ts          # Authentication middleware
│   ├── cors.ts          # CORS middleware
│   ├── error-handler.ts # Error handling
│   └── rate-limit.ts    # Rate limiting
├── routes/
│   ├── issues.ts        # Issues endpoints
│   ├── users.ts         # Users endpoints
│   ├── domains.ts       # Domains endpoints
│   ├── organizations.ts # Organizations endpoints
│   ├── leaderboard.ts   # Leaderboard endpoints
│   ├── hunts.ts         # Bug hunts endpoints
│   └── stats.ts         # Statistics endpoints
└── db/
    └── client.ts        # Database connection
```

## Performance Considerations

- **Edge Deployment** - Runs on Cloudflare's global network for low latency
- **Connection Pooling** - Efficient database connections via Neon or Hyperdrive
- **Pagination** - All list endpoints support pagination to limit data transfer
- **Query Optimization** - Indexed queries and efficient JOIN operations
- **Rate Limiting** - Prevents abuse and ensures fair usage
- **Caching Headers** - Appropriate cache headers for static data

## Contributing

Contributions are welcome! Please see the main [OWASP BLT project](https://github.com/OWASP-BLT/BLT) for contribution guidelines.

## License

MIT License - see LICENSE file for details

## Support

- **Issues:** [GitHub Issues](https://github.com/OWASP-BLT/OWASP-BLT-API/issues)
- **Main Project:** [OWASP BLT](https://github.com/OWASP-BLT/BLT)
- **OWASP:** [OWASP Foundation](https://owasp.org/)

## Related Projects

- [OWASP BLT](https://github.com/OWASP-BLT/BLT) - Main Django application
- [BLT Flutter](https://github.com/OWASP-BLT/BLT-Flutter) - Mobile app
- [BLT Chrome Extension](https://github.com/OWASP-BLT/BLT-Extension) - Browser extension 
