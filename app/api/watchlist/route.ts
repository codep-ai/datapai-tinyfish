/**
 * GET  /api/watchlist  — list the authenticated user's watchlisted tickers
 * POST /api/watchlist  — add a ticker { symbol, exchange?, name? }
 *
 * Both endpoints require an authenticated session (session_token cookie).
 * Returns { error: "Unauthorized", authenticated: false } with 401 if not logged in.
 */

import { NextRequest, NextResponse } from "next/server";
import { getWatchlist, addToWatchlist, getAlertSummaryMap } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { UNIVERSE_ALL } from "@/lib/universe";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized", authenticated: false }, { status: 401 });
  }

  const items = getWatchlist(user.userId);
  const alertMap = getAlertSummaryMap();

  const enriched = items.map((item) => ({
    ...item,
    analysis: alertMap[item.symbol] ?? null,
  }));

  return NextResponse.json({ items: enriched, authenticated: true });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized", authenticated: false }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    symbol?: string;
    exchange?: string;
    name?: string;
  };
  const { symbol, exchange, name } = body;

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  const sym = symbol.toUpperCase();

  // Auto-fill name / exchange from known universe if not provided
  const known = UNIVERSE_ALL.find((t) => t.symbol === sym);
  const resolvedExchange = exchange ?? known?.exchange ?? "US";
  const resolvedName = name ?? known?.name ?? null;

  addToWatchlist(user.userId, sym, resolvedExchange, resolvedName);

  return NextResponse.json({
    success: true,
    symbol: sym,
    exchange: resolvedExchange,
    name: resolvedName,
  });
}
