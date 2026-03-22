/**
 * BreakingNewsAlert — shows CRITICAL/HIGH material events for a stock.
 * Only shows CRITICAL + HIGH by default. MEDIUM/LOW hidden behind "Show more".
 * Source URLs prominently displayed for trust.
 */

"use client";

import { useState } from "react";
import type { MaterialEventRow } from "@/lib/db";

// ── Severity color map ──────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, { bg: string; border: string; text: string; icon: string; label: string }> = {
  CRITICAL: { bg: "#fef2f2", border: "#ef4444", text: "#991b1b", icon: "🚨", label: "CRITICAL" },
  HIGH:     { bg: "#fff7ed", border: "#f97316", text: "#9a3412", icon: "⚠️", label: "HIGH" },
  MEDIUM:   { bg: "#fffbeb", border: "#f59e0b", text: "#92400e", icon: "📰", label: "MEDIUM" },
  LOW:      { bg: "#f0fdf4", border: "#22c55e", text: "#166534", icon: "ℹ️", label: "LOW" },
};

const SENTIMENT_COLORS: Record<string, string> = {
  VERY_NEGATIVE: "#dc2626",
  NEGATIVE: "#ef4444",
  NEUTRAL: "#6b7280",
  POSITIVE: "#16a34a",
  VERY_POSITIVE: "#059669",
};

/** Extract a clean domain name from a URL for display */
function sourceDomain(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host;
  } catch { return ""; }
}

// ── Single event card ────────────────────────────────────────────────────────

function EventCard({ evt }: { evt: MaterialEventRow }) {
  const s = SEVERITY_STYLES[evt.severity] ?? SEVERITY_STYLES.MEDIUM;
  const sentColor = SENTIMENT_COLORS[evt.sentiment] ?? "#6b7280";
  const domain = evt.source_url ? sourceDomain(evt.source_url) : "";

  return (
    <div className="rounded-xl p-5" style={{ background: s.bg, border: `1.5px solid ${s.border}30` }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full uppercase"
              style={{ background: s.border, color: "#fff" }}>
              {s.icon} {s.label}
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
              style={{ background: `${s.border}15`, color: s.text }}>
              {evt.event_type.replace(/_/g, " ")}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ color: sentColor, background: `${sentColor}10` }}>
              {evt.sentiment.replace(/_/g, " ")}
            </span>
          </div>
          <h3 className="font-semibold text-sm text-gray-800 leading-snug">
            {evt.source_url ? (
              <a href={evt.source_url} target="_blank" rel="noopener noreferrer"
                className="hover:underline">
                {evt.headline}
              </a>
            ) : evt.headline}
          </h3>
          {evt.summary && (
            <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{evt.summary}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            {/* Prominent source link */}
            {evt.source_url ? (
              <a href={evt.source_url} target="_blank" rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1">
                🔗 {evt.source_name || domain || "Source"}
              </a>
            ) : evt.source_name ? (
              <span>{evt.source_name}</span>
            ) : null}
            {evt.published_at && (
              <span>{new Date(evt.published_at).toLocaleString()}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Full panel for ticker detail page ────────────────────────────────────────

export function BreakingNewsPanel({ events }: { events: MaterialEventRow[] }) {
  const [showLower, setShowLower] = useState(false);

  if (!events.length) return null;

  // Split into important (CRITICAL/HIGH) vs lower priority
  const important = events.filter((e) => e.severity === "CRITICAL" || e.severity === "HIGH");
  const lower = events.filter((e) => e.severity !== "CRITICAL" && e.severity !== "HIGH");

  // If no important events, show top 1 from lower as a softer alert
  const displayed = important.length > 0 ? important : lower.slice(0, 1);
  const hiddenCount = important.length > 0 ? lower.length : lower.length - 1;

  const hasCritical = events.some((e) => e.severity === "CRITICAL");
  const hasHigh = events.some((e) => e.severity === "HIGH");
  const borderColor = hasCritical ? "#ef4444" : hasHigh ? "#f97316" : "#f59e0b";
  const headerBg = hasCritical ? "#fef2f2" : hasHigh ? "#fff7ed" : "#fffbeb";

  return (
    <div className="rounded-2xl shadow-sm overflow-hidden"
      style={{ border: `2px solid ${borderColor}` }}>
      {/* Header */}
      <div className="px-8 py-5 flex items-center justify-between flex-wrap gap-3"
        style={{ background: headerBg, borderBottom: `1px solid ${borderColor}30` }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{hasCritical ? "🚨" : "⚠️"}</span>
          <div>
            <h2 className="text-xl font-bold" style={{ color: hasCritical ? "#991b1b" : "#9a3412" }}>
              Breaking News Alert
            </h2>
            <p className="text-sm" style={{ color: hasCritical ? "#b91c1c" : "#c2410c", opacity: 0.8 }}>
              {displayed.length} key event{displayed.length !== 1 ? "s" : ""} detected
              {hiddenCount > 0 && !showLower && ` · ${hiddenCount} lower-priority hidden`}
            </p>
          </div>
        </div>
        {hasCritical && (
          <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse"
            style={{ background: "#dc2626", color: "#fff" }}>
            CRITICAL
          </span>
        )}
      </div>

      {/* Important events (always shown) */}
      <div className="px-8 py-5 space-y-4 bg-white">
        {displayed.map((evt) => <EventCard key={evt.id} evt={evt} />)}

        {/* Lower-priority events (collapsed by default) */}
        {showLower && lower.length > 0 && (
          <>
            <div className="border-t border-gray-100 pt-3 mt-3">
              <p className="text-xs text-gray-400 font-medium mb-3">Lower Priority</p>
            </div>
            {(important.length > 0 ? lower : lower.slice(1)).map((evt) => (
              <EventCard key={evt.id} evt={evt} />
            ))}
          </>
        )}

        {/* Toggle button */}
        {hiddenCount > 0 && (
          <button
            onClick={() => setShowLower(!showLower)}
            className="text-xs text-blue-500 hover:text-blue-700 font-medium mt-1"
          >
            {showLower ? "Hide lower-priority events" : `Show ${hiddenCount} more event${hiddenCount !== 1 ? "s" : ""}`}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Compact badge for watchlist card ─────────────────────────────────────────

export function BreakingNewsBadge({ events }: { events: MaterialEventRow[] }) {
  if (!events.length) return null;

  const hasCritical = events.some((e) => e.severity === "CRITICAL");
  const hasHigh = events.some((e) => e.severity === "HIGH");
  const topEvent = events[0];
  const s = SEVERITY_STYLES[topEvent.severity] ?? SEVERITY_STYLES.MEDIUM;

  return (
    <div
      className="mt-2 rounded-lg px-2.5 py-1.5"
      style={{
        background: s.bg,
        border: `1.5px solid ${s.border}`,
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-xs">{hasCritical ? "🚨" : hasHigh ? "⚠️" : "📰"}</span>
        <span
          className="text-[10px] font-bold uppercase"
          style={{ color: s.text }}
        >
          {hasCritical ? "CRITICAL" : hasHigh ? "HIGH" : "NEWS"}
        </span>
      </div>
      <div
        className="text-[10px] leading-tight mt-0.5 line-clamp-2"
        style={{ color: s.text }}
      >
        {topEvent.headline}
      </div>
      {events.length > 1 && (
        <div className="text-[9px] mt-0.5" style={{ color: `${s.text}99` }}>
          +{events.length - 1} more alert{events.length - 1 !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
