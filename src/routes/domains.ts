/**
 * Domains API routes
 */
import { Hono } from 'hono';
import type { Env } from '../types/env';
import { getDbClient } from '../db/client';
import { HTTPException } from 'hono/http-exception';

const domains = new Hono<{ Bindings: Env }>();

/**
 * GET /api/domains - List all domains
 */
domains.get('/', async (c) => {
  const sql = getDbClient(c.env);
  const page = parseInt(c.req.query('page') || '1');
  const perPage = Math.min(parseInt(c.req.query('per_page') || '20'), 100);
  const offset = (page - 1) * perPage;
  const search = c.req.query('search');

  try {
    let whereClause = 'd.is_active = true';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (d.name ILIKE $${paramIndex} OR d.url ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countQuery = `
      SELECT COUNT(*) as count
      FROM website_domain d
      WHERE ${whereClause}
    `;

    const countResult = await sql(countQuery, params);
    const totalCount = parseInt(countResult[0]?.count || '0');

    const query = `
      SELECT 
        d.id,
        d.name,
        d.url,
        d.logo,
        d.webshot,
        d.email,
        d.twitter,
        d.facebook,
        d.created,
        d.has_security_txt,
        o.id as organization_id,
        o.name as organization_name,
        o.slug as organization_slug,
        (SELECT COUNT(*) FROM website_issue WHERE domain_id = d.id AND status = 'open' AND is_hidden = false) as open_issues,
        (SELECT COUNT(*) FROM website_issue WHERE domain_id = d.id AND status = 'closed' AND is_hidden = false) as closed_issues
      FROM website_domain d
      LEFT JOIN website_organization o ON d.organization_id = o.id
      WHERE ${whereClause}
      ORDER BY d.created DESC
      LIMIT ${perPage} OFFSET ${offset}
    `;

    const result = await sql(query, params);

    return c.json({
      count: totalCount,
      next: totalCount > offset + perPage ? `/api/domains?page=${page + 1}&per_page=${perPage}` : null,
      previous: page > 1 ? `/api/domains?page=${page - 1}&per_page=${perPage}` : null,
      results: result,
    });
  } catch (error) {
    console.error('Error fetching domains:', error);
    throw new HTTPException(500, { message: 'Failed to fetch domains' });
  }
});

/**
 * GET /api/domains/:id - Get domain details
 */
domains.get('/:id', async (c) => {
  const sql = getDbClient(c.env);
  const domainId = parseInt(c.req.param('id'));

  try {
    const query = `
      SELECT 
        d.*,
        o.id as organization_id,
        o.name as organization_name,
        o.slug as organization_slug,
        o.url as organization_url,
        (SELECT COUNT(*) FROM website_issue WHERE domain_id = d.id AND status = 'open' AND is_hidden = false) as open_issues,
        (SELECT COUNT(*) FROM website_issue WHERE domain_id = d.id AND status = 'closed' AND is_hidden = false) as closed_issues
      FROM website_domain d
      LEFT JOIN website_organization o ON d.organization_id = o.id
      WHERE d.id = ${domainId}
    `;

    const result = await sql(query);

    if (!result || result.length === 0) {
      throw new HTTPException(404, { message: 'Domain not found' });
    }

    // Get top tester for this domain
    const topTester = await sql`
      SELECT 
        u.id,
        u.username,
        COUNT(i.id) as issue_count
      FROM website_issue i
      INNER JOIN auth_user u ON i.user_id = u.id
      WHERE i.domain_id = ${domainId} AND i.is_hidden = false
      GROUP BY u.id, u.username
      ORDER BY issue_count DESC
      LIMIT 1
    `;

    // Get tags for this domain
    const tags = await sql`
      SELECT t.id, t.name, t.slug
      FROM website_tag t
      INNER JOIN website_domain_tags dt ON t.id = dt.tag_id
      WHERE dt.domain_id = ${domainId}
    `;

    return c.json({
      ...result[0],
      top_tester: topTester[0] || null,
      tags,
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Error fetching domain:', error);
    throw new HTTPException(500, { message: 'Failed to fetch domain' });
  }
});

/**
 * GET /api/domains/:id/issues - Get issues for a domain
 */
domains.get('/:id/issues', async (c) => {
  const sql = getDbClient(c.env);
  const domainId = parseInt(c.req.param('id'));
  const page = parseInt(c.req.query('page') || '1');
  const perPage = Math.min(parseInt(c.req.query('per_page') || '20'), 100);
  const offset = (page - 1) * perPage;
  const status = c.req.query('status');

  try {
    let whereClause = `i.domain_id = ${domainId} AND i.is_hidden = false`;
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND i.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const countQuery = `
      SELECT COUNT(*) as count
      FROM website_issue i
      WHERE ${whereClause}
    `;

    const countResult = await sql(countQuery, params);
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
        (SELECT COUNT(*) FROM website_userprofile_issue_upvoted WHERE issue_id = i.id) as upvotes
      FROM website_issue i
      LEFT JOIN auth_user u ON i.user_id = u.id
      WHERE ${whereClause}
      ORDER BY i.created DESC
      LIMIT ${perPage} OFFSET ${offset}
    `;

    const result = await sql(query, params);

    return c.json({
      count: totalCount,
      next: totalCount > offset + perPage ? `/api/domains/${domainId}/issues?page=${page + 1}&per_page=${perPage}` : null,
      previous: page > 1 ? `/api/domains/${domainId}/issues?page=${page - 1}&per_page=${perPage}` : null,
      results: result,
    });
  } catch (error) {
    console.error('Error fetching domain issues:', error);
    throw new HTTPException(500, { message: 'Failed to fetch domain issues' });
  }
});

export default domains;
