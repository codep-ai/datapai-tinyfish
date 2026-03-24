import { NextResponse } from "next/server";
import { getTickerSnapshots, getTickerAnalyses, getTickerDiffs, lookupStock } from "@/lib/db";
import { fetchPrices } from "@/lib/price";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();
  const dirEntry = await lookupStock(sym);

  if (!dirEntry) {
    return NextResponse.json({ error: "Ticker not found" }, { status: 404 });
  }

  const ticker = {
    symbol: dirEntry.symbol,
    name: dirEntry.name,
    exchange: dirEntry.exchange,
  };

  const [snapshots, analyses, diffs, prices] = await Promise.all([
    getTickerSnapshots(sym, 5),
    getTickerAnalyses(sym, 5),
    getTickerDiffs(sym, 5),
    fetchPrices(sym, 30, dirEntry.exchange),
  ]);

  return NextResponse.json({ ticker, snapshots, analyses, diffs, prices });
}
