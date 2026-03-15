"use client";

/**
 * FundamentalsPanel.tsx
 * Fetches and renders the fundamental analysis snapshot for a given ticker.
 * Called from /ticker/[symbol]/fundamentals/page.tsx (server-side fetch)
 * and also rendered on the ticker detail page as a collapsible card.
 */

import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FundamentalSnapshot {
  ticker: string;
  exchange: string;
  company_name: string | null;
  sector: string | null;
  industry: string | null;
  currency: string | null;
  market_cap: number | null;
  enterprise_value: number | null;
  pe_ratio: number | null;
  forward_pe: number | null;
  peg_ratio: number | null;
  pb_ratio: number | null;
  ps_ratio: number | null;
  ev_ebitda: number | null;
  ev_revenue: number | null;
  gross_margin: number | null;
  operating_margin: number | null;
  net_margin: number | null;
  roe: number | null;
  roa: number | null;
  roic: number | null;
  revenue_yoy: number | null;
  earnings_yoy: number | null;
  revenue_growth_5yr: number | null;
  eps_growth_5yr: number | null;
  current_ratio: number | null;
  quick_ratio: number | null;
  debt_to_equity: number | null;
  interest_coverage: number | null;
  total_cash: number | null;
  total_debt: number | null;
  net_cash: number | null;
  free_cash_flow: number | null;
  fcf_per_share: number | null;
  fcf_yield: number | null;
  operating_cf_margin: number | null;
  dividend_yield: number | null;
  payout_ratio: number | null;
  beta: number | null;
  short_ratio: number | null;
  next_earnings_date: string | null;
  valuation_score: number | null;
  quality_score: number | null;
  growth_score: number | null;
  macro_score: number | null;
  fundamental_score: number | null;
  fundamental_signal: string | null;
  analyst_consensus: string | null;
  analyst_target_price: number | null;
  analyst_upside_pct: number | null;
  macro_summary: string | null;
  macro_factors: string[] | null;
  geopolitical_flags: string[] | null;
  tech_disruption_risk: string | null;
  fundamental_summary: string | null;
  key_strengths: string[] | null;
  key_risks: string[] | null;
  computed_at: string | null;
}

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtPct(v: number | null, decimals = 1): string {
  if (v === null || v === undefined) return "—";
  return `${(v * 100).toFixed(decimals)}%`;
}

function fmtNum(v: number | null, decimals = 2): string {
  if (v === null || v === undefined) return "—";
  return v.toFixed(decimals);
}

function fmtLarge(v: number | null): string {
  if (v === null || v === undefined) return "—";
  const abs = Math.abs(v);
  if (abs >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `${(v / 1e6).toFixed(2)}M`;
  return v.toLocaleString();
}

// ── Score bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ label, value, range = [-1, 1] }: { label: string; value: number | null; range?: [number, number] }) {
  if (value === null || value === undefined) return null;
  const [min, max] = range;
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const color = value >= 0.3 ? "#2e8b57" : value >= -0.2 ? "#fd8412" : "#dc2626";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-10 text-right" style={{ color }}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

// ── Signal badge ──────────────────────────────────────────────────────────────

const SIGNAL_CONFIG: Record<string, { bg: string; border: string; text: string; label: string }> = {
  STRONG_BUY:  { bg: "#f0fdf4", border: "#16a34a", text: "#15803d", label: "⬆⬆ STRONG BUY"  },
  BUY:         { bg: "#f0fdf4", border: "#4ade80", text: "#166534", label: "⬆ BUY"          },
  NEUTRAL:     { bg: "#f9fafb", border: "#d1d5db", text: "#6b7280", label: "— NEUTRAL"       },
  SELL:        { bg: "#fff7ed", border: "#fb923c", text: "#c2410c", label: "⬇ SELL"          },
  STRONG_SELL: { bg: "#fef2f2", border: "#f87171", text: "#991b1b", label: "⬇⬇ STRONG SELL" },
};

function SignalBadge({ signal }: { signal: string | null }) {
  const cfg = SIGNAL_CONFIG[signal ?? ""] ?? { bg: "#f9fafb", border: "#d1d5db", text: "#6b7280", label: signal ?? "N/A" };
  return (
    <span
      className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold"
      style={{ background: cfg.bg, border: `2px solid ${cfg.border}`, color: cfg.text }}
    >
      {cfg.label}
    </span>
  );
}

function RiskBadge({ risk }: { risk: string | null }) {
  if (!risk || risk === "UNKNOWN") return null;
  const cfg: Record<string, { bg: string; text: string }> = {
    LOW:    { bg: "#f0fdf4", text: "#166534" },
    MEDIUM: { bg: "#fffbea", text: "#92400e" },
    HIGH:   { bg: "#fef2f2", text: "#991b1b" },
  };
  const c = cfg[risk] ?? { bg: "#f9fafb", text: "#6b7280" };
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.text }}>
      {risk} DISRUPTION RISK
    </span>
  );
}

// ── Metric row ────────────────────────────────────────────────────────────────

function MetricRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex justify-between items-baseline py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-800">
        {value}
        {sub && <span className="ml-1 text-xs text-gray-400 font-normal">{sub}</span>}
      </span>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FundamentalsPanel({ data }: { data: FundamentalSnapshot | null }) {
  const [showMacro, setShowMacro] = useState(false);

  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="text-4xl mb-3">📊</div>
        <p className="text-gray-600 font-semibold mb-1">No fundamental data yet</p>
        <p className="text-sm text-gray-400">
          Fundamental analysis is computed nightly. Check back after the next batch run, or add this ticker to the watchlist.
        </p>
      </div>
    );
  }

  const d = data;
  const computedDate = d.computed_at ? d.computed_at.slice(0, 10) : "unknown";

  return (
    <div className="space-y-4">

      {/* ── Header: signal + composite score ─────────────────────────────── */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "linear-gradient(135deg, #1a6e3e 0%, #2e8b57 60%, #4aac78 100%)" }}
      >
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-white/70 text-xs font-medium mb-1">Fundamental Signal</p>
            <SignalBadge signal={d.fundamental_signal} />
            {d.fundamental_score !== null && (
              <p className="text-white/80 text-sm mt-2">
                Composite score: <span className="font-bold text-white">{d.fundamental_score.toFixed(3)}</span>
              </p>
            )}
          </div>
          <div className="text-right">
            {d.analyst_consensus && (
              <div>
                <p className="text-white/60 text-xs mb-0.5">Analyst consensus</p>
                <p className="text-white font-bold text-lg">{d.analyst_consensus}</p>
                {d.analyst_target_price && (
                  <p className="text-white/80 text-sm">
                    Target: {d.currency ?? ""} {d.analyst_target_price.toFixed(2)}
                    {d.analyst_upside_pct !== null && (
                      <span className={`ml-1 font-semibold ${d.analyst_upside_pct >= 0 ? "text-green-300" : "text-red-300"}`}>
                        ({d.analyst_upside_pct >= 0 ? "+" : ""}{d.analyst_upside_pct.toFixed(1)}%)
                      </span>
                    )}
                  </p>
                )}
              </div>
            )}
            <p className="text-white/40 text-xs mt-2">Updated {computedDate}</p>
          </div>
        </div>

        {/* Score bars */}
        <div className="mt-5 bg-white/10 rounded-xl p-4 space-y-2">
          <ScoreBar label="Valuation"  value={d.valuation_score} />
          <ScoreBar label="Quality"    value={d.quality_score}   range={[0, 1]} />
          <ScoreBar label="Growth"     value={d.growth_score}    range={[0, 1]} />
          <ScoreBar label="Macro"      value={d.macro_score} />
        </div>
      </div>

      {/* ── Metric grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Valuation */}
        <Section title="Valuation" icon="💰">
          <MetricRow label="P/E (TTM)"      value={fmtNum(d.pe_ratio, 1)} />
          <MetricRow label="Fwd P/E"        value={fmtNum(d.forward_pe, 1)} />
          <MetricRow label="PEG"            value={fmtNum(d.peg_ratio, 2)} />
          <MetricRow label="P/B"            value={fmtNum(d.pb_ratio, 2)} />
          <MetricRow label="P/S"            value={fmtNum(d.ps_ratio, 2)} />
          <MetricRow label="EV/EBITDA"      value={fmtNum(d.ev_ebitda, 1)} />
          <MetricRow label="FCF Yield"      value={fmtPct(d.fcf_yield)} />
          <MetricRow label="Market Cap"     value={fmtLarge(d.market_cap)} sub={d.currency ?? ""} />
        </Section>

        {/* Quality / Profitability */}
        <Section title="Quality & Profitability" icon="⭐">
          <MetricRow label="Gross Margin"   value={fmtPct(d.gross_margin)} />
          <MetricRow label="Operating Mgn"  value={fmtPct(d.operating_margin)} />
          <MetricRow label="Net Margin"     value={fmtPct(d.net_margin)} />
          <MetricRow label="ROE"            value={fmtPct(d.roe)} />
          <MetricRow label="ROA"            value={fmtPct(d.roa)} />
          <MetricRow label="ROIC"           value={fmtPct(d.roic)} />
          <MetricRow label="Debt / Equity"  value={fmtNum(d.debt_to_equity, 2)} />
          <MetricRow label="Current Ratio"  value={fmtNum(d.current_ratio, 2)} />
        </Section>

        {/* Growth */}
        <Section title="Growth" icon="📈">
          <MetricRow label="Revenue YoY"    value={fmtPct(d.revenue_yoy)} />
          <MetricRow label="Earnings YoY"   value={fmtPct(d.earnings_yoy)} />
          <MetricRow label="5yr Rev CAGR"   value={fmtPct(d.revenue_growth_5yr)} />
          <MetricRow label="5yr EPS CAGR"   value={fmtPct(d.eps_growth_5yr)} />
          <MetricRow label="Free Cash Flow" value={fmtLarge(d.free_cash_flow)} sub={d.currency ?? ""} />
          <MetricRow label="FCF / Share"    value={fmtNum(d.fcf_per_share, 2)} />
          <MetricRow label="Op CF Margin"   value={fmtPct(d.operating_cf_margin)} />
        </Section>

        {/* Market & Other */}
        <Section title="Market & Structure" icon="🏛">
          <MetricRow label="Beta"           value={fmtNum(d.beta, 2)} />
          <MetricRow label="Short Ratio"    value={fmtNum(d.short_ratio, 1)} />
          <MetricRow label="Dividend Yield" value={fmtPct(d.dividend_yield)} />
          <MetricRow label="Payout Ratio"   value={fmtPct(d.payout_ratio)} />
          <MetricRow label="Total Cash"     value={fmtLarge(d.total_cash)} sub={d.currency ?? ""} />
          <MetricRow label="Total Debt"     value={fmtLarge(d.total_debt)} sub={d.currency ?? ""} />
          <MetricRow label="Net Cash"       value={fmtLarge(d.net_cash)} sub={d.currency ?? ""} />
          {d.next_earnings_date && (
            <MetricRow label="Next Earnings" value={d.next_earnings_date.slice(0, 10)} />
          )}
        </Section>
      </div>

      {/* ── AI Summary ───────────────────────────────────────────────────── */}
      {d.fundamental_summary && (
        <Section title="AI Fundamental Summary" icon="🤖">
          <p className="text-sm text-gray-700 leading-relaxed">{d.fundamental_summary}</p>
        </Section>
      )}

      {/* ── Key strengths / risks ─────────────────────────────────────────── */}
      {((d.key_strengths?.length ?? 0) > 0 || (d.key_risks?.length ?? 0) > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(d.key_strengths?.length ?? 0) > 0 && (
            <Section title="Key Strengths" icon="✅">
              <ul className="space-y-1.5">
                {d.key_strengths!.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-green-500 shrink-0 mt-0.5">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {(d.key_risks?.length ?? 0) > 0 && (
            <Section title="Key Risks" icon="⚠️">
              <ul className="space-y-1.5">
                {d.key_risks!.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-orange-400 shrink-0 mt-0.5">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}

      {/* ── Macro & Geopolitical ─────────────────────────────────────────── */}
      {(d.macro_summary || (d.macro_factors?.length ?? 0) > 0 || (d.geopolitical_flags?.length ?? 0) > 0) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowMacro(!showMacro)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
              🌍 Macro & Geopolitical Context
              {d.tech_disruption_risk && <RiskBadge risk={d.tech_disruption_risk} />}
            </span>
            <span className="text-gray-400 text-sm">{showMacro ? "▲" : "▼"}</span>
          </button>
          {showMacro && (
            <div className="px-5 pb-5 space-y-4 border-t border-gray-50">
              {d.macro_summary && (
                <p className="text-sm text-gray-700 leading-relaxed pt-3">{d.macro_summary}</p>
              )}
              {(d.macro_factors?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Macro Factors</p>
                  <ul className="space-y-1">
                    {d.macro_factors!.map((f, i) => (
                      <li key={i} className="text-sm text-gray-700 flex gap-2">
                        <span className="text-[#2e8b57] shrink-0">•</span>{f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(d.geopolitical_flags?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Geopolitical Flags</p>
                  <div className="flex flex-wrap gap-2">
                    {d.geopolitical_flags!.map((g, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                        ⚑ {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <p className="text-sm text-gray-500 pb-2 border-t border-gray-100 pt-4 mt-2">
        ⚠️ AI-computed fundamental scores are for research only — not financial advice. Scores are computed nightly from yfinance data and Gemini grounding. Always do your own research before making investment decisions.
      </p>
    </div>
  );
}
