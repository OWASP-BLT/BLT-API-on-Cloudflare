/**
 * Statistics API routes
 */
import { Hono } from 'hono';
import type { Env } from '../types/env';
import { getDbClient } from '../db/client';
import { HTTPException } from 'hono/http-exception';

const stats = new Hono<{ Bindings: Env }>();

/**
 * GET /api/stats - Get overall platform statistics
 */
stats.get('/', async (c) => {
  const sql = getDbClient(c.env);

  try {
    // Get all stats in parallel
    const [
      issuesResult,
      usersResult,
      domainsResult,
      huntsResult,
      organizationsResult,
      pointsResult,
    ] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM website_issue WHERE is_hidden = false`,
      sql`SELECT COUNT(*) as count FROM auth_user WHERE is_active = true`,
      sql`SELECT COUNT(*) as count FROM website_domain WHERE is_active = true`,
      sql`SELECT COUNT(*) as count FROM website_hunt WHERE is_published = true`,
      sql`SELECT COUNT(*) as count FROM website_organization WHERE is_active = true`,
      sql`SELECT COALESCE(SUM(score), 0) as total FROM website_points`,
    ]);

    const stats = {
      total_issues: parseInt(issuesResult[0]?.count || '0'),
      total_users: parseInt(usersResult[0]?.count || '0'),
      total_domains: parseInt(domainsResult[0]?.count || '0'),
      total_hunts: parseInt(huntsResult[0]?.count || '0'),
      total_organizations: parseInt(organizationsResult[0]?.count || '0'),
      total_points_awarded: parseInt(pointsResult[0]?.total || '0'),
    };

    // Get recent activity
    const recentIssues = await sql`
      SELECT COUNT(*) as count
      FROM website_issue
      WHERE created >= NOW() - INTERVAL '7 days'
      AND is_hidden = false
    `;

    const recentUsers = await sql`
      SELECT COUNT(*) as count
      FROM auth_user
      WHERE date_joined >= NOW() - INTERVAL '7 days'
    `;

    stats['issues_this_week'] = parseInt(recentIssues[0]?.count || '0');
    stats['new_users_this_week'] = parseInt(recentUsers[0]?.count || '0');

    return c.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw new HTTPException(500, { message: 'Failed to fetch statistics' });
  }
});

/**
 * GET /api/stats/activity - Get recent activity statistics
 */
stats.get('/activity', async (c) => {
  const sql = getDbClient(c.env);
  const days = parseInt(c.req.query('days') || '30');

  try {
    const query = `
      SELECT 
        DATE(created) as date,
        COUNT(*) as issues_count
      FROM website_issue
      WHERE created >= NOW() - INTERVAL '${days} days'
      AND is_hidden = false
      GROUP BY DATE(created)
      ORDER BY date DESC
    `;

    const result = await sql(query);

    return c.json({
      period_days: days,
      activity: result,
    });
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    throw new HTTPException(500, { message: 'Failed to fetch activity statistics' });
  }
});

/**
 * GET /api/stats/issues-by-label - Get issue count grouped by label
 */
stats.get('/issues-by-label', async (c) => {
  const sql = getDbClient(c.env);

  try {
    const query = `
      SELECT 
        label,
        COUNT(*) as count,
        CASE label
          WHEN 0 THEN 'General'
          WHEN 1 THEN 'Number Error'
          WHEN 2 THEN 'Functional'
          WHEN 3 THEN 'Performance'
          WHEN 4 THEN 'Security'
          WHEN 5 THEN 'Typo'
          WHEN 6 THEN 'Design'
          WHEN 7 THEN 'Server Down'
          WHEN 8 THEN 'Trademark Squatting'
          ELSE 'Unknown'
        END as label_name
      FROM website_issue
      WHERE is_hidden = false
      GROUP BY label
      ORDER BY count DESC
    `;

    const result = await sql(query);

    return c.json({
      labels: result,
    });
  } catch (error) {
    console.error('Error fetching label stats:', error);
    throw new HTTPException(500, { message: 'Failed to fetch label statistics' });
  }
});

/**
 * GET /api/stats/top-domains - Get top domains by issue count
 */
stats.get('/top-domains', async (c) => {
  const sql = getDbClient(c.env);
  const limit = Math.min(parseInt(c.req.query('limit') || '10'), 50);

  try {
    const query = `
      SELECT 
        d.id,
        d.name,
        d.url,
        d.logo,
        COUNT(i.id) as issue_count,
        COUNT(CASE WHEN i.status = 'open' THEN 1 END) as open_issues,
        COUNT(CASE WHEN i.status = 'closed' THEN 1 END) as closed_issues
      FROM website_domain d
      INNER JOIN website_issue i ON d.id = i.domain_id
      WHERE d.is_active = true AND i.is_hidden = false
      GROUP BY d.id, d.name, d.url, d.logo
      ORDER BY issue_count DESC
      LIMIT ${limit}
    `;

    const result = await sql(query);

    return c.json({
      top_domains: result,
    });
  } catch (error) {
    console.error('Error fetching top domains:', error);
    throw new HTTPException(500, { message: 'Failed to fetch top domains' });
  }
});

export default stats;
