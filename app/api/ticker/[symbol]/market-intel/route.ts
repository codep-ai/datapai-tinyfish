/**
 * GET /api/ticker/[symbol]/market-intel?exchange=US&sector=Technology
 *
 * TinyFish Market Intelligence — driven entirely by lib/marketIntelSources.ts.
 * Add/remove/toggle sources by editing that config file only.
 *
 * Flow:
 *  1. Read source registry (lib/marketIntelSources.ts)
 *  2. Fire all enabled sources in parallel (tier-1 always fresh; tier-2 cached)
 *  3. Pass all crawled text blocks to Python /agent/market-intel-synthesis
 *  4. Return senior analyst narrative + stance + theme arrays
 *
 * Caching:
 *  - Tier-1: no cache (real-time per request)
 *  - Tier-2: cacheTtlMs per source (shared across tickers); default 6h
 *  - Full result: 2h per ticker (bypassed with ?fresh=1)
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchPageText } from "@/lib/tinyfish";
import {
  getEnabledSources,
  resolveSourceUrl,
  resolveSourceName,
  type MarketIntelSource,
} from "@/lib/marketIntelSources";
import { getAuthUser } from "@/lib/auth";
import { getInvestorProfileOrDefault, buildProfileContext } from "@/lib/investorProfile";

const AGENT_BASE = (process.env.AGENT_BACKEND_BASE_URL ?? "").replace(/\/$/, "");

// ── In-memory caches ────────────────────────────────────────────────────────────

interface MarketIntelResult {
  intel_markdown:    string;
  overall_stance:    string | null;
  macro_themes:      string[];
  sector_themes:     string[];
  ticker_catalysts:  string[];
  black_swans:       string[];
  sources_used:      string[];
  cached:            boolean;
  fetched_at:        string;
}

const _resultCache = new Map<string, { data: MarketIntelResult; ts: number }>();
const RESULT_TTL = 2 * 60 * 60 * 1000; // 2h

// Per-source tier-2 text cache (key: source id)
const _sourceCache = new Map<string, { text: string; ts: number }>();

function getSourceCache(id: string): string | null {
  const hit = _sourceCache.get(id);
  if (!hit) return null;
  const src = getEnabledSources().find((s) => s.id === id);
  if (!src) return null;
  if (Date.now() - hit.ts > src.cacheTtlMs) return null;
  return hit.text;
}
function setSourceCache(id: string, text: string) {
  _sourceCache.set(id, { text, ts: Date.now() });
}

// ── Per-crawl timeout wrapper (60s; returns "" on failure) ──────────────────────

const CRAWL_TIMEOUT_MS = 60_000;

async function crawlSafe(
  source: MarketIntelSource,
  url: string
): Promise<{ text: string; ok: boolean }> {
  try {
    const result = await Promise.race([
      fetchPageText(url, source.goal),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`timeout ${CRAWL_TIMEOUT_MS / 1000}s`)), CRAWL_TIMEOUT_MS)
      ),
    ]);
    const text = result.text?.trim() ?? "";
    if (text.length < 100) {
      console.warn(`[market-intel] ${source.id}: too little text (${text.length} chars)`);
      return { text: "", ok: false };
    }
    console.log(`[market-intel] ${source.id}: OK (${text.length} chars)`);
    return { text, ok: true };
  } catch (err) {
    console.warn(`[market-intel] ${source.id} failed:`, String(err).slice(0, 120));
    return { text: "", ok: false };
  }
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const sym      = symbol.toUpperCase();
  const exchange = req.nextUrl.searchParams.get("exchange") ?? "US";
  const sector   = req.nextUrl.searchParams.get("sector")   ?? null;
  const fresh    = req.nextUrl.searchParams.get("fresh")    === "1";
  const lang     = req.nextUrl.searchParams.get("lang")     ?? "en";

  // ── Result cache check ────────────────────────────────────────────────────
  const cacheKey = `${sym}:${exchange}:${sector ?? ""}`;
  if (!fresh) {
    const hit = _resultCache.get(cacheKey);
    if (hit && Date.now() - hit.ts < RESULT_TTL) {
      return NextResponse.json({ ok: true, data: { ...hit.data, cached: true } });
    }
  }

  if (!AGENT_BASE) {
    return NextResponse.json(
      { ok: false, error: "AGENT_BACKEND_BASE_URL not configured" },
      { status: 503 }
    );
  }

  // ── Load investor profile for personalised synthesis ──────────────────────
  let profileCtx = "";
  try {
    const user = await getAuthUser();
    if (user?.userId) {
      const profile = await getInvestorProfileOrDefault(user.userId);
      profileCtx   = buildProfileContext(profile);
    }
  } catch { /* anonymous — no profile context */ }

  // ── Resolve source URLs from config ───────────────────────────────────────
  const sources = getEnabledSources();

  // Build crawl tasks: resolve URL, determine if we need a live crawl or can use cache
  type CrawlTask = {
    source: MarketIntelSource;
    url:    string;
    cached: string | null; // pre-existing cached text (tier-2 only)
  };

  const tasks: CrawlTask[] = [];
  for (const src of sources) {
    const url = resolveSourceUrl(src, sym, sector);
    if (!url) continue; // skip if URL can't be resolved (e.g., sector source without sector)
    const cachedText = (!fresh && src.tier === 2) ? getSourceCache(src.id) : null;
    tasks.push({ source: src, url, cached: cachedText });
  }

  // ── Fire all crawls in parallel ────────────────────────────────────────────
  const crawlResults = await Promise.all(
    tasks.map(async (task) => {
      if (task.cached !== null) {
        return { source: task.source, text: task.cached, ok: true, fromCache: true };
      }
      const result = await crawlSafe(task.source, task.url);
      // Cache tier-2 results
      if (task.source.tier === 2 && result.ok) {
        setSourceCache(task.source.id, result.text);
      }
      return { source: task.source, text: result.text, ok: result.ok, fromCache: false };
    })
  );

  // ── Build synthesis payload ────────────────────────────────────────────────
  const sourcesUsed: string[] = [];
  const sourcePayload: Record<string, string> = {};

  for (const r of crawlResults) {
    if (!r.ok || !r.text) continue;
    const displayName = resolveSourceName(r.source, sym, sector);
    sourcesUsed.push(displayName);
    // Use source id as payload key (Python side reads these)
    sourcePayload[r.source.id] = r.text.slice(0, r.source.maxChars);
  }

  // ── Call Python synthesis endpoint ────────────────────────────────────────
  let synthRes: Response;
  try {
    synthRes = await fetch(`${AGENT_BASE}/agent/market-intel-synthesis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticker:          sym,
        exchange,
        sector:          sector ?? "",
        lang,
        sources_used:    sourcesUsed,
        profile_context: profileCtx || null,  // investor profile for personalised framing
        // All source texts keyed by source id
        ...sourcePayload,
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Market intel synthesis failed: ${String(err)}` },
      { status: 502 }
    );
  }

  let synthJson: {
    ok?: boolean;
    data?: Partial<MarketIntelResult>;
    error?: string | { message?: string };
  };
  try {
    synthJson = await synthRes.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: `Synthesis returned non-JSON (HTTP ${synthRes.status})` },
      { status: 502 }
    );
  }

  if (!synthRes.ok || !synthJson?.ok) {
    const msg =
      typeof synthJson?.error === "object"
        ? synthJson.error?.message ?? JSON.stringify(synthJson.error)
        : String(synthJson?.error ?? `HTTP ${synthRes.status}`);
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }

  const result: MarketIntelResult = {
    intel_markdown:   synthJson.data?.intel_markdown   ?? "",
    overall_stance:   synthJson.data?.overall_stance   ?? null,
    macro_themes:     synthJson.data?.macro_themes     ?? [],
    sector_themes:    synthJson.data?.sector_themes    ?? [],
    ticker_catalysts: synthJson.data?.ticker_catalysts ?? [],
    black_swans:      synthJson.data?.black_swans      ?? [],
    sources_used:     sourcesUsed,
    cached:           false,
    fetched_at:       new Date().toISOString(),
  };

  _resultCache.set(cacheKey, { data: result, ts: Date.now() });
  return NextResponse.json({ ok: true, data: result });
}
