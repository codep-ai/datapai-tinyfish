"use client";

import { useState } from "react";
import Link from "next/link";

interface Analysis {
  id: string;
  ticker: string;
  fetched_at: string;
  url: string;
  alert_score: number;
  confidence: number;
  categories_json: string | null;
  signal_type: string;
  changed_pct?: number | null;
  quality_flags_json?: string;
  // V3 agent fields
  agent_signal_type: string | null;
  agent_severity: string | null;
  validation_status: string | null;
  // V3.1 / v1.5 fields
  change_type: string | null;
  corroborating_count: number | null;
}

interface Props {
  contentOnly: Analysis[];
  allSignals: Analysis[];
  universe: Record<string, string>;
  watchlistOnly?: boolean;
}

function scoreColor(score: number): string {
  if (score > 1) return "text-red-600";
  if (score > 0) return "text-amber-600";
  if (score < -1) return "text-green-600";
  return "text-gray-400";
}

function rowStyle(score: number): React.CSSProperties {
  if (score > 1) return { background: "#fff3e0" };
  if (score > 0) return { background: "#fffbea" };
  if (score < -1) return { background: "#f0fdf4" };
  return {};
}

function confidenceBadge(confidence: number) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 80 ? "#2e8b57" : pct >= 50 ? "#f97316" : "#9ca3af";
  return (
    <span
      className="text-sm font-bold px-3 py-1 rounded-full"
      style={{ background: color + "20", color }}
    >
      {pct}%
    </span>
  );
}

function signalTypeBadge(signalType: string) {
  const colors: Record<string, { bg: string; text: string }> = {
    CONTENT_CHANGE: { bg: "#f0fdf4", text: "#166534" },
    ARCHIVE_CHANGE: { bg: "#f0f9ff", text: "#075985" },
    LAYOUT_CHANGE:  { bg: "#fafafa", text: "#6b7280" },
  };
  const c = colors[signalType] ?? { bg: "#f5f5f5", text: "#666" };
  return (
    <span
      className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide"
      style={{ background: c.bg, color: c.text }}
    >
      {signalType.replace(/_/g, " ")}
    </span>
  );
}

function changeTypeBadge(changeType: string | null) {
  if (!changeType || changeType === "CONTENT_CHANGE") return null;
  const config: Record<string, { bg: string; text: string; label: string }> = {
    ARCHIVE_CHANGE: { bg: "#f9fafb", text: "#6b7280", label: "Archive" },
    LAYOUT_CHANGE:  { bg: "#f0f9ff", text: "#0c4a6e", label: "Layout" },
  };
  const c = config[changeType] ?? { bg: "#f9fafb", text: "#6b7280", label: changeType };
  return (
    <span
      className="text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.text}30` }}
    >
      {c.label}
    </span>
  );
}

function agentSignalBadge(signalType: string | null) {
  if (!signalType) return null;
  const labels: Record<string, string> = {
    GUIDANCE_WITHDRAWAL: "Guidance Withdrawal",
    RISK_DISCLOSURE_EXPANSION: "Risk Expansion",
    TONE_SOFTENING: "Tone Softening",
  };
  return (
    <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 uppercase tracking-wide">
      {labels[signalType] ?? signalType.replace(/_/g, " ")}
    </span>
  );
}

function severityBadge(severity: string | null) {
  if (!severity) return null;
  const colors: Record<string, { bg: string; text: string }> = {
    HIGH:   { bg: "#fef2f2", text: "#991b1b" },
    MEDIUM: { bg: "#fffbea", text: "#92400e" },
    LOW:    { bg: "#f0fdf4", text: "#166534" },
  };
  const c = colors[severity] ?? { bg: "#f5f5f5", text: "#666" };
  return (
    <span
      className="text-xs font-bold px-3 py-1 rounded-full uppercase"
      style={{ background: c.bg, color: c.text }}
    >
      {severity}
    </span>
  );
}

function validationBadge(status: string | null) {
  if (!status) return null;
  const config: Record<string, { bg: string; text: string; icon: string }> = {
    CONFIRMED:          { bg: "#f0fdf4", text: "#166534", icon: "✓" },
    PARTIALLY_CONFIRMED:{ bg: "#fffbea", text: "#92400e", icon: "~" },
    NOT_CONFIRMED_YET:  { bg: "#f0f9ff", text: "#0c4a6e", icon: "?" },
    SOURCE_UNAVAILABLE: { bg: "#f9fafb", text: "#6b7280", icon: "—" },
  };
  const c = config[status] ?? config.SOURCE_UNAVAILABLE;
  const label: Record<string, string> = {
    CONFIRMED: "Confirmed",
    PARTIALLY_CONFIRMED: "Partial",
    NOT_CONFIRMED_YET: "Unconfirmed",
    SOURCE_UNAVAILABLE: "No source",
  };
  return (
    <span
      className="text-xs font-bold px-3 py-1 rounded-full"
      style={{ background: c.bg, color: c.text }}
    >
      {c.icon} {label[status] ?? status}
    </span>
  );
}

export default function AlertsClient({ contentOnly, allSignals, universe, watchlistOnly }: Props) {
  const [showAll, setShowAll] = useState(false);
  const analyses = showAll ? allSignals : contentOnly;
  const changed = analyses.filter((a) => a.alert_score !== 0).length;
  const highConf = analyses.filter((a) => a.confidence >= 0.6).length;
  const withAgentSignal = analyses.filter((a) => a.agent_signal_type).length;
  const withInvestigation = analyses.filter((a) => (a.corroborating_count ?? 0) > 0).length;

  return (
    <div>

      {/* ── Green hero bar ── */}
      <div
        className="w-full"
        style={{ background: "linear-gradient(45deg, seagreen, darkseagreen)", paddingTop: "28px", paddingBottom: "28px" }}
      >
        <div className="max-w-6xl mx-auto px-6 space-y-3">
          {/* Row 1: title */}
          <div className="flex items-center gap-4 flex-wrap">
            {watchlistOnly && (
              <Link href="/watchlist" className="text-white/70 hover:text-white text-sm font-medium">
                ← My Watchlist
              </Link>
            )}
            <h1 className="text-2xl font-bold text-white">
              {watchlistOnly ? "⭐ My Watchlist Alerts" : "Change Alerts"}
            </h1>
          </div>
          {/* Row 2: filter toggles (yellow/orange, clickable) */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setShowAll(false)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold uppercase tracking-wide text-sm shadow-md transition-all hover:brightness-110 hover:-translate-y-0.5"
              style={
                !showAll
                  ? { background: "#fd8412", color: "#fff" }
                  : { background: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.85)" }
              }
            >
              Content Only
            </button>
            <button
              onClick={() => setShowAll(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold uppercase tracking-wide text-sm shadow-md transition-all hover:brightness-110 hover:-translate-y-0.5"
              style={
                showAll
                  ? { background: "#fd8412", color: "#fff" }
                  : { background: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.85)" }
              }
            >
              All Signals
            </button>
            {!showAll && (
              <span className="text-xs text-white/60">
                archive &amp; layout filtered out
              </span>
            )}
          </div>
          {/* Row 3: stats (read-only info labels) */}
          <div className="flex items-center gap-2 flex-wrap">
            {changed > 0 && (
              <span className="text-sm text-white/80">
                {changed} with changes
              </span>
            )}
            {highConf > 0 && (
              <span className="text-sm text-white/70">
                · {highConf} high-confidence
              </span>
            )}
            {withAgentSignal > 0 && (
              <span className="text-sm text-white/70">
                · {withAgentSignal} AG2 signal{withAgentSignal !== 1 ? "s" : ""}
              </span>
            )}
            {withInvestigation > 0 && (
              <span className="text-sm text-white/70">
                🔎 {withInvestigation} investigated
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-5 text-sm text-gray-500 px-1">
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded inline-block flex-shrink-0" style={{ background: "#fffbea", border: "1px solid #fd8412" }} />
          Moderate change
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded inline-block flex-shrink-0" style={{ background: "#fff3e0", border: "1px solid #fb923c" }} />
          High-risk language
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded inline-block flex-shrink-0" style={{ background: "#f0fdf4", border: "1px solid #4ade80" }} />
          Positive / more committed
        </span>
        <span className="ml-auto text-gray-400">Confidence = quality of extracted text</span>
      </div>

      {analyses.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
          <div className="text-5xl mb-4">{watchlistOnly ? "⭐" : "📡"}</div>
          <div className="text-2xl font-bold text-gray-400 mb-3">
            {watchlistOnly ? "No alerts for your watchlist yet" : "No analyses yet"}
          </div>
          <p className="text-base text-gray-400 mb-8">
            {watchlistOnly
              ? "Run a scan from your watchlist page to detect changes on your stocks."
              : "Run a scan from the home page to detect company page changes."}
          </p>
          <Link
            href={watchlistOnly ? "/watchlist" : "/"}
            className="inline-block bg-brand text-white px-8 py-3 rounded-xl text-base font-semibold hover:opacity-90"
          >
            {watchlistOnly ? "← Back to Watchlist" : "Go Home →"}
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 text-left text-sm uppercase tracking-wide">
                <th className="py-4 px-6 font-semibold">Ticker</th>
                <th className="py-4 pr-6 font-semibold">Company</th>
                <th className="py-4 pr-6 text-right font-semibold">Score</th>
                <th className="py-4 pr-6 text-right font-semibold">Changed</th>
                <th className="py-4 pr-6 text-right font-semibold">Conf.</th>
                <th className="py-4 pr-6 font-semibold">Signal</th>
                <th className="py-4 pr-6 font-semibold">Validation</th>
                <th className="py-4 pr-6 font-semibold">Scanned</th>
              </tr>
            </thead>
            <tbody>
              {analyses.map((a) => {
                const cats: string[] = a.categories_json ? JSON.parse(a.categories_json) : [];
                return (
                  <tr
                    key={a.id}
                    className="border-b border-gray-100 hover:brightness-95 transition-colors"
                    style={rowStyle(a.alert_score)}
                  >
                    {/* Ticker */}
                    <td className="py-5 px-6">
                      <Link
                        href={`/ticker/${a.ticker}`}
                        className="text-brand text-lg font-bold hover:text-brand-light"
                      >
                        {a.ticker}
                      </Link>
                    </td>

                    {/* Company */}
                    <td className="py-5 pr-6 text-base text-gray-700 max-w-[180px] truncate">
                      {universe[a.ticker] ?? a.ticker}
                    </td>

                    {/* Score */}
                    <td className={`py-5 pr-6 text-right text-xl font-bold ${scoreColor(a.alert_score)}`}>
                      {a.alert_score > 0 ? "+" : ""}{a.alert_score.toFixed(2)}
                    </td>

                    {/* Changed % */}
                    <td className="py-5 pr-6 text-right text-base text-gray-700 font-medium">
                      {a.changed_pct?.toFixed(1) ?? "—"}%
                    </td>

                    {/* Confidence */}
                    <td className="py-5 pr-6 text-right">
                      {confidenceBadge(a.confidence)}
                    </td>

                    {/* Signal */}
                    <td className="py-5 pr-6">
                      <div className="flex flex-col gap-1.5">
                        {a.agent_signal_type
                          ? agentSignalBadge(a.agent_signal_type)
                          : signalTypeBadge(a.signal_type ?? "CONTENT_CHANGE")}
                        <div className="flex gap-1.5 flex-wrap">
                          {changeTypeBadge(a.change_type)}
                          {severityBadge(a.agent_severity)}
                          {(a.corroborating_count ?? 0) > 0 && (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                              style={{ background: "#f3e8ff", color: "#6b21a8" }}>
                              🔎 {a.corroborating_count}
                            </span>
                          )}
                          {cats.slice(0, 1).map((c) => (
                            <span key={c} className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
                              {c.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>

                    {/* Validation */}
                    <td className="py-5 pr-6">
                      {validationBadge(a.validation_status)}
                    </td>

                    {/* Scanned at */}
                    <td className="py-5 pr-6 text-gray-400 text-sm whitespace-nowrap">
                      {new Date(a.fetched_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
