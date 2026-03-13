/**
 * GET /api/stocks/lookup?symbol=TWE
 * GET /api/stocks/lookup?q=BH&exchange=ASX   ← prefix search (autocomplete)
 *
 * Returns stock info from the stock_directory table.
 * If the table is empty (not yet seeded), falls back to UNIVERSE_ALL lookup.
 */

import { NextResponse } from "next/server";
import { lookupStock, searchStocks, countStockDirectory } from "@/lib/db";
import { UNIVERSE_ALL } from "@/lib/universe";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.toUpperCase().trim();
  const query  = searchParams.get("q")?.toUpperCase().trim();
  const exchange = searchParams.get("exchange")?.toUpperCase().trim();

  // ── Prefix search (autocomplete) ──────────────────────────────────────────
  if (query) {
    const total = await countStockDirectory();
    if (total > 0) {
      const results = await searchStocks(query, exchange || undefined);
      return NextResponse.json({ results, source: "db" });
    }
    // Fallback: search UNIVERSE_ALL
    const results = UNIVERSE_ALL.filter(
      (t) => t.symbol.startsWith(query) && (!exchange || t.exchange === exchange)
    ).map((t) => ({ symbol: t.symbol, name: t.name, exchange: t.exchange ?? "US", sector: null }));
    return NextResponse.json({ results, source: "universe" });
  }

  // ── Exact symbol lookup ────────────────────────────────────────────────────
  if (!symbol) {
    return NextResponse.json({ error: "Provide ?symbol=XXX or ?q=prefix" }, { status: 400 });
  }

  const total = await countStockDirectory();
  if (total > 0) {
    const result = await lookupStock(symbol);
    if (result) return NextResponse.json({ ...result, source: "db" });
  }

  // Fallback: check UNIVERSE_ALL
  const known = UNIVERSE_ALL.find((t) => t.symbol === symbol);
  if (known) {
    return NextResponse.json({
      symbol: known.symbol,
      name: known.name,
      exchange: known.exchange ?? "US",
      sector: null,
      source: "universe",
    });
  }

  return NextResponse.json(null);
}
