/**
 * GET /api/screener/technical?exchange=US&sort_by=change_1d_pct&sort_dir=desc&limit=50
 * Proxy to Python backend: GET /agent/technical-screener
 */

import { NextRequest, NextResponse } from "next/server";

const AGENT_BASE = (process.env.AGENT_BACKEND_BASE_URL ?? "").replace(/\/$/, "");

export async function GET(req: NextRequest) {
  if (!AGENT_BASE) {
    return NextResponse.json({ ok: false, error: "AGENT_BACKEND_BASE_URL not configured" }, { status: 503 });
  }

  const qs = req.nextUrl.searchParams.toString();

  try {
    const res = await fetch(
      `${AGENT_BASE}/agent/technical-screener${qs ? `?${qs}` : ""}`,
      { cache: "no-store" }
    );
    const json = await res.json();
    if (!res.ok) return NextResponse.json(json, { status: res.status });

    const items = Array.isArray(json.data?.items) ? json.data.items : [];
    return NextResponse.json({
      ok: json.ok ?? true,
      data: items,
      total: json.data?.total ?? items.length,
      offset: json.data?.offset ?? 0,
      limit: json.data?.limit ?? 50,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
