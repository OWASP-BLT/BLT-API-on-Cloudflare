/**
 * Users API routes
 */
import { Hono } from 'hono';
import type { Env } from '../types/env';
import { getDbClient } from '../db/client';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { HTTPException } from 'hono/http-exception';

const users = new Hono<{ Bindings: Env }>();

/**
 * GET /api/users/:id - Get user profile
 */
users.get('/:id', optionalAuthMiddleware, async (c) => {
  const sql = getDbClient(c.env);
  const userId = parseInt(c.req.param('id'));

  try {
    const query = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        u.date_joined,
        up.user_avatar,
        up.title,
        up.role,
        up.description,
        up.winnings,
        up.btc_address,
        up.bch_address,
        up.eth_address,
        up.visit_count,
        up.merged_pr_count,
        up.contribution_rank,
        up.current_streak,
        up.longest_streak,
        up.x_username,
        up.linkedin_url,
        up.github_url,
        up.website_url,
        up.discounted_hourly_rate,
        o.id as team_id,
        o.name as team_name,
        o.slug as team_slug
      FROM auth_user u
      LEFT JOIN website_userprofile up ON u.id = up.user_id
      LEFT JOIN website_organization o ON up.team_id = o.id
      WHERE u.id = ${userId}
    `;

    const result = await sql(query);

    if (!result || result.length === 0) {
      throw new HTTPException(404, { message: 'User not found' });
    }

    // Get user's points total
    const pointsResult = await sql`
      SELECT COALESCE(SUM(score), 0) as total_score
      FROM website_points
      WHERE user_id = ${userId}
    `;

    // Get user's issues count
    const issuesCount = await sql`
      SELECT COUNT(*) as count
      FROM website_issue
      WHERE user_id = ${userId} AND is_hidden = false
    `;

    // Get user's badges
    const badges = await sql`
      SELECT 
        b.id,
        b.title,
        b.description,
        b.icon,
        ub.awarded_at
      FROM website_userbadge ub
      INNER JOIN website_badge b ON ub.badge_id = b.id
      WHERE ub.user_id = ${userId}
      ORDER BY ub.awarded_at DESC
    `;

    const user = result[0];

    return c.json({
      ...user,
      total_score: pointsResult[0].total_score,
      issues_count: issuesCount[0].count,
      badges,
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Error fetching user:', error);
    throw new HTTPException(500, { message: 'Failed to fetch user' });
  }
});

/**
 * PUT /api/users/:id - Update user profile (authenticated)
 */
users.put('/:id', authMiddleware, async (c) => {
  const sql = getDbClient(c.env);
  const user = c.get('user');
  const userId = parseInt(c.req.param('id'));

  // Can only update own profile
  if (user.id !== userId) {
    throw new HTTPException(403, { message: 'Cannot update another user\'s profile' });
  }

  try {
    const body = await c.req.json();
    const allowedFields = [
      'role',
      'description',
      'btc_address',
      'bch_address',
      'eth_address',
      'x_username',
      'linkedin_url',
      'github_url',
      'website_url',
      'discounted_hourly_rate',
    ];

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (field in body) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(body[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      throw new HTTPException(400, { message: 'No valid fields to update' });
    }

    // Add modified timestamp
    updates.push(`modified = CURRENT_TIMESTAMP`);

    const updateQuery = `
      UPDATE website_userprofile
      SET ${updates.join(', ')}
      WHERE user_id = ${userId}
      RETURNING *
    `;

    const result = await sql(updateQuery, values);

    if (!result || result.length === 0) {
      throw new HTTPException(404, { message: 'User profile not found' });
    }

    return c.json({
      message: 'Profile updated successfully',
      profile: result[0],
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Error updating user:', error);
    throw new HTTPException(500, { message: 'Failed to update user profile' });
  }
});

/**
 * GET /api/users/:id/issues - Get user's issues
 */
users.get('/:id/issues', optionalAuthMiddleware, async (c) => {
  const sql = getDbClient(c.env);
  const userId = parseInt(c.req.param('id'));
  const page = parseInt(c.req.query('page') || '1');
  const perPage = Math.min(parseInt(c.req.query('per_page') || '20'), 100);
  const offset = (page - 1) * perPage;

  try {
    const query = `
      SELECT 
        i.id,
        i.url,
        i.description,
        i.label,
        i.verified,
        i.score,
        i.status,
        i.screenshot,
        i.created,
        i.modified,
        d.name as domain_name,
        d.url as domain_url,
        (SELECT COUNT(*) FROM website_userprofile_issue_upvoted WHERE issue_id = i.id) as upvotes
      FROM website_issue i
      LEFT JOIN website_domain d ON i.domain_id = d.id
      WHERE i.user_id = ${userId} AND i.is_hidden = false
      ORDER BY i.created DESC
      LIMIT ${perPage} OFFSET ${offset}
    `;

    const result = await sql(query);

    const countQuery = `
      SELECT COUNT(*) as count
      FROM website_issue
      WHERE user_id = ${userId} AND is_hidden = false
    `;

    const countResult = await sql(countQuery);
    const totalCount = parseInt(countResult[0]?.count || '0');

    return c.json({
      count: totalCount,
      next: totalCount > offset + perPage ? `/api/users/${userId}/issues?page=${page + 1}&per_page=${perPage}` : null,
      previous: page > 1 ? `/api/users/${userId}/issues?page=${page - 1}&per_page=${perPage}` : null,
      results: result,
    });
  } catch (error) {
    console.error('Error fetching user issues:', error);
    throw new HTTPException(500, { message: 'Failed to fetch user issues' });
  }
});

/**
 * GET /api/users/:id/points - Get user's points history
 */
users.get('/:id/points', async (c) => {
  const sql = getDbClient(c.env);
  const userId = parseInt(c.req.param('id'));
  const page = parseInt(c.req.query('page') || '1');
  const perPage = Math.min(parseInt(c.req.query('per_page') || '20'), 100);
  const offset = (page - 1) * perPage;

  try {
    const query = `
      SELECT 
        p.id,
        p.score,
        p.reason,
        p.created,
        i.id as issue_id,
        i.description as issue_description,
        d.id as domain_id,
        d.name as domain_name
      FROM website_points p
      LEFT JOIN website_issue i ON p.issue_id = i.id
      LEFT JOIN website_domain d ON p.domain_id = d.id
      WHERE p.user_id = ${userId}
      ORDER BY p.created DESC
      LIMIT ${perPage} OFFSET ${offset}
    `;

    const result = await sql(query);

    const countQuery = `
      SELECT COUNT(*) as count
      FROM website_points
      WHERE user_id = ${userId}
    `;

    const countResult = await sql(countQuery);
    const totalCount = parseInt(countResult[0]?.count || '0');

    return c.json({
      count: totalCount,
      next: totalCount > offset + perPage ? `/api/users/${userId}/points?page=${page + 1}&per_page=${perPage}` : null,
      previous: page > 1 ? `/api/users/${userId}/points?page=${page - 1}&per_page=${perPage}` : null,
      results: result,
    });
  } catch (error) {
    console.error('Error fetching user points:', error);
    throw new HTTPException(500, { message: 'Failed to fetch user points' });
  }
});

export default users;
