import Link from "next/link";
import { getLang } from "@/lib/getLang";
import { loadTranslations } from "@/lib/i18n";
import { t } from "@/lib/translations";
import { getCommonConfig } from "@/lib/db";
import HomepageTourTrigger from "./components/HomepageTourTrigger";

export const dynamic = "force-dynamic";

const MARKETS = [
  { href: "/us",        flag: "🇺🇸", key: "nav_usStocks",  stocks: "9,000+" },
  { href: "/asx",       flag: "🇦🇺", key: "nav_asx",       stocks: "2,000+" },
  { href: "/hongkong",  flag: "🇭🇰", key: "nav_hongkong",  stocks: "3,000+" },
  { href: "/taiwan",    flag: "🇹🇼", key: "nav_taiwan",    stocks: "1,900+" },
  { href: "/singapore", flag: "🇸🇬", key: "nav_singapore", stocks: "700+" },
  { href: "/japan",     flag: "🇯🇵", key: "nav_japan",     stocks: "3,800+" },
  { href: "/china",     flag: "🇨🇳", key: "nav_china",     stocks: "9,000+" },
  { href: "/vietnam",   flag: "🇻🇳", key: "nav_vietnam",   stocks: "400+" },
  { href: "/thailand",  flag: "🇹🇭", key: "nav_thailand",  stocks: "450+" },
  { href: "/malaysia",  flag: "🇲🇾", key: "nav_malaysia",  stocks: "1,000+" },
  { href: "/indonesia", flag: "🇮🇩", key: "nav_indonesia", stocks: "800+" },
  { href: "/uk",        flag: "🇬🇧", key: "nav_uk",        stocks: "2,600+" },
];

const FEATURES = [
  { icon: "🔍", titleKey: "home_feat_tinyfish_title", descKey: "home_feat_tinyfish_desc",
    fallbackTitle: "Website Intelligence", fallbackDesc: "Real browser agents visit company IR pages before announcements hit the exchange. Detect guidance changes, risk disclosures, and tone shifts — hours before the market reacts." },
  { icon: "🤖", titleKey: "home_feat_multiagent_title", descKey: "home_feat_multiagent_desc",
    fallbackTitle: "Multi-Agent AI Debate", fallbackDesc: "Not one AI — a team. TA, FA, Chart Analysis, Macro, and Website agents each analyse independently, then debate and cross-validate. Only the consensus survives." },
  { icon: "📈", titleKey: "home_feat_ta_title", descKey: "home_feat_ta_desc",
    fallbackTitle: "Technical Analysis Agent", fallbackDesc: "RSI, MACD, KDJ, Bollinger Bands, moving averages, volume, and volatility — computed across 4 timeframes. Multi-factor scoring with backtest-validated thresholds." },
  { icon: "📊", titleKey: "home_feat_fa_title", descKey: "home_feat_fa_desc",
    fallbackTitle: "Fundamental Analysis Agent", fallbackDesc: "PE, PEG, ROE, margins, growth rates, debt ratios, DCF valuation — AI reads the balance sheet so you don't have to. Quality tiers from A to D." },
  { icon: "👁️", titleKey: "home_feat_ca_title", descKey: "home_feat_ca_desc",
    fallbackTitle: "Chart Vision Agent", fallbackDesc: "AI sees your chart like a human trader. Detects head & shoulders, double tops, wedges, divergences, and support/resistance — from the actual chart image." },
  { icon: "🌍", titleKey: "home_feat_macro_title", descKey: "home_feat_macro_desc",
    fallbackTitle: "Macro Intelligence Agent", fallbackDesc: "Crawls Reuters, IMF, CFR, and analyst commentary in real-time. Detects macro regime shifts, interest rate impacts, and geopolitical risks affecting your stocks." },
  { icon: "💬", titleKey: "home_feat_copilot_title", descKey: "home_feat_copilot_desc",
    fallbackTitle: "AI Copilot", fallbackDesc: "Ask anything about any stock, in your language. Context-aware — knows what page you're on, what stocks you hold, and your risk profile." },
  { icon: "🧪", titleKey: "home_feat_studio_title", descKey: "home_feat_studio_desc",
    fallbackTitle: "Custom AI Studio", fallbackDesc: "Build your own AI strategy. Define rules, backtest with 5 years of data, let AI run it automatically. Your strategy, your edge." },
];

const AGENT_STEPS = [
  { icon: "🌐", labelKey: "home_agent_step1", fallback: "Company Website" },
  { icon: "🤖", labelKey: "home_agent_step2", fallback: "TinyFish Browser Agent" },
  { icon: "⚡", labelKey: "home_agent_step3", fallback: "Content Change Detected" },
  { icon: "🔍", labelKey: "home_agent_step4", fallback: "3 Signal Agents Analyse in Parallel" },
  { icon: "⚖️", labelKey: "home_agent_step5", fallback: "Cross-Validation Agent" },
  { icon: "📊", labelKey: "home_agent_step6", fallback: "Noise-Aware Confidence Score" },
  { icon: "📱", labelKey: "home_agent_step7", fallback: "Alert Delivered" },
];

const LANGS = [
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "zh", flag: "🇨🇳", label: "简体中文" },
  { code: "zh-TW", flag: "🇹🇼", label: "繁體中文" },
  { code: "ja", flag: "🇯🇵", label: "日本語" },
  { code: "ko", flag: "🇰🇷", label: "한국어" },
  { code: "vi", flag: "🇻🇳", label: "Tiếng Việt" },
  { code: "th", flag: "🇹🇭", label: "ภาษาไทย" },
  { code: "ms", flag: "🇲🇾", label: "Bahasa Melayu" },
];

function tl(labels: Record<string, string>, key: string, fallback: string): string {
  return labels[key] || fallback;
}

export default async function HomePage() {
  const lang = await getLang();
  const [labels, tourFlag] = await Promise.all([
    loadTranslations(lang),
    getCommonConfig("tour", "homepage_tour_enabled", "true"),
  ]);
  const tourEnabled = tourFlag === "true";

  return (
    <div>
      {/* Auto-start tour for first-time visitors (controlled by DB config) */}
      <HomepageTourTrigger enabled={tourEnabled} />
      {/* ═══════════════════════════════════════════════════════════════════
          HERO — only green block on the page
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        className="w-full"
        style={{ background: "linear-gradient(45deg, seagreen, darkseagreen)", paddingTop: "60px", paddingBottom: "60px" }}
      >
        <div className="max-w-5xl mx-auto px-6 space-y-5" data-tour="hero-search">
          {/* Headline + sub — left aligned */}
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            {tl(labels, "home_hero_headline", "AI-Powered Stock Intelligence Across Asia-Pacific")}
          </h1>
          <p className="text-lg md:text-xl text-white/80">
            {tl(labels, "home_hero_sub", "12 markets. 50,000+ stocks. 8 languages.")}
            <br />
            {tl(labels, "home_hero_sub2", "A global stock research platform with local AI experience.")}
          </p>

          {/* Language support — same style as headline, left aligned */}
          <p className="text-lg md:text-xl text-white/80">
            {tl(labels, "home_lang_title", "Speak Your Language")} — {tl(labels, "home_lang_sub", "Every AI report, signal, and chat — in your preferred language.")}
          </p>

          {/* Language pills — clickable, switches language */}
          <div className="flex items-center gap-2 flex-wrap">
            {LANGS.map((l) => (
              <a key={l.code}
                href="#"
                onClick={undefined}
                className="text-xs font-semibold rounded-full px-3.5 py-1.5 transition-all hover:brightness-110 hover:-translate-y-0.5 cursor-pointer"
                style={{ background: "#fd8412", color: "#fff" }}
                data-lang={l.code}
              >
                {l.flag} {l.label}
              </a>
            ))}
          </div>

          {/* Language switch script — sets cookie + reload on click */}
          <script dangerouslySetInnerHTML={{ __html: `
            document.querySelectorAll('[data-lang]').forEach(function(el) {
              el.addEventListener('click', function(e) {
                e.preventDefault();
                document.cookie = 'lang=' + el.dataset.lang + '; path=/; max-age=31536000; SameSite=Lax';
                window.location.reload();
              });
            });
          `}} />

          {/* CTAs */}
          <div className="flex items-center gap-4 flex-wrap pt-2">
            <Link href="/register"
              className="px-8 py-3.5 rounded-xl font-bold text-white text-base transition-all hover:brightness-110 hover:-translate-y-0.5 shadow-lg"
              style={{ background: "#fd8412" }}>
              {tl(labels, "home_cta_start", "Get Started Free")} →
            </Link>
            <Link href="/us"
              className="px-8 py-3.5 rounded-xl font-bold text-white text-base transition-all hover:brightness-110 hover:-translate-y-0.5 shadow-lg"
              style={{ background: "#fd8412" }}>
              {tl(labels, "home_cta_explore", "Explore Markets")}
            </Link>
            <Link href="/pricing"
              className="px-8 py-3.5 rounded-xl font-bold text-white text-base transition-all hover:brightness-110 hover:-translate-y-0.5 shadow-lg"
              style={{ background: "#fd8412" }}>
              {tl(labels, "home_pricing_cta", "View all plans")}
            </Link>
          </div>

          {/* Market flags */}
          <div className="flex items-center gap-3 text-2xl pt-2">
            {MARKETS.map((m) => (
              <Link key={m.href} href={m.href} title={t(labels, m.key)} className="hover:scale-125 transition-transform">
                {m.flag}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          MARKETS + HOW IT WORKS (consolidated)
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-[#252525]">
            {tl(labels, "home_markets_title", "One Data + AI Platform")}
          </h2>
          <p className="text-gray-500 mt-2 text-base">
            {tl(labels, "home_markets_sub", "From Wall Street to Southeast Asia — 12 markets, real-time prices, AI analysis, and alerts. All in one place.")}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-12">
          {MARKETS.map((m) => (
            <Link key={m.href} href={m.href}
              className="group bg-white border border-gray-200 rounded-xl p-4 text-center hover:border-[#2e8b57] hover:shadow-md transition-all hover:-translate-y-0.5">
              <div className="text-3xl mb-2">{m.flag}</div>
              <div className="font-semibold text-sm text-gray-800 group-hover:text-[#2e8b57]">{t(labels, m.key)}</div>
              <div className="text-xs text-gray-400 mt-0.5">{m.stocks} {tl(labels, "home_stocks", "stocks")}</div>
            </Link>
          ))}
        </div>

        {/* How it works — 3 steps inline */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { num: "1", titleKey: "home_how_1_title", descKey: "home_how_1_desc",
              ft: "Pick Your Markets", fd: "Choose from 12 exchanges. Add stocks to your watchlist. Set your risk profile and preferred language." },
            { num: "2", titleKey: "home_how_2_title", descKey: "home_how_2_desc",
              ft: "AI Does The Research", fd: "AI agents scan company websites, analyse technicals, score fundamentals, and debate each other — 24/7." },
            { num: "3", titleKey: "home_how_3_title", descKey: "home_how_3_desc",
              ft: "You Make The Call", fd: "Get BUY/SELL signals with confidence scores. Ask the AI copilot to explain. The decision is always yours." },
          ].map((s) => (
            <div key={s.num} className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
              <div className="text-3xl font-bold mb-3" style={{ color: "#2e8b57" }}>{s.num}</div>
              <h3 className="text-lg font-bold text-[#252525] mb-2">{tl(labels, s.titleKey, s.ft)}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{tl(labels, s.descKey, s.fd)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          KEY FEATURES
          ═══════════════════════════════════════════════════════════════════ */}
      <section style={{ background: "#f8faf9" }} className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-[#252525]">
              {tl(labels, "home_features_title", "What Makes Us Different")}
            </h2>
            <p className="text-gray-500 mt-2 text-base">
              {tl(labels, "home_features_sub", "TA, FA, Chart Analysis, Macro, and Website Intelligence agents read, debate, cross-validate, and deliver verified signals.")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-lg text-[#252525] mb-2">
                  {tl(labels, f.titleKey, f.fallbackTitle)}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {tl(labels, f.descKey, f.fallbackDesc)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          AGENT FLOW VISUALIZATION
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-[#252525]">
            {tl(labels, "home_pipeline_title", "How AI Agents Work Together")}
          </h2>
          <p className="text-gray-500 mt-2 text-base">
            {tl(labels, "home_pipeline_sub", "Multiple agents analyse independently, then validate each other. Only verified signals reach you.")}
          </p>
        </div>

        <div className="flex flex-col items-center gap-1">
          {AGENT_STEPS.map((step, i) => (
            <div key={i} className="flex items-center gap-3 w-full max-w-md">
              {i > 0 && (
                <div className="flex flex-col items-center" style={{ width: 40 }}>
                  <div className="w-0.5 h-6" style={{ background: "#2e8b57" }} />
                  <div style={{ color: "#2e8b57", fontSize: 10 }}>▼</div>
                </div>
              )}
              {i === 0 && <div style={{ width: 40 }} />}
              <div className={`flex-1 flex items-center gap-3 rounded-xl px-4 py-3 border ${i === 3 ? "border-amber-300 bg-amber-50" : i === 6 ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"}`}>
                <span className="text-xl flex-shrink-0">{step.icon}</span>
                <span className="text-sm font-medium text-gray-700">
                  {tl(labels, step.labelKey, step.fallback)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-6 mt-8 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
            {tl(labels, "home_pipeline_parallel", "3 agents in parallel")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-100 border border-green-300" />
            {tl(labels, "home_pipeline_output", "Verified output")}
          </span>
        </div>
      </section>

    </div>
  );
}
