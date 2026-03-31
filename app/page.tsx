import Link from "next/link";
import Image from "next/image";
import { getLang } from "@/lib/getLang";
import { loadTranslations } from "@/lib/i18n";
import { t } from "@/lib/translations";

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
  {
    icon: "🔍",
    titleKey: "home_feat_tinyfish_title",
    descKey: "home_feat_tinyfish_desc",
    fallbackTitle: "Website Intelligence",
    fallbackDesc: "Real browser agents visit company IR pages before announcements hit the exchange. Detect guidance changes, risk disclosures, and tone shifts — hours before the market reacts.",
  },
  {
    icon: "🤖",
    titleKey: "home_feat_multiagent_title",
    descKey: "home_feat_multiagent_desc",
    fallbackTitle: "Multi-Agent AI Debate",
    fallbackDesc: "Not one AI — a team. TA, FA, Chart Analysis, Macro, and Website agents each analyse independently, then debate and cross-validate. Only the consensus survives.",
  },
  {
    icon: "📈",
    titleKey: "home_feat_ta_title",
    descKey: "home_feat_ta_desc",
    fallbackTitle: "Technical Analysis Agent",
    fallbackDesc: "RSI, MACD, KDJ, Bollinger Bands, moving averages, volume, and volatility — computed across 4 timeframes. Multi-factor scoring with backtest-validated thresholds.",
  },
  {
    icon: "📊",
    titleKey: "home_feat_fa_title",
    descKey: "home_feat_fa_desc",
    fallbackTitle: "Fundamental Analysis Agent",
    fallbackDesc: "PE, PEG, ROE, margins, growth rates, debt ratios, DCF valuation — AI reads the balance sheet so you don't have to. Quality tiers from A to D.",
  },
  {
    icon: "👁️",
    titleKey: "home_feat_ca_title",
    descKey: "home_feat_ca_desc",
    fallbackTitle: "Chart Vision Agent",
    fallbackDesc: "AI sees your chart like a human trader. Detects head & shoulders, double tops, wedges, divergences, and support/resistance — from the actual chart image.",
  },
  {
    icon: "🌍",
    titleKey: "home_feat_macro_title",
    descKey: "home_feat_macro_desc",
    fallbackTitle: "Macro Intelligence Agent",
    fallbackDesc: "Crawls Reuters, IMF, CFR, and analyst commentary in real-time. Detects macro regime shifts, interest rate impacts, and geopolitical risks affecting your stocks.",
  },
  {
    icon: "💬",
    titleKey: "home_feat_copilot_title",
    descKey: "home_feat_copilot_desc",
    fallbackTitle: "AI Copilot",
    fallbackDesc: "Ask anything about any stock, in your language. Context-aware — knows what page you're on, what stocks you hold, and your risk profile.",
  },
  {
    icon: "🧪",
    titleKey: "home_feat_studio_title",
    descKey: "home_feat_studio_desc",
    fallbackTitle: "Custom AI Studio",
    fallbackDesc: "Build your own AI strategy. Define rules, backtest with 5 years of data, let AI run it automatically. Your strategy, your edge.",
  },
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
  { code: "en",    flag: "🇬🇧", label: "English" },
  { code: "zh",    flag: "🇨🇳", label: "简体中文" },
  { code: "zh-TW", flag: "🇹🇼", label: "繁體中文" },
  { code: "ja",    flag: "🇯🇵", label: "日本語" },
  { code: "ko",    flag: "🇰🇷", label: "한국어" },
  { code: "vi",    flag: "🇻🇳", label: "Tiếng Việt" },
  { code: "th",    flag: "🇹🇭", label: "ภาษาไทย" },
  { code: "ms",    flag: "🇲🇾", label: "Bahasa Melayu" },
];

function tl(labels: Record<string, string>, key: string, fallback: string): string {
  return labels[key] || fallback;
}

export default async function HomePage() {
  const lang = await getLang();
  const labels = await loadTranslations(lang);

  return (
    <div>
      {/* ═══════════════════════════════════════════════════════════════════
          HERO
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        className="w-full"
        style={{ background: "linear-gradient(45deg, seagreen, darkseagreen)", paddingTop: "60px", paddingBottom: "60px" }}
      >
        <div className="max-w-5xl mx-auto px-6 text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            {tl(labels, "home_hero_headline", "AI-Powered Stock Intelligence Across Asia-Pacific")}
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto">
            {tl(labels, "home_hero_sub", "12 markets. 50,000+ stocks. 8 languages. Powered by AI agents that never sleep.")}
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/register"
              className="px-8 py-3.5 rounded-xl font-bold text-white text-base transition-all hover:brightness-110 hover:-translate-y-0.5 shadow-lg"
              style={{ background: "#fd8412" }}>
              {tl(labels, "home_cta_start", "Get Started Free")} →
            </Link>
            <Link href="/us"
              className="px-8 py-3.5 rounded-xl font-bold text-white/90 text-base border-2 border-white/30 hover:bg-white/10 transition-all hover:-translate-y-0.5">
              {tl(labels, "home_cta_explore", "Explore Markets")}
            </Link>
          </div>

          {/* Market flags band */}
          <div className="flex items-center justify-center gap-3 text-2xl pt-4">
            {MARKETS.map((m) => (
              <Link key={m.href} href={m.href} title={t(labels, m.key)} className="hover:scale-125 transition-transform">
                {m.flag}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          MARKET COVERAGE
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-[#252525]">
            {tl(labels, "home_markets_title", "From Wall Street to Southeast Asia")}
          </h2>
          <p className="text-gray-500 mt-2 text-base">
            {tl(labels, "home_markets_sub", "Every market, one platform. Real-time prices, AI analysis, and alerts.")}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {MARKETS.map((m) => (
            <Link key={m.href} href={m.href}
              className="group bg-white border border-gray-200 rounded-xl p-4 text-center hover:border-[#2e8b57] hover:shadow-md transition-all hover:-translate-y-0.5">
              <div className="text-3xl mb-2">{m.flag}</div>
              <div className="font-semibold text-sm text-gray-800 group-hover:text-[#2e8b57]">{t(labels, m.key)}</div>
              <div className="text-xs text-gray-400 mt-0.5">{m.stocks} {tl(labels, "home_stocks", "stocks")}</div>
            </Link>
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
              {tl(labels, "home_features_sub", "AI agents that read company websites, debate each other, and deliver verified signals.")}
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

        {/* Agent labels */}
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

      {/* ═══════════════════════════════════════════════════════════════════
          HOW IT WORKS
          ═══════════════════════════════════════════════════════════════════ */}
      <section style={{ background: "linear-gradient(45deg, seagreen, darkseagreen)" }} className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-white text-center mb-10">
            {tl(labels, "home_how_title", "How It Works")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { num: "1", titleKey: "home_how_1_title", descKey: "home_how_1_desc",
                ft: "Pick Your Markets", fd: "Choose from 12 exchanges. Add stocks to your watchlist. Set your risk profile and preferred language." },
              { num: "2", titleKey: "home_how_2_title", descKey: "home_how_2_desc",
                ft: "AI Does The Research", fd: "AI agents scan company websites, analyse technicals, score fundamentals, and debate each other — 24/7." },
              { num: "3", titleKey: "home_how_3_title", descKey: "home_how_3_desc",
                ft: "You Make The Call", fd: "Get BUY/SELL signals with confidence scores. Ask the AI copilot to explain. The decision is always yours." },
            ].map((s) => (
              <div key={s.num} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="text-4xl font-bold text-white/30 mb-3">{s.num}</div>
                <h3 className="text-lg font-bold text-white mb-2">{tl(labels, s.titleKey, s.ft)}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{tl(labels, s.descKey, s.fd)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          LANGUAGE SUPPORT
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold text-[#252525] mb-3">
          {tl(labels, "home_lang_title", "Speak Your Language")}
        </h2>
        <p className="text-gray-500 mb-8 text-base">
          {tl(labels, "home_lang_sub", "Every AI report, signal, and chat — in your preferred language.")}
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {LANGS.map((l) => (
            <div key={l.code}
              className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
              <span className="text-lg">{l.flag}</span>
              <span className="text-sm font-medium text-gray-700">{l.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          POWERED BY
          ═══════════════════════════════════════════════════════════════════ */}
      <section style={{ background: "#f8faf9" }} className="py-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm text-gray-400 uppercase tracking-wider font-semibold mb-6">
            {tl(labels, "home_powered_by", "Powered By")}
          </p>
          <div className="flex items-center justify-center gap-10">
            <a href="https://www.datap.ai" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70">
              <Image src="/logos/datapai.png" width={120} height={30} alt="DataP.ai" style={{ height: "30px", width: "auto" }} />
            </a>
            <span className="text-gray-300 text-2xl font-extralight">×</span>
            <a href="https://tinyfish.ai" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70">
              <Image src="/logos/tinyfish.svg" width={80} height={20} alt="TinyFish" style={{ height: "20px", width: "auto" }} />
            </a>
            <span className="text-gray-300 text-2xl font-extralight">&</span>
            <a href="https://www.ag2.ai" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70">
              <Image src="/logos/ag2.png" width={40} height={20} alt="ag2" style={{ height: "20px", width: "auto" }} />
            </a>
          </div>

          {/* LLM Providers */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-4">
              {tl(labels, "home_llm_title", "Built on Top LLM Models")}
            </p>
            <div className="flex items-center justify-center gap-8 flex-wrap text-sm text-gray-500">
              <span className="flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#10a37f]" />
                OpenAI GPT-4o
              </span>
              <span className="flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#d97757]" />
                Anthropic Claude
              </span>
              <span className="flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#4285f4]" />
                Google Gemini
              </span>
              <span className="flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#ff9900]" />
                AWS Bedrock
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          PRICING PREVIEW
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold text-[#252525] mb-3">
          {tl(labels, "home_pricing_title", "Free Forever to Start")}
        </h2>
        <p className="text-gray-500 mb-8 text-base max-w-xl mx-auto">
          {tl(labels, "home_pricing_sub", "No credit card required. Upgrade when you're ready for more AI signals, larger watchlists, and custom strategies.")}
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <div className="bg-white border-2 border-[#2e8b57] rounded-xl px-6 py-4 shadow-sm">
            <div className="text-2xl font-bold text-[#2e8b57]">$0</div>
            <div className="text-sm text-gray-500">{tl(labels, "home_pricing_free", "Signal Watch — Free forever")}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-6 py-4">
            <div className="text-2xl font-bold text-gray-700">$49</div>
            <div className="text-sm text-gray-500">{tl(labels, "home_pricing_individual", "Individual — Full AI suite")}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-6 py-4">
            <div className="text-2xl font-bold text-gray-700">$299</div>
            <div className="text-sm text-gray-500">{tl(labels, "home_pricing_pro", "Professional — All markets")}</div>
          </div>
        </div>
        <Link href="/pricing"
          className="inline-block mt-6 text-[#2e8b57] font-semibold hover:underline text-sm">
          {tl(labels, "home_pricing_cta", "View all plans")} →
        </Link>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FINAL CTA
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        className="w-full py-16"
        style={{ background: "linear-gradient(45deg, seagreen, darkseagreen)" }}
      >
        <div className="max-w-3xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            {tl(labels, "home_final_title", "50,000+ Stocks Monitored by AI. Start Free Today.")}
          </h2>
          <p className="text-white/70 text-base">
            {tl(labels, "home_final_sub", "Join investors across Asia-Pacific using AI to find opportunities faster.")}
          </p>
          <Link href="/register"
            className="inline-block px-10 py-4 rounded-xl font-bold text-white text-lg transition-all hover:brightness-110 hover:-translate-y-0.5 shadow-lg"
            style={{ background: "#fd8412" }}>
            {tl(labels, "home_final_cta", "Create Free Account")} →
          </Link>
        </div>
      </section>
    </div>
  );
}
