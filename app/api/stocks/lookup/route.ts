/**
 * GET /api/stocks/lookup?symbol=TWE
 * GET /api/stocks/lookup?q=BH&exchange=ASX   ← prefix search (autocomplete)
 *
 * Returns stock info from the stock_directory table + live price from screener_metrics.
 * If the table is empty (not yet seeded), falls back to UNIVERSE_ALL lookup.
 */

import { NextResponse } from "next/server";
import { lookupStock, searchStocks, countStockDirectory, getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

interface StockResult {
  symbol: string;
  name: string;
  exchange: string;
  sector: string | null;
  price?: number | null;
  change_1d_pct?: number | null;
  change_1m_pct?: number | null;
  market_cap?: number | null;
  volume?: number | null;
}

/** Enrich search results with price data from screener_metrics */
async function enrichWithPrices(results: StockResult[]): Promise<StockResult[]> {
  if (results.length === 0) return results;
  try {
    const pool = getPool();
    const symbols = results.map((r) => r.symbol);
    const rows = await pool.query(
      `SELECT ticker, exchange, latest_close, change_1d_pct, change_1m_pct, latest_volume
       FROM datapai.screener_metrics
       WHERE ticker = ANY($1)`,
      [symbols]
    );
    const priceMap = new Map<string, Record<string, unknown>>();
    for (const r of rows.rows) {
      priceMap.set(`${r.ticker}:${r.exchange}`, r);
    }
    return results.map((r) => {
      const p = priceMap.get(`${r.symbol}:${r.exchange}`);
      if (p) {
        r.price = Number(p.latest_close) || null;
        r.change_1d_pct = Number(p.change_1d_pct) || null;
        r.change_1m_pct = Number(p.change_1m_pct) || null;
        r.volume = Number(p.latest_volume) || null;
      }
      return r;
    });
  } catch {
    return results; // price enrichment is best-effort
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.toUpperCase().trim();
  const query  = searchParams.get("q")?.toUpperCase().trim();
  const exchange = searchParams.get("exchange")?.toUpperCase().trim();
  const lang   = searchParams.get("lang") ?? "en";

  // ── Prefix search (autocomplete) ──────────────────────────────────────────
  if (query && query.length >= 1) {
    const raw = await searchStocks(query, exchange || undefined, lang);
    const results = await enrichWithPrices(raw as StockResult[]);
    return NextResponse.json({ results, source: "db" });
  }

  // ── Exact symbol lookup ────────────────────────────────────────────────────
  if (!symbol) {
    return NextResponse.json({ error: "Provide ?symbol=XXX or ?q=prefix" }, { status: 400 });
  }

  const result = await lookupStock(symbol, lang);
  if (result) {
    const enriched = await enrichWithPrices([result as StockResult]);
    return NextResponse.json({ ...enriched[0], source: "db" });
  }

  return NextResponse.json(null);
}
