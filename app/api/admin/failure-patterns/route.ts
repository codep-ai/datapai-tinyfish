/**
 * GET /api/admin/failure-patterns
 * PATCH /api/admin/failure-patterns
 *
 * Reads + updates datapai.failure_patterns — the macro-learning loop's
 * audit table. Written by stock_failure_analyzer Airflow DAG nightly;
 * read by /admin/failure-patterns for human review.
 *
 * GET — list open + recently-reviewed patterns. Query params:
 *   status   open / triaged / resolved / wontfix (default: all)
 *   horizon  7 / 30 / 90 (default: all)
 *
 * PATCH — set status / resolution_note on a pattern. Body:
 *   { pattern_id, status, resolution_note, reviewed_by }
 *
 * Reads via FDW on stock_db; writes via direct framework_db connection
 * (the FDW write-side has the same NULL pattern_id problem as
 * sys_agent_debate_log — same fix pattern as run_failure_analyzer.py).
 */
import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

// ── Direct-to-framework-db pool (bypass FDW for writes) ──────────────────
let _fwkPool: Pool | null = null;
function getFrameworkPool(): Pool {
  if (!_fwkPool) {
    _fwkPool = new Pool({
      host:     process.env.DATAPAI_FRAMEWORK_DB_HOST     ?? "127.0.0.1",
      port:     parseInt(process.env.DATAPAI_FRAMEWORK_DB_PORT ?? "5433"),
      user:     process.env.DATAPAI_FRAMEWORK_DB_USER     ?? "postgres",
      password: process.env.DATAPAI_FRAMEWORK_DB_PASSWORD ?? "auth_root_2026",
      database: process.env.DATAPAI_FRAMEWORK_DB_NAME     ?? "datapai_auth_db",
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }
  return _fwkPool;
}

interface PatternRow {
  pattern_id: number;
  computed_at: string;
  run_date?: string;
  horizon_days: number;
  signature_text: string;
  signature: Record<string, unknown>;
  n_observations: number;
  n_losses: number;
  loss_rate: number;
  avg_return_missed: number | null;
  example_tickers: string[] | null;
  suggested_action: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution_note: string | null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status   = searchParams.get("status") ?? "";
  const horizon  = searchParams.get("horizon") ?? "";

  const conds: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (status) {
    conds.push(`status = $${idx++}`);
    params.push(status);
  }
  if (horizon) {
    conds.push(`horizon_days = $${idx++}`);
    params.push(parseInt(horizon));
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  try {
    const pool = getPool();
    // FDW read from stock_db.datapai.failure_patterns (foreign table → framework_db)
    const res = await pool.query<PatternRow>(
      `SELECT pattern_id, computed_at, horizon_days,
              signature, signature_text,
              n_observations, n_losses, loss_rate, avg_return_missed,
              example_tickers, suggested_action,
              status, reviewed_by, reviewed_at, resolution_note
       FROM datapai.failure_patterns
       ${where}
       ORDER BY (loss_rate * n_observations) DESC, computed_at DESC
       LIMIT 200`,
      params
    );

    // Counts by status for the page header
    const countsRes = await pool.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::text AS count
       FROM datapai.failure_patterns
       GROUP BY status`
    );
    const counts: Record<string, number> = {};
    for (const r of countsRes.rows) counts[r.status] = parseInt(r.count);

    return NextResponse.json({ ok: true, patterns: res.rows, counts });
  } catch (err) {
    console.error("failure-patterns GET:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  let body: { pattern_id?: number; status?: string; resolution_note?: string; reviewed_by?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const { pattern_id, status, resolution_note, reviewed_by } = body;
  if (!pattern_id || !status) {
    return NextResponse.json({ ok: false, error: "pattern_id and status required" }, { status: 400 });
  }
  const validStatuses = new Set(["open", "triaged", "fix_proposed", "fix_applied", "resolved", "wontfix"]);
  if (!validStatuses.has(status)) {
    return NextResponse.json({ ok: false, error: `status must be one of: ${[...validStatuses].join(", ")}` }, { status: 400 });
  }

  try {
    const pool = getFrameworkPool();   // write directly to framework_db
    const res = await pool.query(
      `UPDATE datapai.failure_patterns
       SET status = $1,
           resolution_note = COALESCE($2, resolution_note),
           reviewed_by = COALESCE($3, reviewed_by),
           reviewed_at = NOW()
       WHERE pattern_id = $4
       RETURNING pattern_id, status, reviewed_by, reviewed_at`,
      [status, resolution_note ?? null, reviewed_by ?? "admin", pattern_id]
    );
    if (res.rows.length === 0) {
      return NextResponse.json({ ok: false, error: "pattern_id not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, updated: res.rows[0] });
  } catch (err) {
    console.error("failure-patterns PATCH:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
