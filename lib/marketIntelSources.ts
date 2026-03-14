/**
 * lib/marketIntelSources.ts
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * MARKET INTELLIGENCE SOURCE REGISTRY
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Add, remove, or toggle sources here — NO code changes required in route.ts.
 *
 * Fields:
 *   id          — unique key; used as cache key and as LLM section label
 *   name        — display name shown in the UI source list
 *   url         — static URL to crawl (use null for dynamic URLs)
 *   urlTemplate — optional URL with {TICKER} / {SECTOR} placeholders;
 *                 overrides `url` when present and placeholders are filled
 *   goal        — TinyFish extraction goal (what to extract from the page)
 *   tier        — 1 = real-time (crawled every request for this ticker)
 *                 2 = analytical/macro (cached for cacheTtlMs, shared across tickers)
 *   cacheTtlMs  — how long to cache the result (tier-2 sources only)
 *   enabled     — set false to disable without deleting the row
 *   maxChars    — max chars to send to the LLM synthesis prompt
 *   sectionLabel — section header used in the LLM prompt (markdown prefix kept)
 *
 * Crawl concurrency: all enabled sources fire in parallel, each with a 60s timeout.
 * If a crawl times out or returns < 100 chars, it is gracefully excluded from synthesis.
 */

export interface MarketIntelSource {
  id:            string;
  name:          string;
  url?:          string;          // static URL
  urlTemplate?:  string;          // {TICKER} and/or {SECTOR} replaced at runtime
  goal:          string;
  tier:          1 | 2;
  cacheTtlMs:    number;          // ignored for tier-1 sources
  enabled:       boolean;
  maxChars:      number;
  sectionLabel:  string;          // shown in LLM prompt
}

// ─────────────────────────────────────────────────────────────────────────────
// SOURCE TABLE  ← edit this list freely
// ─────────────────────────────────────────────────────────────────────────────

export const MARKET_INTEL_SOURCES: MarketIntelSource[] = [

  // ── TIER 1: Real-time financial news (crawled fresh every request) ────────

  {
    id:    "reuters",
    name:  "Reuters Finance",
    url:   "https://www.reuters.com/finance/",
    tier:  1,
    cacheTtlMs: 0,
    enabled: true,
    maxChars: 5000,
    sectionLabel: "📰 REAL-TIME NEWS — Reuters Finance",
    goal: `
Extract the top 20 most important financial and market news headlines from this Reuters Finance page.
For each item: (1) headline, (2) date/time, (3) 1-2 sentence factual summary.
Prioritise: central bank policy (Fed/ECB/RBA/BoJ), inflation data (CPI/PCE/PPI), GDP/jobs reports,
geopolitical market impacts (tariffs, sanctions, conflicts), major corporate earnings,
commodity price moves (oil/WTI/Brent, gold, copper), bond market (yields, spreads),
currency moves (DXY, EUR/USD, AUD/USD), M&A, banking/credit stress.
End with REUTERS MACRO SUMMARY: 4-5 bullet points on the most important macro themes today.
`.trim(),
  },

  {
    id:          "yahoo_ticker",
    name:        "Yahoo Finance ({TICKER})",       // {TICKER} replaced in display
    urlTemplate: "https://finance.yahoo.com/quote/{TICKER}/news/",
    tier:        1,
    cacheTtlMs:  0,
    enabled:     true,
    maxChars:    4000,
    sectionLabel: "📊 STOCK NEWS — {TICKER} (Yahoo Finance)",
    goal: `
Extract all news headlines and analyst research about this stock on this Yahoo Finance page.
For each item: (1) headline, (2) date, (3) 1-2 sentence summary.
Highlight: earnings beats/misses vs consensus, EPS/revenue guidance changes,
analyst upgrades/downgrades (firm name + new rating + price target), CEO/CFO changes,
product launches, contract wins, regulatory news, M&A, buybacks, insider trades.
Sort most recent first. If analyst ratings table exists, extract it: Firm | Rating | Price Target | Date.
`.trim(),
  },

  {
    id:          "yahoo_sector",
    name:        "Yahoo Finance ({SECTOR} Sector)", // {SECTOR} replaced in display
    urlTemplate: "https://finance.yahoo.com/sectors/{SECTOR_SLUG}/", // {SECTOR_SLUG} = url-safe sector key
    tier:        1,
    cacheTtlMs:  0,
    enabled:     true,
    maxChars:    3000,
    sectionLabel: "🏭 SECTOR — {SECTOR} (Yahoo Finance)",
    goal: `
Extract sector news, analyst views, and industry trends from this Yahoo Finance sector page.
Include: (1) sector performance vs S&P 500/ASX 200, (2) top movers, (3) analyst sector calls,
(4) regulatory changes, (5) disruption themes (AI, automation, energy transition),
(6) M&A activity, (7) earnings season trends.
End with SECTOR THEMES: 4-5 bullet points on the key sector-level thesis right now.
`.trim(),
  },

  // ── TIER 2: Analytical / macro research (cached 6h, shared across tickers) ──

  {
    id:    "project_syndicate",
    name:  "Project Syndicate",
    url:   "https://www.project-syndicate.org/section/economics",
    tier:  2,
    cacheTtlMs: 6 * 3600 * 1000,   // 6 hours
    enabled:    true,
    maxChars:   3000,
    sectionLabel: "💡 MACRO VIEWS — Project Syndicate (Roubini, El-Erian, Summers et al.)",
    goal: `
Extract the top 8-12 most recent opinion articles from Project Syndicate.
For each piece: (1) title, (2) author + their affiliation (e.g. "Nouriel Roubini, NYU Professor"),
(3) publication date, (4) 2-3 sentence summary of the main thesis.
Focus on: global recession risk, US/China trade war, central bank policy mistakes,
inflation trajectories, debt sustainability, geopolitical risk premiums, AI economic impact,
financial stability risks, EM crises, commodity cycles. This is premium macro intelligence.
`.trim(),
  },

  {
    id:    "cfr",
    name:  "CFR (Council on Foreign Relations)",
    url:   "https://www.cfr.org/global-economy",
    tier:  2,
    cacheTtlMs: 6 * 3600 * 1000,
    enabled:    true,
    maxChars:   2500,
    sectionLabel: "🌍 GEOPOLITICAL RISK — Council on Foreign Relations (CFR)",
    goal: `
Extract the 8-12 most recent analyses, backgrounders, and blog posts from CFR Global Economy.
For each: (1) title, (2) author, (3) date, (4) 2-3 sentence summary.
Focus on: US-China trade/technology decoupling, Taiwan strait semiconductor risk,
Middle East energy disruption, Russia-Ukraine economic impact, sanctions regimes,
G7/G20 policy, EM debt crises, dollar weaponisation, supply chain re-shoring.
End with GEOPOLITICAL RISK SUMMARY: top 3 active geopolitical risks with market implications.
`.trim(),
  },

  {
    id:    "imf",
    name:  "IMF (International Monetary Fund)",
    url:   "https://www.imf.org/en/News",
    tier:  2,
    cacheTtlMs: 6 * 3600 * 1000,
    enabled:    true,
    maxChars:   2500,
    sectionLabel: "🏦 GLOBAL POLICY — International Monetary Fund (IMF)",
    goal: `
Extract the latest 10 news items, press releases, and research from the IMF News page.
For each: (1) headline, (2) date, (3) key takeaway in 1-2 sentences.
Prioritise: World Economic Outlook updates (GDP growth forecasts, downside scenarios),
Global Financial Stability Report warnings, Article IV consultations (US/China/EU/Japan),
SDR and reserve currency developments, IMF programme approvals, debt restructuring,
global trade volume forecasts.
End with IMF GLOBAL OUTLOOK: 3-4 bullet points on the IMF's current global risk assessment.
`.trim(),
  },

  {
    id:    "wef",
    name:  "WEF (World Economic Forum)",
    url:   "https://www.weforum.org/agenda/",
    tier:  2,
    cacheTtlMs: 6 * 3600 * 1000,
    enabled:    true,
    maxChars:   2000,
    sectionLabel: "🔭 MEGA-TRENDS — World Economic Forum (WEF Agenda)",
    goal: `
Extract the 8-10 most recent articles from the WEF Agenda page.
For each: (1) title, (2) date, (3) 1-2 sentence summary.
Focus on: AI and automation economic disruption, energy transition and clean tech investment,
global supply chain transformation, future of work, ESG and sustainable finance,
deglobalisation and geoeconomic fragmentation, digital economy and fintech disruption,
climate-related financial risks, healthcare system stress.
End with WEF MEGA-TRENDS: 3-4 bullets on the biggest structural forces shaping markets.
`.trim(),
  },

  {
    id:    "bis",
    name:  "BIS (Bank for International Settlements)",
    url:   "https://www.bis.org/press/",
    tier:  2,
    cacheTtlMs: 12 * 3600 * 1000,  // 12 hours — BIS publishes quarterly
    enabled:    true,
    maxChars:   2000,
    sectionLabel: "🏛️ SYSTEMIC RISK — Bank for International Settlements (BIS)",
    goal: `
Extract the 8-10 most recent press releases and research from the BIS press page.
For each: (1) title, (2) date, (3) key finding in 1-2 sentences.
Prioritise: BIS Quarterly Review (financial stability, banking sector health),
global credit conditions, cross-border banking flows, FX reserve management,
central bank digital currencies (CBDC), systemic risk warnings,
international banking statistics, macroprudential policy changes.
End with BIS STABILITY OUTLOOK: 3 bullets on key systemic/banking sector risks.
`.trim(),
  },

  // ── TIER 1: Additional real-time news sources ────────────────────────────

  {
    id:    "cnbc_markets",
    name:  "CNBC Markets",
    url:   "https://www.cnbc.com/markets/",
    tier:  1,
    cacheTtlMs: 0,
    enabled:    true,
    maxChars:   4000,
    sectionLabel: "📺 REAL-TIME NEWS — CNBC Markets",
    goal: `
Extract the top 15-20 most important market news stories and alerts from CNBC Markets.
For each item: (1) headline, (2) timestamp, (3) 1-2 sentence summary.
Prioritise: US equity market moves (S&P 500, Nasdaq, Dow), Fed/FOMC news, earnings movers,
sector rotation stories, commodities (oil, gold), Treasury yields, major economic data releases,
pre-market and after-hours movers, analyst calls and price target changes.
End with CNBC MARKET SUMMARY: 3-4 bullet points on the dominant market themes right now.
`.trim(),
  },

  {
    id:    "marketwatch",
    name:  "MarketWatch",
    url:   "https://www.marketwatch.com/latest-news",
    tier:  1,
    cacheTtlMs: 0,
    enabled:    true,
    maxChars:   4000,
    sectionLabel: "📈 REAL-TIME NEWS — MarketWatch (WSJ)",
    goal: `
Extract the 15-20 most recent financial news headlines from MarketWatch.
For each: (1) headline, (2) timestamp, (3) 1-2 sentence factual summary.
Focus on: US equity indices, individual stock movers, earnings surprises,
economic indicator releases (jobs, inflation, GDP, housing), Fed commentary,
corporate events (M&A, IPOs, bankruptcies, buybacks), credit markets.
End with MARKETWATCH PULSE: 3-4 bullets on the key market narratives driving price action today.
`.trim(),
  },

  // ── TIER 2: Central bank policy (primary sources) ────────────────────────

  {
    id:    "fed_reserve",
    name:  "Federal Reserve (FOMC)",
    url:   "https://www.federalreserve.gov/newsevents/pressreleases.htm",
    tier:  2,
    cacheTtlMs: 6 * 3600 * 1000,   // 6 hours
    enabled:    true,
    maxChars:   3000,
    sectionLabel: "🏦 US MONETARY POLICY — Federal Reserve (FOMC)",
    goal: `
Extract the latest 10 press releases and statements from the Federal Reserve newsroom.
For each: (1) title, (2) date, (3) key policy content in 1-2 sentences.
Prioritise: FOMC rate decisions and meeting minutes, balance sheet (QT/QE) announcements,
Fed Chair statements and testimony, bank stress test results, financial stability reports,
discount rate changes, emergency lending facility announcements, supervisory guidance.
End with FED POLICY STANCE: current federal funds rate target + 3 bullets on the Fed's
current policy trajectory, inflation outlook, and next FOMC meeting expectations.
`.trim(),
  },

  // ── OPTIONAL / EXPERIMENTAL (set enabled: false by default) ──────────────

  {
    id:    "ft_markets",
    name:  "Financial Times Markets",
    url:   "https://www.ft.com/markets",
    tier:  1,
    cacheTtlMs: 0,
    enabled:    false,   // FT is paywalled — enable if you have a subscription
    maxChars:   3000,
    sectionLabel: "📋 FT MARKETS — Financial Times",
    goal: `
Extract market news headlines and summaries visible on this FT Markets page.
For each: (1) headline, (2) date/time, (3) brief summary (note: content may be paywalled).
Focus on: UK/European markets, BoE/ECB policy, FTSE/DAX/CAC moves,
Sterling and Euro FX, UK gilt market, European earnings season.
`.trim(),
  },

  {
    id:    "economist",
    name:  "The Economist (Finance)",
    url:   "https://www.economist.com/finance-and-economics",
    tier:  2,
    cacheTtlMs: 12 * 3600 * 1000,
    enabled:    false,   // Economist is paywalled — enable if you have access
    maxChars:   2000,
    sectionLabel: "📘 THE ECONOMIST — Finance & Economics",
    goal: `
Extract article titles and available summaries from The Economist Finance & Economics section.
For each: (1) headline, (2) brief description or teaser (note: full articles may be paywalled).
Focus on macro economics, monetary policy analysis, global trade, financial market commentary.
`.trim(),
  },

  {
    id:    "brookings",
    name:  "Brookings Institution",
    url:   "https://www.brookings.edu/topic/economy/",
    tier:  2,
    cacheTtlMs: 12 * 3600 * 1000,
    enabled:    true,    // Policy depth — especially valuable during rate cycles and election years
    maxChars:   2000,
    sectionLabel: "🏛️ POLICY RESEARCH — Brookings Institution",
    goal: `
Extract recent research papers, commentary, and analyses from Brookings on economic policy.
For each: (1) title, (2) author, (3) date, (4) 1-2 sentence summary.
Focus on: fiscal policy, trade policy, regulatory reform, labour markets, technology policy.
`.trim(),
  },

];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers used by the route
// ─────────────────────────────────────────────────────────────────────────────

/** All enabled sources */
export function getEnabledSources(): MarketIntelSource[] {
  return MARKET_INTEL_SOURCES.filter((s) => s.enabled);
}

/** Tier-1 sources (crawled fresh every request) */
export function getTier1Sources(): MarketIntelSource[] {
  return MARKET_INTEL_SOURCES.filter((s) => s.enabled && s.tier === 1);
}

/** Tier-2 sources (analytical, shared cache across tickers) */
export function getTier2Sources(): MarketIntelSource[] {
  return MARKET_INTEL_SOURCES.filter((s) => s.enabled && s.tier === 2);
}

/** Sector slug map — used to resolve {SECTOR_SLUG} in urlTemplate */
export const SECTOR_SLUGS: Record<string, string> = {
  "Technology":             "technology",
  "Information Technology": "technology",
  "Healthcare":             "healthcare",
  "Financials":             "financial-services",
  "Financial Services":     "financial-services",
  "Energy":                 "energy",
  "Basic Materials":        "basic-materials",
  "Materials":              "basic-materials",
  "Consumer Discretionary": "consumer-cyclical",
  "Consumer Cyclical":      "consumer-cyclical",
  "Consumer Staples":       "consumer-defensive",
  "Consumer Defensive":     "consumer-defensive",
  "Industrials":            "industrials",
  "Real Estate":            "real-estate",
  "Utilities":              "utilities",
  "Communication Services": "communication-services",
  "Telecommunications":     "communication-services",
};

/** Resolve a source URL — fills {TICKER}, {SECTOR}, {SECTOR_SLUG} placeholders */
export function resolveSourceUrl(
  source: MarketIntelSource,
  ticker: string,
  sector: string | null
): string | null {
  const template = source.urlTemplate ?? source.url ?? null;
  if (!template) return null;
  const sectorSlug = SECTOR_SLUGS[sector ?? ""] ?? "";
  const resolved = template
    .replace("{TICKER}",      ticker.toUpperCase())
    .replace("{SECTOR}",      sector ?? "")
    .replace("{SECTOR_SLUG}", sectorSlug);
  // If the URL still has unfilled placeholders (e.g. sector-specific but no sector given), skip
  if (resolved.includes("{")) return null;
  // Skip sector URL if we have no sector
  if (source.id === "yahoo_sector" && !sectorSlug) return null;
  return resolved;
}

/** Resolve display name — fills {TICKER}, {SECTOR} placeholders */
export function resolveSourceName(
  source: MarketIntelSource,
  ticker: string,
  sector: string | null
): string {
  return source.name
    .replace("{TICKER}", ticker.toUpperCase())
    .replace("{SECTOR}", sector ?? "");
}
