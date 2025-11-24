/**
 * Issues API routes
 */
import { Hono } from 'hono';
import type { Env } from '../types/env';
import { getDbClient } from '../db/client';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { HTTPException } from 'hono/http-exception';

const issues = new Hono<{ Bindings: Env }>();

/**
 * GET /api/issues - List all issues with pagination
 */
issues.get('/', optionalAuthMiddleware, async (c) => {
  const sql = getDbClient(c.env);
  const user = c.get('user');
  
  // Pagination parameters
  const page = parseInt(c.req.query('page') || '1');
  const perPage = Math.min(parseInt(c.req.query('per_page') || '20'), 100);
  const offset = (page - 1) * perPage;
  
  // Filter parameters
  const status = c.req.query('status');
  const domainUrl = c.req.query('domain');
  const search = c.req.query('search');

  try {
    let whereConditions = user 
      ? `(i.is_hidden = false OR i.user_id = ${user.id})`
      : 'i.is_hidden = false';
    
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      whereConditions += ` AND i.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (domainUrl) {
      whereConditions += ` AND d.url ILIKE $${paramIndex}`;
      params.push(`%${domainUrl}%`);
      paramIndex++;
    }

    if (search) {
      whereConditions += ` AND (i.description ILIKE $${paramIndex} OR i.url ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count
      FROM website_issue i
      LEFT JOIN website_domain d ON i.domain_id = d.id
      WHERE ${whereConditions}
    `;
    
    const countResult = await sql(countQuery, params);
    const totalCount = parseInt(countResult[0]?.count || '0');

    // Get issues
    const issuesQuery = `
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
        i.views,
        i.rewarded,
        i.cve_id,
        i.cve_score,
        u.id as user_id,
        u.username as user_username,
        d.id as domain_id,
        d.name as domain_name,
        d.url as domain_url,
        h.id as hunt_id,
        h.name as hunt_name
      FROM website_issue i
      LEFT JOIN auth_user u ON i.user_id = u.id
      LEFT JOIN website_domain d ON i.domain_id = d.id
      LEFT JOIN website_hunt h ON i.hunt_id = h.id
      WHERE ${whereConditions}
      ORDER BY i.created DESC
      LIMIT ${perPage} OFFSET ${offset}
    `;

    const issuesResult = await sql(issuesQuery, params);

    return c.json({
      count: totalCount,
      next: totalCount > offset + perPage ? `/api/issues?page=${page + 1}&per_page=${perPage}` : null,
      previous: page > 1 ? `/api/issues?page=${page - 1}&per_page=${perPage}` : null,
      results: issuesResult,
    });
  } catch (error) {
    console.error('Error fetching issues:', error);
    throw new HTTPException(500, { message: 'Failed to fetch issues' });
  }
});

/**
 * GET /api/issues/:id - Get single issue details
 */
issues.get('/:id', optionalAuthMiddleware, async (c) => {
  const sql = getDbClient(c.env);
  const user = c.get('user');
  const issueId = parseInt(c.req.param('id'));

  try {
    const whereClause = user
      ? `(i.is_hidden = false OR i.user_id = ${user.id}) AND i.id = ${issueId}`
      : `i.is_hidden = false AND i.id = ${issueId}`;

    const query = `
      SELECT 
        i.*,
        u.id as user_id,
        u.username as user_username,
        u.email as user_email,
        d.id as domain_id,
        d.name as domain_name,
        d.url as domain_url,
        h.id as hunt_id,
        h.name as hunt_name,
        cb.id as closed_by_id,
        cb.username as closed_by_username,
        (SELECT COUNT(*) FROM website_userprofile_issue_upvoted WHERE issue_id = i.id) as upvotes,
        (SELECT COUNT(*) FROM website_userprofile_issue_flaged WHERE issue_id = i.id) as flags
      FROM website_issue i
      LEFT JOIN auth_user u ON i.user_id = u.id
      LEFT JOIN website_domain d ON i.domain_id = d.id
      LEFT JOIN website_hunt h ON i.hunt_id = h.id
      LEFT JOIN auth_user cb ON i.closed_by_id = cb.id
      WHERE ${whereClause}
    `;

    const result = await sql(query);

    if (!result || result.length === 0) {
      throw new HTTPException(404, { message: 'Issue not found' });
    }

    // Get screenshots
    const screenshots = await sql`
      SELECT image FROM website_issuescreenshot
      WHERE issue_id = ${issueId}
      ORDER BY created ASC
    `;

    // Get tags
    const tags = await sql`
      SELECT t.id, t.name, t.slug
      FROM website_tag t
      INNER JOIN website_issue_tags it ON t.id = it.tag_id
      WHERE it.issue_id = ${issueId}
    `;

    // Check if user has upvoted/flagged (if authenticated)
    let isUpvoted = false;
    let isFlagged = false;
    if (user) {
      const upvoteCheck = await sql`
        SELECT 1 FROM website_userprofile_issue_upvoted
        WHERE userprofile_id = (SELECT id FROM website_userprofile WHERE user_id = ${user.id})
        AND issue_id = ${issueId}
        LIMIT 1
      `;
      isUpvoted = upvoteCheck.length > 0;

      const flagCheck = await sql`
        SELECT 1 FROM website_userprofile_issue_flaged
        WHERE userprofile_id = (SELECT id FROM website_userprofile WHERE user_id = ${user.id})
        AND issue_id = ${issueId}
        LIMIT 1
      `;
      isFlagged = flagCheck.length > 0;
    }

    const issue = result[0];

    return c.json({
      ...issue,
      screenshots: screenshots.map(s => s.image),
      tags,
      is_upvoted: isUpvoted,
      is_flagged: isFlagged,
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Error fetching issue:', error);
    throw new HTTPException(500, { message: 'Failed to fetch issue' });
  }
});

/**
 * POST /api/issues/:id/like - Like/unlike an issue
 */
issues.post('/:id/like', authMiddleware, async (c) => {
  const sql = getDbClient(c.env);
  const user = c.get('user');
  const issueId = parseInt(c.req.param('id'));

  try {
    // Get user profile
    const profileResult = await sql`
      SELECT id FROM website_userprofile WHERE user_id = ${user.id}
    `;

    if (!profileResult || profileResult.length === 0) {
      throw new HTTPException(404, { message: 'User profile not found' });
    }

    const profileId = profileResult[0].id;

    // Check if already liked
    const existing = await sql`
      SELECT 1 FROM website_userprofile_issue_upvoted
      WHERE userprofile_id = ${profileId} AND issue_id = ${issueId}
    `;

    if (existing.length > 0) {
      // Unlike
      await sql`
        DELETE FROM website_userprofile_issue_upvoted
        WHERE userprofile_id = ${profileId} AND issue_id = ${issueId}
      `;
      return c.json({ message: 'Issue unliked', liked: false });
    } else {
      // Like
      await sql`
        INSERT INTO website_userprofile_issue_upvoted (userprofile_id, issue_id)
        VALUES (${profileId}, ${issueId})
      `;
      return c.json({ message: 'Issue liked', liked: true });
    }
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Error toggling like:', error);
    throw new HTTPException(500, { message: 'Failed to toggle like' });
  }
});

/**
 * POST /api/issues/:id/flag - Flag/unflag an issue
 */
issues.post('/:id/flag', authMiddleware, async (c) => {
  const sql = getDbClient(c.env);
  const user = c.get('user');
  const issueId = parseInt(c.req.param('id'));

  try {
    // Get user profile
    const profileResult = await sql`
      SELECT id FROM website_userprofile WHERE user_id = ${user.id}
    `;

    if (!profileResult || profileResult.length === 0) {
      throw new HTTPException(404, { message: 'User profile not found' });
    }

    const profileId = profileResult[0].id;

    // Check if already flagged
    const existing = await sql`
      SELECT 1 FROM website_userprofile_issue_flaged
      WHERE userprofile_id = ${profileId} AND issue_id = ${issueId}
    `;

    if (existing.length > 0) {
      // Unflag
      await sql`
        DELETE FROM website_userprofile_issue_flaged
        WHERE userprofile_id = ${profileId} AND issue_id = ${issueId}
      `;
      return c.json({ message: 'Issue unflagged', flagged: false });
    } else {
      // Flag
      await sql`
        INSERT INTO website_userprofile_issue_flaged (userprofile_id, issue_id)
        VALUES (${profileId}, ${issueId})
      `;
      return c.json({ message: 'Issue flagged', flagged: true });
    }
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Error toggling flag:', error);
    throw new HTTPException(500, { message: 'Failed to toggle flag' });
  }
});

export default issues;
