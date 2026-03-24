/**
 * /pricing  —  TinyFish × DataP.ai pricing page
 *
 * Four tiers: Signal Watch (free), Individual ($49), Professional ($299),
 *             Business ($999), Enterprise (contact)
 */

import type { Metadata } from "next";
import Link from "next/link";
import { getLang } from "@/lib/getLang";
import { loadTranslations } from "@/lib/i18n";
import { t } from "@/lib/translations";
import { getPricingTiers, type PricingTier } from "@/lib/db";

export const metadata: Metadata = {
  title: "Pricing — TinyFish × DataP.ai Stock Intelligence",
  description:
    "Signal Watch (free) · Individual ($49) · Professional ($299) · Business ($999). AI-powered stock language intelligence for self-directed investors, advisors and institutions.",
};

// ─── Feature matrix ──────────────────────────────────────────────────────────

interface Feature { key: string; text: string; noteKey?: string; note: string | null; disabled?: boolean }
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
      { key: "pf_stocks_monitored", text: "10 stocks monitored", note: "US & ASX" },
      { key: "pf_weekly_scan", text: "Weekly IR page scan", note: null },
      { key: "pf_lang_shift_alerts", text: "Language shift alerts", noteKey: "pf_note_commitment", note: "commitment · hedging · risk" },
      { key: "pf_scan_history_30d", text: "30-day scan history", note: null },
      { key: "pf_confidence_scores", text: "Confidence scores", note: null },
      { key: "pf_watchlist", text: "Watchlist", note: null },
      { key: "pf_daily_scan", text: "Daily scan", note: null, disabled: true },
      { key: "pf_ai_technical", text: "AI Technical Signal", note: null, disabled: true },
      { key: "pf_chart_vision", text: "Chart Vision (Gemini)", note: null, disabled: true },
      { key: "pf_asx_trading", text: "ASX Trading Signal", note: null, disabled: true },
      { key: "pf_api_access", text: "API access", note: null, disabled: true },
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
      { key: "pf_stocks_monitored", text: "50 stocks monitored", note: "US & ASX" },
      { key: "pf_daily_ir_scan", text: "Daily IR page scan", noteKey: "pf_note_every_trading", note: "every trading day" },
      { key: "pf_lang_shift_alerts", text: "Language shift alerts", noteKey: "pf_full_pipeline", note: "full signal pipeline" },
      { key: "pf_scan_history_1y", text: "1-year scan history", note: null },
      { key: "pf_conf_relevance", text: "Confidence + relevance scores", note: null },
      { key: "pf_watchlist_email", text: "Watchlist + email alerts", note: null },
      { key: "pf_ai_technical", text: "📈 AI Technical Signal", note: "Gemini + GPT‑4o" },
      { key: "pf_chart_vision", text: "📊 Chart Vision", note: "Gemini Vision 3-panel" },
      { key: "pf_asx_trading", text: "🎯 ASX Trading Signal", noteKey: "pf_note_ir_live", note: "IR context + live price" },
      { key: "pf_signal_cache", text: "6-hour signal cache", noteKey: "pf_note_instant", note: "instant repeat loads" },
      { key: "pf_api_access", text: "API access", note: null, disabled: true },
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
      { key: "pf_stocks_monitored", text: "200 stocks monitored", note: "US & ASX" },
      { key: "pf_multi_scans", text: "Multiple daily scans", noteKey: "pf_note_configurable", note: "configurable schedule" },
      { key: "pf_full_ai_pipeline", text: "Full AI signal pipeline", noteKey: "pf_note_6agents", note: "all 6 agents" },
      { key: "pf_unlimited_history", text: "Unlimited scan history", note: null },
      { key: "pf_all_individual", text: "All Individual AI features", note: null },
      { key: "pf_priority_processing", text: "Priority signal processing", note: null },
      { key: "pf_rest_api", text: "📡 REST API access", note: "JSON · OpenAPI spec" },
      { key: "pf_webhooks", text: "Webhook alerts", noteKey: "pf_note_realtime", note: "real-time push" },
      { key: "pf_data_export", text: "Historical data export", note: "CSV / JSON" },
      { key: "pf_team_seats", text: "3 team seats", noteKey: "pf_note_addl_seats", note: "additional seats available" },
      { key: "pf_white_label", text: "White-label option", note: null, disabled: true },
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
      { key: "pf_unlimited_stocks", text: "Unlimited stocks", note: "9,000+ US · 2,000+ ASX" },
      { key: "pf_unlimited_scans", text: "Unlimited scans", noteKey: "pf_note_configurable", note: "configurable schedule" },
      { key: "pf_full_ai_pipeline", text: "Full AI signal pipeline", noteKey: "pf_note_6agents", note: "all 6 agents" },
      { key: "pf_all_professional", text: "All Professional features", note: null },
      { key: "pf_custom_alerts", text: "Custom alert rules", noteKey: "pf_note_sector_score", note: "sector · score threshold" },
      { key: "pf_team_seats", text: "10 team seats", noteKey: "pf_note_addl_request", note: "additional seats on request" },
      { key: "pf_dedicated_support", text: "Dedicated support", noteKey: "pf_note_sla", note: "guaranteed response SLA" },
      { key: "pf_white_label", text: "🏷️ White-label option", noteKey: "pf_note_on_request", note: "on request" },
      { key: "pf_custom_integrations", text: "Custom integrations", note: "Bloomberg · Slack · webhooks" },
      { key: "pf_invoiced_billing", text: "Invoiced billing", noteKey: "pf_note_annual_contract", note: "annual contract available" },
      { key: "pf_ir_monitoring_own", text: "IR monitoring for your own listings", noteKey: "pf_note_competitors", note: "watch competitors too" },
    ],
  },
];

// ─── Competitor comparison ────────────────────────────────────────────────────

type CompareValue = boolean | string;
interface CompareRow {
  key: string;
  feature: string;
  tinyfish: CompareValue;
  simplyWallSt: CompareValue;
  bloomberg: CompareValue;
  bloombergKey?: string;
  highlight?: boolean;
}

const COMPARE_ROWS: CompareRow[] = [
  { key: "cmp_live_price",       feature: "Live US / ASX price data",         tinyfish: true,   simplyWallSt: true,   bloomberg: true  },
  { key: "cmp_ta_indicators",    feature: "Technical indicators (RSI, MACD…)",tinyfish: true,   simplyWallSt: true,   bloomberg: true  },
  { key: "cmp_broker_consensus", feature: "Broker consensus & price targets", tinyfish: true,   simplyWallSt: true,   bloomberg: true  },
  { key: "cmp_fundamental",      feature: "Fundamental scoring",              tinyfish: true,   simplyWallSt: true,   bloomberg: true  },
  { key: "cmp_macro",            feature: "Macro & geopolitical risk scoring",tinyfish: true,   simplyWallSt: false,  bloomberg: "News only", bloombergKey: "cmp_news_only", highlight: true },
  { key: "cmp_ir_detection",     feature: "IR page language change detection",tinyfish: true,   simplyWallSt: false,  bloomberg: false, highlight: true },
  { key: "cmp_real_browser",     feature: "Real-browser JS rendering",        tinyfish: true,   simplyWallSt: false,  bloomberg: false, highlight: true },
  { key: "cmp_ai_pipeline",      feature: "AI signal pipeline (6 agents)",    tinyfish: true,   simplyWallSt: false,  bloomberg: false, highlight: true },
  { key: "cmp_noise_filter",     feature: "Noise filter (content vs layout)", tinyfish: true,   simplyWallSt: false,  bloomberg: false, highlight: true },
  { key: "cmp_investigation",    feature: "Investigation agent",              tinyfish: true,   simplyWallSt: false,  bloomberg: false, highlight: true },
  { key: "cmp_gemini_vision",    feature: "Gemini Vision chart analysis",     tinyfish: true,   simplyWallSt: false,  bloomberg: false, highlight: true },
  { key: "cmp_asx_trading",      feature: "ASX Trading Signal (IR + price)",  tinyfish: true,   simplyWallSt: false,  bloomberg: false, highlight: true },
  { key: "cmp_api_webhooks",     feature: "REST API + webhooks",              tinyfish: true,   simplyWallSt: false,  bloomberg: true  },
  { key: "cmp_price_entry",      feature: "Price (entry)",                    tinyfish: "Free", simplyWallSt: "Free", bloomberg: "~$24k/yr" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PricingPage() {
  const lang = await getLang();
  const labels = await loadTranslations(lang);

  // Fetch region-specific pricing from DB (falls back to 'en'/AUD)
  const dbTiers = await getPricingTiers(lang);
  const priceMap: Record<string, PricingTier> = {};
  for (const pt of dbTiers) priceMap[pt.tier_id] = pt;

  // Currency info from DB (or defaults)
  const sym = priceMap.individual?.currency_symbol ?? "$";
  const cur = priceMap.individual?.currency ?? "AUD";

  // Build localized tier data
  const TIER_I18N: Record<string, { name: string; tagline: string; badge: string | null; cta: string }> = {
    watch:        { name: t(labels, "pricing_tier_watch"),        tagline: t(labels, "pricing_tag_watch"),        badge: null,                                    cta: t(labels, "pricing_cta_free") },
    individual:   { name: t(labels, "pricing_tier_individual"),   tagline: t(labels, "pricing_tag_individual"),   badge: t(labels, "pricing_badge_popular"),       cta: t(labels, "pricing_cta_trial") },
    professional: { name: t(labels, "pricing_tier_professional"), tagline: t(labels, "pricing_tag_professional"), badge: null,                                    cta: t(labels, "pricing_cta_trial") },
    business:     { name: t(labels, "pricing_tier_business"),     tagline: t(labels, "pricing_tag_business"),     badge: t(labels, "pricing_badge_institutional"), cta: t(labels, "pricing_cta_contact") },
  };

  /** Format price for display — no decimals for whole numbers / large currencies */
  function fmtPrice(amount: number): string {
    if (amount === 0) return "";
    // VND, KRW, JPY — no decimals, use thousands separator
    if (["VND", "KRW", "JPY"].includes(cur)) {
      return amount.toLocaleString("en-US", { maximumFractionDigits: 0 });
    }
    // AUD, USD, MYR, THB — show decimals only if needed
    return amount % 1 === 0 ? amount.toLocaleString("en-US", { maximumFractionDigits: 0 }) : amount.toFixed(2);
  }

  return (
    <div className="min-h-screen bg-[#fcfcfd]">

      {/* Hero */}
      <div
        className="w-full"
        style={{ background: "linear-gradient(45deg, seagreen, darkseagreen)", paddingTop: "48px", paddingBottom: "52px" }}
      >
        <div className="max-w-5xl mx-auto px-6 space-y-4">
          <p className="text-white/60 text-sm font-medium uppercase tracking-widest">{t(labels, "pricing_hero_label")}</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            {t(labels, "pricing_hero_title")}
          </h1>
          <p className="text-white/75 text-lg max-w-2xl">
            {t(labels, "pricing_hero_desc")}
          </p>
          <p className="text-white/50 text-sm">
            {t(labels, "pricing_hero_note").replace("AUD", cur)}
          </p>
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
              {TIER_I18N[tier.id]?.badge && (
                <div
                  className="text-center text-xs font-bold uppercase tracking-widest py-1.5"
                  style={
                    tier.id === "individual"
                      ? { background: "#2e8b57", color: "#fff" }
                      : { background: "#1a1a2e", color: "#a5b4fc" }
                  }
                >
                  {TIER_I18N[tier.id].badge}
                </div>
              )}

              <div className="p-8 flex flex-col flex-1">
                {/* Name + tagline */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-[#252525]">{TIER_I18N[tier.id]?.name ?? tier.name}</h2>
                  <p className="text-gray-400 text-sm mt-1">{TIER_I18N[tier.id]?.tagline ?? tier.tagline}</p>
                </div>

                {/* Price — from DB regional pricing */}
                <div className="mb-6">
                  {(() => {
                    const dbP = priceMap[tier.id];
                    const mp = dbP?.monthly_price ?? tier.price.monthly;
                    const ap = dbP?.annual_price ?? tier.price.annual;
                    const cs = dbP?.currency_symbol ?? "$";
                    if (mp === 0) return <div className="text-5xl font-bold text-[#252525]">{t(labels, "pricing_free")}</div>;
                    const savePct = Math.round((1 - ap / (mp * 12)) * 100);
                    return (
                      <>
                        <div className="flex items-end gap-1">
                          <span className="text-5xl font-bold text-[#252525]">
                            {cs}{fmtPrice(mp)}
                          </span>
                          <span className="text-gray-400 text-base mb-1.5">{t(labels, "pricing_per_mo")}</span>
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          {t(labels, "pricing_or")}{" "}
                          <span className="font-semibold text-[#2e8b57]">
                            {cs}{fmtPrice(ap)}{t(labels, "pricing_per_yr")}
                          </span>{" "}
                          <span className="text-xs">
                            ({t(labels, "pricing_save")} {savePct}%)
                          </span>
                        </div>
                      </>
                    );
                  })()}
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
                  {TIER_I18N[tier.id]?.cta ?? tier.cta.label}
                </Link>

                {/* Feature list */}
                <ul className="space-y-3 flex-1">
                  {tier.features.map((f) => {
                    const fText = t(labels, f.key) !== f.key ? t(labels, f.key) : f.text;
                    const fNote = f.noteKey ? (t(labels, f.noteKey) !== f.noteKey ? t(labels, f.noteKey) : f.note) : f.note;
                    // For "N stocks monitored" style: extract leading number + translate label
                    const numMatch = f.text.match(/^(\d+[\s-])/);
                    const displayText = numMatch ? `${numMatch[1]}${t(labels, f.key)}` : fText;
                    return (
                      <li
                        key={f.key + f.text}
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
                            {f.disabled ? displayText.replace(/^[📈📊🎯📡🏷️]\s?/, "") : displayText}
                          </span>
                          {fNote && !f.disabled && (
                            <span className="text-gray-400 ml-1">· {fNote}</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* ── What makes this different ────────────────────────────────────── */}
        <div>
          <h2 className="text-3xl font-bold text-[#252525] mb-2">{t(labels, "pricing_what_buying")}</h2>
          <p className="text-gray-400 mb-10 max-w-2xl">
            {t(labels, "pricing_what_buying_desc")}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { icon: "🌊", titleKey: "pricing_card1_title", descKey: "pricing_card1_desc" },
              { icon: "🤖", titleKey: "pricing_card2_title", descKey: "pricing_card2_desc" },
              { icon: "📊", titleKey: "pricing_card3_title", descKey: "pricing_card3_desc" },
              { icon: "🎯", titleKey: "pricing_card4_title", descKey: "pricing_card4_desc" },
            ].map((item) => (
              <div key={item.titleKey} className="bg-white border border-gray-200 rounded-2xl p-7 shadow-sm">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="font-bold text-[#252525] text-lg mb-2">{t(labels, item.titleKey)}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{t(labels, item.descKey)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Comparison table ─────────────────────────────────────────────── */}
        <div>
          <h2 className="text-3xl font-bold text-[#252525] mb-2">{t(labels, "pricing_how_compare")}</h2>
          <p className="text-gray-400 mb-8 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-[#2e8b57] font-semibold">
              <span>★</span> {t(labels, "pricing_unique_label")}
            </span>
            {" "}{t(labels, "pricing_unique_desc")}
          </p>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                    <th className="text-left px-6 py-4 font-semibold text-gray-500" style={{ width: "42%" }}>{t(labels, "pricing_feature_col")}</th>
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
                      key={row.key}
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
                            <span className="text-gray-700 font-medium">{t(labels, row.key)}</span>
                          </div>
                        </div>
                      </td>
                      {[
                        { val: row.tinyfish, style: "bold", color: "#2e8b57" },
                        { val: row.simplyWallSt, style: "normal", color: "#6b7280" },
                        { val: row.bloomberg, style: "normal", color: "#6b7280", key: row.bloombergKey },
                      ].map((cell, ci) => (
                        <td key={ci} className="text-center px-4 py-3.5">
                          {typeof cell.val === "boolean" ? (
                            cell.val ? (
                              <span style={{ color: cell.color }} className={`${cell.style === "bold" ? "font-bold text-base" : "font-medium"}`}>✓</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )
                          ) : (
                            <span className={`text-sm ${cell.style === "bold" ? "font-bold" : ""}`} style={{ color: cell.color }}>
                              {cell.val === "Free" ? t(labels, "pricing_free") : cell.key ? t(labels, cell.key) : cell.val}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-gray-300 mt-3">
            {t(labels, "pricing_competitor_note")} · Mar 2026
          </p>
        </div>

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-3xl font-bold text-[#252525] mb-8">{t(labels, "pricing_faq_title")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { q: t(labels, "pricing_faq_q1"), a: t(labels, "pricing_faq_a1") },
              { q: t(labels, "pricing_faq_q2"), a: t(labels, "pricing_faq_a2") },
              { q: t(labels, "pricing_faq_q3"), a: t(labels, "pricing_faq_a3") },
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
            {t(labels, "pricing_bottom_title")}
          </h2>
          <p className="text-white/60 mb-8 max-w-xl mx-auto">
            {t(labels, "pricing_bottom_desc")}
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/register"
              className="font-bold py-3 px-8 rounded-xl text-base transition-all hover:-translate-y-0.5 hover:shadow-lg"
              style={{ background: "#2e8b57", color: "#fff" }}
            >
              {t(labels, "pricing_cta_free")} →
            </Link>
            <Link
              href="/register?plan=individual"
              className="font-bold py-3 px-8 rounded-xl text-base transition-all hover:-translate-y-0.5"
              style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              {t(labels, "pricing_cta_try_individual")}
            </Link>
            <a
              href="mailto:donny@datap.ai?subject=Business plan enquiry"
              className="font-medium py-3 px-6 rounded-xl text-sm transition-colors"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              {t(labels, "pricing_cta_enterprise")}
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
