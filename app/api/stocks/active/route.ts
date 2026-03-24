/**
 * GET /api/stocks/active?exchange=ASX&limit=500
 *
 * Returns active stocks from the DB (ticker_universe + stock_directory).
 * Used by client components that need the stock list (e.g., LiveScanProgress).
 *
 * If no exchange is specified, returns stocks from all exchanges.
 */

import { NextResponse } from "next/server";
import { getActiveStocks } from "@/lib/db";

export const dynamic = "force-dynamic";

const ALL_EXCHANGES = ["NASDAQ", "NYSE", "ASX", "HOSE", "HNX"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const exchange = searchParams.get("exchange")?.toUpperCase().trim();
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "500"), 1000);
  const lang = searchParams.get("lang") ?? "en";

  // Map "US" shorthand to both NASDAQ + NYSE
  const exchanges = exchange === "US"
    ? ["NASDAQ", "NYSE"]
    : exchange
      ? [exchange]
      : ALL_EXCHANGES;

  const stocks = (await Promise.all(
    exchanges.map((ex) => getActiveStocks(ex, lang, limit))
  )).flat();

  return NextResponse.json({ stocks, count: stocks.length });
}
