import { NextResponse } from "next/server";
import { getTickerAlerts, getTickerSnapshots } from "@/lib/db";
import { getMockPrices } from "@/lib/price";
import { UNIVERSE } from "@/lib/universe";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const ticker = UNIVERSE.find((t) => t.symbol === symbol.toUpperCase());

  if (!ticker) {
    return NextResponse.json({ error: "Ticker not found" }, { status: 404 });
  }

  const alerts = getTickerAlerts(symbol.toUpperCase(), 10);
  const snapshots = getTickerSnapshots(symbol.toUpperCase(), 2);
  const prices = getMockPrices(symbol.toUpperCase(), 30);

  return NextResponse.json({ ticker, alerts, snapshots, prices });
}
