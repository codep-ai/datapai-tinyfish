/**
 * GET  /api/watchlist  — list the authenticated user's watchlisted tickers
 * POST /api/watchlist  — add a ticker { symbol, exchange?, name? }
 *
 * Both endpoints require an authenticated session (session_token cookie).
 * Returns { error: "Unauthorized", authenticated: false } with 401 if not logged in.
 */

import { NextRequest, NextResponse } from "next/server";
import { getWatchlist, addToWatchlist, getAlertSummaryMap, lookupStock } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { checkWatchlistLimit } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized", authenticated: false }, { status: 401 });
  }

  const items = await getWatchlist(user.userId);
  const alertMap = await getAlertSummaryMap();

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

  // Enforce plan watchlist quota
  const quota = await checkWatchlistLimit(user.userId);
  if (!quota.allowed) {
    return NextResponse.json({ error: quota.message, upgradeUrl: "/pricing" }, { status: 403 });
  }

  const sym = symbol.toUpperCase();

  // Auto-fill name / exchange from DB if not provided
  const dirEntry = (!exchange || !name) ? await lookupStock(sym) : null;
  const resolvedExchange = exchange ?? dirEntry?.exchange ?? "US";
  const resolvedName = name ?? dirEntry?.name ?? null;

  await addToWatchlist(user.userId, sym, resolvedExchange, resolvedName);

  return NextResponse.json({
    success: true,
    symbol: sym,
    exchange: resolvedExchange,
    name: resolvedName,
  });
}
