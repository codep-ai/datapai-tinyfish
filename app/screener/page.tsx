"use client";

/**
 * /screener  —  Stock Screener (Technical + Fundamental tabs)
 *
 * Technical tab: screens 8,500+ tickers using pre-computed TA indicators
 *   (SMA, RSI, MACD, KDJ, BB, Pivot Points, OBV, volume, volatility)
 * Fundamental tab: screens ~30 tickers with AI fundamental scores
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import WatchlistButton from "@/app/components/WatchlistButton";

// ── i18n helpers ─────────────────────────────────────────────────────────────

type Labels = Record<string, string>;

function getLangFromCookie(): string {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/(?:^|;\s*)lang=([^;]*)/);
  return match?.[1] ?? "en";
}

/** Fetch UI labels from /api/i18n/labels for client components */
function useLabels(): Labels {
  const [labels, setLabels] = useState<Labels>({});
  useEffect(() => {
    const lang = getLangFromCookie();
    if (lang === "en") return; // English is the hardcoded fallback
    fetch(`/api/i18n/labels?lang=${lang}&category=screener,enum`)
      .then((r) => r.json())
      .then(setLabels)
      .catch(() => {}); // fallback to English on error
  }, []);
  return labels;
}

/** Lookup a label, fallback to English default */
function L(labels: Labels, key: string, fallback: string): string {
  return labels[key] ?? fallback;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface TechRow {
  ticker: string;
  exchange: string;
  latest_close: number | null;
  latest_volume: number | null;
  trade_date: string | null;
  change_1d_pct: number | null;
  change_5d_pct: number | null;
  change_1m_pct: number | null;
  change_3m_pct: number | null;
  change_6m_pct: number | null;
  change_1y_pct: number | null;
  high_52w: number | null;
  low_52w: number | null;
  pct_from_52w_high: number | null;
  pct_from_52w_low: number | null;
  sma_5: number | null;
  sma_10: number | null;
  sma_20: number | null;
  sma_50: number | null;
  sma_200: number | null;
  price_vs_sma20_pct: number | null;
  price_vs_sma50_pct: number | null;
  price_vs_sma200_pct: number | null;
  golden_cross: boolean | null;
  death_cross: boolean | null;
  rsi_14: number | null;
  macd_line: number | null;
  macd_signal: number | null;
  macd_histogram: number | null;
  macd_trend: string | null;
  kdj_k: number | null;
  kdj_d: number | null;
  kdj_signal: string | null;
  bb_pct_b: number | null;
  obv_trend: string | null;
  volume_ratio: number | null;
  volatility_20d: number | null;
  computed_at: string | null;
  // ── Multi-factor enrichment (from backend) ──
  datapai_score: number | null;
  mfs_signal_days: string | null;
  mfs_signal_weeks: string | null;
  mfs_signal_months: string | null;
  mfs_signal_quarter: string | null;
  mfs_quality_tier: string | null;
  fl_quality_tier: string | null;
  fl_pe: number | null;
  fl_fwd_pe: number | null;
  fl_gross_margin: number | null;
  fl_roe: number | null;
  fl_rev_yoy: number | null;
  fl_profitable: boolean | null;
  fl_growing: boolean | null;
  fl_healthy: boolean | null;
  fl_analyst_rating: string | null;
  fl_market_cap: number | null;
  fl_sector: string | null;
  ci_alert_score: number | null;
  ci_severity: string | null;
  ci_signal_type: string | null;
  ci_what_changed: string | null;
  me_severity: string | null;
  me_sentiment: string | null;
  me_headline: string | null;
}

interface FundRow {
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
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function pctCell(v: number | null) {
  if (v === null || v === undefined) return <span className="text-gray-300">—</span>;
  const color = v >= 0 ? "#15803d" : "#dc2626";
  return (
    <span className="text-xs font-semibold tabular-nums" style={{ color }}>
      {v >= 0 ? "+" : ""}{v.toFixed(2)}%
    </span>
  );
}

const TREND_LABEL_KEY: Record<string, string> = {
  BULLISH: "signal_bullish_chip", BEARISH: "signal_bearish_chip",
  UP: "signal_up_chip", DOWN: "signal_down_chip", FLAT: "signal_flat_chip",
  OVERBOUGHT: "signal_overbought_chip", OVERSOLD: "signal_oversold_chip",
  NEUTRAL: "signal_neutral_chip",
};

function trendChip(trend: string | null, labels?: Labels) {
  if (!trend) return <span className="text-gray-300 text-xs">—</span>;
  const defaults: Record<string, { bg: string; text: string }> = {
    BULLISH:    { bg: "#dcfce7", text: "#166534" },
    BEARISH:    { bg: "#fef2f2", text: "#991b1b" },
    UP:         { bg: "#dcfce7", text: "#166534" },
    DOWN:       { bg: "#fef2f2", text: "#991b1b" },
    FLAT:       { bg: "#f3f4f6", text: "#6b7280" },
    OVERBOUGHT: { bg: "#fef2f2", text: "#991b1b" },
    OVERSOLD:   { bg: "#dcfce7", text: "#166534" },
    NEUTRAL:    { bg: "#f3f4f6", text: "#6b7280" },
  };
  const c = defaults[trend] ?? { bg: "#f3f4f6", text: "#6b7280" };
  const display = labels && TREND_LABEL_KEY[trend] ? L(labels, TREND_LABEL_KEY[trend], trend) : trend;
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: c.bg, color: c.text }}>
      {display}
    </span>
  );
}

function volFmt(v: number | null): string {
  if (v === null || v === undefined) return "—";
  if (v >= 1e9) return (v / 1e9).toFixed(1) + "B";
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(0) + "K";
  return v.toFixed(0);
}

// ── Signal / Score helpers for fundamental tab ──────────────────────────────

const SIGNAL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  STRONG_BUY:  { bg: "#f0fdf4", text: "#15803d", border: "#4ade80" },
  BUY:         { bg: "#f0fdf4", text: "#166534", border: "#86efac" },
  NEUTRAL:     { bg: "#f9fafb", text: "#6b7280", border: "#d1d5db" },
  SELL:        { bg: "#fff7ed", text: "#c2410c", border: "#fb923c" },
  STRONG_SELL: { bg: "#fef2f2", text: "#991b1b", border: "#f87171" },
};

const SIGNAL_LABEL_KEY: Record<string, string> = {
  STRONG_BUY: "signal_strong_buy", BUY: "signal_buy",
  NEUTRAL: "signal_hold", SELL: "signal_sell", STRONG_SELL: "signal_strong_sell",
};

function SignalChip({ signal, labels }: { signal: string | null; labels?: Labels }) {
  if (!signal) return <span className="text-gray-300 text-sm">—</span>;
  const c = SIGNAL_COLORS[signal] ?? { bg: "#f9fafb", text: "#6b7280", border: "#d1d5db" };
  const display = labels && SIGNAL_LABEL_KEY[signal] ? L(labels, SIGNAL_LABEL_KEY[signal], signal.replace("_", " ")) : signal.replace("_", " ");
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ background: c.bg, color: c.text, border: `1.5px solid ${c.border}` }}>
      {display}
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

function RsiCell({ rsi }: { rsi: number | null }) {
  if (rsi === null || rsi === undefined) return <span className="text-gray-300 text-xs">—</span>;
  const color = rsi >= 70 ? "#dc2626" : rsi <= 30 ? "#15803d" : "#6b7280";
  return (
    <span className="text-xs font-semibold tabular-nums" style={{ color }}>
      {rsi.toFixed(0)}
    </span>
  );
}

/** RSI zone signal chip */
function RsiSignal({ rsi, labels }: { rsi: number | null; labels?: Labels }) {
  if (rsi === null || rsi === undefined) return <span className="text-gray-300 text-xs">—</span>;
  if (rsi >= 70) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: "#fef2f2", color: "#991b1b" }}>{L(labels ?? {}, "signal_overbought_chip", "OVERBOUGHT")}</span>;
  if (rsi <= 30) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: "#dcfce7", color: "#166534" }}>{L(labels ?? {}, "signal_oversold_chip", "OVERSOLD")}</span>;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: "#f3f4f6", color: "#6b7280" }}>{L(labels ?? {}, "signal_neutral_chip", "NEUTRAL")}</span>;
}

// ── DataPAI Score + Quality Tier + Alert helpers ────────────────────────────

/** DataPAI composite score 0-100 bar with color coding */
function DataPAIScoreCell({ score }: { score: number | null }) {
  if (score === null || score === undefined) return <span className="text-gray-300 text-[9px]">—</span>;
  const color = score >= 65 ? "#15803d" : score >= 45 ? "#92400e" : "#dc2626";
  const bg = score >= 65 ? "#dcfce7" : score >= 45 ? "#fefce8" : "#fef2f2";
  const label = score >= 65 ? "STRONG" : score >= 45 ? "NEUTRAL" : "WEAK";
  return (
    <div className="flex items-center gap-1" title={`DataPAI Score: ${score}/100 — combines TA + Fundamentals + Website Intelligence + News`}>
      <span className="text-[10px] font-extrabold tabular-nums w-6 text-right" style={{ color }}>{score}</span>
      <div className="w-10 h-2 rounded-full overflow-hidden" style={{ background: "#f3f4f6" }}>
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  );
}

/** Quality tier chip A/B/C/D with detailed tooltip */
function QualityTierCell({ tier, row }: { tier: string | null; row?: TechRow }) {
  if (!tier) return <span className="text-gray-300 text-[9px]">—</span>;
  const styles: Record<string, { bg: string; color: string; label: string; desc: string }> = {
    A: { bg: "#dcfce7", color: "#166534", label: "Excellent",
         desc: "Profitable, growing revenue, healthy balance sheet, strong margins, good ROE" },
    B: { bg: "#dbeafe", color: "#1e40af", label: "Good",
         desc: "Mostly profitable, decent growth, reasonable debt levels" },
    C: { bg: "#fefce8", color: "#854d0e", label: "Fair",
         desc: "Mixed fundamentals — may lack profitability, growth, or financial health" },
    D: { bg: "#fef2f2", color: "#991b1b", label: "Poor",
         desc: "Unprofitable, declining revenue, or weak balance sheet — higher risk" },
  };
  const s = styles[tier] ?? { bg: "#f3f4f6", color: "#6b7280", label: "Unknown", desc: "" };
  // Build rich tooltip with actual data if available
  const parts = [`Quality ${tier}: ${s.label}`, s.desc];
  if (row) {
    const details: string[] = [];
    if (row.fl_pe !== null && row.fl_pe !== undefined) details.push(`PE: ${row.fl_pe.toFixed(1)}`);
    if (row.fl_roe !== null && row.fl_roe !== undefined) details.push(`ROE: ${(row.fl_roe * 100).toFixed(0)}%`);
    if (row.fl_gross_margin !== null && row.fl_gross_margin !== undefined) details.push(`Margin: ${(row.fl_gross_margin * 100).toFixed(0)}%`);
    if (row.fl_rev_yoy !== null && row.fl_rev_yoy !== undefined) details.push(`Rev YoY: ${(row.fl_rev_yoy * 100).toFixed(0)}%`);
    if (row.fl_profitable !== null) details.push(row.fl_profitable ? "✓ Profitable" : "✗ Not profitable");
    if (row.fl_growing !== null) details.push(row.fl_growing ? "✓ Growing" : "✗ Not growing");
    if (details.length) parts.push(details.join(" · "));
  }
  return (
    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded cursor-help" style={{ background: s.bg, color: s.color }}
      title={parts.join("\n")}>
      {tier}
    </span>
  );
}

/** Website change / news alert chip */
function AlertCell({ ciSeverity, ciWhat, meSeverity, meHeadline }: {
  ciSeverity: string | null; ciWhat: string | null;
  meSeverity: string | null; meHeadline: string | null;
}) {
  // Pick the most significant alert (CI = website change, ME = news)
  const sev = ciSeverity || meSeverity;
  const detail = ciWhat || meHeadline;
  if (!sev) return <span className="text-gray-300 text-[9px]">—</span>;
  const upper = sev.toUpperCase();
  if (upper === "CRITICAL") return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#fef2f2", color: "#991b1b" }} title={detail || ""}>🔴 CRIT</span>;
  if (upper === "HIGH") return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#fff7ed", color: "#c2410c" }} title={detail || ""}>🟠 HIGH</span>;
  if (upper === "MEDIUM") return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#fefce8", color: "#854d0e" }} title={detail || ""}>🟡 MED</span>;
  return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#f3f4f6", color: "#6b7280" }} title={detail || ""}>⚪ LOW</span>;
}

/** Market cap formatter */
function mcapFmt(v: number | null): string {
  if (v === null || v === undefined) return "—";
  if (v >= 1e12) return "$" + (v / 1e12).toFixed(1) + "T";
  if (v >= 1e9) return "$" + (v / 1e9).toFixed(1) + "B";
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(0) + "M";
  return "$" + volFmt(v);
}

// ── Composite Buy / Hold / Sell signal for each timeframe ────────────────────

type Signal = "BUY" | "SELL" | "HOLD";

/**
 * Short-term signals (Days/Weeks) model how real traders behave:
 *   - BUY the dip (oversold, pulled back, bounce setup)
 *   - SELL the rip (take profit after run-up, overbought → wait for correction)
 *   - HOLD when not clear
 *
 * Key insight: SELL threshold is LOWER than BUY threshold for short-term,
 * because taking profit is a defensive/conservative action (easier trigger),
 * while new entries need stronger conviction.
 *
 * Long-term signals (Months/Quarter) are trend-following — use symmetric thresholds.
 */

function computeSignalShortTerm(votes: number[]): Signal {
  const sum = votes.reduce((a, b) => a + b, 0);
  if (sum >= 3) return "BUY";   // strong conviction needed to enter
  if (sum <= -2) return "SELL";  // easier to take profit / exit (defensive)
  return "HOLD";
}

function computeSignalLongTerm(votes: number[]): Signal {
  const sum = votes.reduce((a, b) => a + b, 0);
  if (sum >= 3) return "BUY";
  if (sum <= -3) return "SELL";
  return "HOLD";
}

/**
 * Short-term (Days): Mean-reversion + momentum exhaustion model
 *
 * Real day-trader logic:
 *   - Stock dropped 4%+ today with RSI<30? → BUY the dip (bounce play)
 *   - Stock up 3%+ today with RSI>60? → SELL / take profit before pullback
 *   - SMA cross alone isn't enough — price distance from SMA5 matters more
 *
 * 5 indicators, asymmetric threshold (BUY≥3, SELL≤-2):
 */
function signalDays(r: TechRow): Signal {
  // v2 (backtest-validated): Buy on RSI RECOVERY (30-45), not while falling
  const votes: number[] = [];
  if (r.rsi_14 !== null) votes.push((r.rsi_14 >= 30 && r.rsi_14 <= 45) ? 1 : r.rsi_14 >= 65 ? -1 : 0);
  if (r.macd_trend) votes.push(r.macd_trend === "BULLISH" ? 1 : r.macd_trend === "BEARISH" ? -1 : 0);
  if (r.kdj_signal) votes.push(r.kdj_signal === "OVERSOLD" ? 1 : r.kdj_signal === "OVERBOUGHT" ? -1 : 0);
  // Price pullback to SMA5 (not crash through it)
  if (r.latest_close !== null && r.sma_5 !== null && r.sma_5 > 0) {
    const ext = ((r.latest_close - r.sma_5) / r.sma_5) * 100;
    votes.push(ext > 3 ? -1 : (ext >= -3 && ext <= -0.5) ? 1 : 0);
  }
  // Moderate dip = buy, big crash = stay away, big rip = sell
  if (r.change_1d_pct !== null) votes.push(r.change_1d_pct > 3 ? -1 : (r.change_1d_pct >= -4 && r.change_1d_pct <= -1) ? 1 : 0);
  return computeSignalShortTerm(votes);
}

/**
 * Near-term (Weeks): Swing-trader profit-taking model
 *
 * Real swing-trader logic:
 *   - Ran up 5%+ this week with BB near top? → SELL, take profit before mean reversion
 *   - Dropped 5%+ this week with BB near bottom? → BUY, anticipate bounce
 *   - Volume spike on down day = distribution → SELL
 *
 * 5 indicators, asymmetric threshold (BUY≥3, SELL≤-2):
 */
function signalWeeks(r: TechRow): Signal {
  const votes: number[] = [];
  // SMA10 vs SMA20 — weekly trend
  if (r.sma_10 !== null && r.sma_20 !== null) votes.push(r.sma_10 > r.sma_20 ? 1 : -1);
  // Bollinger %B: near top = take profit, near bottom = buy
  if (r.bb_pct_b !== null) votes.push(r.bb_pct_b < 0.2 ? 1 : r.bb_pct_b > 0.8 ? -1 : 0);
  // Volume spike: confirms direction (distribution vs accumulation)
  if (r.volume_ratio !== null && r.change_1d_pct !== null) {
    if (r.volume_ratio >= 2) votes.push(r.change_1d_pct >= 0 ? 1 : -1);
    else votes.push(0);
  }
  // RSI for swing: sell at 65 (don't wait for 70)
  if (r.rsi_14 !== null) votes.push(r.rsi_14 <= 35 ? 1 : r.rsi_14 >= 65 ? -1 : 0);
  // 5D extension: up 5%+ this week = time to take profit, not enter
  if (r.change_5d_pct !== null) votes.push(r.change_5d_pct > 5 ? -1 : r.change_5d_pct < -5 ? 1 : 0);
  return computeSignalShortTerm(votes);
}

/**
 * Medium-term (Months) v2 — backtest-validated:
 * Added SMA50/200 trend-regime filter. Don't sell in confirmed uptrends.
 * BUY jumped from 52.7% → 61.2% win rate at 60D after this change.
 */
function signalMonths(r: TechRow): Signal {
  const votes: number[] = [];
  if (r.sma_20 !== null && r.sma_50 !== null) votes.push(r.sma_20 > r.sma_50 ? 1 : -1);
  if (r.change_1m_pct !== null) votes.push(r.change_1m_pct > 5 ? 1 : r.change_1m_pct < -5 ? -1 : 0);
  if (r.obv_trend) votes.push(r.obv_trend === "UP" ? 1 : r.obv_trend === "DOWN" ? -1 : 0);
  if (r.rsi_14 !== null) votes.push(r.rsi_14 <= 35 ? 1 : r.rsi_14 >= 65 ? -1 : 0);
  if (r.change_3m_pct !== null) votes.push(r.change_3m_pct > 30 ? -1 : r.change_3m_pct < -30 ? 1 : 0);
  // v2: Trend regime filter — golden cross makes SELL harder, death cross makes it easier
  if (r.sma_50 !== null && r.sma_200 !== null) votes.push(r.sma_50 > r.sma_200 ? 1 : -1);
  // v2: Stricter SELL threshold — need overwhelming bearish evidence (-4 of 6)
  const sum = votes.reduce((a, b) => a + b, 0);
  if (sum >= 3) return "BUY";
  if (sum <= -4) return "SELL";
  return "HOLD";
}

/**
 * Long-term (Quarter+): Trend + institutional flow
 * Symmetric threshold (BUY≥3, SELL≤-3):
 */
function signalQuarter(r: TechRow): Signal {
  const votes: number[] = [];
  if (r.sma_50 !== null && r.sma_200 !== null) votes.push(r.sma_50 > r.sma_200 ? 1 : -1);
  if (r.pct_from_52w_high !== null) votes.push(r.pct_from_52w_high > -10 ? 1 : r.pct_from_52w_high < -30 ? -1 : 0);
  if (r.change_6m_pct !== null) votes.push(r.change_6m_pct > 15 ? 1 : r.change_6m_pct < -15 ? -1 : 0);
  if (r.change_1y_pct !== null) votes.push(r.change_1y_pct > 20 ? 1 : r.change_1y_pct < -20 ? -1 : 0);
  if (r.obv_trend) votes.push(r.obv_trend === "UP" ? 1 : r.obv_trend === "DOWN" ? -1 : 0);
  return computeSignalLongTerm(votes);
}

const SIGNAL_CHIP_STYLE: Record<Signal, { bg: string; color: string }> = {
  BUY:  { bg: "#dcfce7", color: "#166534" },
  SELL: { bg: "#fef2f2", color: "#991b1b" },
  HOLD: { bg: "#fefce8", color: "#854d0e" },
};

const COMPOSITE_SIGNAL_KEY: Record<Signal, string> = {
  BUY: "signal_buy", SELL: "signal_sell", HOLD: "signal_hold",
};

function SignalCell({ signal, labels }: { signal: Signal; labels?: Labels }) {
  const s = SIGNAL_CHIP_STYLE[signal];
  const display = labels ? L(labels, COMPOSITE_SIGNAL_KEY[signal], signal) : signal;
  return (
    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}>
      {display}
    </span>
  );
}

/** Single SMA cross cell — shows bullish/bearish chip */
function SmaCrossCell({ fast, slow, label, labels }: { fast: number | null; slow: number | null; label: string; labels?: Labels }) {
  if (fast === null || slow === null) return <span className="text-gray-300 text-[9px]">—</span>;
  const bullish = fast > slow;
  const pctDiff = ((fast - slow) / slow) * 100;
  return (
    <span
      className="text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
      style={{
        background: bullish ? "#dcfce7" : "#fef2f2",
        color: bullish ? "#166534" : "#991b1b",
      }}
      title={`SMA${label}: ${bullish ? "Bullish" : "Bearish"} (${pctDiff >= 0 ? "+" : ""}${pctDiff.toFixed(1)}%)`}
    >
      {bullish ? L(labels ?? {}, "sma_bull", "▲ Bull") : L(labels ?? {}, "sma_bear", "▼ Bear")}
    </span>
  );
}

// ── Sortable table header ──────────────────────────────────────────────────

function Th({ label, col, sortBy, sortDir, onClick, align = "left", tip }: {
  label: string; col: string; sortBy: string; sortDir: string;
  onClick: (col: string) => void; align?: string; tip?: string;
}) {
  const active = sortBy === col;
  const arrow = active ? (sortDir === "desc" ? " ↓" : " ↑") : "";
  return (
    <th className={`px-2 py-2 font-bold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 whitespace-nowrap`}
      style={{ textAlign: align as "left" | "right" | "center" }}
      title={tip}
      onClick={() => onClick(col)}>
      {label}{arrow}
    </th>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════════════════

export default function ScreenerPage() {
  const [tab, setTab] = useState<"technical" | "fundamental">("technical");
  const labels = useLabels();

  return (
    <div>
      {/* Tab bar */}
      <div className="w-full" style={{ background: "linear-gradient(45deg, seagreen, darkseagreen)" }}>
        <div className="max-w-7xl mx-auto px-8 pt-6 pb-0">
          <div className="flex items-end gap-6">
            <h1 className="text-3xl font-bold text-white drop-shadow-sm pb-3"
              style={{ fontFamily: "var(--font-rajdhani)" }}>
              {L(labels, "screener_title", "Stock Screener")}
            </h1>
            <div className="flex gap-1 mb-0">
              {(["technical", "fundamental"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className="px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-all"
                  style={tab === t
                    ? { background: "#fff", color: "#2e8b57" }
                    : { background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)" }
                  }>
                  {t === "technical"
                    ? `📈 ${L(labels, "screener_tab_technical", "Technical")} (8,500+)`
                    : `📊 ${L(labels, "screener_tab_fundamental", "Fundamental")} (~30)`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {tab === "technical" ? <TechnicalTab labels={labels} /> : <FundamentalTab labels={labels} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Technical Screener Tab
// ══════════════════════════════════════════════════════════════════════════════

function TechnicalTab({ labels }: { labels: Labels }) {
  const [exchange,   setExchange]   = useState("US");
  const [sortBy,     setSortBy]     = useState("change_1d_pct");
  const [sortDir,    setSortDir]    = useState("desc");
  const [minPrice,   setMinPrice]   = useState("");
  const [maxPrice,   setMaxPrice]   = useState("");
  const [minRsi,     setMinRsi]     = useState("");
  const [maxRsi,     setMaxRsi]     = useState("");
  const [macdTrend,  setMacdTrend]  = useState("");
  const [kdjSignal,  setKdjSignal]  = useState("");
  const [goldenCross, setGoldenCross] = useState(false);
  const [deathCross,  setDeathCross]  = useState(false);
  const [minVolRatio, setMinVolRatio] = useState("");
  const [near52High, setNear52High] = useState("");
  const [near52Low,  setNear52Low]  = useState("");
  const [limit,      setLimit]      = useState(50);

  const [rows,    setRows]    = useState<TechRow[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const runScreener = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams({
        exchange, sort_by: sortBy, sort_dir: sortDir, limit: String(limit),
      });
      if (minPrice)    p.set("min_price", minPrice);
      if (maxPrice)    p.set("max_price", maxPrice);
      if (minRsi)      p.set("min_rsi", minRsi);
      if (maxRsi)      p.set("max_rsi", maxRsi);
      if (macdTrend)   p.set("macd_trend", macdTrend);
      if (kdjSignal)   p.set("kdj_signal", kdjSignal);
      if (goldenCross) p.set("golden_cross", "true");
      if (deathCross)  p.set("death_cross", "true");
      if (minVolRatio) p.set("min_volume_ratio", minVolRatio);
      if (near52High)  p.set("near_52w_high", near52High);
      if (near52Low)   p.set("near_52w_low", near52Low);

      const res = await fetch(`/api/screener/technical?${p.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setRows(json.data ?? []);
        setTotal(json.total ?? 0);
      } else {
        setError(json.error ?? "Screener request failed");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [exchange, sortBy, sortDir, minPrice, maxPrice, minRsi, maxRsi, macdTrend, kdjSignal, goldenCross, deathCross, minVolRatio, near52High, near52Low, limit]);

  // Auto-run on mount
  useEffect(() => { runScreener(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-run when dropdown/checkbox filters change (instant feedback)
  useEffect(() => { runScreener(); }, [exchange, sortBy, sortDir, macdTrend, kdjSignal, goldenCross, deathCross, limit]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  return (
    <>
      {/* Filters */}
      <div className="w-full" style={{ background: "linear-gradient(135deg, #2e8b57, #3cb371)", padding: "16px 0 20px" }}>
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-end gap-3 flex-wrap">

            {/* Exchange */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-white/70 uppercase tracking-wide">{L(labels, "screener_filter_exchange", "Exchange")}</label>
              <div className="flex gap-1">
                {["US", "ASX"].map((ex) => (
                  <button key={ex} onClick={() => setExchange(ex)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={exchange === ex
                      ? { background: "#fd8412", color: "#fff" }
                      : { background: "rgba(255,255,255,0.2)", color: "#fff" }}>
                    {ex === "US" ? "🇺🇸 US" : "🇦🇺 ASX"}
                  </button>
                ))}
              </div>
            </div>

            {/* Price range */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-white/70 uppercase tracking-wide">{L(labels, "screener_filter_price", "Price ($)")}</label>
              <div className="flex gap-1">
                <input type="number" placeholder={L(labels, "screener_filter_min", "Min")} value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
                  className="w-16 text-xs border-0 rounded-lg px-2 py-1.5 bg-white/90 text-gray-700" />
                <input type="number" placeholder={L(labels, "screener_filter_max", "Max")} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-16 text-xs border-0 rounded-lg px-2 py-1.5 bg-white/90 text-gray-700" />
              </div>
            </div>

            {/* RSI range */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-white/70 uppercase tracking-wide">{L(labels, "screener_filter_rsi", "RSI (14)")}</label>
              <div className="flex gap-1">
                <input type="number" placeholder={L(labels, "screener_filter_min", "Min")} value={minRsi} onChange={(e) => setMinRsi(e.target.value)}
                  className="w-14 text-xs border-0 rounded-lg px-2 py-1.5 bg-white/90 text-gray-700" />
                <input type="number" placeholder={L(labels, "screener_filter_max", "Max")} value={maxRsi} onChange={(e) => setMaxRsi(e.target.value)}
                  className="w-14 text-xs border-0 rounded-lg px-2 py-1.5 bg-white/90 text-gray-700" />
              </div>
            </div>

            {/* MACD Trend */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-white/70 uppercase tracking-wide">{L(labels, "screener_filter_macd", "MACD")}</label>
              <select value={macdTrend} onChange={(e) => setMacdTrend(e.target.value)}
                className="text-xs border-0 rounded-lg px-2 py-1.5 bg-white/90 text-gray-700">
                <option value="">{L(labels, "screener_filter_any", "Any")}</option>
                <option value="BULLISH">{L(labels, "screener_bullish", "Bullish")}</option>
                <option value="BEARISH">{L(labels, "screener_bearish", "Bearish")}</option>
              </select>
            </div>

            {/* KDJ Signal */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-white/70 uppercase tracking-wide">{L(labels, "screener_filter_kdj", "KDJ")}</label>
              <select value={kdjSignal} onChange={(e) => setKdjSignal(e.target.value)}
                className="text-xs border-0 rounded-lg px-2 py-1.5 bg-white/90 text-gray-700">
                <option value="">{L(labels, "screener_filter_any", "Any")}</option>
                <option value="OVERBOUGHT">{L(labels, "screener_overbought", "Overbought")}</option>
                <option value="OVERSOLD">{L(labels, "screener_oversold", "Oversold")}</option>
                <option value="NEUTRAL">{L(labels, "screener_neutral", "Neutral")}</option>
              </select>
            </div>

            {/* MA Crossovers */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-white/70 uppercase tracking-wide">{L(labels, "screener_filter_ma_cross", "MA Cross")}</label>
              <div className="flex gap-2">
                <label className="flex items-center gap-1 text-xs text-white cursor-pointer">
                  <input type="checkbox" checked={goldenCross} onChange={(e) => { setGoldenCross(e.target.checked); if (e.target.checked) setDeathCross(false); }} />
                  {L(labels, "screener_filter_golden", "Golden")}
                </label>
                <label className="flex items-center gap-1 text-xs text-white cursor-pointer">
                  <input type="checkbox" checked={deathCross} onChange={(e) => { setDeathCross(e.target.checked); if (e.target.checked) setGoldenCross(false); }} />
                  {L(labels, "screener_filter_death", "Death")}
                </label>
              </div>
            </div>

            {/* Volume ratio */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-white/70 uppercase tracking-wide">{L(labels, "screener_filter_vol_ratio", "Vol ratio ≥")}</label>
              <input type="number" step="0.5" placeholder="e.g. 2" value={minVolRatio} onChange={(e) => setMinVolRatio(e.target.value)}
                className="w-16 text-xs border-0 rounded-lg px-2 py-1.5 bg-white/90 text-gray-700" />
            </div>

            {/* 52w proximity */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-white/70 uppercase tracking-wide">{L(labels, "screener_filter_52w", "52w")}</label>
              <div className="flex gap-1">
                <select value={near52High} onChange={(e) => { setNear52High(e.target.value); if (e.target.value) setNear52Low(""); }}
                  className="text-xs border-0 rounded-lg px-2 py-1.5 bg-white/90 text-gray-700">
                  <option value="">{L(labels, "screener_filter_any", "Any")}</option>
                  <option value="5">{L(labels, "screener_filter_near_high", "Near High")} (5%)</option>
                  <option value="10">{L(labels, "screener_filter_near_high", "Near High")} (10%)</option>
                </select>
                <select value={near52Low} onChange={(e) => { setNear52Low(e.target.value); if (e.target.value) setNear52High(""); }}
                  className="text-xs border-0 rounded-lg px-2 py-1.5 bg-white/90 text-gray-700">
                  <option value="">{L(labels, "screener_filter_any", "Any")}</option>
                  <option value="10">{L(labels, "screener_filter_near_low", "Near Low")} (10%)</option>
                  <option value="20">{L(labels, "screener_filter_near_low", "Near Low")} (20%)</option>
                </select>
              </div>
            </div>

            {/* Limit */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-white/70 uppercase tracking-wide">{L(labels, "screener_filter_show", "Show")}</label>
              <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}
                className="text-xs border-0 rounded-lg px-2 py-1.5 bg-white/90 text-gray-700">
                {[20, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            {/* Run */}
            <button onClick={runScreener} disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110 disabled:opacity-60 shadow-md"
              style={{ background: "#fd8412", color: "#fff" }}>
              {loading ? `⟳ ${L(labels, "screener_btn_scanning", "Scanning…")}` : `🔍 ${L(labels, "screener_btn_screen", "Screen")}`}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-8 py-4 space-y-3">
        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-2">
              <div className="text-3xl animate-pulse">📈</div>
              <p className="text-gray-500 text-sm">{L(labels, "screener_scanning", "Scanning stocks…")}</p>
            </div>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                <strong>{rows.length}</strong> {L(labels, "screener_of", "of")} <strong>{total.toLocaleString()}</strong> {exchange} {L(labels, "screener_stocks", "stocks")}
                {rows.length < total && ` ${L(labels, "screener_filtered", "(filtered)")}`}
              </p>
              <p className="text-xs text-gray-400">
                {L(labels, "screener_updated", "Updated")}: {rows[0]?.trade_date ?? "—"} · {L(labels, "screener_sort_tip", "Click column headers to sort")}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
              <table className="w-full min-w-[1900px] text-xs">
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    <th className="px-1 py-2 w-8" title="Add to watchlist">☆</th>
                    <Th label={L(labels, "screener_th_ticker", "Ticker")} col="ticker" sortBy={sortBy} sortDir={sortDir} onClick={handleSort} tip="Stock ticker symbol" />
                    <Th label={L(labels, "screener_th_price", "Price")} col="latest_close" sortBy={sortBy} sortDir={sortDir} onClick={handleSort} align="right" tip="Latest closing price" />
                    {/* ── Composite Signals (right after price) ── */}
                    <th className="px-1 py-2 text-center font-bold text-gray-500 uppercase tracking-wide text-[9px]" title="Short-term signal (Days): RSI + MACD + KDJ + SMA5/10">{L(labels, "screener_th_days", "Days")}</th>
                    <th className="px-1 py-2 text-center font-bold text-gray-500 uppercase tracking-wide text-[9px]" title="Near-term signal (Weeks): SMA10/20 + 5D% + BB + Volume">{L(labels, "screener_th_weeks", "Weeks")}</th>
                    <th className="px-1 py-2 text-center font-bold text-gray-500 uppercase tracking-wide text-[9px]" title="Medium-term signal (Months): SMA20/50 + 1M% + 3M% + OBV">{L(labels, "screener_th_months", "Months")}</th>
                    <th className="px-1 py-2 text-center font-bold text-gray-500 uppercase tracking-wide text-[9px]" title="Long-term signal (Quarter+): SMA50/200 + 52w High + 6M% + 1Y%">{L(labels, "screener_th_quarter", "Quarter")}</th>
                    {/* ── Multi-Factor Score ── */}
                    <th className="px-1 py-2 text-center font-bold text-[#2e8b57] uppercase tracking-wide text-[9px]" title="DataPAI Composite Score: TA (40%) + Fundamentals (30%) + Website Intelligence (30%). 0-100 scale.">{L(labels, "screener_th_score", "Score")}</th>
                    <th className="px-1 py-2 text-center font-bold text-gray-500 uppercase tracking-wide text-[9px]" title="Fundamental Quality Tier (hover each for details)&#10;A = Excellent: profitable, growing, healthy&#10;B = Good: mostly profitable, decent growth&#10;C = Fair: mixed fundamentals&#10;D = Poor: unprofitable or declining&#10;Based on: PE, margins, ROE, revenue growth, debt">{L(labels, "screener_th_qual", "Qual")}</th>
                    <th className="px-1 py-2 text-center font-bold text-gray-500 uppercase tracking-wide text-[9px]" title="Website change or news alert severity. Hover for details.">{L(labels, "screener_th_alert", "Alert")}</th>
                    <th className="px-1 py-2 text-center font-bold text-gray-500 uppercase tracking-wide text-[9px]" title="Sector classification">{L(labels, "screener_th_sector", "Sector")}</th>
                    {/* ── Price Changes ── */}
                    <Th label="1D %" col="change_1d_pct" sortBy={sortBy} sortDir={sortDir} onClick={handleSort} align="right" tip="1-day price change %" />
                    <Th label="5D %" col="change_5d_pct" sortBy={sortBy} sortDir={sortDir} onClick={handleSort} align="right" tip="5-day price change %" />
                    <Th label="1M %" col="change_1m_pct" sortBy={sortBy} sortDir={sortDir} onClick={handleSort} align="right" tip="1-month price change %" />
                    {/* ── Detailed TA ── */}
                    <Th label="RSI(14)" col="rsi_14" sortBy={sortBy} sortDir={sortDir} onClick={handleSort} align="right" tip="Relative Strength Index (14-day). <30 = oversold, >70 = overbought" />
                    <th className="px-2 py-2 text-center font-bold text-gray-500 uppercase tracking-wide text-[10px]" title="RSI Zone: OVERBOUGHT (>70), OVERSOLD (<30), NEUTRAL (30-70)">{L(labels, "screener_th_rsi_signal", "RSI Signal")}</th>
                    <th className="px-2 py-2 text-center font-bold text-gray-500 uppercase tracking-wide text-[10px]" title="MACD crossover: BULLISH = MACD line above signal line, BEARISH = below">{L(labels, "screener_filter_macd", "MACD")}</th>
                    <th className="px-2 py-2 text-center font-bold text-gray-500 uppercase tracking-wide text-[10px]" title="KDJ Stochastic: OVERBOUGHT (K>80), OVERSOLD (K<20), NEUTRAL">{L(labels, "screener_filter_kdj", "KDJ")}</th>
                    <th className="px-1 py-2 text-center font-bold text-gray-500 uppercase tracking-wide text-[9px]" title="Short-term: SMA5 vs SMA10 (days). Bullish = SMA5 above SMA10">SMA5/10</th>
                    <th className="px-1 py-2 text-center font-bold text-gray-500 uppercase tracking-wide text-[9px]" title="Near-term: SMA10 vs SMA20 (weeks). Bullish = SMA10 above SMA20">SMA10/20</th>
                    <th className="px-1 py-2 text-center font-bold text-gray-500 uppercase tracking-wide text-[9px]" title="Medium-term: SMA20 vs SMA50 (months). Bullish = SMA20 above SMA50">SMA20/50</th>
                    <th className="px-1 py-2 text-center font-bold text-gray-500 uppercase tracking-wide text-[9px]" title="Long-term: SMA50 vs SMA200 (golden/death cross). Bullish = SMA50 above SMA200">SMA50/200</th>
                    <th className="px-2 py-2 text-center font-bold text-gray-500 uppercase tracking-wide text-[10px]" title="On-Balance Volume trend — UP = buying pressure, DOWN = selling pressure">{L(labels, "screener_th_obv", "OBV")}</th>
                    <Th label={L(labels, "screener_th_52w_high", "52w High")} col="pct_from_52w_high" sortBy={sortBy} sortDir={sortDir} onClick={handleSort} align="right" tip="% below 52-week high. 0% = at 52-week high" />
                    <Th label={L(labels, "screener_th_vol_ratio", "Vol Ratio")} col="volume_ratio" sortBy={sortBy} sortDir={sortDir} onClick={handleSort} align="right" tip="Today's volume / 20-day average volume. >2.0 = unusual volume spike" />
                    <Th label={L(labels, "screener_th_volume", "Volume")} col="latest_volume" sortBy={sortBy} sortDir={sortDir} onClick={handleSort} align="right" tip="Latest trading volume (shares)" />
                    <Th label={L(labels, "screener_th_volatility", "Volatility")} col="volatility_20d" sortBy={sortBy} sortDir={sortDir} onClick={handleSort} align="right" tip="20-day annualized volatility %. Higher = more price swings" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={r.ticker} className="border-b border-gray-50 hover:bg-[#f0f7f1] transition-colors"
                      style={idx % 2 ? { background: "#fafafa" } : {}}>
                      <td className="px-1 py-1 text-center">
                        <WatchlistButton symbol={r.ticker} exchange={r.exchange} compact />
                      </td>
                      <td className="px-3 py-2">
                        <Link href={`/ticker/${r.ticker}/intel`}
                          className="font-bold text-[#2e8b57] hover:text-[#1a6e3e] hover:underline text-sm">
                          {r.ticker}
                        </Link>
                      </td>
                      <td className="px-2 py-2 text-right font-semibold tabular-nums text-gray-700">
                        {r.latest_close !== null ? (r.latest_close < 1 ? r.latest_close.toFixed(4) : r.latest_close.toFixed(2)) : "—"}
                      </td>
                      {/* Composite signals (right after price) */}
                      <td className="px-1 py-2 text-center"><SignalCell signal={signalDays(r)} labels={labels} /></td>
                      <td className="px-1 py-2 text-center"><SignalCell signal={signalWeeks(r)} labels={labels} /></td>
                      <td className="px-1 py-2 text-center"><SignalCell signal={signalMonths(r)} labels={labels} /></td>
                      <td className="px-1 py-2 text-center"><SignalCell signal={signalQuarter(r)} labels={labels} /></td>
                      {/* Multi-factor columns */}
                      <td className="px-1 py-2 text-center"><DataPAIScoreCell score={r.datapai_score} /></td>
                      <td className="px-1 py-2 text-center"><QualityTierCell tier={r.fl_quality_tier || r.mfs_quality_tier} row={r} /></td>
                      <td className="px-1 py-2 text-center"><AlertCell ciSeverity={r.ci_severity} ciWhat={r.ci_what_changed} meSeverity={r.me_severity} meHeadline={r.me_headline} /></td>
                      <td className="px-1 py-2 text-center text-[9px] text-gray-500 max-w-[60px] truncate" title={r.fl_sector || ""}>{r.fl_sector ? r.fl_sector.split(" ")[0] : "—"}</td>
                      {/* Price changes */}
                      <td className="px-2 py-2 text-right">{pctCell(r.change_1d_pct)}</td>
                      <td className="px-2 py-2 text-right">{pctCell(r.change_5d_pct)}</td>
                      <td className="px-2 py-2 text-right">{pctCell(r.change_1m_pct)}</td>
                      {/* Detailed TA */}
                      <td className="px-2 py-2 text-right"><RsiCell rsi={r.rsi_14} /></td>
                      <td className="px-2 py-2 text-center"><RsiSignal rsi={r.rsi_14} labels={labels} /></td>
                      <td className="px-2 py-2 text-center">{trendChip(r.macd_trend, labels)}</td>
                      <td className="px-2 py-2 text-center">{trendChip(r.kdj_signal, labels)}</td>
                      <td className="px-1 py-2 text-center"><SmaCrossCell fast={r.sma_5} slow={r.sma_10} label="5/10" labels={labels} /></td>
                      <td className="px-1 py-2 text-center"><SmaCrossCell fast={r.sma_10} slow={r.sma_20} label="10/20" labels={labels} /></td>
                      <td className="px-1 py-2 text-center"><SmaCrossCell fast={r.sma_20} slow={r.sma_50} label="20/50" labels={labels} /></td>
                      <td className="px-1 py-2 text-center"><SmaCrossCell fast={r.sma_50} slow={r.sma_200} label="50/200" labels={labels} /></td>
                      <td className="px-2 py-2 text-center">{trendChip(r.obv_trend, labels)}</td>
                      <td className="px-2 py-2 text-right">{pctCell(r.pct_from_52w_high)}</td>
                      <td className="px-2 py-2 text-right">
                        <span className={`text-xs tabular-nums font-semibold ${(r.volume_ratio ?? 0) >= 2 ? "text-blue-600" : "text-gray-500"}`}>
                          {r.volume_ratio !== null ? r.volume_ratio.toFixed(1) + "x" : "—"}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right text-xs tabular-nums text-gray-500">{volFmt(r.latest_volume)}</td>
                      <td className="px-2 py-2 text-right text-xs tabular-nums text-gray-500">
                        {r.volatility_20d !== null ? (r.volatility_20d * 100).toFixed(0) + "%" : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!loading && rows.length === 0 && !error && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="text-3xl mb-3">🔍</div>
            <p className="font-semibold text-gray-700 mb-1">{L(labels, "screener_no_match", "No stocks match your filters")}</p>
            <p className="text-sm text-gray-400">{L(labels, "screener_no_match_hint", "Try relaxing the filters or switching exchange.")}</p>
          </div>
        )}

        {/* ── Backtest Results ──────────────────────────────────────────── */}
        <details className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <summary className="px-5 py-3 cursor-pointer text-sm font-semibold text-gray-600 hover:text-gray-800 select-none">
            {L(labels, "screener_backtest_title", "Signal Backtest Results & Methodology")} (v2, 171 US stocks, Jan 2024 &ndash; Mar 2026)
          </summary>
          <div className="px-5 pb-5 space-y-4">

            {/* Backtest Performance Table */}
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <div className="bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 uppercase">Backtest Win Rates — Real Data, 59,923 Signals Tested</div>
              <table className="w-full text-xs">
                <thead><tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-3 py-1.5 text-gray-600 font-semibold">Signal</th>
                  <th className="text-center px-2 py-1.5 text-gray-600 font-semibold">Window</th>
                  <th className="text-center px-2 py-1.5 text-gray-600 font-semibold">Win Rate</th>
                  <th className="text-center px-2 py-1.5 text-gray-600 font-semibold">Avg Return</th>
                  <th className="text-center px-2 py-1.5 text-gray-600 font-semibold">Profit Factor</th>
                  <th className="text-center px-2 py-1.5 text-gray-600 font-semibold">Signals</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  <tr className="bg-green-50/50"><td className="px-3 py-1.5 font-bold text-green-800">Quarter BUY</td><td className="text-center">180D</td><td className="text-center font-bold text-green-700">64.4%</td><td className="text-center">+8.82%</td><td className="text-center font-bold">2.0</td><td className="text-center text-gray-500">16,856</td></tr>
                  <tr className="bg-green-50/50"><td className="px-3 py-1.5 font-bold text-green-800">Months BUY</td><td className="text-center">60D</td><td className="text-center font-bold text-green-700">61.2%</td><td className="text-center">+3.25%</td><td className="text-center font-bold">1.6</td><td className="text-center text-gray-500">9,709</td></tr>
                  <tr className="bg-green-50/30"><td className="px-3 py-1.5 font-bold text-green-800">Quarter BUY</td><td className="text-center">120D</td><td className="text-center font-bold text-green-700">61.6%</td><td className="text-center">+4.79%</td><td className="text-center font-bold">1.6</td><td className="text-center text-gray-500">16,856</td></tr>
                  <tr className="bg-green-50/30"><td className="px-3 py-1.5 font-bold text-green-800">Months BUY</td><td className="text-center">40D</td><td className="text-center font-bold text-green-700">58.5%</td><td className="text-center">+2.25%</td><td className="text-center font-bold">1.5</td><td className="text-center text-gray-500">9,709</td></tr>
                  <tr><td className="px-3 py-1.5 font-medium">Months BUY</td><td className="text-center">20D</td><td className="text-center text-green-700">55.3%</td><td className="text-center">+1.16%</td><td className="text-center">1.4</td><td className="text-center text-gray-500">9,709</td></tr>
                  <tr><td className="px-3 py-1.5 font-medium">Weeks SELL</td><td className="text-center">15D</td><td className="text-center">53.2%</td><td className="text-center">-0.81% med</td><td className="text-center">1.0</td><td className="text-center text-gray-500">7,011</td></tr>
                  <tr><td className="px-3 py-1.5 font-medium">Days SELL</td><td className="text-center">3D</td><td className="text-center">52.9%</td><td className="text-center">-0.36% med</td><td className="text-center">1.1</td><td className="text-center text-gray-500">4,785</td></tr>
                  <tr className="bg-amber-50/30"><td className="px-3 py-1.5 font-medium text-amber-800">Days BUY</td><td className="text-center">1-5D</td><td className="text-center text-amber-700">~49%</td><td className="text-center">~0%</td><td className="text-center">1.1</td><td className="text-center text-gray-500">4,835</td></tr>
                </tbody>
              </table>
            </div>

            {/* Methodology */}
            <p className="text-xs text-gray-500">
              <strong>Methodology:</strong> Each indicator votes <strong>+1</strong> (bullish), <strong>-1</strong> (bearish), or <strong>0</strong> (neutral).
              Short-term (Days/Weeks): BUY &ge; 3, SELL &le; -2 (asymmetric — take profit triggers earlier).
              Long-term (Months/Quarter): BUY &ge; 3, SELL &le; -3 to -4 (trend-following needs more evidence).
            </p>
            <p className="text-xs text-gray-500">
              <strong>Key principles:</strong> Days uses RSI recovery zone (30-45, not &lt;30 which catches falling knives — validated by Larry Connors&apos; RSI research).
              Months adds SMA50/200 trend-regime filter (don&apos;t sell in bull markets — inspired by O&apos;Neil CAN SLIM and Stan Weinstein Stage Analysis).
              Quarter follows institutional flow via OBV accumulation/distribution.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Days */}
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 uppercase">Days — Mean-Reversion <span className="text-amber-600 normal-case">(~49% BUY win rate — use with caution)</span></div>
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-gray-100">
                    <th className="text-left px-3 py-1.5 text-gray-500 font-semibold">Indicator</th>
                    <th className="text-center px-2 py-1.5 text-green-700 font-semibold">+1 Buy Setup</th>
                    <th className="text-center px-2 py-1.5 text-red-700 font-semibold">-1 Sell/Take Profit</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    <tr><td className="px-3 py-1.5 font-medium">RSI (14)</td><td className="text-center">30-45 (recovering)</td><td className="text-center">&ge; 65 (overbought zone)</td></tr>
                    <tr><td className="px-3 py-1.5 font-medium">MACD</td><td className="text-center">Bullish (confirmation)</td><td className="text-center">Bearish crossover</td></tr>
                    <tr><td className="px-3 py-1.5 font-medium">KDJ</td><td className="text-center">Oversold (K&lt;20)</td><td className="text-center">Overbought (K&gt;80)</td></tr>
                    <tr><td className="px-3 py-1.5 font-medium">Price vs SMA5</td><td className="text-center">-3% to -0.5% (pullback)</td><td className="text-center">&gt; +3% above (stretched)</td></tr>
                    <tr className="bg-amber-50/50"><td className="px-3 py-1.5 font-medium italic">1D % Action</td><td className="text-center">-4% to -1% (moderate dip)</td><td className="text-center">&gt; +3% (sell the rip)</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Weeks */}
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 uppercase">Weeks — Swing-Trader <span className="text-gray-400 normal-case">(53% SELL win rate)</span></div>
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-gray-100">
                    <th className="text-left px-3 py-1.5 text-gray-500 font-semibold">Indicator</th>
                    <th className="text-center px-2 py-1.5 text-green-700 font-semibold">+1 Buy Setup</th>
                    <th className="text-center px-2 py-1.5 text-red-700 font-semibold">-1 Sell/Take Profit</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    <tr><td className="px-3 py-1.5 font-medium">SMA 10/20</td><td className="text-center">SMA10 &gt; SMA20</td><td className="text-center">SMA10 &lt; SMA20</td></tr>
                    <tr><td className="px-3 py-1.5 font-medium">Bollinger %B</td><td className="text-center">&lt; 0.2 (near lower band)</td><td className="text-center">&gt; 0.8 (near upper band)</td></tr>
                    <tr><td className="px-3 py-1.5 font-medium">Volume Spike</td><td className="text-center">Vol &ge; 2x + up day</td><td className="text-center">Vol &ge; 2x + down day</td></tr>
                    <tr><td className="px-3 py-1.5 font-medium">RSI (14)</td><td className="text-center">&le; 35</td><td className="text-center">&ge; 65</td></tr>
                    <tr className="bg-amber-50/50"><td className="px-3 py-1.5 font-medium italic">5D % Action</td><td className="text-center">&lt; -5% (oversold week)</td><td className="text-center">&gt; +5% (profit-taking)</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Months */}
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 uppercase">Months — Trend-Following <span className="text-green-600 normal-case">(61% BUY win rate at 60D)</span></div>
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-gray-100">
                    <th className="text-left px-3 py-1.5 text-gray-500 font-semibold">Indicator</th>
                    <th className="text-center px-2 py-1.5 text-green-700 font-semibold">+1 (Bullish Trend)</th>
                    <th className="text-center px-2 py-1.5 text-red-700 font-semibold">-1 (Bearish Trend)</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    <tr><td className="px-3 py-1.5 font-medium">SMA 20/50</td><td className="text-center">SMA20 &gt; SMA50</td><td className="text-center">SMA20 &lt; SMA50</td></tr>
                    <tr><td className="px-3 py-1.5 font-medium">1-Month %</td><td className="text-center">&gt; +5%</td><td className="text-center">&lt; -5%</td></tr>
                    <tr><td className="px-3 py-1.5 font-medium">OBV Trend</td><td className="text-center">UP (institutional buying)</td><td className="text-center">DOWN (distribution)</td></tr>
                    <tr><td className="px-3 py-1.5 font-medium">RSI (14)</td><td className="text-center">&le; 35</td><td className="text-center">&ge; 65</td></tr>
                    <tr><td className="px-3 py-1.5 font-medium">3M % Guard</td><td className="text-center">&lt; -30% (capitulation)</td><td className="text-center">&gt; +30% (overextended)</td></tr>
                    <tr className="bg-blue-50/50"><td className="px-3 py-1.5 font-medium italic">SMA 50/200 Regime</td><td className="text-center">Golden Cross (+1 bias)</td><td className="text-center">Death Cross (-1 bias)</td></tr>
                  </tbody>
                </table>
                <div className="px-3 py-1 bg-gray-50 text-[10px] text-gray-500">SELL requires -4 of 6 votes (stricter) — avoids selling in bull markets</div>
              </div>

              {/* Quarter */}
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 uppercase">Quarter — Long-term Investor <span className="text-green-600 normal-case">(64% BUY win rate at 180D, PF 2.0)</span></div>
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-gray-100">
                    <th className="text-left px-3 py-1.5 text-gray-500 font-semibold">Indicator</th>
                    <th className="text-center px-2 py-1.5 text-green-700 font-semibold">+1 (Bullish Trend)</th>
                    <th className="text-center px-2 py-1.5 text-red-700 font-semibold">-1 (Bearish Trend)</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    <tr><td className="px-3 py-1.5 font-medium">SMA 50/200</td><td className="text-center">Golden Cross</td><td className="text-center">Death Cross</td></tr>
                    <tr><td className="px-3 py-1.5 font-medium">52-Week High</td><td className="text-center">Within 10% (strength)</td><td className="text-center">&gt; 30% off (broken)</td></tr>
                    <tr><td className="px-3 py-1.5 font-medium">6-Month %</td><td className="text-center">&gt; +15%</td><td className="text-center">&lt; -15%</td></tr>
                    <tr><td className="px-3 py-1.5 font-medium">1-Year %</td><td className="text-center">&gt; +20%</td><td className="text-center">&lt; -20%</td></tr>
                    <tr><td className="px-3 py-1.5 font-medium">OBV Trend</td><td className="text-center">UP (accumulation)</td><td className="text-center">DOWN (distribution)</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 italic">
              Backtest: 171 US stocks, Jan 2024 &ndash; Mar 2026, 59,923 total signals. Win rate = % of signals where forward return matched predicted direction.
              Profit Factor = sum of winning returns / sum of losing returns. PF &gt; 1.0 = profitable.
              These signals are for educational/informational purposes only and do not constitute financial advice. Past performance does not guarantee future results.
            </p>
          </div>
        </details>

        <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
          {L(labels, "screener_disclaimer", "Technical indicators pre-computed nightly from price data. Not financial advice.")}
        </p>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Fundamental Screener Tab (preserved from original)
// ══════════════════════════════════════════════════════════════════════════════

function FundamentalTab({ labels }: { labels: Labels }) {
  const [exchange, setExchange] = useState("US");
  const [signal,   setSignal]   = useState("");
  const [sector,   setSector]   = useState("");
  const [minScore, setMinScore] = useState("0.5");
  const [maxRisk,  setMaxRisk]  = useState("");
  const [limit,    setLimit]    = useState(50);
  const [rows,     setRows]     = useState<FundRow[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const SECTOR_OPTIONS = [
    "", "Technology", "Healthcare", "Financials", "Energy", "Materials",
    "Consumer Discretionary", "Consumer Staples", "Industrials",
    "Real Estate", "Utilities", "Communication Services",
  ];

  const runScreener = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams({ exchange, limit: String(limit) });
      if (signal)   p.set("signal", signal);
      if (sector)   p.set("sector", sector);
      if (minScore) p.set("min_score", minScore);
      if (maxRisk)  p.set("max_tech_risk", maxRisk);
      const res = await fetch(`/api/screener?${p.toString()}`);
      const json = await res.json();
      if (json.ok) setRows(json.data ?? []);
      else setError(json.error ?? "Failed");
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [exchange, signal, sector, minScore, maxRisk, limit]);

  useEffect(() => { runScreener(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="w-full" style={{ background: "linear-gradient(135deg, #2e8b57, #3cb371)", padding: "16px 0 20px" }}>
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-white/70 uppercase">{L(labels, "screener_filter_exchange", "Exchange")}</label>
              <div className="flex gap-1">
                {["US", "ASX"].map((ex) => (
                  <button key={ex} onClick={() => setExchange(ex)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={exchange === ex ? { background: "#fd8412", color: "#fff" } : { background: "rgba(255,255,255,0.2)", color: "#fff" }}>
                    {ex === "US" ? "🇺🇸 US" : "🇦🇺 ASX"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-white/70 uppercase">{L(labels, "screener_fund_ai_signal", "AI Signal")}</label>
              <select value={signal} onChange={(e) => setSignal(e.target.value)}
                className="text-xs border-0 rounded-lg px-2 py-1.5 bg-white/90 text-gray-700">
                <option value="">{L(labels, "screener_fund_all", "All")}</option>
                <option value="STRONG_BUY">{L(labels, "signal_strong_buy", "STRONG BUY")}</option>
                <option value="BUY">{L(labels, "signal_buy", "BUY")}</option>
                <option value="NEUTRAL">{L(labels, "signal_neutral_chip", "NEUTRAL")}</option>
                <option value="SELL">{L(labels, "signal_sell", "SELL")}</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-white/70 uppercase">{L(labels, "screener_fund_sector", "Sector")}</label>
              <select value={sector} onChange={(e) => setSector(e.target.value)}
                className="text-xs border-0 rounded-lg px-2 py-1.5 bg-white/90 text-gray-700 min-w-[140px]">
                <option value="">{L(labels, "screener_fund_all_sectors", "All sectors")}</option>
                {SECTOR_OPTIONS.filter(Boolean).map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-white/70 uppercase">{L(labels, "screener_fund_min_score", "Min Score")}</label>
              <select value={minScore} onChange={(e) => setMinScore(e.target.value)}
                className="text-xs border-0 rounded-lg px-2 py-1.5 bg-white/90 text-gray-700">
                <option value="">Any</option>
                <option value="0.5">≥ 0.5</option>
                <option value="0.2">≥ 0.2</option>
                <option value="0.0">≥ 0.0</option>
                <option value="-0.2">≥ -0.2</option>
              </select>
            </div>
            <button onClick={runScreener} disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-bold hover:brightness-110 disabled:opacity-60 shadow-md"
              style={{ background: "#fd8412", color: "#fff" }}>
              {loading ? `⟳ ${L(labels, "screener_btn_scanning", "Scanning…")}` : `🔍 ${L(labels, "screener_btn_screen", "Screen")}`}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-4 space-y-3">
        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}
        {loading && <div className="flex justify-center py-20"><div className="text-3xl animate-pulse">📊</div></div>}
        {!loading && rows.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full min-w-[900px] text-xs">
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th className="text-left px-3 py-2 font-bold text-gray-500 uppercase">{L(labels, "screener_th_ticker", "Ticker")}</th>
                  <th className="text-left px-3 py-2 font-bold text-gray-500 uppercase">{L(labels, "screener_th_company", "Company")}</th>
                  <th className="text-left px-3 py-2 font-bold text-gray-500 uppercase">{L(labels, "screener_th_sector", "Sector")}</th>
                  <th className="text-center px-3 py-2 font-bold text-gray-500 uppercase">{L(labels, "screener_th_signal", "Signal")}</th>
                  <th className="text-right px-3 py-2 font-bold text-gray-500 uppercase">{L(labels, "screener_th_score", "Score")}</th>
                  <th className="text-right px-3 py-2 font-bold text-gray-500 uppercase">{L(labels, "screener_th_val", "Val")}</th>
                  <th className="text-right px-3 py-2 font-bold text-gray-500 uppercase">{L(labels, "screener_th_qual", "Qual")}</th>
                  <th className="text-right px-3 py-2 font-bold text-gray-500 uppercase">{L(labels, "screener_th_growth", "Growth")}</th>
                  <th className="text-right px-3 py-2 font-bold text-gray-500 uppercase">{L(labels, "screener_th_macro", "Macro")}</th>
                  <th className="text-center px-3 py-2 font-bold text-gray-500 uppercase">{L(labels, "screener_th_analyst", "Analyst")}</th>
                  <th className="text-right px-3 py-2 font-bold text-gray-500 uppercase">{L(labels, "screener_th_upside", "Upside")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.ticker} className="border-b border-gray-50 hover:bg-[#f0f7f1]"
                    style={idx % 2 ? { background: "#fafafa" } : {}}>
                    <td className="px-3 py-2">
                      <Link href={`/ticker/${r.ticker}/intel`}
                        className="font-bold text-[#2e8b57] hover:underline text-sm">{r.ticker}</Link>
                    </td>
                    <td className="px-3 py-2 text-gray-700 max-w-[160px] truncate">{r.company_name ?? "—"}</td>
                    <td className="px-3 py-2 text-gray-500">{r.sector ?? "—"}</td>
                    <td className="px-3 py-2 text-center"><SignalChip signal={r.fundamental_signal} labels={labels} /></td>
                    <td className="px-3 py-2"><ScoreBar value={r.fundamental_score} /></td>
                    <td className="px-3 py-2"><ScoreBar value={r.valuation_score} /></td>
                    <td className="px-3 py-2"><ScoreBar value={r.quality_score} range={[0, 1]} /></td>
                    <td className="px-3 py-2"><ScoreBar value={r.growth_score} range={[0, 1]} /></td>
                    <td className="px-3 py-2"><ScoreBar value={r.macro_score} /></td>
                    <td className="px-3 py-2 text-center text-gray-600 font-medium">{r.analyst_consensus ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {r.analyst_upside_pct !== null
                        ? <span className="font-semibold" style={{ color: r.analyst_upside_pct >= 0 ? "#15803d" : "#991b1b" }}>
                            {r.analyst_upside_pct >= 0 ? "+" : ""}{r.analyst_upside_pct.toFixed(1)}%
                          </span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && rows.length === 0 && !error && (
          <div className="bg-white rounded-xl border p-12 text-center">
            <p className="text-gray-500 text-sm">{L(labels, "screener_fund_no_match", "No stocks match filters. Try relaxing criteria.")}</p>
          </div>
        )}
      </div>
    </>
  );
}
