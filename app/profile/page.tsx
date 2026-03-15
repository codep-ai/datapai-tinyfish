"use client";

/**
 * /profile  — Investor preference settings page.
 * All 7 profile options are editable here at any time.
 * Loads saved preferences, allows partial updates, saves to DB.
 * Accessible from the nav bar profile badge.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { InvestorProfile } from "@/lib/investorProfile";

const RISK_OPTS     = ["CONSERVATIVE","MODERATE","AGGRESSIVE","SPECULATIVE"] as const;
const HORIZON_OPTS  = ["SHORT","MEDIUM","LONG"] as const;
const STRATEGY_OPTS = ["VALUE","GROWTH","MOMENTUM","DIVIDEND","INDEX","SWING"] as const;
const EXCHANGE_OPTS = ["US","ASX"] as const;
const SIZE_OPTS     = ["STARTER","RETAIL","HNW","INSTITUTIONAL"] as const;
const ANALYSIS_OPTS = ["TA","FA","MIX","OTHER"] as const;
const STYLE_OPTS    = ["BRIEF","BALANCED","DETAILED"] as const;

const RISK_META: Record<string, { emoji: string; desc: string }> = {
  CONSERVATIVE: { emoji: "🛡️", desc: "Capital preservation, low volatility" },
  MODERATE:     { emoji: "⚖️", desc: "Balanced growth + income" },
  AGGRESSIVE:   { emoji: "🚀", desc: "Growth-focused, high upside tolerance" },
  SPECULATIVE:  { emoji: "⚡", desc: "High-conviction bets, momentum" },
};

const ANALYSIS_META: Record<string, { emoji: string; desc: string }> = {
  TA:    { emoji: "📈", desc: "Price action, indicators, chart patterns" },
  FA:    { emoji: "📊", desc: "Valuation, earnings, margins, balance sheet" },
  MIX:   { emoji: "⚖️", desc: "Balanced technical + fundamental" },
  OTHER: { emoji: "🌍", desc: "Macro, sector rotation, thematic" },
};

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all"
      style={{ borderColor: active ? "#2e8b57" : "#e5e7eb", background: active ? "#f0fdf4" : "white", color: active ? "#166534" : "#6b7280" }}>
      {label}
    </button>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-100 rounded-xl p-5 bg-white">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const [profile,  setProfile]  = useState<InvestorProfile | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState("");

  // Editable state
  const [risk,       setRisk]       = useState("MODERATE");
  const [horizons,   setHorizons]   = useState<string[]>(["MEDIUM"]);  // multi-select
  const [strategies, setStrategies] = useState<string[]>([]);
  const [exchanges,  setExchanges]  = useState<string[]>(["US"]);
  const [sectors,    setSectors]    = useState<string[]>([]);
  const [size,       setSize]       = useState("RETAIL");
  const [analysis,   setAnalysis]   = useState<string[]>(["MIX"]);     // multi-select
  const [lang,       setLang]       = useState("en");
  const [style,      setStyle]      = useState("BALANCED");
  const [esg,        setEsg]        = useState(false);
  const [taxCtx,     setTaxCtx]     = useState("AU");
  const [portfolioTickers, setPortfolioTickers] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      const res  = await fetch("/api/profile");
      const json = await res.json() as { ok: boolean; profile: InvestorProfile };
      if (!json.ok) throw new Error("Load failed");
      const p = json.profile;
      setProfile(p);
      setRisk(p.risk_tolerance);
      // investment_horizon may be "SHORT+LONG" (multi) or "MEDIUM" (legacy single)
      setHorizons(p.investment_horizon ? p.investment_horizon.split("+").filter(Boolean) : ["MEDIUM"]);
      setStrategies(p.strategies ?? []);
      setExchanges(p.preferred_exchanges ?? ["US"]);
      setSectors(p.preferred_sectors ?? []);
      setSize(p.portfolio_size);
      // analysis_preference may be "TA+FA" (multi) or "MIX" (legacy single)
      setAnalysis(p.analysis_preference ? p.analysis_preference.split("+").filter(Boolean) : ["MIX"]);
      setLang(p.preferred_lang ?? "en");
      setStyle(p.response_style);
      setEsg(p.esg_only);
      setTaxCtx(p.tax_context);
      setPortfolioTickers((p.portfolio_tickers ?? []).join(", "));
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const toggleArr = (arr: string[], val: string, set: (a: string[]) => void) =>
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const handleSave = async () => {
    setSaving(true); setSaved(false); setError("");
    try {
      const tickers = portfolioTickers.split(/[,\s]+/).map(t => t.trim().toUpperCase()).filter(Boolean);
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          risk_tolerance:      risk,
          investment_horizon:  horizons.join("+") || "MEDIUM",
          strategies,
          preferred_exchanges: exchanges,
          preferred_sectors:   sectors,
          portfolio_size:      size,
          analysis_preference: analysis.join("+") || "MIX",
          preferred_lang:      lang,
          response_style:      style,
          esg_only:            esg,
          tax_context:         taxCtx,
          portfolio_tickers:   tickers,
          onboarding_completed: true,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="max-w-2xl mx-auto px-6 py-16 text-center text-gray-400">Loading your profile…</div>
  );

  const updatedAt = profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🎯 Investor Profile</h1>
          <p className="text-sm text-gray-500 mt-1">
            Your AI co-pilot uses this to personalise <strong>every</strong> analysis, report, and chat.
            {updatedAt && <span className="ml-2 text-gray-400">Last updated {updatedAt}</span>}
          </p>
        </div>
        <Link href="/profile/onboarding"
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all whitespace-nowrap">
          Re-run wizard →
        </Link>
      </div>

      <div className="space-y-5">

        {/* 1. Risk appetite */}
        <Section title="1. Risk appetite" subtitle="Shapes how every analysis is framed — upside vs downside emphasis">
          <div className="grid grid-cols-2 gap-2">
            {RISK_OPTS.map(r => (
              <button key={r} type="button" onClick={() => setRisk(r)}
                className="text-left rounded-xl border-2 px-4 py-3 transition-all"
                style={{ borderColor: risk === r ? "#2e8b57" : "#e5e7eb", background: risk === r ? "#f0fdf4" : "white" }}>
                <span className="font-semibold text-sm">{RISK_META[r].emoji} {r[0]+r.slice(1).toLowerCase()}</span>
                <p className="text-xs text-gray-400 mt-0.5">{RISK_META[r].desc}</p>
              </button>
            ))}
          </div>
        </Section>

        {/* 2. Horizon — multi-select */}
        <Section title="2. Investment horizon" subtitle="Select all that apply — mix short-term and long-term if you run both strategies">
          <div className="flex gap-2 flex-wrap">
            {HORIZON_OPTS.map(h => (
              <Chip key={h} label={h[0]+h.slice(1).toLowerCase()} active={horizons.includes(h)}
                onClick={() => toggleArr(horizons, h, setHorizons)} />
            ))}
          </div>
        </Section>

        {/* 3. Strategies */}
        <Section title="3. Strategy focus" subtitle="Multi-select — all selected strategies will be emphasised in analysis">
          <div className="flex gap-2 flex-wrap">
            {STRATEGY_OPTS.map(s => (
              <Chip key={s} label={s[0]+s.slice(1).toLowerCase()} active={strategies.includes(s)}
                onClick={() => toggleArr(strategies, s, setStrategies)} />
            ))}
          </div>
        </Section>

        {/* 4. Markets + size */}
        <Section title="4. Markets & portfolio size">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Markets</p>
          <div className="flex gap-2 mb-4">
            {EXCHANGE_OPTS.map(e => (
              <Chip key={e} label={e === "US" ? "🇺🇸 US" : "🇦🇺 ASX"} active={exchanges.includes(e)}
                onClick={() => toggleArr(exchanges, e, setExchanges)} />
            ))}
          </div>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Portfolio size</p>
          <div className="flex gap-2 flex-wrap">
            {SIZE_OPTS.map(s => (
              <Chip key={s} label={s[0]+s.slice(1).toLowerCase()} active={size === s} onClick={() => setSize(s)} />
            ))}
          </div>
        </Section>

        {/* 5. Analysis preference — multi-select */}
        <Section title="5. Analysis preference" subtitle="Select all that apply — mix frameworks if you use multiple approaches">
          <div className="grid grid-cols-2 gap-2">
            {ANALYSIS_OPTS.map(a => (
              <button key={a} type="button" onClick={() => toggleArr(analysis, a, setAnalysis)}
                className="text-left rounded-xl border-2 px-3 py-2.5 transition-all"
                style={{ borderColor: analysis.includes(a) ? "#2e8b57" : "#e5e7eb", background: analysis.includes(a) ? "#f0fdf4" : "white" }}>
                <span className="font-semibold text-sm block">{ANALYSIS_META[a].emoji} {a === "MIX" ? "Mix TA + FA" : a === "OTHER" ? "Macro / Thematic" : a}</span>
                <span className="text-xs text-gray-400">{ANALYSIS_META[a].desc}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* 6. Language */}
        <Section title="6. Preferred language" subtitle="All AI responses will use this language">
          <div className="flex gap-2">
            <Chip label="🇬🇧 English" active={lang === "en"} onClick={() => setLang("en")} />
            <Chip label="🇨🇳 中文 (Chinese)" active={lang === "zh"} onClick={() => setLang("zh")} />
          </div>
        </Section>

        {/* 7. Response style */}
        <Section title="7. AI response style" subtitle="Preferred depth for analysis reports and chat answers">
          <div className="flex gap-2 flex-wrap">
            {STYLE_OPTS.map(s => (
              <Chip key={s} label={s[0]+s.slice(1).toLowerCase()} active={style === s} onClick={() => setStyle(s)} />
            ))}
          </div>
        </Section>

        {/* Portfolio tickers */}
        <Section title="Stocks you currently hold" subtitle="AI will cross-analyse vs your existing holdings (optional)">
          <input type="text" value={portfolioTickers} onChange={e => setPortfolioTickers(e.target.value)}
            placeholder="e.g. AAPL, BHP, CBA, TSLA"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
        </Section>

        {/* Other preferences */}
        <Section title="Other preferences">
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={esg} onChange={e => setEsg(e.target.checked)}
                className="w-4 h-4 rounded accent-green-600" />
              <span className="text-sm text-gray-700">
                <span className="font-semibold">ESG / ethical investing only</span>
                <span className="text-gray-400 ml-2">— flag ESG concerns in every analysis</span>
              </span>
            </label>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700 w-32">Tax context</span>
              <select value={taxCtx} onChange={e => setTaxCtx(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
                <option value="AU">🇦🇺 Australia</option>
                <option value="US">🇺🇸 United States</option>
                <option value="INTL">🌍 International</option>
              </select>
            </div>
          </div>
        </Section>
      </div>

      {/* Save bar */}
      <div className="mt-8 flex items-center gap-4">
        <button type="button" onClick={handleSave} disabled={saving}
          className="px-8 py-3 rounded-xl font-bold text-white text-sm transition-all hover:brightness-110 disabled:opacity-60"
          style={{ background: "#2e8b57" }}>
          {saving ? "Saving…" : "💾 Save preferences"}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">✓ Saved — AI personalisation active</span>}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
      <p className="text-xs text-gray-400 mt-3">Changes take effect immediately on all new AI analyses and chat sessions.</p>
    </div>
  );
}
