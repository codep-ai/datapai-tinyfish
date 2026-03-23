"use client";

/**
 * /profile/onboarding  — 7-step investor profile wizard.
 * Shown immediately after new-user registration.
 * ~90 seconds to complete. Redirects to / on finish.
 * Also reachable from /profile page ("Re-run setup wizard").
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

// ─── Option sets ──────────────────────────────────────────────────────────

const RISK_OPTIONS = [
  { value: "CONSERVATIVE", label: "Conservative", emoji: "🛡️", desc: "Capital preservation. Low volatility. Happy with 5–10% annual return." },
  { value: "MODERATE",     label: "Moderate",     emoji: "⚖️", desc: "Balanced growth + income. Can handle occasional -15% drawdowns." },
  { value: "AGGRESSIVE",   label: "Aggressive",   emoji: "🚀", desc: "Growth-focused. Comfortable riding -30% corrections for higher upside." },
  { value: "SPECULATIVE",  label: "Speculative",  emoji: "⚡", desc: "High-conviction bets. Momentum plays. Risk of total loss accepted." },
];

const HORIZON_OPTIONS = [
  { value: "SHORT",  label: "Short-term",  emoji: "⚡", desc: "Weeks to 3 months — swing / momentum trader" },
  { value: "MEDIUM", label: "Medium-term", emoji: "📅", desc: "3–12 months — trend follower, earnings plays" },
  { value: "LONG",   label: "Long-term",   emoji: "🌱", desc: "1+ years — buy-and-hold, fundamental focus" },
];

const STRATEGY_OPTIONS = [
  { value: "VALUE",    label: "Value",     desc: "Find undervalued companies trading below their true worth" },
  { value: "GROWTH",   label: "Growth",    desc: "Invest in fast-growing companies with rising revenue" },
  { value: "MOMENTUM", label: "Momentum",  desc: "Buy stocks that are already going up and riding the trend" },
  { value: "DIVIDEND", label: "Dividend",  desc: "Earn regular income from company dividend payments" },
  { value: "INDEX",    label: "Index / ETF", desc: "Simple and passive — just track the market (e.g. S&P 500)" },
  { value: "SWING",    label: "Short-term trading", desc: "Buy and sell within days or weeks based on price patterns" },
];

const EXCHANGE_OPTIONS = [
  { value: "US",  label: "🇺🇸 US Markets", desc: "NASDAQ / NYSE — Apple, NVDA, Tesla…" },
  { value: "ASX", label: "🇦🇺 ASX",         desc: "Australian Securities Exchange — BHP, CBA, CSL…" },
];

const SIZE_OPTIONS = [
  { value: "STARTER",       label: "Starter",        desc: "Under $50k AUD" },
  { value: "RETAIL",        label: "Retail",          desc: "$50k – $500k AUD" },
  { value: "HNW",           label: "High net worth",  desc: "$500k – $2M AUD" },
  { value: "INSTITUTIONAL", label: "Institutional",   desc: "$2M+ AUD / fund desk" },
];

const ANALYSIS_OPTIONS = [
  { value: "TA",    label: "Technical Analysis (TA)", emoji: "📈", desc: "Use price charts, indicators and patterns to time your trades" },
  { value: "FA",    label: "Fundamental Analysis (FA)", emoji: "📊", desc: "Evaluate company financials — earnings, valuation, balance sheet" },
  { value: "MIX",   label: "Mix of both (TA + FA)",    emoji: "⚖️", desc: "Use financials to pick good companies, charts to time entry" },
  { value: "OTHER", label: "Macro / Big picture",      emoji: "🌍", desc: "Focus on economy, interest rates, sectors and global trends" },
];

const LANG_OPTIONS = [
  { value: "en",    label: "English",        emoji: "🇬🇧", desc: "All AI responses in English" },
  { value: "zh",    label: "简体中文",        emoji: "🇨🇳", desc: "所有AI分析以简体中文回复" },
  { value: "zh-TW", label: "繁體中文",        emoji: "🇹🇼", desc: "所有AI分析以繁體中文回覆" },
  { value: "ja",    label: "日本語",          emoji: "🇯🇵", desc: "すべてのAI分析を日本語で表示" },
  { value: "ko",    label: "한국어",          emoji: "🇰🇷", desc: "모든 AI 분석을 한국어로 표시" },
  { value: "vi",    label: "Tiếng Việt",     emoji: "🇻🇳", desc: "Tất cả phân tích AI bằng tiếng Việt" },
  { value: "th",    label: "ภาษาไทย",       emoji: "🇹🇭", desc: "การวิเคราะห์ AI ทั้งหมดเป็นภาษาไทย" },
  { value: "ms",    label: "Bahasa Melayu",  emoji: "🇲🇾", desc: "Semua analisis AI dalam Bahasa Melayu" },
];

const STYLE_OPTIONS = [
  { value: "BRIEF",    label: "Brief",    emoji: "⚡", desc: "Bullet points only — get to the signal fast" },
  { value: "BALANCED", label: "Balanced", emoji: "📋", desc: "Key points + brief reasoning — recommended" },
  { value: "DETAILED", label: "Detailed", emoji: "📖", desc: "Full analysis with all supporting reasoning" },
];

// ─── Reusable sub-components ──────────────────────────────────────────────

const TOTAL = 7;

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-4">
      {Array.from({ length: TOTAL }).map((_, i) => (
        <div key={i} className="h-1.5 rounded-full flex-1 transition-all duration-300"
          style={{ background: i < step ? "#2e8b57" : "#e5e7eb" }} />
      ))}
    </div>
  );
}

function StepHeader({ step, title, sub }: { step: number; title: string; sub: string }) {
  return (
    <div className="mb-5">
      <ProgressBar step={step} />
      <p className="text-xs text-gray-400 font-medium mb-1">Step {step} of {TOTAL}</p>
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-500 mt-1">{sub}</p>
    </div>
  );
}

function RadioCards({ options, value, onChange }: {
  options: { value: string; label: string; desc: string; emoji?: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2.5">
      {options.map(opt => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          className="text-left rounded-xl border-2 px-4 py-3 transition-all hover:border-[#2e8b57] hover:bg-green-50"
          style={{ borderColor: value === opt.value ? "#2e8b57" : "#e5e7eb", background: value === opt.value ? "#f0fdf4" : "white" }}>
          <span className="font-semibold text-gray-900 text-sm">
            {opt.emoji && <span className="mr-2">{opt.emoji}</span>}
            {opt.label}
          </span>
          <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
        </button>
      ))}
    </div>
  );
}

function CheckCards({ options, value, onChange }: {
  options: { value: string; label: string; desc: string; emoji?: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map(opt => (
        <button key={opt.value} type="button" onClick={() => toggle(opt.value)}
          className="text-left rounded-xl border-2 px-3 py-2.5 transition-all hover:border-[#2e8b57]"
          style={{ borderColor: value.includes(opt.value) ? "#2e8b57" : "#e5e7eb", background: value.includes(opt.value) ? "#f0fdf4" : "white" }}>
          <span className="font-semibold text-xs text-gray-900 block">
            {opt.emoji && <span className="mr-1">{opt.emoji}</span>}
            {opt.label}
          </span>
          <span className="text-xs text-gray-400">{opt.desc}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep]     = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  // Step values
  const [risk,       setRisk]       = useState("");
  const [horizons,   setHorizons]   = useState<string[]>([]);   // multi-select (stored as "SHORT+LONG" etc.)
  const [strategies, setStrategies] = useState<string[]>([]);
  const [exchanges,  setExchanges]  = useState<string[]>(["US"]);
  const [size,       setSize]       = useState("RETAIL");
  const [analysis,   setAnalysis]   = useState<string[]>([]);   // multi-select (stored as "TA+FA" etc.)
  const [lang,       setLang]       = useState("en");
  const [style,      setStyle]      = useState("BALANCED");

  const canNext = (): boolean => {
    if (step === 1) return !!risk;
    if (step === 2) return horizons.length > 0;
    if (step === 3) return strategies.length > 0;
    if (step === 4) return exchanges.length > 0 && !!size;
    if (step === 5) return analysis.length > 0;
    return true; // steps 6,7 have defaults
  };

  const handleNext = () => {
    if (!canNext()) return;
    if (step < TOTAL) { setStep(s => s + 1); return; }
    handleSave();
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          risk_tolerance:      risk || "MODERATE",
          investment_horizon:  horizons.join("+") || "MEDIUM",
          strategies,
          preferred_exchanges: exchanges,
          portfolio_size:      size,
          analysis_preference: analysis.join("+") || "MIX",
          preferred_lang:      lang,
          response_style:      style,
          onboarding_completed: true,
          onboarding_step:      TOTAL,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboarding_completed: true }),
      });
    } catch { /* non-fatal */ }
    router.push("/");
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">

          {/* Welcome header — step 1 only */}
          {step === 1 && (
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🎯</div>
              <h1 className="text-2xl font-bold text-gray-900">Set up your investor profile</h1>
              <p className="text-sm text-gray-500 mt-1">
                7 quick questions — takes 90 seconds.<br/>
                Your AI will <strong>never ask these again</strong>.
              </p>
            </div>
          )}

          {/* Step 1 — Risk */}
          {step === 1 && (
            <>
              <StepHeader step={1} title="What's your risk appetite?"
                sub="This shapes how every analysis, report and chat response is framed for you." />
              <RadioCards options={RISK_OPTIONS} value={risk} onChange={setRisk} />
            </>
          )}

          {/* Step 2 — Horizon (multi-select: can combine short + long, etc.) */}
          {step === 2 && (
            <>
              <StepHeader step={2} title="Investment horizon?"
                sub="Select all that apply — you can mix short-term and long-term positions." />
              <CheckCards options={HORIZON_OPTIONS} value={horizons} onChange={setHorizons} />
            </>
          )}

          {/* Step 3 — Strategies */}
          {step === 3 && (
            <>
              <StepHeader step={3} title="Strategy focus?"
                sub="How do you like to pick stocks? Select all that interest you." />
              <CheckCards options={STRATEGY_OPTIONS} value={strategies} onChange={setStrategies} />
            </>
          )}

          {/* Step 4 — Markets + size */}
          {step === 4 && (
            <>
              <StepHeader step={4} title="Markets & portfolio size?"
                sub="Helps surface the most relevant stocks and calibrate position-sizing advice." />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Markets (select all you trade)</p>
              <CheckCards options={EXCHANGE_OPTIONS} value={exchanges} onChange={setExchanges} />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 mt-4">Portfolio size</p>
              <RadioCards options={SIZE_OPTIONS} value={size} onChange={setSize} />
            </>
          )}

          {/* Step 5 — Analysis preference (multi-select: can combine TA + FA etc.) */}
          {step === 5 && (
            <>
              <StepHeader step={5} title="Analysis preference?"
                sub="Select all that apply — which frameworks do you use in your decision making?" />
              <CheckCards options={ANALYSIS_OPTIONS} value={analysis} onChange={setAnalysis} />
            </>
          )}

          {/* Step 6 — Language */}
          {step === 6 && (
            <>
              <StepHeader step={6} title="Preferred language?"
                sub="All AI reports, signals and chat responses will use this language." />
              <RadioCards options={LANG_OPTIONS} value={lang} onChange={setLang} />
            </>
          )}

          {/* Step 7 — Response style */}
          {step === 7 && (
            <>
              <StepHeader step={7} title="How do you like AI responses?"
                sub="Your preferred depth for analysis reports and chat answers." />
              <RadioCards options={STYLE_OPTIONS} value={style} onChange={setStyle} />
            </>
          )}

          {error && (
            <div className="mt-4 text-red-600 text-sm bg-red-50 rounded-lg px-4 py-2">
              {error} — please try again.
            </div>
          )}

          {/* Nav buttons — Previous left, Next right (standard wizard pattern) */}
          <div className="flex items-center justify-between mt-6">
            {/* Left: Previous (step 2+) or Skip (step 1) */}
            {step > 1 ? (
              <button type="button" onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all">
                ← Back
              </button>
            ) : (
              <button type="button" onClick={handleSkip}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                Skip for now
              </button>
            )}

            {/* Right: Next / Save */}
            <div className="flex items-center gap-3">
              {/* Show Skip on steps 2–6 as a smaller secondary option */}
              {step > 1 && step < TOTAL && (
                <button type="button" onClick={handleSkip}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                  Skip setup
                </button>
              )}
              <button type="button" onClick={handleNext}
                disabled={!canNext() || saving}
                className="px-6 py-2 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: canNext() ? "#2e8b57" : "#9ca3af" }}>
                {saving ? "Saving…" : step === TOTAL ? "✓ Save my profile" : "Next →"}
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          You can edit your profile anytime from the nav bar.
        </p>
      </div>
    </div>
  );
}
