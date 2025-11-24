/**
 * Organizations API routes
 */
import { Hono } from 'hono';
import type { Env } from '../types/env';
import { getDbClient } from '../db/client';
import { HTTPException } from 'hono/http-exception';

const organizations = new Hono<{ Bindings: Env }>();

/**
 * GET /api/organizations - List all organizations
 */
organizations.get('/', async (c) => {
  const sql = getDbClient(c.env);
  const page = parseInt(c.req.query('page') || '1');
  const perPage = Math.min(parseInt(c.req.query('per_page') || '20'), 100);
  const offset = (page - 1) * perPage;
  const search = c.req.query('search');

  try {
    let whereClause = 'o.is_active = true';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (o.name ILIKE $${paramIndex} OR o.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countQuery = `
      SELECT COUNT(*) as count
      FROM website_organization o
      WHERE ${whereClause}
    `;

    const countResult = await sql(countQuery, params);
    const totalCount = parseInt(countResult[0]?.count || '0');

    const query = `
      SELECT 
        o.id,
        o.name,
        o.slug,
        o.description,
        o.logo,
        o.url,
        o.email,
        o.twitter,
        o.created,
        o.type,
        o.team_points,
        o.tagline,
        o.license,
        o.categories,
        o.tech_tags,
        o.topic_tags,
        (SELECT COUNT(*) FROM website_domain WHERE organization_id = o.id) as domain_count,
        (SELECT COUNT(*) FROM website_project WHERE organization_id = o.id) as project_count,
        (SELECT COUNT(*) FROM website_userprofile WHERE team_id = o.id) as member_count
      FROM website_organization o
      WHERE ${whereClause}
      ORDER BY o.created DESC
      LIMIT ${perPage} OFFSET ${offset}
    `;

    const result = await sql(query, params);

    return c.json({
      count: totalCount,
      next: totalCount > offset + perPage ? `/api/organizations?page=${page + 1}&per_page=${perPage}` : null,
      previous: page > 1 ? `/api/organizations?page=${page - 1}&per_page=${perPage}` : null,
      results: result,
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    throw new HTTPException(500, { message: 'Failed to fetch organizations' });
  }
});

/**
 * GET /api/organizations/:id - Get organization details
 */
organizations.get('/:id', async (c) => {
  const sql = getDbClient(c.env);
  const orgId = parseInt(c.req.param('id'));

  try {
    const query = `
      SELECT 
        o.*,
        u.id as admin_id,
        u.username as admin_username,
        (SELECT COUNT(*) FROM website_domain WHERE organization_id = o.id) as domain_count,
        (SELECT COUNT(*) FROM website_project WHERE organization_id = o.id) as project_count,
        (SELECT COUNT(*) FROM website_userprofile WHERE team_id = o.id) as member_count
      FROM website_organization o
      LEFT JOIN auth_user u ON o.admin_id = u.id
      WHERE o.id = ${orgId}
    `;

    const result = await sql(query);

    if (!result || result.length === 0) {
      throw new HTTPException(404, { message: 'Organization not found' });
    }

    // Get tags
    const tags = await sql`
      SELECT t.id, t.name, t.slug
      FROM website_tag t
      INNER JOIN website_organization_tags ot ON t.id = ot.tag_id
      WHERE ot.organization_id = ${orgId}
    `;

    // Get managers
    const managers = await sql`
      SELECT u.id, u.username
      FROM auth_user u
      INNER JOIN website_organization_managers om ON u.id = om.user_id
      WHERE om.organization_id = ${orgId}
    `;

    return c.json({
      ...result[0],
      tags,
      managers,
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Error fetching organization:', error);
    throw new HTTPException(500, { message: 'Failed to fetch organization' });
  }
});

/**
 * GET /api/organizations/:id/repositories - Get organization repositories
 */
organizations.get('/:id/repositories', async (c) => {
  const sql = getDbClient(c.env);
  const orgId = parseInt(c.req.param('id'));
  const page = parseInt(c.req.query('page') || '1');
  const perPage = Math.min(parseInt(c.req.query('per_page') || '20'), 100);
  const offset = (page - 1) * perPage;

  try {
    const countQuery = `
      SELECT COUNT(*) as count
      FROM website_repo
      WHERE organization_id = ${orgId}
    `;

    const countResult = await sql(countQuery);
    const totalCount = parseInt(countResult[0]?.count || '0');

    const query = `
      SELECT 
        r.id,
        r.name,
        r.slug,
        r.github_url,
        r.description,
        r.stars,
        r.forks,
        r.watchers,
        r.open_issues,
        r.language,
        r.homepage,
        r.topics,
        r.archived,
        r.disabled,
        r.created,
        r.modified,
        r.last_pushed
      FROM website_repo r
      WHERE r.organization_id = ${orgId}
      ORDER BY r.stars DESC
      LIMIT ${perPage} OFFSET ${offset}
    `;

    const result = await sql(query);

    return c.json({
      count: totalCount,
      next: totalCount > offset + perPage ? `/api/organizations/${orgId}/repositories?page=${page + 1}&per_page=${perPage}` : null,
      previous: page > 1 ? `/api/organizations/${orgId}/repositories?page=${page - 1}&per_page=${perPage}` : null,
      results: result,
    });
  } catch (error) {
    console.error('Error fetching organization repositories:', error);
    throw new HTTPException(500, { message: 'Failed to fetch organization repositories' });
  }
});

/**
 * GET /api/organizations/:id/members - Get organization members
 */
organizations.get('/:id/members', async (c) => {
  const sql = getDbClient(c.env);
  const orgId = parseInt(c.req.param('id'));
  const page = parseInt(c.req.query('page') || '1');
  const perPage = Math.min(parseInt(c.req.query('per_page') || '20'), 100);
  const offset = (page - 1) * perPage;

  try {
    const countQuery = `
      SELECT COUNT(*) as count
      FROM website_userprofile
      WHERE team_id = ${orgId}
    `;

    const countResult = await sql(countQuery);
    const totalCount = parseInt(countResult[0]?.count || '0');

    const query = `
      SELECT 
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        up.user_avatar,
        up.title,
        up.role,
        up.github_url,
        up.contribution_rank,
        up.merged_pr_count,
        (SELECT COALESCE(SUM(score), 0) FROM website_points WHERE user_id = u.id) as total_score
      FROM auth_user u
      INNER JOIN website_userprofile up ON u.id = up.user_id
      WHERE up.team_id = ${orgId}
      ORDER BY total_score DESC
      LIMIT ${perPage} OFFSET ${offset}
    `;

    const result = await sql(query);

    return c.json({
      count: totalCount,
      next: totalCount > offset + perPage ? `/api/organizations/${orgId}/members?page=${page + 1}&per_page=${perPage}` : null,
      previous: page > 1 ? `/api/organizations/${orgId}/members?page=${page - 1}&per_page=${perPage}` : null,
      results: result,
    });
  } catch (error) {
    console.error('Error fetching organization members:', error);
    throw new HTTPException(500, { message: 'Failed to fetch organization members' });
  }
});

export default organizations;
