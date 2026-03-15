/**
 * /pricing  —  TinyFish × DataP.ai pricing page
 *
 * Four tiers: Signal Watch (free), Individual ($49), Professional ($299),
 *             Business ($999), Enterprise (contact)
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing — TinyFish × DataP.ai Stock Intelligence",
  description:
    "Signal Watch (free) · Individual ($49) · Professional ($299) · Business ($999). AI-powered stock language intelligence for self-directed investors, advisors and institutions.",
};

// ─── Feature matrix ──────────────────────────────────────────────────────────

interface Feature { text: string; note: string | null; disabled?: boolean }
interface Tier {
  id: string;
  name: string;
  tagline: string;
  price: { monthly: number; annual: number };
  cta: { label: string; href: string; style: "outline" | "solid" | "dark" };
  badge: string | null;
  features: Feature[];
}

const TIERS: Tier[] = [
  {
    id: "watch",
    name: "Signal Watch",
    tagline: "Get started. No card needed.",
    price: { monthly: 0, annual: 0 },
    cta: { label: "Start free", href: "/register", style: "outline" as const },
    badge: null,
    features: [
      { text: "5 stocks monitored", note: "US & ASX" },
      { text: "Weekly IR page scan", note: null },
      { text: "Language shift alerts", note: "commitment · hedging · risk" },
      { text: "30-day scan history", note: null },
      { text: "Confidence scores", note: null },
      { text: "Watchlist", note: null },
      { text: "Daily scan", note: null, disabled: true },
      { text: "AI Technical Signal", note: null, disabled: true },
      { text: "Chart Vision (Gemini)", note: null, disabled: true },
      { text: "ASX Trading Signal", note: null, disabled: true },
      { text: "API access", note: null, disabled: true },
    ],
  },
  {
    id: "individual",
    name: "Individual",
    tagline: "For the serious self-directed investor.",
    price: { monthly: 49, annual: 399 },
    cta: { label: "Start 14-day free trial", href: "/register?plan=individual", style: "solid" as const },
    badge: "Most popular",
    features: [
      { text: "50 stocks monitored", note: "US & ASX" },
      { text: "Daily IR page scan", note: "every trading day" },
      { text: "Language shift alerts", note: "full signal pipeline" },
      { text: "1-year scan history", note: null },
      { text: "Confidence + relevance scores", note: null },
      { text: "Watchlist + email alerts", note: null },
      { text: "📈 AI Technical Signal", note: "Gemini + GPT‑4o" },
      { text: "📊 Chart Vision", note: "Gemini Vision 3-panel" },
      { text: "🎯 ASX Trading Signal", note: "IR context + live price" },
      { text: "6-hour signal cache", note: "instant repeat loads" },
      { text: "API access", note: null, disabled: true },
    ],
  },
  {
    id: "professional",
    name: "Professional",
    tagline: "For active traders, advisors & small teams.",
    price: { monthly: 299, annual: 2499 },
    cta: { label: "Start 14-day free trial", href: "/register?plan=professional", style: "solid" as const },
    badge: null,
    features: [
      { text: "200 stocks monitored", note: "US & ASX" },
      { text: "Multiple daily scans", note: "configurable schedule" },
      { text: "Full AI signal pipeline", note: "all 6 agents" },
      { text: "Unlimited scan history", note: null },
      { text: "All Individual AI features", note: null },
      { text: "Priority signal processing", note: null },
      { text: "📡 REST API access", note: "JSON · OpenAPI spec" },
      { text: "Webhook alerts", note: "real-time push" },
      { text: "Historical data export", note: "CSV / JSON" },
      { text: "3 team seats", note: "additional seats available" },
      { text: "White-label option", note: null, disabled: true },
    ],
  },
  {
    id: "business",
    name: "Business",
    tagline: "For funds, desks and research teams.",
    price: { monthly: 999, annual: 8999 },
    cta: { label: "Contact us", href: "mailto:donny@datap.ai?subject=Business plan enquiry", style: "dark" as const },
    badge: "Institutional",
    features: [
      { text: "Unlimited stocks", note: "9,000+ US · 2,000+ ASX" },
      { text: "Unlimited scans", note: "configurable schedule" },
      { text: "Full AI signal pipeline", note: "all 6 agents" },
      { text: "All Professional features", note: null },
      { text: "Custom alert rules", note: "sector · score threshold" },
      { text: "10 team seats", note: "additional seats on request" },
      { text: "Dedicated support", note: "guaranteed response SLA" },
      { text: "🏷️ White-label option", note: "on request" },
      { text: "Custom integrations", note: "Bloomberg · Slack · webhooks" },
      { text: "Invoiced billing", note: "annual contract available" },
      { text: "IR monitoring for your own listings", note: "watch competitors too" },
    ],
  },
];

// ─── Competitor comparison ────────────────────────────────────────────────────

type CompareValue = boolean | string;
interface CompareRow {
  feature: string;
  note?: string;
  tinyfish: CompareValue;
  simplyWallSt: CompareValue;
  bloomberg: CompareValue;
  highlight?: boolean;   // rows where TF uniquely wins
}

const COMPARE_ROWS: CompareRow[] = [
  // ── Standard features (all tools have these) ──────────────────────────────
  { feature: "Live US / ASX price data",            tinyfish: true,   simplyWallSt: true,   bloomberg: true  },
  { feature: "Technical indicators (RSI, MACD…)",   tinyfish: true,   simplyWallSt: true,   bloomberg: true  },
  { feature: "Broker consensus & price targets",    tinyfish: true,   simplyWallSt: true,   bloomberg: true,
    note: "TF via Gemini grounding · refreshed nightly" },
  { feature: "Fundamental scoring (valuation / quality / growth)",
                                                    tinyfish: true,   simplyWallSt: true,   bloomberg: true,
    note: "TF adds macro + geopolitical dimension" },
  // ── Differentiators ───────────────────────────────────────────────────────
  { feature: "Macro & geopolitical risk scoring",   tinyfish: true,   simplyWallSt: false,  bloomberg: "News only",
    highlight: true, note: "Fed / ECB / tariffs / supply-chain — AI-scored per sector" },
  { feature: "IR page language change detection",   tinyfish: true,   simplyWallSt: false,  bloomberg: false,
    highlight: true },
  { feature: "Real-browser JS rendering of IR pages", tinyfish: true, simplyWallSt: false,  bloomberg: false,
    highlight: true, note: "TinyFish headless browser — dynamic content not missed" },
  { feature: "AI signal pipeline (6 agents)",       tinyfish: true,   simplyWallSt: false,  bloomberg: false,
    highlight: true, note: "Forward Guidance · Risk · Tone · Quality · Investigation · Validation" },
  { feature: "Noise filter (content vs layout)",    tinyfish: true,   simplyWallSt: false,  bloomberg: false,
    highlight: true },
  { feature: "Investigation agent (corroboration)", tinyfish: true,   simplyWallSt: false,  bloomberg: false,
    highlight: true, note: "Probes press releases + exchange filings to confirm signals" },
  { feature: "Gemini Vision chart analysis",        tinyfish: true,   simplyWallSt: false,  bloomberg: false,
    highlight: true },
  { feature: "ASX Trading Signal (IR + price)",     tinyfish: true,   simplyWallSt: false,  bloomberg: false,
    highlight: true, note: "Unique: IR language + live multi-timeframe TA → BUY/HOLD/SELL" },
  { feature: "REST API + webhooks",                 tinyfish: true,   simplyWallSt: false,  bloomberg: true  },
  // ── Price ─────────────────────────────────────────────────────────────────
  { feature: "Price (entry)",                       tinyfish: "Free", simplyWallSt: "Free", bloomberg: "~$24k/yr" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#fcfcfd]">

      {/* Hero */}
      <div
        className="w-full"
        style={{ background: "linear-gradient(45deg, seagreen, darkseagreen)", paddingTop: "48px", paddingBottom: "52px" }}
      >
        <div className="max-w-5xl mx-auto px-6 space-y-4">
          <p className="text-white/60 text-sm font-medium uppercase tracking-widest">Pricing</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            Know what changed before the market does
          </h1>
          <p className="text-white/75 text-lg max-w-2xl">
            AI agents scan 9,000+ company websites daily, detect language shifts in forward guidance
            and risk disclosures, and surface actionable signals — before they move stock prices.
          </p>
          <p className="text-white/50 text-sm">Prices in AUD · No lock-in · Cancel any time</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16 space-y-20">

        {/* ── Pricing cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className="relative bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col"
              style={{
                border: tier.id === "individual"
                  ? "2px solid #2e8b57"
                  : "1px solid #e5e7eb",
              }}
            >
              {/* Badge */}
              {tier.badge && (
                <div
                  className="text-center text-xs font-bold uppercase tracking-widest py-1.5"
                  style={
                    tier.id === "individual"
                      ? { background: "#2e8b57", color: "#fff" }
                      : { background: "#1a1a2e", color: "#a5b4fc" }
                  }
                >
                  {tier.badge}
                </div>
              )}

              <div className="p-8 flex flex-col flex-1">
                {/* Name + tagline */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-[#252525]">{tier.name}</h2>
                  <p className="text-gray-400 text-sm mt-1">{tier.tagline}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  {tier.price.monthly === 0 ? (
                    <div className="text-5xl font-bold text-[#252525]">Free</div>
                  ) : (
                    <>
                      <div className="flex items-end gap-1">
                        <span className="text-5xl font-bold text-[#252525]">
                          ${tier.price.monthly}
                        </span>
                        <span className="text-gray-400 text-base mb-1.5">/mo</span>
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        or{" "}
                        <span className="font-semibold text-[#2e8b57]">
                          ${tier.price.annual}/yr
                        </span>{" "}
                        <span className="text-xs">
                          (save {Math.round((1 - tier.price.annual / (tier.price.monthly * 12)) * 100)}%)
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* CTA */}
                <Link
                  href={tier.cta.href}
                  className="block text-center font-bold py-3 px-6 rounded-xl text-sm mb-8 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  style={
                    tier.cta.style === "solid"
                      ? { background: "#2e8b57", color: "#fff" }
                      : tier.cta.style === "dark"
                      ? { background: "#1a1a2e", color: "#fff" }
                      : { background: "transparent", color: "#2e8b57", border: "1.5px solid #2e8b57" }
                  }
                >
                  {tier.cta.label}
                </Link>

                {/* Feature list */}
                <ul className="space-y-3 flex-1">
                  {tier.features.map((f) => (
                    <li
                      key={f.text}
                      className={`flex items-start gap-2.5 text-sm ${
                        f.disabled ? "opacity-35" : ""
                      }`}
                    >
                      <span
                        className="flex-shrink-0 mt-0.5 text-base"
                        style={{ color: f.disabled ? "#9ca3af" : "#2e8b57" }}
                      >
                        {f.disabled ? "✕" : "✓"}
                      </span>
                      <span>
                        <span className={f.disabled ? "text-gray-400" : "text-[#252525] font-medium"}>
                          {f.disabled ? f.text.slice(2) : f.text}
                        </span>
                        {f.note && !f.disabled && (
                          <span className="text-gray-400 ml-1">· {f.note}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* ── What makes this different ────────────────────────────────────── */}
        <div>
          <h2 className="text-3xl font-bold text-[#252525] mb-2">What you&apos;re actually buying</h2>
          <p className="text-gray-400 mb-10 max-w-2xl">
            Simply Wall St gives you fundamental scores and broker consensus. Bloomberg gives you
            everything at enterprise cost. TinyFish × DataP.ai is the only platform that reads what
            companies quietly change on their websites — before it moves the stock price.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              {
                icon: "🌊",
                title: "TinyFish real-browser fetch",
                desc: "Renders JavaScript-heavy investor relations pages exactly as a human would see them. No scraping shortcuts that miss dynamic content.",
              },
              {
                icon: "🤖",
                title: "6-agent AI pipeline",
                desc: "Forward Guidance · Risk Disclosure · Tone Shift · Signal Quality · Investigation · Cross-Validation. Each agent adds a layer of signal fidelity.",
              },
              {
                icon: "📊",
                title: "Fundamental + macro scoring",
                desc: "AI-computed valuation, quality, growth, and macro/geopolitical scores — refreshed nightly from yfinance + Gemini grounding across Reuters, FT, WSJ, IMF sources.",
              },
              {
                icon: "🎯",
                title: "ASX Trading Signal",
                desc: "Uniquely combines TinyFish IR page language intelligence with live multi-timeframe price data into a single BUY/HOLD/SELL signal with entry, target and stop.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-white border border-gray-200 rounded-2xl p-7 shadow-sm">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="font-bold text-[#252525] text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Comparison table ─────────────────────────────────────────────── */}
        <div>
          <h2 className="text-3xl font-bold text-[#252525] mb-2">How we compare</h2>
          <p className="text-gray-400 mb-8 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-[#2e8b57] font-semibold">
              <span>★</span> Unique to TinyFish × DataP.ai
            </span>
            {" "}— features no other retail platform offers.
          </p>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                    <th className="text-left px-6 py-4 font-semibold text-gray-500" style={{ width: "42%" }}>Feature</th>
                    <th className="text-center px-4 py-4 font-bold text-[#2e8b57]">
                      TinyFish × DataP.ai
                    </th>
                    <th className="text-center px-4 py-4 font-semibold text-gray-400">
                      Simply Wall St
                    </th>
                    <th className="text-center px-4 py-4 font-semibold text-gray-400">
                      Bloomberg
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((row, i) => (
                    <tr
                      key={row.feature}
                      style={{
                        borderBottom: i < COMPARE_ROWS.length - 1 ? "1px solid #f3f4f6" : "none",
                        background: row.highlight ? "rgba(46,139,87,0.03)" : undefined,
                      }}
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-start gap-2">
                          {row.highlight && (
                            <span className="text-[#2e8b57] text-xs mt-0.5 flex-shrink-0">★</span>
                          )}
                          <div>
                            <span className="text-gray-700 font-medium">{row.feature}</span>
                            {row.note && (
                              <div className="text-gray-400 text-xs mt-0.5">{row.note}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-center px-4 py-3.5">
                        {typeof row.tinyfish === "boolean" ? (
                          row.tinyfish ? (
                            <span className="text-[#2e8b57] font-bold text-base">✓</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )
                        ) : (
                          <span className="font-bold text-[#2e8b57] text-sm">{row.tinyfish}</span>
                        )}
                      </td>
                      <td className="text-center px-4 py-3.5">
                        {typeof row.simplyWallSt === "boolean" ? (
                          row.simplyWallSt ? (
                            <span className="text-gray-400 font-medium">✓</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )
                        ) : (
                          <span className="text-gray-500 text-sm">{row.simplyWallSt}</span>
                        )}
                      </td>
                      <td className="text-center px-4 py-3.5">
                        {typeof row.bloomberg === "boolean" ? (
                          row.bloomberg ? (
                            <span className="text-gray-400 font-medium">✓</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )
                        ) : (
                          <span className="text-gray-500 text-sm">{row.bloomberg}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-gray-300 mt-3">
            Competitor data based on publicly available information · Mar 2026
          </p>
        </div>

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-3xl font-bold text-[#252525] mb-8">Frequently asked questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                q: "What does \"language shift\" mean?",
                a: "Companies quietly change the wording on their investor relations pages before announcements — removing forward guidance, adding risk disclaimers, softening commitment language. These shifts often precede material price moves by days or weeks.",
              },
              {
                q: "Which stocks are covered?",
                a: "9,000+ US-listed stocks (NYSE, NASDAQ, AMEX) and 2,000+ ASX-listed companies. The Pro plan covers 50 stocks of your choice; Signal Command covers the full universe.",
              },
              {
                q: "How is this different from Simply Wall St or a broker consensus tool?",
                a: "Simply Wall St scores fundamentals from reported financials — backward-looking by definition. We add two layers they don't have: (1) real-time IR page language monitoring that catches guidance changes before they show up in financials, and (2) macro/geopolitical context scoring so you know whether the sector tailwind or headwind is priced in.",
              },
              {
                q: "What is the ASX Trading Signal?",
                a: "A unique feature that combines TinyFish IR page language intelligence (what the company changed on their website) with live multi-timeframe price data to generate a STRONG BUY / BUY / HOLD / SELL / STRONG SELL signal with per-timeframe entry, target and stop-loss levels.",
              },
              {
                q: "Is this financial advice?",
                a: "No. All signals are AI-generated and for informational purposes only. They do not constitute financial advice. Always do your own research before making investment decisions.",
              },
              {
                q: "Can I use the API to build my own tools?",
                a: "Yes — Signal Command includes REST API access with an OpenAPI spec, webhook support for real-time alerts, and JSON data export. Contact us for integration details.",
              },
            ].map((item) => (
              <div key={item.q} className="bg-white border border-gray-200 rounded-2xl p-7 shadow-sm">
                <h3 className="font-bold text-[#252525] mb-2">{item.q}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <h2 className="text-3xl font-bold text-white mb-3">
            Ready to see what changed — before the market does?
          </h2>
          <p className="text-white/60 mb-8 max-w-xl mx-auto">
            Start free. No credit card required. Upgrade when you need more stocks or daily scans.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/register"
              className="font-bold py-3 px-8 rounded-xl text-base transition-all hover:-translate-y-0.5 hover:shadow-lg"
              style={{ background: "#2e8b57", color: "#fff" }}
            >
              Start free →
            </Link>
            <Link
              href="/register?plan=individual"
              className="font-bold py-3 px-8 rounded-xl text-base transition-all hover:-translate-y-0.5"
              style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              Try Individual free for 14 days
            </Link>
            <a
              href="mailto:donny@datap.ai?subject=Business plan enquiry"
              className="font-medium py-3 px-6 rounded-xl text-sm transition-colors"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Business / Enterprise enquiry →
            </a>
          </div>
          <p className="text-white/25 text-xs mt-8">
            Powered by TinyFish real-browser technology · ag2 AI agent framework · DataP.ai
          </p>
        </div>

      </div>
    </div>
  );
}
