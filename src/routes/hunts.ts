/**
 * Bug Hunts API routes
 */
import { Hono } from 'hono';
import type { Env } from '../types/env';
import { getDbClient } from '../db/client';
import { HTTPException } from 'hono/http-exception';

const hunts = new Hono<{ Bindings: Env }>();

/**
 * GET /api/hunts - List all hunts
 */
hunts.get('/', async (c) => {
  const sql = getDbClient(c.env);
  const page = parseInt(c.req.query('page') || '1');
  const perPage = Math.min(parseInt(c.req.query('per_page') || '20'), 100);
  const offset = (page - 1) * perPage;
  const filter = c.req.query('filter'); // 'active', 'upcoming', 'previous'
  const search = c.req.query('search');

  try {
    let whereClause = 'h.is_published = true';
    const params: any[] = [];
    let paramIndex = 1;

    const now = new Date().toISOString();

    if (filter === 'active') {
      whereClause += ` AND h.starts_on <= '${now}' AND h.end_on >= '${now}'`;
    } else if (filter === 'upcoming') {
      whereClause += ` AND h.starts_on > '${now}'`;
    } else if (filter === 'previous') {
      whereClause += ` AND h.end_on < '${now}'`;
    }

    if (search) {
      whereClause += ` AND h.name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countQuery = `
      SELECT COUNT(*) as count
      FROM website_hunt h
      WHERE ${whereClause}
    `;

    const countResult = await sql(countQuery, params);
    const totalCount = parseInt(countResult[0]?.count || '0');

    const query = `
      SELECT 
        h.id,
        h.name,
        h.description,
        h.url,
        h.prize,
        h.prize_winner,
        h.prize_runner,
        h.prize_second_runner,
        h.logo,
        h.banner,
        h.plan,
        h.color,
        h.created,
        h.starts_on,
        h.end_on,
        h.result_published,
        d.id as domain_id,
        d.name as domain_name,
        d.url as domain_url,
        (SELECT COUNT(*) FROM website_issue WHERE hunt_id = h.id AND is_hidden = false) as issue_count
      FROM website_hunt h
      INNER JOIN website_domain d ON h.domain_id = d.id
      WHERE ${whereClause}
      ORDER BY 
        CASE 
          WHEN h.end_on >= '${now}' THEN 0
          ELSE 1
        END,
        h.end_on DESC
      LIMIT ${perPage} OFFSET ${offset}
    `;

    const result = await sql(query, params);

    // Get prizes for each hunt
    const huntsWithPrizes = await Promise.all(
      result.map(async (hunt: any) => {
        const prizes = await sql`
          SELECT 
            id,
            name,
            value,
            no_of_eligible_projects,
            valid_submissions_eligible,
            prize_in_crypto,
            description
          FROM website_huntprize
          WHERE hunt_id = ${hunt.id}
          ORDER BY value DESC
        `;
        return {
          ...hunt,
          prizes,
        };
      })
    );

    return c.json({
      count: totalCount,
      next: totalCount > offset + perPage ? `/api/hunts?page=${page + 1}&per_page=${perPage}` : null,
      previous: page > 1 ? `/api/hunts?page=${page - 1}&per_page=${perPage}` : null,
      results: huntsWithPrizes,
    });
  } catch (error) {
    console.error('Error fetching hunts:', error);
    throw new HTTPException(500, { message: 'Failed to fetch hunts' });
  }
});

/**
 * GET /api/hunts/:id - Get hunt details
 */
hunts.get('/:id', async (c) => {
  const sql = getDbClient(c.env);
  const huntId = parseInt(c.req.param('id'));

  try {
    const query = `
      SELECT 
        h.*,
        d.id as domain_id,
        d.name as domain_name,
        d.url as domain_url,
        d.logo as domain_logo,
        (SELECT COUNT(*) FROM website_issue WHERE hunt_id = h.id AND is_hidden = false) as issue_count,
        (SELECT COUNT(DISTINCT user_id) FROM website_issue WHERE hunt_id = h.id AND is_hidden = false) as participant_count
      FROM website_hunt h
      INNER JOIN website_domain d ON h.domain_id = d.id
      WHERE h.id = ${huntId}
    `;

    const result = await sql(query);

    if (!result || result.length === 0) {
      throw new HTTPException(404, { message: 'Hunt not found' });
    }

    // Get prizes
    const prizes = await sql`
      SELECT 
        id,
        name,
        value,
        no_of_eligible_projects,
        valid_submissions_eligible,
        prize_in_crypto,
        description,
        created
      FROM website_huntprize
      WHERE hunt_id = ${huntId}
      ORDER BY value DESC
    `;

    // Get leaderboard for this hunt
    const leaderboard = await sql`
      SELECT 
        u.id,
        u.username,
        up.user_avatar,
        COUNT(i.id) as issue_count,
        COALESCE(SUM(i.score), 0) as total_score
      FROM website_issue i
      INNER JOIN auth_user u ON i.user_id = u.id
      INNER JOIN website_userprofile up ON u.id = up.user_id
      WHERE i.hunt_id = ${huntId} AND i.is_hidden = false
      GROUP BY u.id, u.username, up.user_avatar
      ORDER BY total_score DESC, issue_count DESC
      LIMIT 10
    `;

    return c.json({
      ...result[0],
      prizes,
      leaderboard,
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Error fetching hunt:', error);
    throw new HTTPException(500, { message: 'Failed to fetch hunt' });
  }
});

/**
 * GET /api/hunts/:id/issues - Get issues for a hunt
 */
hunts.get('/:id/issues', async (c) => {
  const sql = getDbClient(c.env);
  const huntId = parseInt(c.req.param('id'));
  const page = parseInt(c.req.query('page') || '1');
  const perPage = Math.min(parseInt(c.req.query('per_page') || '20'), 100);
  const offset = (page - 1) * perPage;

  try {
    const countQuery = `
      SELECT COUNT(*) as count
      FROM website_issue
      WHERE hunt_id = ${huntId} AND is_hidden = false
    `;

    const countResult = await sql(countQuery);
    const totalCount = parseInt(countResult[0]?.count || '0');

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
        u.id as user_id,
        u.username as user_username,
        up.user_avatar,
        (SELECT COUNT(*) FROM website_userprofile_issue_upvoted WHERE issue_id = i.id) as upvotes
      FROM website_issue i
      LEFT JOIN auth_user u ON i.user_id = u.id
      LEFT JOIN website_userprofile up ON u.id = up.user_id
      WHERE i.hunt_id = ${huntId} AND i.is_hidden = false
      ORDER BY i.created DESC
      LIMIT ${perPage} OFFSET ${offset}
    `;

    const result = await sql(query);

    return c.json({
      count: totalCount,
      next: totalCount > offset + perPage ? `/api/hunts/${huntId}/issues?page=${page + 1}&per_page=${perPage}` : null,
      previous: page > 1 ? `/api/hunts/${huntId}/issues?page=${page - 1}&per_page=${perPage}` : null,
      results: result,
    });
  } catch (error) {
    console.error('Error fetching hunt issues:', error);
    throw new HTTPException(500, { message: 'Failed to fetch hunt issues' });
  }
});

export default hunts;
