/**
 * GET /api/portfolio — Get portfolio holdings + snapshots for the logged-in user.
 * POST /api/portfolio — Add a holding.
 * DELETE /api/portfolio — Remove a holding.
 */
import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const pool = getPool();

    // Holdings with latest price
    const holdingsRes = await pool.query(
      `SELECT h.id, h.ticker, h.exchange, h.shares, h.avg_cost, h.added_at, h.notes,
              p.close AS current_price,
              ROUND(((p.close - h.avg_cost::float) / NULLIF(h.avg_cost::float, 0) * 100)::numeric, 2) AS pnl_pct,
              ROUND((p.close * h.shares::float - h.avg_cost::float * h.shares::float)::numeric, 2) AS pnl_value
       FROM datapai.usr_holdings h
       LEFT JOIN LATERAL (
         SELECT close FROM datapai.prices
         WHERE ticker = h.ticker AND exchange = h.exchange AND close IS NOT NULL
         ORDER BY trade_date DESC LIMIT 1
       ) p ON TRUE
       WHERE h.user_id = $1
       ORDER BY h.added_at DESC`,
      [user.userId]
    );

    // Portfolio snapshots (last 90 days)
    const snapshotsRes = await pool.query(
      `SELECT snapshot_date, total_value, total_cost, daily_pnl, total_pnl, total_pnl_pct, benchmark_return
       FROM datapai.usr_portfolio_snapshots
       WHERE user_id = $1
       ORDER BY snapshot_date DESC
       LIMIT 90`,
      [user.userId]
    );

    // Calculate totals
    const holdings = holdingsRes.rows;
    const totalValue = holdings.reduce((s: number, h: any) => s + (h.current_price ?? h.avg_cost) * h.shares, 0);
    const totalCost = holdings.reduce((s: number, h: any) => s + h.avg_cost * h.shares, 0);

    return NextResponse.json({
      ok: true,
      holdings,
      snapshots: snapshotsRes.rows,
      summary: {
        total_value: Math.round(totalValue * 100) / 100,
        total_cost: Math.round(totalCost * 100) / 100,
        total_pnl: Math.round((totalValue - totalCost) * 100) / 100,
        total_pnl_pct: totalCost > 0 ? Math.round((totalValue - totalCost) / totalCost * 10000) / 100 : 0,
        positions: holdings.length,
      },
    });
  } catch (err) {
    console.error("Portfolio GET error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const { ticker, exchange, shares, avg_cost, notes } = await req.json();
    if (!ticker || !shares || !avg_cost) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    const pool = getPool();
    await pool.query(
      `INSERT INTO datapai.usr_holdings (user_id, ticker, exchange, shares, avg_cost, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user.userId, ticker.toUpperCase(), exchange ?? "US", shares, avg_cost, notes ?? null]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Portfolio POST error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    const pool = getPool();
    await pool.query(
      `DELETE FROM datapai.usr_holdings WHERE id = $1 AND user_id = $2`,
      [id, user.userId]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Portfolio DELETE error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
