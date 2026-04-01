/**
 * /why-datapai  —  "Why DataP.ai" marketing page
 *
 * Evidence-based trust page for customers, broker partners, and VCs.
 * Shows RESULTS only — never reveals implementation details.
 * Fully translated in all 8 supported languages.
 */

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getLang } from "@/lib/getLang";
import { loadTranslations } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Why DataP.ai — AI Stock Research That Gets The Numbers Right",
  description:
    "Real-time stock prices verified against Google Finance. 13 markets. 8 native languages. See how we compare to leading AI assistants.",
};

/* ── Constants ──────────────────────────────────────────────────────────────── */

const MARKETS = [
  { flag: "🇺🇸", key: "nav_usStocks",  stocks: "9,000+", href: "/us" },
  { flag: "🇦🇺", key: "nav_asx",       stocks: "2,000+", href: "/asx" },
  { flag: "🇭🇰", key: "nav_hongkong",  stocks: "3,000+", href: "/hongkong" },
  { flag: "🇹🇼", key: "nav_taiwan",    stocks: "1,900+", href: "/taiwan" },
  { flag: "🇸🇬", key: "nav_singapore", stocks: "700+",   href: "/singapore" },
  { flag: "🇯🇵", key: "nav_japan",     stocks: "3,800+", href: "/japan" },
  { flag: "🇨🇳", key: "nav_china",     stocks: "9,000+", href: "/china" },
  { flag: "🇻🇳", key: "nav_vietnam",   stocks: "400+",   href: "/vietnam" },
  { flag: "🇹🇭", key: "nav_thailand",  stocks: "450+",   href: "/thailand" },
  { flag: "🇲🇾", key: "nav_malaysia",  stocks: "1,000+", href: "/malaysia" },
  { flag: "🇮🇩", key: "nav_indonesia", stocks: "800+",   href: "/indonesia" },
  { flag: "🇬🇧", key: "nav_uk",        stocks: "2,600+", href: "/uk" },
  { flag: "🇮🇳", key: "why_india",     stocks: "5,000+", href: "#" },
];

const COMPARE_ROWS = [
  { key: "why_cmp_price",     datapai: "correct",  compA: "wrong",   compB: "wrong"   },
  { key: "why_cmp_ohlcv",     datapai: "correct",  compA: "wrong",   compB: "wrong"   },
  { key: "why_cmp_lang",      datapai: "full",     compA: "limited", compB: "partial" },
  { key: "why_cmp_timezone",  datapai: "correct",  compA: "missing", compB: "missing" },
  { key: "why_cmp_company",   datapai: "correct",  compA: "missing", compB: "missing" },
  { key: "why_cmp_format",    datapai: "correct",  compA: "wrong",   compB: "wrong"   },
];

const LANG_SHOWCASE = [
  { flag: "🇬🇧", lang: "English",      example: "BHP Group Limited (BHP): $52.56 · ASX · Close Apr 01 04:10 PM Sydney time",          img: "datapai-bhp-en.png" },
  { flag: "🇨🇳", lang: "简体中文",      example: "必和必拓集团 (BHP): $52.56 · ASX · 收盘 4月01日 04:10 PM 悉尼时间",                    img: "datapai-bhp-zh.png" },
  { flag: "🇻🇳", lang: "Tiếng Việt",   example: "BHP Group Limited (BHP): $52.56 · ASX · Đóng cửa Apr 01 04:10 PM giờ Sydney",        img: "datapai-bhp-vi.png" },
  { flag: "🇯🇵", lang: "日本語",        example: "BHPグループ (BHP): $52.56 · ASX · 終値 4月01日 04:10 PM シドニー時間",                  img: "datapai-bhp-ja.png" },
  { flag: "🇰🇷", lang: "한국어",        example: "BHP 그룹 (BHP): $52.56 · ASX · 종가 4월01일 04:10 PM 시드니 시간",                    img: "datapai-bhp-ko.png" },
  { flag: "🇹🇭", lang: "ภาษาไทย",      example: "BHP Group (BHP): $52.56 · ASX · ปิด Apr 01 04:10 PM เวลาซิดนีย์",                    img: "datapai-bhp-th.png" },
];

const FEATURES = [
  { icon: "🔍", titleKey: "why_feat1_title", descKey: "why_feat1_desc",
    ft: "Website Intelligence", fd: "Know when company IR pages change before the market reacts. Our agents monitor thousands of corporate pages 24/7." },
  { icon: "🤖", titleKey: "why_feat2_title", descKey: "why_feat2_desc",
    ft: "Multi-Agent Analysis", fd: "Multiple AI agents analyse each stock independently, then debate and cross-validate. Only consensus signals survive." },
  { icon: "🔔", titleKey: "why_feat3_title", descKey: "why_feat3_desc",
    ft: "Smart Alerts", fd: "Price, volume, and IR-change alerts delivered in your language, in your timezone. Never miss a signal." },
  { icon: "🧪", titleKey: "why_feat4_title", descKey: "why_feat4_desc",
    ft: "Custom Strategies", fd: "Build, backtest, and deploy your own AI strategy in our Studio. 5 years of historical data. Your strategy, your edge." },
];

/* ── Helper ─────────────────────────────────────────────────────────────────── */

function tl(labels: Record<string, string>, key: string, fallback: string): string {
  return labels[key] || fallback;
}

function renderCompareCell(value: string, labels: Record<string, string>) {
  if (value === "correct" || value === "full") {
    return <span className="font-bold" style={{ color: "#2e8b57" }}>✓</span>;
  }
  if (value === "wrong") {
    return <span className="font-bold" style={{ color: "#ef4444" }}>✗</span>;
  }
  if (value === "missing") {
    return <span className="text-gray-300">—</span>;
  }
  if (value === "partial") {
    return <span className="text-amber-400 font-medium">~</span>;
  }
  if (value === "limited") {
    return <span className="text-amber-400 font-medium">~</span>;
  }
  return <span className="text-gray-400 text-xs">{value}</span>;
}

/* ── Page ────────────────────────────────────────────────────────────────────── */

export default async function WhyDatapaiPage() {
  const lang = await getLang();
  const labels = await loadTranslations(lang);

  return (
    <div className="min-h-screen bg-[#fcfcfd]">

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1: HERO
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        className="w-full"
        style={{ background: "linear-gradient(45deg, seagreen, darkseagreen)", paddingTop: "60px", paddingBottom: "60px" }}
      >
        <div className="max-w-5xl mx-auto px-6 space-y-5">
          <p className="text-white/60 text-sm font-medium uppercase tracking-widest">
            {tl(labels, "why_hero_label", "Why DataP.ai")}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            {tl(labels, "why_hero_headline", "AI Stock Research That Gets The Numbers Right")}
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl">
            {tl(labels, "why_hero_sub", "13 markets. 8 native languages. Real-time OHLCV data verified against Google Finance.")}
          </p>

          {/* Audience pills */}
          <div className="flex items-center gap-3 flex-wrap pt-2">
            {[
              { key: "why_audience_investors", fallback: "Self-Directed Investors" },
              { key: "why_audience_partners",  fallback: "Broker Partners" },
              { key: "why_audience_vcs",       fallback: "Investors & VCs" },
            ].map((a) => (
              <span key={a.key}
                className="px-4 py-1.5 rounded-full text-sm font-medium"
                style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)" }}>
                {tl(labels, a.key, a.fallback)}
              </span>
            ))}
          </div>

          {/* Market flags */}
          <div className="flex items-center gap-3 text-2xl pt-2">
            {MARKETS.map((m) => (
              <Link key={m.key} href={m.href} title={tl(labels, m.key, "")} className="hover:scale-125 transition-transform">
                {m.flag}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2: PRICE ACCURACY CHALLENGE
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-[#252525]">
            {tl(labels, "why_accuracy_title", "The Price Accuracy Challenge")}
          </h2>
          <p className="text-gray-500 mt-2 text-base max-w-2xl mx-auto">
            {tl(labels, "why_accuracy_sub", "We asked 3 AI assistants the same question: \"What is the current price of BHP on ASX?\" Here are the results.")}
          </p>
        </div>

        {/* Comparison table */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                  <th className="text-left px-6 py-4 font-semibold text-gray-500" style={{ width: "34%" }}>
                    {tl(labels, "why_cmp_metric", "Metric")}
                  </th>
                  <th className="text-center px-4 py-4 font-bold text-[#2e8b57]" style={{ borderLeft: "2px solid #2e8b57", borderRight: "2px solid #2e8b57" }}>
                    DataP.ai
                  </th>
                  <th className="text-center px-4 py-4 font-semibold text-gray-400">
                    {tl(labels, "why_cmp_competitor_a", "Leading Trading App AI")}
                  </th>
                  <th className="text-center px-4 py-4 font-semibold text-gray-400">
                    {tl(labels, "why_cmp_competitor_b", "Leading AI Assistant")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, i) => {
                  const rowLabels: Record<string, string> = {
                    "why_cmp_price":    tl(labels, "why_cmp_price",    "BHP Close Price (actual: $52.56)"),
                    "why_cmp_ohlcv":    tl(labels, "why_cmp_ohlcv",    "OHLCV Data (vs Google Finance)"),
                    "why_cmp_lang":     tl(labels, "why_cmp_lang",     "Native Language Support"),
                    "why_cmp_timezone": tl(labels, "why_cmp_timezone", "Local Timezone Display"),
                    "why_cmp_company":  tl(labels, "why_cmp_company",  "Company Name Translation"),
                    "why_cmp_format":   tl(labels, "why_cmp_format",   "Response Format (concise vs verbose)"),
                  };
                  return (
                    <tr key={row.key}
                      style={{
                        borderBottom: i < COMPARE_ROWS.length - 1 ? "1px solid #f3f4f6" : "none",
                        background: "rgba(46,139,87,0.02)",
                      }}>
                      <td className="px-6 py-3.5 text-gray-700 font-medium">{rowLabels[row.key]}</td>
                      <td className="text-center px-4 py-3.5" style={{ borderLeft: "2px solid #2e8b5720", borderRight: "2px solid #2e8b5720" }}>
                        {renderCompareCell(row.datapai, labels)}
                      </td>
                      <td className="text-center px-4 py-3.5">{renderCompareCell(row.compA, labels)}</td>
                      <td className="text-center px-4 py-3.5">{renderCompareCell(row.compB, labels)}</td>
                    </tr>
                  );
                })}

                {/* Detail rows with actual values */}
                <tr style={{ borderTop: "2px solid #e5e7eb", background: "#f9fafb" }}>
                  <td className="px-6 py-3 text-gray-500 text-xs font-medium">
                    {tl(labels, "why_cmp_price_shown", "Price shown")}
                  </td>
                  <td className="text-center px-4 py-3 font-bold text-[#2e8b57] text-sm">$52.56</td>
                  <td className="text-center px-4 py-3 text-red-400 text-sm">$53.75</td>
                  <td className="text-center px-4 py-3 text-red-400 text-sm">O: 50.62 (?)</td>
                </tr>
                <tr style={{ background: "#f9fafb" }}>
                  <td className="px-6 py-3 text-gray-500 text-xs font-medium">
                    {tl(labels, "why_cmp_response_style", "Response style")}
                  </td>
                  <td className="text-center px-4 py-3 text-[#2e8b57] text-xs font-medium">
                    {tl(labels, "why_cmp_2lines", "2-line snapshot")}
                  </td>
                  <td className="text-center px-4 py-3 text-gray-400 text-xs">
                    {tl(labels, "why_cmp_wall", "Wall of text")}
                  </td>
                  <td className="text-center px-4 py-3 text-gray-400 text-xs">
                    {tl(labels, "why_cmp_verbose", "Verbose essay")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-gray-300 text-center mb-8">
          {tl(labels, "why_cmp_note", "Test conducted April 2026. All AI assistants asked the same question about BHP on ASX. Competitor brands hidden.")}
        </p>

        {/* Screenshot comparison — 3 cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* DataP.ai */}
          <div className="rounded-2xl overflow-hidden shadow-sm" style={{ border: "2px solid #2e8b57" }}>
            <div className="px-4 py-2 text-center font-bold text-sm text-white" style={{ background: "#2e8b57" }}>
              DataP.ai — {tl(labels, "why_ss_correct", "Correct")}: $52.56
            </div>
            <div className="bg-gray-50 p-4 min-h-[200px] flex items-center justify-center">
              <Image src="/why-us/datapai-bhp-en.png" alt="DataP.ai BHP price"
                width={676} height={496}
                className="rounded-lg w-full h-auto"
              />
            </div>
          </div>

          {/* Competitor A */}
          <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-200">
            <div className="px-4 py-2 text-center font-bold text-sm text-white" style={{ background: "#ef4444" }}>
              {tl(labels, "why_cmp_competitor_a", "Leading Trading App AI")} — {tl(labels, "why_ss_wrong", "Wrong")}: $53.75
            </div>
            <div className="bg-gray-50 p-4 min-h-[200px] flex items-center justify-center">
              <Image src="/why-us/competitor-a.png" alt="Competitor A wrong price"
                width={590} height={500}
                className="rounded-lg w-full h-auto"
              />
            </div>
          </div>

          {/* Competitor B */}
          <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-200">
            <div className="px-4 py-2 text-center font-bold text-sm text-white" style={{ background: "#ef4444" }}>
              {tl(labels, "why_cmp_competitor_b", "Leading AI Assistant")} — {tl(labels, "why_ss_wrong_ohlcv", "Wrong OHLCV")}
            </div>
            <div className="bg-gray-50 p-4 min-h-[200px] flex items-center justify-center">
              <Image src="/why-us/competitor-b.png" alt="Competitor B wrong OHLCV"
                width={590} height={500}
                className="rounded-lg w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3: 8 NATIVE LANGUAGES
          ═══════════════════════════════════════════════════════════════════ */}
      <section style={{ background: "#f8faf9" }} className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-[#252525]">
              {tl(labels, "why_lang_title", "AI That Thinks In Your Language")}
            </h2>
            <p className="text-gray-500 mt-2 text-base max-w-2xl mx-auto">
              {tl(labels, "why_lang_sub", "Not just translated UI. Company names, price labels, timezone, and disclaimer — all in your native language. No other AI stock platform does this.")}
            </p>
          </div>

          {/* Screenshots for EN, ZH, VI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { flag: "🇬🇧", lang: "English", img: "/why-us/datapai-bhp-en.png", w: 676, h: 496 },
              { flag: "🇨🇳", lang: "简体中文", img: "/why-us/datapai-bhp-zh.png", w: 337, h: 246 },
              { flag: "🇻🇳", lang: "Tiếng Việt", img: "/why-us/datapai-bhp-vi.png", w: 674, h: 576 },
            ].map((l) => (
              <div key={l.lang} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div className="px-4 py-2 flex items-center gap-2" style={{ background: "#2e8b57" }}>
                  <span className="text-xl">{l.flag}</span>
                  <span className="font-bold text-sm text-white">{l.lang}</span>
                </div>
                <div className="p-4">
                  <Image src={l.img} alt={`DataP.ai in ${l.lang}`}
                    width={l.w} height={l.h}
                    className="rounded-lg w-full h-auto"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Text examples for remaining languages */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {LANG_SHOWCASE.filter((l) => !["English", "简体中文", "Tiếng Việt"].includes(l.lang)).map((l) => (
              <div key={l.lang} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{l.flag}</span>
                  <span className="font-bold text-[#252525]">{l.lang}</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 font-mono leading-relaxed" style={{ minHeight: "60px" }}>
                  {l.example}
                </div>
              </div>
            ))}
          </div>

          {/* Key differentiator callout */}
          <div className="mt-8 rounded-xl p-6" style={{ background: "#2e8b57", color: "#fff" }}>
            <div className="flex items-start gap-4">
              <span className="text-3xl flex-shrink-0">🌏</span>
              <div>
                <h3 className="font-bold text-lg mb-1">
                  {tl(labels, "why_lang_callout_title", "8 Languages, 100% Native")}
                </h3>
                <p className="text-white/80 text-sm">
                  {tl(labels, "why_lang_callout_desc", "English, Simplified Chinese, Traditional Chinese, Japanese, Korean, Vietnamese, Thai, Malay. Every label, every company name, every timestamp — translated from our proprietary stock dictionary covering 50,000+ stocks.")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4: 13 MARKETS
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-[#252525]">
            {tl(labels, "why_markets_title", "13 Markets. 50,000+ Stocks. One Platform.")}
          </h2>
          <p className="text-gray-500 mt-2 text-base">
            {tl(labels, "why_markets_sub", "From Wall Street to Southeast Asia — the widest Asia-Pacific coverage of any AI stock platform.")}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {MARKETS.map((m) => (
            <Link key={m.key} href={m.href}
              className="group bg-white border border-gray-200 rounded-xl p-4 text-center hover:border-[#2e8b57] hover:shadow-md transition-all hover:-translate-y-0.5">
              <div className="text-3xl mb-2">{m.flag}</div>
              <div className="font-semibold text-sm text-gray-800 group-hover:text-[#2e8b57]">{tl(labels, m.key, "")}</div>
              <div className="text-xs text-gray-400 mt-0.5">{m.stocks} {tl(labels, "home_stocks", "stocks")}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 5: DATA YOU CAN TRUST
          ═══════════════════════════════════════════════════════════════════ */}
      <section style={{ background: "#f8faf9" }} className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-[#252525]">
              {tl(labels, "why_trust_title", "Data You Can Verify")}
            </h2>
            <p className="text-gray-500 mt-2 text-base">
              {tl(labels, "why_trust_sub", "Our OHLCV data matches Google Finance. Don't take our word for it — check it yourself.")}
            </p>
          </div>

          {/* Side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* DataP.ai OHLCV */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-2 text-center font-bold text-sm text-white" style={{ background: "#2e8b57" }}>
                DataP.ai
              </div>
              <div className="p-6">
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      ["Close", "$52.56"],
                      ["Open", "$52.50"],
                      ["High", "$53.09"],
                      ["Low", "$52.35"],
                      ["Volume", "9.32M"],
                    ].map(([label, val]) => (
                      <tr key={label} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td className="py-2 text-gray-500 font-medium">{label}</td>
                        <td className="py-2 text-right font-bold text-[#252525]">{val}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="py-2 text-gray-500 font-medium">{tl(labels, "why_trust_time", "Time")}</td>
                      <td className="py-2 text-right font-medium text-[#2e8b57]">04:10 PM Sydney time</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Google Finance */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-2 text-center font-bold text-sm text-gray-600" style={{ background: "#f3f4f6" }}>
                Google Finance
              </div>
              <div className="p-6">
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      ["Close", "$52.56"],
                      ["Open", "$52.50"],
                      ["High", "$53.09"],
                      ["Low", "$52.35"],
                      ["Volume", "—"],
                    ].map(([label, val]) => (
                      <tr key={label} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td className="py-2 text-gray-500 font-medium">{label}</td>
                        <td className="py-2 text-right font-bold text-[#252525]">{val}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="py-2 text-gray-500 font-medium">{tl(labels, "why_trust_time", "Time")}</td>
                      <td className="py-2 text-right font-medium text-gray-500">1 Apr, 4:10 pm AEDT</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Trust statement */}
          <div className="rounded-xl p-6 bg-white" style={{ borderLeft: "4px solid #2e8b57" }}>
            <p className="text-[#252525] font-medium">
              {tl(labels, "why_trust_statement", "\"Our stock price data matches Google Finance — Open, High, Low, Close, Volume. Every market, every stock, every time.\"")}
            </p>
            <p className="text-gray-400 text-xs mt-2">
              {tl(labels, "why_trust_date", "BHP Group Limited (ASX: BHP) — April 1, 2026")}
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 6: AI FEATURES (results only, no implementation)
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-[#252525]">
            {tl(labels, "why_ai_title", "A Research Platform, Not a Chatbot")}
          </h2>
          <p className="text-gray-500 mt-2 text-base max-w-2xl mx-auto">
            {tl(labels, "why_ai_sub", "Accurate data is just the foundation. DataP.ai combines real-time prices with proprietary AI analysis.")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div key={f.titleKey} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-lg text-[#252525] mb-2">
                {tl(labels, f.titleKey, f.ft)}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {tl(labels, f.descKey, f.fd)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 7: TRIPLE CTA
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        className="rounded-none md:rounded-2xl md:mx-6 lg:mx-auto lg:max-w-5xl p-12 text-center"
        style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <h2 className="text-3xl font-bold text-white mb-3">
          {tl(labels, "why_cta_title", "Ready to See the Difference?")}
        </h2>
        <p className="text-white/60 mb-8 max-w-xl mx-auto">
          {tl(labels, "why_cta_sub", "Join thousands of self-directed investors across 13 Asia-Pacific markets.")}
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/register"
            className="font-bold py-3 px-8 rounded-xl text-base transition-all hover:-translate-y-0.5 hover:shadow-lg"
            style={{ background: "#2e8b57", color: "#fff" }}>
            {tl(labels, "why_cta_start", "Start Free")} →
          </Link>
          <a href="mailto:donny@datap.ai?subject=Broker Partnership Enquiry"
            className="font-bold py-3 px-8 rounded-xl text-base transition-all hover:-translate-y-0.5 hover:shadow-lg"
            style={{ background: "#fd8412", color: "#fff" }}>
            {tl(labels, "why_cta_partner", "Partner With Us")}
          </a>
          <a href="mailto:donny@datap.ai?subject=Investor Enquiry"
            className="font-bold py-3 px-8 rounded-xl text-base transition-all hover:-translate-y-0.5"
            style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}>
            {tl(labels, "why_cta_founders", "Talk to Founders")}
          </a>
        </div>

        {/* Trust line with flags */}
        <div className="mt-8 text-white/30 text-sm">
          <div className="flex items-center justify-center gap-2 text-lg mb-2">
            {MARKETS.map((m) => <span key={m.key}>{m.flag}</span>)}
          </div>
          {tl(labels, "why_cta_trust", "Trusted by self-directed investors across 13 Asia-Pacific markets")}
        </div>
      </section>

      {/* Bottom spacing */}
      <div className="h-16" />
    </div>
  );
}
