/**
 * GET /api/synthesis
 *
 * Latest AG2 multi-agent synthesis recommendations per ticker, from
 * `datapai.stock_synthesis`. Each row carries the 4-agent debate output:
 *   - direction (STRONG_BUY..STRONG_SELL)
 *   - confidence (0..1)
 *   - conviction (HIGH/MEDIUM/LOW)
 *   - thesis  (PM final synthesis)
 *   - what_bulls_say / what_bears_say / key_risk
 *   - ta_direction / fa_direction / ma_direction (component agents)
 *   - signals_aligned / disagreement_summary
 *
 * Used by:
 *   - /performance (Current Recommendations tab)
 *   - /screener (per-row "AI Call" column links here)
 *   - /ticker/[X]/intel (per-ticker AI Analyst Call card)
 *
 * Query params:
 *   - ticker      single ticker filter (e.g. ?ticker=BHP) — returns only that ticker's latest row
 *   - exchange    market filter (US, ASX, ...)
 *   - direction   STRONG_BUY | BUY | HOLD | SELL | STRONG_SELL
 *   - conviction  HIGH | MEDIUM | LOW
 *   - limit       default 200, max 1000
 *
 * Returns the latest row per ticker (via DISTINCT ON), not all history —
 * for the historical track record use /api/performance.
 */
import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ticker     = searchParams.get("ticker") ?? "";
  const exchange   = searchParams.get("exchange") ?? "";
  const direction  = searchParams.get("direction") ?? "";
  const conviction = searchParams.get("conviction") ?? "";
  const limit      = Math.min(parseInt(searchParams.get("limit") ?? "200"), 1000);

  try {
    const pool = getPool();
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (ticker)     { conditions.push(`ticker = $${idx++}`);     params.push(ticker.toUpperCase()); }
    if (exchange)   { conditions.push(`exchange = $${idx++}`);   params.push(exchange.toUpperCase()); }
    if (direction)  { conditions.push(`direction = $${idx++}`);  params.push(direction.toUpperCase()); }
    if (conviction) { conditions.push(`conviction = $${idx++}`); params.push(conviction.toUpperCase()); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    // DISTINCT ON gives the latest synthesis per (ticker, exchange).
    const sql = `
      WITH latest AS (
        SELECT DISTINCT ON (ticker, exchange)
               ticker, exchange, direction, confidence, conviction,
               thesis, what_bulls_say, what_bears_say, key_risk,
               ta_direction, fa_direction, ma_direction,
               signals_aligned, disagreement_summary,
               debate_rounds, model_used, computed_at
        FROM datapai.stock_synthesis
        ${where}
        ORDER BY ticker, exchange, computed_at DESC
      )
      SELECT * FROM latest
      ORDER BY
        CASE direction
          WHEN 'STRONG_BUY'  THEN 0
          WHEN 'BUY'         THEN 1
          WHEN 'HOLD'        THEN 2
          WHEN 'SELL'        THEN 3
          WHEN 'STRONG_SELL' THEN 4
          ELSE 5
        END,
        confidence DESC NULLS LAST,
        ticker
      LIMIT $${idx}
    `;

    const res = await pool.query(sql, [...params, limit]);

    // Summary counts for the page header
    const summary = {
      total: res.rows.length,
      by_direction: res.rows.reduce<Record<string, number>>((acc, r) => {
        acc[r.direction] = (acc[r.direction] ?? 0) + 1;
        return acc;
      }, {}),
      latest_computed_at: res.rows.reduce<string | null>(
        (latest, r) => (!latest || (r.computed_at && r.computed_at > latest))
          ? r.computed_at : latest,
        null,
      ),
    };

    return NextResponse.json({
      ok: true,
      summary,
      items: res.rows,
    });
  } catch (err) {
    console.error("Synthesis API error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}
