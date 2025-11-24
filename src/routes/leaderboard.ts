/**
 * Leaderboard API routes
 */
import { Hono } from 'hono';
import type { Env } from '../types/env';
import { getDbClient } from '../db/client';
import { HTTPException } from 'hono/http-exception';

const leaderboard = new Hono<{ Bindings: Env }>();

/**
 * GET /api/leaderboard - Get global leaderboard
 */
leaderboard.get('/', async (c) => {
  const sql = getDbClient(c.env);
  const page = parseInt(c.req.query('page') || '1');
  const perPage = Math.min(parseInt(c.req.query('per_page') || '50'), 100);
  const offset = (page - 1) * perPage;
  const month = c.req.query('month');
  const year = c.req.query('year');
  const type = c.req.query('type') || 'users'; // 'users' or 'organizations'

  try {
    if (type === 'organizations') {
      return await getOrganizationLeaderboard(sql, page, perPage, offset);
    }

    let dateFilter = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (year && month) {
      dateFilter = `AND EXTRACT(YEAR FROM p.created) = $${paramIndex} AND EXTRACT(MONTH FROM p.created) = $${paramIndex + 1}`;
      params.push(parseInt(year), parseInt(month));
      paramIndex += 2;
    } else if (year) {
      dateFilter = `AND EXTRACT(YEAR FROM p.created) = $${paramIndex}`;
      params.push(parseInt(year));
      paramIndex++;
    }

    const query = `
      SELECT 
        u.id,
        u.username,
        up.user_avatar,
        up.title,
        COALESCE(SUM(p.score), 0) as total_score,
        COUNT(DISTINCT i.id) FILTER (WHERE i.user_id = u.id) as issue_count,
        ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(p.score), 0) DESC) as rank
      FROM auth_user u
      INNER JOIN website_userprofile up ON u.id = up.user_id
      LEFT JOIN website_points p ON u.id = p.user_id ${dateFilter}
      LEFT JOIN website_issue i ON u.id = i.user_id AND i.is_hidden = false
      WHERE u.is_active = true
      GROUP BY u.id, u.username, up.user_avatar, up.title
      HAVING COALESCE(SUM(p.score), 0) > 0
      ORDER BY total_score DESC
      LIMIT ${perPage} OFFSET ${offset}
    `;

    const result = await sql(query, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as count
      FROM auth_user u
      INNER JOIN website_points p ON u.id = p.user_id
      WHERE u.is_active = true ${dateFilter}
    `;

    const countResult = await sql(countQuery, params);
    const totalCount = parseInt(countResult[0]?.count || '0');

    // Adjust rank for pagination
    const rankedResults = result.map((row: any, index: number) => ({
      ...row,
      rank: offset + index + 1,
    }));

    return c.json({
      count: totalCount,
      next: totalCount > offset + perPage ? `/api/leaderboard?page=${page + 1}&per_page=${perPage}` : null,
      previous: page > 1 ? `/api/leaderboard?page=${page - 1}&per_page=${perPage}` : null,
      results: rankedResults,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    throw new HTTPException(500, { message: 'Failed to fetch leaderboard' });
  }
});

async function getOrganizationLeaderboard(sql: any, page: number, perPage: number, offset: number) {
  const query = `
    SELECT 
      o.id,
      o.name,
      o.slug,
      o.logo,
      o.team_points,
      COUNT(DISTINCT i.id) as issue_count,
      COUNT(DISTINCT up.user_id) as member_count,
      ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT i.id) DESC) as rank
    FROM website_organization o
    LEFT JOIN website_domain d ON o.id = d.organization_id
    LEFT JOIN website_issue i ON d.id = i.domain_id AND i.is_hidden = false
    LEFT JOIN website_userprofile up ON o.id = up.team_id
    WHERE o.is_active = true
    GROUP BY o.id, o.name, o.slug, o.logo, o.team_points
    HAVING COUNT(DISTINCT i.id) > 0
    ORDER BY issue_count DESC
    LIMIT ${perPage} OFFSET ${offset}
  `;

  const result = await sql(query);

  const countQuery = `
    SELECT COUNT(DISTINCT o.id) as count
    FROM website_organization o
    LEFT JOIN website_domain d ON o.id = d.organization_id
    LEFT JOIN website_issue i ON d.id = i.domain_id AND i.is_hidden = false
    WHERE o.is_active = true
    AND EXISTS (SELECT 1 FROM website_issue WHERE domain_id = d.id AND is_hidden = false)
  `;

  const countResult = await sql(countQuery);
  const totalCount = parseInt(countResult[0]?.count || '0');

  const rankedResults = result.map((row: any, index: number) => ({
    ...row,
    rank: offset + index + 1,
  }));

  return {
    count: totalCount,
    next: totalCount > offset + perPage ? `/api/leaderboard?type=organizations&page=${page + 1}&per_page=${perPage}` : null,
    previous: page > 1 ? `/api/leaderboard?type=organizations&page=${page - 1}&per_page=${perPage}` : null,
    results: rankedResults,
  };
}

/**
 * GET /api/leaderboard/monthly - Get monthly leaderboard winners by year
 */
leaderboard.get('/monthly', async (c) => {
  const sql = getDbClient(c.env);
  const year = c.req.query('year') || new Date().getFullYear().toString();

  try {
    const query = `
      WITH monthly_leaders AS (
        SELECT 
          EXTRACT(MONTH FROM p.created) as month,
          u.id,
          u.username,
          up.user_avatar,
          COALESCE(SUM(p.score), 0) as total_score,
          ROW_NUMBER() OVER (PARTITION BY EXTRACT(MONTH FROM p.created) ORDER BY COALESCE(SUM(p.score), 0) DESC) as rank_in_month
        FROM website_points p
        INNER JOIN auth_user u ON p.user_id = u.id
        INNER JOIN website_userprofile up ON u.id = up.user_id
        WHERE EXTRACT(YEAR FROM p.created) = ${parseInt(year)}
        AND u.is_active = true
        GROUP BY EXTRACT(MONTH FROM p.created), u.id, u.username, up.user_avatar
      )
      SELECT 
        month,
        id as user_id,
        username,
        user_avatar,
        total_score
      FROM monthly_leaders
      WHERE rank_in_month = 1
      ORDER BY month ASC
    `;

    const result = await sql(query);

    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const formatted = months.map((monthName, index) => {
      const monthData = result.find((r: any) => r.month === index + 1);
      return {
        month: monthName,
        month_number: index + 1,
        winner: monthData || null,
      };
    });

    return c.json({
      year: parseInt(year),
      months: formatted,
    });
  } catch (error) {
    console.error('Error fetching monthly leaderboard:', error);
    throw new HTTPException(500, { message: 'Failed to fetch monthly leaderboard' });
  }
});

export default leaderboard;
