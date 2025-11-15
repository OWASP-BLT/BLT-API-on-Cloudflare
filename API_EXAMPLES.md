# API Usage Examples

This document provides practical examples of using the OWASP BLT API.

## Base URL

Replace `<API_URL>` with your deployed worker URL:
- Local: `http://localhost:8787`
- Production: `https://owasp-blt-api.your-subdomain.workers.dev`

## Authentication

Most endpoints work without authentication, but some require it. To authenticate, include your token in the header:

```bash
curl -H "Authorization: Token <your-token>" <API_URL>/api/users/1
```

## Issues API

### List All Issues

```bash
# Get first page of issues
curl <API_URL>/api/issues

# Get specific page with custom page size
curl "<API_URL>/api/issues?page=2&per_page=50"

# Filter by status
curl "<API_URL>/api/issues?status=open"

# Search issues
curl "<API_URL>/api/issues?search=xss"

# Filter by domain
curl "<API_URL>/api/issues?domain=example.com"
```

### Get Single Issue

```bash
curl <API_URL>/api/issues/123
```

### Like an Issue (Authentication Required)

```bash
curl -X POST \
  -H "Authorization: Token <your-token>" \
  <API_URL>/api/issues/123/like
```

### Flag an Issue (Authentication Required)

```bash
curl -X POST \
  -H "Authorization: Token <your-token>" \
  <API_URL>/api/issues/123/flag
```

## Users API

### Get User Profile

```bash
curl <API_URL>/api/users/1
```

### Update Profile (Authentication Required)

```bash
curl -X PUT \
  -H "Authorization: Token <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Security researcher and bug bounty hunter",
    "github_url": "https://github.com/username",
    "btc_address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
  }' \
  <API_URL>/api/users/1
```

### Get User's Issues

```bash
curl <API_URL>/api/users/1/issues
```

### Get User's Points History

```bash
curl <API_URL>/api/users/1/points
```

## Domains API

### List All Domains

```bash
# Get all domains
curl <API_URL>/api/domains

# Search domains
curl "<API_URL>/api/domains?search=example"
```

### Get Domain Details

```bash
curl <API_URL>/api/domains/1
```

### Get Issues for a Domain

```bash
# All issues
curl <API_URL>/api/domains/1/issues

# Open issues only
curl "<API_URL>/api/domains/1/issues?status=open"
```

## Organizations API

### List Organizations

```bash
# All organizations
curl <API_URL>/api/organizations

# Search organizations
curl "<API_URL>/api/organizations?search=owasp"
```

### Get Organization Details

```bash
curl <API_URL>/api/organizations/1
```

### Get Organization Repositories

```bash
curl <API_URL>/api/organizations/1/repositories
```

### Get Organization Members

```bash
curl <API_URL>/api/organizations/1/members
```

## Leaderboard API

### Global Leaderboard

```bash
# Current global leaderboard
curl <API_URL>/api/leaderboard

# With pagination
curl "<API_URL>/api/leaderboard?page=1&per_page=50"

# Filter by time period
curl "<API_URL>/api/leaderboard?year=2024&month=11"

# Organization leaderboard
curl "<API_URL>/api/leaderboard?type=organizations"
```

### Monthly Leaderboard

```bash
# Get monthly winners for 2024
curl "<API_URL>/api/leaderboard/monthly?year=2024"
```

## Bug Hunts API

### List Hunts

```bash
# All published hunts
curl <API_URL>/api/hunts

# Active hunts only
curl "<API_URL>/api/hunts?filter=active"

# Upcoming hunts
curl "<API_URL>/api/hunts?filter=upcoming"

# Previous hunts
curl "<API_URL>/api/hunts?filter=previous"

# Search hunts
curl "<API_URL>/api/hunts?search=web security"
```

### Get Hunt Details

```bash
curl <API_URL>/api/hunts/1
```

### Get Hunt Issues

```bash
curl <API_URL>/api/hunts/1/issues
```

## Statistics API

### Platform Statistics

```bash
# Overall stats
curl <API_URL>/api/stats
```

**Response:**
```json
{
  "total_issues": 1234,
  "total_users": 567,
  "total_domains": 89,
  "total_hunts": 12,
  "total_organizations": 45,
  "total_points_awarded": 56789,
  "issues_this_week": 23,
  "new_users_this_week": 5
}
```

### Activity Statistics

```bash
# Last 30 days
curl <API_URL>/api/stats/activity

# Last 7 days
curl "<API_URL>/api/stats/activity?days=7"

# Last 90 days
curl "<API_URL>/api/stats/activity?days=90"
```

### Issues by Label

```bash
curl <API_URL>/api/stats/issues-by-label
```

**Response:**
```json
{
  "labels": [
    {
      "label": 4,
      "label_name": "Security",
      "count": 456
    },
    {
      "label": 2,
      "label_name": "Functional",
      "count": 234
    }
  ]
}
```

### Top Domains

```bash
# Top 10 domains
curl <API_URL>/api/stats/top-domains

# Top 20 domains
curl "<API_URL>/api/stats/top-domains?limit=20"
```

## JavaScript/TypeScript Examples

### Using Fetch API

```javascript
// Get issues
async function getIssues() {
  const response = await fetch('https://api-url/api/issues');
  const data = await response.json();
  console.log(data);
}

// Get user with authentication
async function getUser(userId, token) {
  const response = await fetch(`https://api-url/api/users/${userId}`, {
    headers: {
      'Authorization': `Token ${token}`
    }
  });
  const data = await response.json();
  return data;
}

// Like an issue
async function likeIssue(issueId, token) {
  const response = await fetch(`https://api-url/api/issues/${issueId}/like`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${token}`
    }
  });
  const data = await response.json();
  return data;
}
```

### Using Axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api-url/api',
  headers: {
    'Authorization': `Token ${your_token}`
  }
});

// Get leaderboard
const leaderboard = await api.get('/leaderboard');
console.log(leaderboard.data);

// Update profile
const profile = await api.put('/users/1', {
  description: 'Updated description',
  github_url: 'https://github.com/username'
});
console.log(profile.data);
```

## Python Examples

### Using requests

```python
import requests

API_URL = 'https://api-url/api'
TOKEN = 'your-token-here'

# Get issues
response = requests.get(f'{API_URL}/issues')
issues = response.json()
print(issues)

# Get user with auth
headers = {'Authorization': f'Token {TOKEN}'}
response = requests.get(f'{API_URL}/users/1', headers=headers)
user = response.json()
print(user)

# Like an issue
response = requests.post(
    f'{API_URL}/issues/123/like',
    headers=headers
)
result = response.json()
print(result)

# Get leaderboard with filters
params = {'year': 2024, 'month': 11}
response = requests.get(f'{API_URL}/leaderboard', params=params)
leaderboard = response.json()
print(leaderboard)
```

## React Example

```jsx
import { useState, useEffect } from 'react';

function IssuesList() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://api-url/api/issues')
      .then(res => res.json())
      .then(data => {
        setIssues(data.results);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Issues</h1>
      {issues.map(issue => (
        <div key={issue.id}>
          <h3>{issue.description}</h3>
          <p>Status: {issue.status}</p>
          <p>Upvotes: {issue.upvotes}</p>
        </div>
      ))}
    </div>
  );
}
```

## Error Handling

All endpoints return standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

Example error response:

```json
{
  "error": "Not Found",
  "message": "The requested resource does not exist"
}
```

## Rate Limiting

The API has rate limiting enabled. Headers indicate your current status:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699564800
```

When rate limited, you'll receive a 429 response:

```json
{
  "error": "Too many requests. Please try again later."
}
```

## Best Practices

1. **Use pagination** - Don't request all data at once
2. **Cache responses** - Cache data that doesn't change frequently
3. **Handle errors** - Always handle potential errors gracefully
4. **Respect rate limits** - Implement exponential backoff when rate limited
5. **Use HTTPS** - Always use HTTPS in production
6. **Authenticate when needed** - Only send tokens when required
7. **Validate input** - Validate and sanitize all user input before sending
