import { NextResponse } from "next/server";
import { getTickerSnapshots, getTickerAnalyses, getTickerDiffs } from "@/lib/db";
import { fetchPrices } from "@/lib/price";
import { UNIVERSE } from "@/lib/universe";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const ticker = UNIVERSE.find((t) => t.symbol === symbol.toUpperCase());

  if (!ticker) {
    return NextResponse.json({ error: "Ticker not found" }, { status: 404 });
  }

  const sym = symbol.toUpperCase();
  const [snapshots, analyses, diffs, prices] = await Promise.all([
    Promise.resolve(getTickerSnapshots(sym, 5)),
    Promise.resolve(getTickerAnalyses(sym, 5)),
    Promise.resolve(getTickerDiffs(sym, 5)),
    fetchPrices(sym, 30),
  ]);

  return NextResponse.json({ ticker, snapshots, analyses, diffs, prices });
}
