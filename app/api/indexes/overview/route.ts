/**
 * GET /api/indexes/overview
 * Proxies to Python backend /agent/index-overview
 * Returns all 16 global market indexes with TA data, grouped by region.
 */
import { NextResponse } from "next/server";

const AGENT_BASE = process.env.AGENT_BASE_URL ?? "http://localhost:8005";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get("region") ?? "";

  try {
    const url = `${AGENT_BASE}/agent/index-overview${region ? `?region=${region}` : ""}`;
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    const json = await res.json();
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
