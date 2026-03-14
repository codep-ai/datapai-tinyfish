/**
 * GET /api/ticker/[symbol]/market-intel?exchange=US&sector=Technology
 *
 * TinyFish Market Intelligence — real-time senior analyst view.
 *
 * Uses TinyFish to crawl three sources in parallel:
 *   1. Yahoo Finance Markets  — global macro headlines + themes
 *   2. Yahoo Finance Ticker   — stock-specific news, analyst actions
 *   3. Yahoo Finance Sector   — sector dynamics, disruption themes
 *
 * Then calls the Python backend for LLM synthesis via a Goldman Sachs /
 * Morgan Stanley-quality senior equity research analyst prompt.
 *
 * In-memory cache: TICKER_TTL (2 h). Fresh via ?fresh=1.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchPageText } from "@/lib/tinyfish";

const AGENT_BASE = (process.env.AGENT_BACKEND_BASE_URL ?? "").replace(/\/$/, "");

// ── In-memory cache ────────────────────────────────────────────────────────────

interface MarketIntelResult {
  intel_markdown:    string;
  overall_stance:    string | null;  // BULLISH | NEUTRAL | BEARISH
  macro_themes:      string[];
  sector_themes:     string[];
  ticker_catalysts:  string[];
  black_swans:       string[];
  cached:            boolean;
  fetched_at:        string;
}

type CacheEntry = { data: MarketIntelResult; ts: number };
const _cache = new Map<string, CacheEntry>();
const TICKER_TTL = 2 * 60 * 60 * 1000; // 2 hours

// ── TinyFish goal strings — structured, specific (per TinyFish examples pattern) ──

const MACRO_GOAL = `
Extract the 15-20 most important market and financial news headlines currently on this page.
For each item provide: (1) headline, (2) date if shown, (3) a 1-2 sentence factual summary.

Prioritise these topics:
- Federal Reserve / RBA / ECB monetary policy decisions, rate changes, Fed funds futures
- Inflation data: CPI, PCE, PPI prints vs expectations
- GDP growth reports, US payrolls, unemployment rate
- Geopolitical events: trade wars, tariffs, US-China tech decoupling, Middle East energy risks,
  Russia-Ukraine commodity impact, Taiwan semiconductor risk, sanctions
- Major index moves (S&P 500, Nasdaq, Dow), bond yield changes (2yr, 10yr, 30yr),
  DXY dollar index, VIX fear gauge
- Commodity price shocks (oil/WTI/Brent, gold, copper, LNG)
- Banking/credit stress, high yield spreads, liquidity conditions

Return as a numbered list. Finish with a brief MACRO SUMMARY section:
3-5 bullet points on the single most important macro themes right now.
`.trim();

const TICKER_NEWS_GOAL = `
Extract all news headlines and analyst research about this stock on this page.
For each item include: (1) headline, (2) date/time, (3) 1-2 sentence summary.

Specifically look for and highlight:
- Earnings reports: EPS beat/miss vs consensus, revenue beat/miss, margin trends
- Revenue and EPS guidance revisions (raised/lowered/withdrawn)
- Analyst upgrades/downgrades — include the firm name and new price target
- CEO/CFO/key executive appointments or departures
- Major product launches, contract wins, strategic partnerships
- Regulatory approvals, investigations, antitrust actions
- M&A: acquisition announcements, rumours, divestitures
- Share buybacks, dividend changes, capital raises
- Insider buying or selling (Form 4 filings)
- Short seller reports or activist investor disclosures
- Competitive threats: new entrants, market share losses

Sort most recent first. If analyst ratings are listed, summarise them in a table:
Firm | Rating | Price Target | Change.
`.trim();

const SECTOR_GOAL = `
Extract the top sector news, analyst views, and industry trends from this page.
Focus on:
1. Sector performance vs broader market (%, time period)
2. Key earnings results from the largest companies in this sector
3. Analyst consensus changes: sector upgrades/downgrades, sector calls from major banks
4. Regulatory or policy changes affecting the sector (legislation, antitrust, carbon pricing,
   capital requirements, drug approvals, tariffs)
5. Technology disruption themes — especially AI impact, automation, energy transition,
   electrification, cloud migration, cybersecurity, semiconductors
6. M&A activity within the sector
7. Macro factors specific to this sector: rate sensitivity, commodity exposure, FX exposure

Return as a structured list. Add a SECTOR THEMES section at the end with 3-5 bullets on
the key sector-level thesis an investor should know right now.
`.trim();

// ── Sector page URL routing ─────────────────────────────────────────────────────

function getSectorUrl(sector: string | null): string {
  const map: Record<string, string> = {
    "Technology":              "https://finance.yahoo.com/sectors/technology/",
    "Information Technology":  "https://finance.yahoo.com/sectors/technology/",
    "Healthcare":              "https://finance.yahoo.com/sectors/healthcare/",
    "Financials":              "https://finance.yahoo.com/sectors/financial-services/",
    "Financial Services":      "https://finance.yahoo.com/sectors/financial-services/",
    "Energy":                  "https://finance.yahoo.com/sectors/energy/",
    "Basic Materials":         "https://finance.yahoo.com/sectors/basic-materials/",
    "Materials":               "https://finance.yahoo.com/sectors/basic-materials/",
    "Consumer Discretionary":  "https://finance.yahoo.com/sectors/consumer-cyclical/",
    "Consumer Cyclical":       "https://finance.yahoo.com/sectors/consumer-cyclical/",
    "Consumer Staples":        "https://finance.yahoo.com/sectors/consumer-defensive/",
    "Consumer Defensive":      "https://finance.yahoo.com/sectors/consumer-defensive/",
    "Industrials":             "https://finance.yahoo.com/sectors/industrials/",
    "Real Estate":             "https://finance.yahoo.com/sectors/real-estate/",
    "Utilities":               "https://finance.yahoo.com/sectors/utilities/",
    "Communication Services":  "https://finance.yahoo.com/sectors/communication-services/",
    "Telecommunications":      "https://finance.yahoo.com/sectors/communication-services/",
  };
  return map[sector ?? ""] ?? "https://finance.yahoo.com/markets/";
}

// ── Per-crawl timeout wrapper (returns "" on timeout so synthesis still runs) ──

const CRAWL_TIMEOUT_MS = 60_000; // 60s per crawl

async function crawlSafe(url: string, goal: string): Promise<string> {
  try {
    const page = await Promise.race([
      fetchPageText(url, goal),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`TinyFish timeout after ${CRAWL_TIMEOUT_MS / 1000}s: ${url}`)), CRAWL_TIMEOUT_MS)
      ),
    ]);
    return page.text;
  } catch (err) {
    console.warn(`[market-intel] crawl failed for ${url}:`, err);
    return "";
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

  // ── Cache check ───────────────────────────────────────────────────────────
  const cacheKey = `${sym}:${exchange}:${sector ?? ""}`;
  if (!fresh) {
    const hit = _cache.get(cacheKey);
    if (hit && Date.now() - hit.ts < TICKER_TTL) {
      return NextResponse.json({ ok: true, data: { ...hit.data, cached: true } });
    }
  }

  if (!AGENT_BASE) {
    return NextResponse.json(
      { ok: false, error: "AGENT_BACKEND_BASE_URL not configured" },
      { status: 503 }
    );
  }

  // ── Parallel TinyFish crawls (each capped at 60s; failures return "") ─────
  const macroUrl  = "https://finance.yahoo.com/markets/";
  const tickerUrl = `https://finance.yahoo.com/quote/${sym}/news/`;
  const sectorUrl = getSectorUrl(sector);

  const [marketNewsText, tickerNewsText, sectorNewsText] = await Promise.all([
    crawlSafe(macroUrl,                        MACRO_GOAL),
    crawlSafe(tickerUrl,                       TICKER_NEWS_GOAL),
    sector ? crawlSafe(sectorUrl, SECTOR_GOAL) : Promise.resolve(""),
  ]);

  // ── Python synthesis — senior investment bank analyst LLM ─────────────────
  let synthRes: Response;
  try {
    synthRes = await fetch(`${AGENT_BASE}/agent/market-intel-synthesis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticker:           sym,
        exchange,
        sector:           sector ?? "",
        market_news_text: marketNewsText.slice(0, 8000),
        ticker_news_text: tickerNewsText.slice(0, 5000),
        sector_news_text: sectorNewsText.slice(0, 4000),
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Market intel synthesis request failed: ${String(err)}` },
      { status: 502 }
    );
  }

  let synthJson: { ok?: boolean; data?: Partial<MarketIntelResult>; error?: string | { message?: string } };
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
    cached:           false,
    fetched_at:       new Date().toISOString(),
  };

  _cache.set(cacheKey, { data: result, ts: Date.now() });
  return NextResponse.json({ ok: true, data: result });
}
