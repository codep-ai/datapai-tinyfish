/**
 * POST /api/ticker/[symbol]/chart-analysis
 *
 * Returns a rendered 3-panel technical chart (base64 PNG) + Gemini Vision
 * AI pattern analysis for the given ticker.
 *
 * Performance: results are persisted in SQLite (chart_analyses table) with a
 * 24-hour TTL. Cache hits return the stored PNG + analysis instantly.
 * Only cache misses call the Python backend (slow: ~15–30 s).
 *
 * Cache behaviour:
 *   ?fresh=1 / ?force=1 — skip cache, force regeneration
 *
 * Response (ApiResponse envelope):
 *   { ok: true, data: { chart_b64, analysis, indicators, timeframe } }
 */

import { NextResponse } from "next/server";
import { UNIVERSE_ALL } from "@/lib/universe";
import { lookupStock } from "@/lib/db";
import { getCachedChartAnalysis, upsertChartAnalysis } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { checkAiSignalAccess } from "@/lib/plan-limits";

export const dynamic    = "force-dynamic";
export const maxDuration = 120;

const AGENT_BASE  = (process.env.AGENT_BACKEND_BASE_URL ?? "").replace(/\/$/, "");
const CACHE_HOURS = 24;   // Chart analysis TTL (full trading day)
const TIMEFRAME   = "1d";
const BARS        = 120;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: rawSymbol } = await params;
  const symbol    = rawSymbol.toUpperCase();
  const url       = new URL(req.url);
  const skipCache = url.searchParams.has("fresh") || url.searchParams.has("force");

  // ── 0. Auth + plan check ──────────────────────────────────────────────────
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json(
      { ok: false, data: null, error: { code: "UNAUTHORIZED", message: "Sign in to access AI signals", upgradeUrl: "/login" } },
      { status: 401 }
    );
  }
  const access = await checkAiSignalAccess(authUser.userId, symbol);
  if (!access.allowed) {
    return NextResponse.json(
      { ok: false, data: null, error: { code: "PLAN_LIMIT", message: access.message, upgradeUrl: "/pricing" } },
      { status: 403 }
    );
  }

  // Parse body — lang drives cache bypass and Python prompt language
  let lang = "en";
  try { const b = await req.json(); if (b?.lang === "zh") lang = "zh"; } catch { /* ok */ }
  const useCache = lang !== "zh";

  // ── 1. Cache lookup ───────────────────────────────────────────────────────
  if (!skipCache && useCache) {
    try {
      const cached = await getCachedChartAnalysis(symbol, TIMEFRAME, CACHE_HOURS);
      if (cached) {
        return NextResponse.json({
          ok:   true,
          data: {
            chart_b64:   cached.chart_b64,
            analysis:    cached.analysis_md,
            indicators:  cached.indicators_json ? JSON.parse(cached.indicators_json) : {},
            timeframe:   cached.timeframe,
            cached:      true,
            generated_at: cached.generated_at,
            expires_at:   cached.expires_at,
          },
          error: null,
        });
      }
    } catch (cacheErr) {
      console.warn(`[chart-analysis:${symbol}] cache read failed (non-fatal):`, cacheErr);
    }
  }

  // ── 2. Agent backend check ────────────────────────────────────────────────
  if (!AGENT_BASE) {
    return NextResponse.json(
      { ok: false, data: null, error: { code: "NO_BACKEND", message: "Agent backend not configured" } },
      { status: 503 }
    );
  }

  // ── 3. Resolve exchange/suffix ────────────────────────────────────────────
  const tickerInfo = UNIVERSE_ALL.find((t) => t.symbol === symbol);
  let exchange = tickerInfo?.exchange ?? "";
  if (!exchange) {
    try { const d = await lookupStock(symbol); exchange = d?.exchange ?? "US"; } catch { exchange = "US"; }
  }
  const suffix = exchange === "ASX" ? ".AX" : "";

  // ── 4. Call Python backend ────────────────────────────────────────────────
  try {
    const res = await fetch(`${AGENT_BASE}/agent/chart-analysis`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ticker: symbol, suffix, timeframe: TIMEFRAME, bars: BARS, lang }),
      signal:  AbortSignal.timeout(115_000),
    });

    let json: { ok: boolean; data: Record<string, unknown> | null; error: unknown };
    try {
      json = await res.json() as typeof json;
    } catch {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { ok: false, data: null, error: { code: "BACKEND_ERROR", message: `Agent returned non-JSON (HTTP ${res.status})`, detail: text.slice(0, 300) } },
        { status: 502 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, data: null, error: json?.error ?? { code: "BACKEND_ERROR", message: `Agent returned ${res.status}` } },
        { status: 502 }
      );
    }

    // ── 5. Persist to DB cache (EN only — never cache zh output) ────────────
    if (json.ok && json.data && useCache) {
      const d       = json.data;
      const now     = new Date();
      const expires = new Date(now.getTime() + CACHE_HOURS * 3_600_000);
      try {
        await upsertChartAnalysis({
          ticker:         symbol,
          timeframe:      TIMEFRAME,
          chart_b64:      String(d.chart_b64 ?? ""),
          analysis_md:    String(d.analysis  ?? ""),
          indicators_json: d.indicators ? JSON.stringify(d.indicators) : null,
          generated_at:   now.toISOString(),
          expires_at:     expires.toISOString(),
        });
      } catch (dbErr) {
        console.warn(`[chart-analysis:${symbol}] DB write failed (non-fatal):`, dbErr);
      }
    }

    return NextResponse.json({ ...json, cached: false });

  } catch (err) {
    console.error(`[chart-analysis:${symbol}]`, err);
    return NextResponse.json(
      { ok: false, data: null, error: { code: "FETCH_ERROR", message: String(err) } },
      { status: 500 }
    );
  }
}
