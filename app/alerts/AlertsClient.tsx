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
  changed_pct?: number;
  quality_flags_json?: string;
  // V3 agent fields
  agent_signal_type: string | null;
  agent_severity: string | null;
  validation_status: string | null;
}

interface Props {
  contentOnly: Analysis[];
  allSignals: Analysis[];
  universe: Record<string, string>;
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

export default function AlertsClient({ contentOnly, allSignals, universe }: Props) {
  const [showAll, setShowAll] = useState(false);
  const analyses = showAll ? allSignals : contentOnly;
  const changed = analyses.filter((a) => a.alert_score !== 0).length;
  const highConf = analyses.filter((a) => a.confidence >= 0.6).length;
  const withAgentSignal = analyses.filter((a) => a.agent_signal_type).length;

  return (
    <div className="max-w-6xl mx-auto px-8 py-12 space-y-8">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold text-[#252525]">Change Alerts</h1>
          <p className="text-lg text-gray-500 mt-2">
            Detected page wording changes — sorted by alert score.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap mt-1">
          {changed > 0 && (
            <span
              className="text-base px-5 py-2 rounded-full font-bold"
              style={{ background: "#fd8412", color: "#ffffff", textShadow: "0 1px 2px rgba(0,0,0,0.25)" }}
            >
              {changed} with changes
            </span>
          )}
          {highConf > 0 && (
            <span className="text-base px-5 py-2 rounded-full bg-green-50 text-green-700 font-semibold">
              {highConf} high-confidence
            </span>
          )}
          {withAgentSignal > 0 && (
            <span className="text-base px-5 py-2 rounded-full bg-amber-50 text-amber-700 font-semibold">
              {withAgentSignal} AG2 signal{withAgentSignal !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* ── Signal filter toggle ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowAll(false)}
          className="px-6 py-2.5 rounded-xl text-base font-semibold transition-all"
          style={
            !showAll
              ? { background: "#2e8b57", color: "#fff" }
              : { background: "#f3f4f6", color: "#6b7280" }
          }
        >
          Content Only
        </button>
        <button
          onClick={() => setShowAll(true)}
          className="px-6 py-2.5 rounded-xl text-base font-semibold transition-all"
          style={
            showAll
              ? { background: "#2e8b57", color: "#fff" }
              : { background: "#f3f4f6", color: "#6b7280" }
          }
        >
          All Signals
        </button>
        {!showAll && (
          <span className="text-sm text-gray-400 ml-1">
            Showing CONTENT_CHANGE only — archive &amp; layout changes filtered out
          </span>
        )}
      </div>

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
          <div className="text-5xl mb-4">📡</div>
          <div className="text-2xl font-bold text-gray-400 mb-3">No analyses yet</div>
          <p className="text-base text-gray-400 mb-8">
            Run a scan from the home page to detect company page changes.
          </p>
          <Link
            href="/"
            className="inline-block bg-brand text-white px-8 py-3 rounded-xl text-base font-semibold hover:opacity-90"
          >
            Go Home →
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
                          {severityBadge(a.agent_severity)}
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
  );
}
