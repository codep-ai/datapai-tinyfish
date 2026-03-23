/**
 * POST /api/ticker/[symbol]/ta-signal
 *
 * Returns a Gemini+GPT structured technical trading signal for the given ticker.
 *
 * Performance: results are persisted in SQLite (ta_signals table) with a
 * 6-hour TTL. Cache hits return instantly; only misses call the Python backend.
 *
 * Cache behaviour:
 *   ?fresh=1 / ?force=1 — skip cache, force regeneration
 *
 * Response (ApiResponse envelope):
 *   { ok: true, data: { signal_markdown, current_price, rsi, trend, ... } }
 */

import { NextResponse } from "next/server";
import { UNIVERSE_ALL } from "@/lib/universe";
import { getCachedTaSignal, upsertTaSignal, lookupStock } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { checkAiSignalAccess } from "@/lib/plan-limits";

export const dynamic    = "force-dynamic";
export const maxDuration = 120;

const AGENT_BASE  = (process.env.AGENT_BACKEND_BASE_URL ?? "").replace(/\/$/, "");
const CACHE_HOURS = 6;  // TA signal cache TTL (one trading session)

export async function POST(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: rawSymbol } = await params;
  const symbol    = decodeURIComponent(rawSymbol).toUpperCase();
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
  // Chinese requests bypass the EN cache (never read or write zh content to cache)
  const useCache = lang !== "zh";

  // ── 1. Cache lookup ───────────────────────────────────────────────────────
  if (!skipCache && useCache) {
    try {
      const cached = await getCachedTaSignal(symbol, CACHE_HOURS);
      if (cached) {
        return NextResponse.json({
          ok:   true,
          data: {
            signal_markdown:  cached.signal_md,
            current_price:    cached.current_price,
            change_pct:       cached.change_pct,
            rsi:              cached.rsi,
            rsi_label:        cached.rsi_label,
            trend:            cached.trend,
            macd_label:       cached.macd_label,
            bb_label:         cached.bb_label,
            indicators_by_tf: cached.indicators_json ? JSON.parse(cached.indicators_json) : {},
            cached:           true,
            generated_at:     cached.generated_at,
            expires_at:       cached.expires_at,
          },
          error: null,
        });
      }
    } catch (cacheErr) {
      console.warn(`[ta-signal:${symbol}] cache read failed (non-fatal):`, cacheErr);
    }
  }

  // ── 2. Agent backend check ────────────────────────────────────────────────
  if (!AGENT_BASE) {
    return NextResponse.json(
      { ok: false, data: null, error: { code: "NO_BACKEND", message: "Agent backend not configured (AGENT_BACKEND_BASE_URL not set)" } },
      { status: 503 }
    );
  }

  // ── 3. Resolve exchange/suffix ────────────────────────────────────────────
  // Check hardcoded universe first, then fall back to DB stock_directory
  const tickerInfo = UNIVERSE_ALL.find((t) => t.symbol === symbol);
  let exchange = tickerInfo?.exchange ?? "";
  if (!exchange) {
    try {
      const dbEntry = await lookupStock(symbol);
      exchange = dbEntry?.exchange ?? "US";
    } catch { exchange = "US"; }
  }
  const suffix = exchange === "ASX" ? ".AX" : "";

  // ── 4. Call Python backend ────────────────────────────────────────────────
  try {
    const res = await fetch(`${AGENT_BASE}/agent/technical-signal`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ticker: symbol, suffix, exchange, lang }),
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
        await upsertTaSignal({
          ticker:          symbol,
          exchange,
          signal_md:       String(d.signal_markdown ?? ""),
          current_price:   typeof d.current_price === "number" ? d.current_price : null,
          change_pct:      typeof d.change_pct    === "number" ? d.change_pct    : null,
          rsi:             typeof d.rsi           === "number" ? d.rsi           : null,
          rsi_label:       typeof d.rsi_label     === "string" ? d.rsi_label     : null,
          trend:           typeof d.trend         === "string" ? d.trend         : null,
          macd_label:      typeof d.macd_label    === "string" ? d.macd_label    : null,
          bb_label:        typeof d.bb_label      === "string" ? d.bb_label      : null,
          indicators_json: d.indicators_by_tf ? JSON.stringify(d.indicators_by_tf) : null,
          generated_at:    now.toISOString(),
          expires_at:      expires.toISOString(),
        });
      } catch (dbErr) {
        console.warn(`[ta-signal:${symbol}] DB write failed (non-fatal):`, dbErr);
      }
    }

    return NextResponse.json({ ...json, cached: false });

  } catch (err) {
    console.error(`[ta-signal:${symbol}]`, err);
    return NextResponse.json(
      { ok: false, data: null, error: { code: "FETCH_ERROR", message: String(err) } },
      { status: 500 }
    );
  }
}
