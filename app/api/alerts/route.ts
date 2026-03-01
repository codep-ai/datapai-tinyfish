import { NextResponse } from "next/server";
import { getLatestAnalyses } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const minConfidence = parseFloat(searchParams.get("minConfidence") ?? "0");
  const ticker = searchParams.get("ticker")?.toUpperCase();

  let analyses = getLatestAnalyses(100);

  if (ticker) {
    analyses = analyses.filter((a) => a.ticker === ticker);
  }
  if (minConfidence > 0) {
    analyses = analyses.filter((a) => a.confidence >= minConfidence);
  }

  return NextResponse.json({ analyses });
}
