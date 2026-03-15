/**
 * lib/db-mfa.ts
 * Thin wrappers for MFA-related DB operations.
 * Avoids importing the full db.ts in MFA routes.
 */

import { getPool } from "./db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function q(sql: string, params?: unknown[]): Promise<any[]> {
  const pool = getPool();
  const res  = await pool.query(sql, params);
  return res.rows;
}

export async function execMfa(sql: string, params?: unknown[]): Promise<void> {
  const pool = getPool();
  await pool.query(sql, params);
}
