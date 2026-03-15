"use client";

/**
 * /screener  —  Fundamental Analysis Screener
 *
 * Comprehensive UX with full explanations of every filter, score, and column.
 * Helps users answer: "Which stocks are fundamentally attractive right now?"
 *
 * Profile integration:
 *  - On mount: loads investor profile screener_defaults (preferred exchange,
 *    sector, min score, etc.) and pre-fills the filter controls.
 *  - After each run: saves the current filter state back to screener_defaults
 *    so the next visit remembers the last choices.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScreenerRow {
  ticker: string;
  exchange: string;
  company_name: string | null;
  sector: string | null;
  fundamental_signal: string | null;
  fundamental_score: number | null;
  valuation_score: number | null;
  quality_score: number | null;
  growth_score: number | null;
  macro_score: number | null;
  analyst_consensus: string | null;
  analyst_upside_pct: number | null;
  tech_disruption_risk: string | null;
  computed_at: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SIGNAL_OPTIONS = [
  { value: "",            label: "All signals" },
  { value: "STRONG_BUY",  label: "⬆⬆ STRONG BUY" },
  { value: "BUY",         label: "⬆ BUY" },
  { value: "NEUTRAL",     label: "→ NEUTRAL" },
  { value: "SELL",        label: "⬇ SELL" },
  { value: "STRONG_SELL", label: "⬇⬇ STRONG SELL" },
];

const SECTOR_OPTIONS = [
  "", "Technology", "Healthcare", "Financials", "Energy", "Materials",
  "Consumer Discretionary", "Consumer Staples", "Industrials",
  "Real Estate", "Utilities", "Communication Services",
];

const MIN_SCORE_PRESETS = [
  { value: "",     label: "Any score" },
  { value: "0.5",  label: "≥ 0.5  — STRONG BUY territory" },
  { value: "0.2",  label: "≥ 0.2  — BUY or better" },
  { value: "0.0",  label: "≥ 0.0  — positive signals only" },
  { value: "-0.2", label: "≥ −0.2 — exclude weak sells" },
];

// ── Badge / chip helpers ──────────────────────────────────────────────────────

const SIGNAL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  STRONG_BUY:  { bg: "#f0fdf4", text: "#15803d", border: "#4ade80" },
  BUY:         { bg: "#f0fdf4", text: "#166534", border: "#86efac" },
  NEUTRAL:     { bg: "#f9fafb", text: "#6b7280", border: "#d1d5db" },
  SELL:        { bg: "#fff7ed", text: "#c2410c", border: "#fb923c" },
  STRONG_SELL: { bg: "#fef2f2", text: "#991b1b", border: "#f87171" },
};

const RISK_COLORS: Record<string, { bg: string; text: string }> = {
  LOW:    { bg: "#f0fdf4", text: "#166534" },
  MEDIUM: { bg: "#fffbea", text: "#92400e" },
  HIGH:   { bg: "#fef2f2", text: "#991b1b" },
};

function SignalChip({ signal }: { signal: string | null }) {
  if (!signal) return <span className="text-gray-300 text-sm">—</span>;
  const c = SIGNAL_COLORS[signal] ?? { bg: "#f9fafb", text: "#6b7280", border: "#d1d5db" };
  return (
    <span
      className="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ background: c.bg, color: c.text, border: `1.5px solid ${c.border}` }}
    >
      {signal.replace("_", " ")}
    </span>
  );
}

function ScoreBar({ value, range = [-1, 1] }: { value: number | null; range?: [number, number] }) {
  if (value === null) return <span className="text-gray-300 text-xs">—</span>;
  const [min, max] = range;
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const color = value >= 0.3 ? "#15803d" : value >= -0.2 ? "#92400e" : "#991b1b";
  return (
    <div className="flex items-center gap-1.5 justify-end">
      <span className="text-xs font-bold tabular-nums w-10 text-right" style={{ color }}>
        {value.toFixed(2)}
      </span>
      <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function RiskChip({ risk }: { risk: string | null }) {
  if (!risk || risk === "UNKNOWN") return <span className="text-gray-300 text-xs">—</span>;
  const c = RISK_COLORS[risk] ?? { bg: "#f9fafb", text: "#6b7280" };
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.text }}>
      {risk}
    </span>
  );
}

// ── Score legend component ────────────────────────────────────────────────────

function ScoreLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-[#f8fafc] border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-600 flex items-center gap-2">
          📖 How AI scores work — what do these numbers mean?
        </span>
        <span className="text-gray-400 text-sm">{open ? "▲ hide" : "▼ show"}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
          <p className="text-sm text-gray-600">
            Each stock is scored nightly using <strong>yfinance data + Gemini grounding</strong> across four dimensions.
            The composite score answers: <em>&quot;Is this stock fundamentally attractive right now?&quot;</em>
          </p>

          {/* Composite score */}
          <div className="bg-white rounded-lg border border-gray-100 p-4">
            <p className="text-sm font-bold text-gray-700 mb-2">🎯 Composite Score (−1.0 to +1.0)</p>
            <p className="text-xs text-gray-500 mb-3">
              Weighted average: <code className="bg-gray-100 px-1 rounded">0.35 × Val + 0.30 × Qual + 0.20 × Growth + 0.15 × Macro</code>
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "STRONG BUY", range: "≥ 0.5", bg: "#f0fdf4", text: "#15803d", border: "#4ade80" },
                { label: "BUY",        range: "≥ 0.2", bg: "#f0fdf4", text: "#166534", border: "#86efac" },
                { label: "NEUTRAL",    range: "> −0.2", bg: "#f9fafb", text: "#6b7280", border: "#d1d5db" },
                { label: "SELL",       range: "> −0.5", bg: "#fff7ed", text: "#c2410c", border: "#fb923c" },
                { label: "STRONG SELL",range: "≤ −0.5", bg: "#fef2f2", text: "#991b1b", border: "#f87171" },
              ].map(({ label, range, bg, text, border }) => (
                <span key={label} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ background: bg, color: text, border: `1.5px solid ${border}` }}>
                  {label} <span className="font-normal opacity-70">{range}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Four dimensions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <p className="text-xs font-bold text-gray-700 mb-1">💰 Val — Valuation (−1 to +1, weight 35%)</p>
              <p className="text-xs text-gray-500">
                Positive = <strong>cheap vs sector peers</strong>. Compares P/E, EV/EBITDA, P/B, PEG ratio, and FCF yield
                against sector medians. A score of +0.5 means significantly undervalued; −0.5 means expensive.
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <p className="text-xs font-bold text-gray-700 mb-1">⭐ Qual — Quality (0 to 1, weight 30%)</p>
              <p className="text-xs text-gray-500">
                Measures <strong>business quality and management effectiveness</strong>: gross/net margins, ROE, ROIC,
                debt-to-equity, current ratio, and interest coverage. Higher = stronger, more durable business.
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <p className="text-xs font-bold text-gray-700 mb-1">📈 Growth (0 to 1, weight 20%)</p>
              <p className="text-xs text-gray-500">
                <strong>Revenue, earnings and free cash flow growth momentum</strong> — YoY rates plus 5-year CAGRs.
                High score = accelerating, profitable growth; low score = stagnant or declining.
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <p className="text-xs font-bold text-gray-700 mb-1">🌍 Macro (−1 to +1, weight 15%)</p>
              <p className="text-xs text-gray-500">
                <strong>Sector-level macro & geopolitical environment</strong> via Gemini real-time grounding.
                Covers interest rates, trade policy, geopolitical risks (tariffs, conflicts),
                and sector-specific regulation. Positive = tailwinds; negative = headwinds.
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
            <p className="text-xs text-amber-700">
              <strong>AI Disruption Risk</strong> — estimated exposure of the sector to AI/automation disruption.
              HIGH risk may compress long-term margins for companies not adapting; it does <em>not</em> automatically mean sell.
              Combine with the individual stock&apos;s Growth and Quality scores for full context.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ScreenerPage() {
  const [exchange, setExchange] = useState("US");
  const [signal,   setSignal]   = useState("");
  const [sector,   setSector]   = useState("");
  const [minScore, setMinScore] = useState("");
  const [maxRisk,  setMaxRisk]  = useState("");
  const [limit,    setLimit]    = useState(50);

  const [rows,    setRows]    = useState<ScreenerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [ran,     setRan]     = useState(false);

  // ── Load screener defaults from investor profile ─────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch("/api/profile");
        const json = await res.json() as {
          ok: boolean;
          profile?: {
            preferred_exchanges?: string[];
            screener_defaults?: {
              exchange?: string;
              signal?:   string;
              sector?:   string;
              minScore?: string;
              maxRisk?:  string;
              limit?:    number;
            };
          };
        };
        if (!json.ok || !json.profile) return;
        const p  = json.profile;
        const sd = p.screener_defaults ?? {};
        // Apply profile exchange preference if no screener default saved
        if (sd.exchange)        setExchange(sd.exchange);
        else if (p.preferred_exchanges?.[0]) setExchange(p.preferred_exchanges[0]);
        if (sd.signal   != null) setSignal(sd.signal);
        if (sd.sector   != null) setSector(sd.sector);
        if (sd.minScore != null) setMinScore(sd.minScore);
        if (sd.maxRisk  != null) setMaxRisk(sd.maxRisk);
        if (sd.limit    != null) setLimit(sd.limit);
      } catch { /* no profile — use defaults */ }
    })();
  }, []);

  // ── Save screener state back to profile after each run ───────────────────
  const saveScreenerDefaults = useCallback(async (
    ex: string, sig: string, sec: string, min: string, risk: string, lim: number
  ) => {
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screener_defaults: {
            exchange:  ex,
            signal:    sig,
            sector:    sec,
            minScore:  min,
            maxRisk:   risk,
            limit:     lim,
          },
        }),
      });
    } catch { /* non-fatal — profile save failure shouldn't break screener */ }
  }, []);

  const runScreener = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ exchange, limit: String(limit) });
      if (signal)   params.set("signal",        signal);
      if (sector)   params.set("sector",        sector);
      if (minScore) params.set("min_score",     minScore);
      if (maxRisk)  params.set("max_tech_risk", maxRisk);

      const res = await fetch(`/api/screener?${params.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setRows(json.data ?? []);
        setRan(true);
        // Persist filter choices to profile (fire-and-forget)
        saveScreenerDefaults(exchange, signal, sector, minScore, maxRisk, limit);
      } else {
        setError(json.error ?? "Screener request failed");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [exchange, signal, sector, minScore, maxRisk, limit, saveScreenerDefaults]);

  // Auto-run on first load with defaults
  useEffect(() => {
    runScreener();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div
        className="w-full"
        style={{ background: "linear-gradient(45deg, seagreen, darkseagreen)", paddingTop: "32px", paddingBottom: "36px" }}
      >
        <div className="max-w-6xl mx-auto px-8 space-y-4">
          <div className="flex items-end gap-4 flex-wrap">
            <h1
              className="text-4xl font-bold text-white drop-shadow-sm"
              style={{ fontFamily: "var(--font-rajdhani)" }}
            >
              Fundamental Stock Screener
            </h1>
            <span className="text-white/70 font-light pb-1">
              AI-scored · nightly updated
            </span>
          </div>

          {/* Filters */}
          <div className="flex items-end gap-4 flex-wrap">

            {/* Exchange */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                Exchange
              </label>
              <div className="flex gap-2">
                {["US", "ASX"].map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setExchange(ex)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:brightness-110"
                    style={
                      exchange === ex
                        ? { background: "#fd8412", color: "#fff" }
                        : { background: "rgba(255,255,255,0.2)", color: "#fff" }
                    }
                  >
                    {ex === "US" ? "🇺🇸 US" : "🇦🇺 ASX"}
                  </button>
                ))}
              </div>
            </div>

            {/* Signal */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                AI Signal
              </label>
              <select
                value={signal}
                onChange={(e) => setSignal(e.target.value)}
                className="text-sm border-0 rounded-lg px-3 py-2 focus:outline-none bg-white/90 text-gray-700"
              >
                {SIGNAL_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Sector */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                Sector
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="text-sm border-0 rounded-lg px-3 py-2 focus:outline-none bg-white/90 text-gray-700 min-w-[160px]"
              >
                <option value="">All sectors</option>
                {SECTOR_OPTIONS.filter(Boolean).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Min score */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                Min Score
              </label>
              <select
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                className="text-sm border-0 rounded-lg px-3 py-2 focus:outline-none bg-white/90 text-gray-700 min-w-[200px]"
              >
                {MIN_SCORE_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Max tech risk */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                AI Disruption Risk
              </label>
              <select
                value={maxRisk}
                onChange={(e) => setMaxRisk(e.target.value)}
                className="text-sm border-0 rounded-lg px-3 py-2 focus:outline-none bg-white/90 text-gray-700"
              >
                <option value="">Any risk level</option>
                <option value="LOW">≤ LOW (safest)</option>
                <option value="MEDIUM">≤ MEDIUM</option>
                <option value="HIGH">Include HIGH</option>
              </select>
            </div>

            {/* Limit */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                Show
              </label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="text-sm border-0 rounded-lg px-3 py-2 focus:outline-none bg-white/90 text-gray-700"
              >
                {[20, 50, 100].map((n) => <option key={n} value={n}>{n} results</option>)}
              </select>
            </div>

            {/* Run button */}
            <button
              onClick={runScreener}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 disabled:opacity-60 shadow-md"
              style={{ background: "#fd8412", color: "#fff" }}
            >
              {loading ? "⟳ Scanning…" : "🔍 Screen stocks"}
            </button>
          </div>

          {/* Signal scale reference */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-white/50 text-xs">Score scale:</span>
            {[
              { label: "STRONG BUY ≥0.5", bg: "#f0fdf4", text: "#15803d" },
              { label: "BUY ≥0.2",        bg: "#dcfce7", text: "#166534" },
              { label: "NEUTRAL →",       bg: "#f9fafb", text: "#6b7280" },
              { label: "SELL ↓",          bg: "#fff7ed", text: "#c2410c" },
              { label: "STRONG SELL ≤−0.5", bg: "#fef2f2", text: "#991b1b" },
            ].map(({ label, bg, text }) => (
              <span key={label} className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: bg, color: text }}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content area ─────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-8 py-6 space-y-6">

        {/* Value proposition */}
        <p className="text-sm text-gray-500">
          Find stocks that are <strong className="text-gray-700">fundamentally attractive right now</strong> —
          screened by AI across valuation (is it cheap?), business quality (is management doing a good job?),
          growth momentum (revenue &amp; cashflow trajectory), and macro environment (tailwinds or headwinds?).
          Use this to shortlist candidates, then open the full AI analysis for buy/sell/hold depth.
        </p>

        {/* Score legend (expandable) */}
        <ScoreLegend />

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-3">
              <div className="text-4xl animate-pulse">📊</div>
              <p className="text-gray-500 text-sm font-medium">Scanning fundamentals…</p>
              <p className="text-gray-400 text-xs">Reading nightly-computed AI scores from database</p>
            </div>
          </div>
        )}

        {/* Results count */}
        {ran && !loading && !error && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {rows.length === 0
                ? "No stocks match your filters."
                : <><strong>{rows.length}</strong> stock{rows.length === 1 ? "" : "s"} found — click any ticker for full AI analysis</>}
            </p>
            <p className="text-xs text-gray-400">
              Scores computed nightly · Updated up to 24h ago
            </p>
          </div>
        )}

        {/* Results table */}
        {!loading && rows.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-5 py-3 w-24">
                    Ticker
                  </th>
                  <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-3 py-3">
                    Company
                  </th>
                  <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-3 py-3">
                    Sector
                  </th>
                  <th className="text-center text-xs font-bold text-gray-500 uppercase tracking-wide px-3 py-3">
                    AI Signal
                  </th>
                  <th className="text-right px-3 py-3">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Score</div>
                    <div className="text-[10px] text-gray-400 font-normal normal-case">−1.0 → +1.0</div>
                  </th>
                  <th className="text-right px-3 py-3">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Val</div>
                    <div className="text-[10px] text-gray-400 font-normal normal-case">cheap vs peers</div>
                  </th>
                  <th className="text-right px-3 py-3">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Qual</div>
                    <div className="text-[10px] text-gray-400 font-normal normal-case">margins &amp; ROE</div>
                  </th>
                  <th className="text-right px-3 py-3">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Growth</div>
                    <div className="text-[10px] text-gray-400 font-normal normal-case">rev &amp; earnings</div>
                  </th>
                  <th className="text-right px-3 py-3">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Macro</div>
                    <div className="text-[10px] text-gray-400 font-normal normal-case">sector env.</div>
                  </th>
                  <th className="text-center px-3 py-3">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Analyst</div>
                    <div className="text-[10px] text-gray-400 font-normal normal-case">Wall St. consensus</div>
                  </th>
                  <th className="text-right px-3 py-3">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Upside</div>
                    <div className="text-[10px] text-gray-400 font-normal normal-case">to price target</div>
                  </th>
                  <th className="text-center px-3 py-3">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">AI Risk</div>
                    <div className="text-[10px] text-gray-400 font-normal normal-case">disruption</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={row.ticker}
                    className="border-b border-gray-50 hover:bg-[#f0f7f1] transition-colors cursor-pointer"
                    style={idx % 2 === 0 ? {} : { background: "#fafafa" }}
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/ticker/${row.ticker}/intel`}
                        className="font-bold text-[#2e8b57] hover:text-[#1a6e3e] transition-colors text-sm hover:underline"
                      >
                        {row.ticker}
                      </Link>
                      <div className="text-xs text-gray-400">{row.exchange}</div>
                    </td>
                    <td className="px-3 py-3 max-w-[160px]">
                      <span className="text-sm text-gray-700 truncate block" title={row.company_name ?? ""}>
                        {row.company_name ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs text-gray-500">{row.sector ?? "—"}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <SignalChip signal={row.fundamental_signal} />
                    </td>
                    <td className="px-3 py-3">
                      <ScoreBar value={row.fundamental_score} />
                    </td>
                    <td className="px-3 py-3">
                      <ScoreBar value={row.valuation_score} />
                    </td>
                    <td className="px-3 py-3">
                      <ScoreBar value={row.quality_score} range={[0, 1]} />
                    </td>
                    <td className="px-3 py-3">
                      <ScoreBar value={row.growth_score} range={[0, 1]} />
                    </td>
                    <td className="px-3 py-3">
                      <ScoreBar value={row.macro_score} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs text-gray-600 font-medium">{row.analyst_consensus ?? "—"}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {row.analyst_upside_pct !== null ? (
                        <span
                          className="text-sm font-semibold tabular-nums"
                          style={{ color: row.analyst_upside_pct >= 0 ? "#15803d" : "#991b1b" }}
                        >
                          {row.analyst_upside_pct >= 0 ? "+" : ""}{row.analyst_upside_pct.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-300 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <RiskChip risk={row.tech_disruption_risk} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Table footer hint */}
            <div className="px-5 py-3 border-t border-gray-50 bg-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Click any ticker to open the full AI analysis (Technical Signal + Chart Vision + Fundamental Analysis)
              </p>
              <p className="text-xs text-gray-400">
                {rows.length} result{rows.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        )}

        {/* No results */}
        {!loading && ran && rows.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <p className="font-semibold text-gray-700 mb-2">No stocks match your current filters</p>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Try relaxing the filters — remove the sector, lower the min score, or change the signal.
              <br />
              Fundamental data is computed nightly; new tickers appear after their first batch run.
            </p>
          </div>
        )}

        {/* Initial state */}
        {!ran && !loading && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-gray-500 text-sm">
              Select your filters above and click <strong>Screen stocks</strong> to find opportunities.
            </p>
          </div>
        )}

        <p className="text-sm text-gray-500 pb-4 border-t border-gray-100 pt-4">
          ⚠️ AI-computed fundamental scores are for research only — not financial advice. Scores are computed nightly from yfinance data and Gemini grounding. Always do your own research before making investment decisions.
        </p>
      </div>
    </div>
  );
}
