/**
 * POST /api/ticker/[symbol]/asx-trading-signal
 *
 * ASX-only endpoint. Proxies to Python /agent/asx-trading-signal.
 * Combines an IR page snapshot text with live multi-timeframe technicals
 * to generate a STRONG BUY / BUY / HOLD / SELL / STRONG SELL signal.
 *
 * Request body (all optional — defaults are used if missing):
 *   announcement_text  : string — latest IR page content / announcement body
 *   headline           : string — announcement headline
 *   doc_type           : string — document type label
 *   market_sensitive   : boolean
 *   doc_date           : YYYY-MM-DD
 */

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { checkAiSignalAccess } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";
export const maxDuration = 180; // Yahoo Finance + Gemini (grounded) + GPT reviewer

const AGENT_BASE = (process.env.AGENT_BACKEND_BASE_URL ?? "").replace(/\/$/, "");

export async function POST(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: rawSymbol } = await params;
  const symbol = rawSymbol.toUpperCase();

  // ── 0. Auth + plan check ──────────────────────────────────────────────────
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json(
      { error: "Sign in to access AI signals", upgradeUrl: "/login" },
      { status: 401 }
    );
  }
  const access = await checkAiSignalAccess(authUser.userId, symbol);
  if (!access.allowed) {
    return NextResponse.json(
      { error: access.message, upgradeUrl: "/pricing" },
      { status: 403 }
    );
  }

  if (!AGENT_BASE) {
    return NextResponse.json(
      { error: "Agent backend not configured (AGENT_BACKEND_BASE_URL not set)" },
      { status: 503 }
    );
  }

  let body: {
    announcement_text?: string;
    headline?: string;
    doc_type?: string;
    market_sensitive?: boolean;
    doc_date?: string;
    lang?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is valid */
  }

  try {
    const res = await fetch(`${AGENT_BASE}/agent/asx-trading-signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticker: symbol,
        announcement: {
          ticker:           symbol,
          headline:         body.headline ?? "IR / Investor Relations Update",
          doc_type:         body.doc_type ?? "IR Update",
          market_sensitive: body.market_sensitive ?? false,
          document_date:    body.doc_date ?? new Date().toISOString().slice(0, 10),
        },
        announcement_text: body.announcement_text ?? "",
        use_grounding:     true,
        lang:              body.lang === "zh" ? "zh" : "en",
      }),
      signal: AbortSignal.timeout(175_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Agent backend returned ${res.status}`, detail: text },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error(`[asx-trading-signal:${symbol}]`, err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
