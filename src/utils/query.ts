/**
 * Utility functions for executing dynamic SQL queries
 * Neon's serverless driver requires template strings, but for dynamic queries
 * we need to build SQL strings. This utility provides type-safe wrappers.
 */

/**
 * Execute a dynamic SQL query with parameters
 * Note: This bypasses Neon's template string requirement for dynamic queries
 */
export async function executeDynamicQuery(sql: any, query: string, params: any[] = []) {
  // For dynamic queries, we need to construct the function call differently
  // This is a workaround for TypeScript's template literal type checking
  return await (sql as any)(query, params);
}

/**
 * Build a WHERE clause with proper parameterization
 */
export function buildWhereClause(conditions: Record<string, any>, startIndex: number = 1): {
  clause: string;
  params: any[];
} {
  const clauses: string[] = [];
  const params: any[] = [];
  let paramIndex = startIndex;

  for (const [key, value] of Object.entries(conditions)) {
    if (value !== undefined && value !== null) {
      clauses.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  return {
    clause: clauses.join(' AND '),
    params,
  };
}
