"use client";

/**
 * BehindTheCall — "How the AI Decided" transparency panel.
 *
 * Sits below the 🤖 AI Analyst Call card on /ticker/[X]/intel. Expandable
 * (collapsed by default to keep the page clean). When opened, surfaces:
 *
 *   1. Input agents — TA / FA (+ sub-agents) / Macro / Market Activity / News
 *      Each with direction badge + confidence + 1-line summary + key data.
 *
 *   2. Governance gates — Quality / Regime / Sanity Override / Critical News
 *      Each as a chip showing fired (red) or pass (green) + reason.
 *
 *   3. Reflector lessons used — past-debate lessons injected into prompts.
 *
 * Data source: `gate_decisions` / `agent_signals` / `reflector_lessons`
 * JSONB columns on `datapai.stock_synthesis` (migration 045, 2026-05-28).
 * Returned by /api/synthesis. See /methodology for what each agent does.
 *
 * Design: monochrome with subtle direction tinting. Matches the existing
 * AI Analyst Call card visual language. No emoji-spam; one icon per gate.
 */

import { useState } from "react";
import type { GateDecisions, AgentSignals, ReflectorLessons } from "@/lib/db";

interface Props {
  gateDecisions?: GateDecisions;
  agentSignals?: AgentSignals;
  reflectorLessons?: ReflectorLessons;
}

const directionColor = (d?: string): { bg: string; fg: string; label: string } => {
  const dir = (d || "").toUpperCase();
  if (dir === "STRONG_BUY" || dir === "BUY") return { bg: "#dcfce7", fg: "#166534", label: dir.replace("_", " ") };
  if (dir === "SELL" || dir === "STRONG_SELL") return { bg: "#fef2f2", fg: "#991b1b", label: dir.replace("_", " ") };
  if (dir === "HOLD") return { bg: "#fefce8", fg: "#854d0e", label: "HOLD" };
  return { bg: "#f3f4f6", fg: "#374151", label: dir || "—" };
};

const agentMeta: Record<string, { name: string; role: string }> = {
  technical:       { name: "Technical Analyst",  role: "RSI · MACD · MAs · trend" },
  fundamental:     { name: "Fundamental Composite", role: "Valuation · Quality · Growth · Analyst consensus" },
  macro:           { name: "Macro Agent",        role: "Rates · sector cycle · commodity overlay" },
  market_activity: { name: "Market Activity",    role: "TinyFish IR-page change detection" },
  news:            { name: "News Classifier",    role: "Google News · Finnhub · SEC 8-K → severity & sentiment" },
};

const gateMeta: Record<string, { name: string; desc: string }> = {
  quality_gate:    { name: "Quality Gate",      desc: "Demotes BUY → HOLD if quality tier C/D or failing profitability/growth/health" },
  regime_gate:     { name: "Regime Gate",       desc: "Demotes BUY → HOLD when TA + FA are both bearish" },
  sanity_override: { name: "Sanity Override",   desc: "Flags impossible direction flips (all signals one way, PM emitted the opposite)" },
  critical_news:   { name: "Critical News",     desc: "Forces SELL on fraud/bankruptcy/sanctions/major lawsuits" },
};

function AgentRow({ slug, signal }: { slug: string; signal: NonNullable<AgentSignals[string]> }) {
  const meta = agentMeta[slug] ?? { name: slug, role: "" };
  const dc = directionColor(signal.direction);
  const data = signal.data || {};
  // Pick top 4 data points to render as key=value chips
  const dataChips = Object.entries(data)
    .filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
    .slice(0, 4)
    .map(([k, v]) => {
      let val = typeof v === "number" ? (Math.abs(v) < 1 ? v.toFixed(3) : v.toFixed(2)) : String(v);
      if (k.includes("pct") && typeof v === "number") val = `${(v * 100).toFixed(1)}%`;
      return { k: k.replace(/_/g, " "), v: val };
    });
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <span className="text-sm font-semibold text-gray-900">{meta.name}</span>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-bold"
          style={{ background: dc.bg, color: dc.fg }}
        >
          {dc.label}
        </span>
        {typeof signal.confidence === "number" && (
          <span className="text-[10px] text-gray-500">
            conf <span className="font-bold text-gray-700">{Math.round(signal.confidence * 100)}%</span>
          </span>
        )}
      </div>
      {meta.role && <div className="text-[10px] text-gray-500 mb-1.5 italic">{meta.role}</div>}
      {signal.summary && (
        <div className="text-xs text-gray-700 leading-snug mb-2">{signal.summary}</div>
      )}
      {dataChips.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {dataChips.map(({ k, v }) => (
            <span key={k} className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
              {k}: <span className="font-mono font-semibold">{v}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function GateChip({ slug, decision }: { slug: string; decision: NonNullable<GateDecisions[keyof GateDecisions]> }) {
  const meta = gateMeta[slug] ?? { name: slug, desc: "" };
  const fired = decision.fired;
  return (
    <div
      className={`border rounded-lg px-3 py-2.5 ${fired ? "bg-amber-50 border-amber-300" : "bg-gray-50 border-gray-200"}`}
      title={meta.desc}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${fired ? "bg-amber-500 text-white" : "bg-gray-300 text-gray-700"}`}>
          {fired ? "FIRED" : "PASS"}
        </span>
        <span className="text-xs font-semibold text-gray-900">{meta.name}</span>
      </div>
      {fired ? (
        <div className="text-[11px] text-amber-900 leading-snug">
          {decision.reason && <div><span className="font-semibold">Reason:</span> {decision.reason}</div>}
          {decision.demoted_from && decision.demoted_to && (
            <div className="font-mono mt-0.5">
              {decision.demoted_from} → {decision.demoted_to}
            </div>
          )}
          {decision.headline && (
            <div className="mt-0.5 italic">"{decision.headline.slice(0, 100)}…"</div>
          )}
        </div>
      ) : (
        <div className="text-[10px] text-gray-500 leading-snug">{meta.desc}</div>
      )}
    </div>
  );
}

export default function BehindTheCall({ gateDecisions, agentSignals, reflectorLessons }: Props) {
  const [open, setOpen] = useState(false);
  const agentEntries: Array<[string, NonNullable<AgentSignals[string]>]> =
    Object.entries(agentSignals ?? {}).filter(
      (entry): entry is [string, NonNullable<AgentSignals[string]>] => !!entry[1]
    );
  const gateEntries: Array<[string, NonNullable<GateDecisions[keyof GateDecisions]>]> =
    Object.entries(gateDecisions ?? {}).filter(
      (entry): entry is [string, NonNullable<GateDecisions[keyof GateDecisions]>] => !!entry[1]
    );
  const hasContent = agentEntries.length > 0 || gateEntries.length > 0;
  if (!hasContent) return null;

  const firedCount = gateEntries.filter(([, d]) => d.fired).length;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-5 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3 flex-wrap text-left">
          <h2 className="text-sm font-bold text-gray-800">🔍 Behind the call</h2>
          <span className="text-[10px] text-gray-500">
            {agentEntries.length} input agents · 4 governance gates {firedCount > 0 && (
              <span className="text-amber-700 font-semibold">· {firedCount} fired</span>
            )}
          </span>
          {(reflectorLessons?.lessons_count ?? 0) > 0 && (
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-semibold">
              📚 {reflectorLessons!.lessons_count} learned lessons applied
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">{open ? "▲ hide" : "▼ show"}</span>
      </button>

      {open && (
        <div className="px-5 py-4 space-y-5 border-t border-gray-100 bg-gray-50/40">
          {/* Section 1 — Input agents */}
          {agentEntries.length > 0 && (
            <section>
              <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-2">
                Input signals — what each agent contributed
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {agentEntries.map(([slug, signal]) => (
                  <AgentRow key={slug} slug={slug} signal={signal} />
                ))}
              </div>
            </section>
          )}

          {/* Section 2 — Governance gates */}
          {gateEntries.length > 0 && (
            <section>
              <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-2">
                Governance gates — post-debate guardrails
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {gateEntries.map(([slug, decision]) => (
                  <GateChip key={slug} slug={slug} decision={decision} />
                ))}
              </div>
            </section>
          )}

          {/* Section 3 — Reflector lessons */}
          {(reflectorLessons?.lessons?.length ?? 0) > 0 && (
            <section>
              <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-2">
                Learned from past debates
              </div>
              <ul className="space-y-1.5">
                {reflectorLessons!.lessons!.map((lesson, i) => (
                  <li key={i} className="text-xs text-indigo-900 bg-indigo-50 border border-indigo-100 rounded px-2.5 py-1.5 leading-snug">
                    {lesson}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="pt-1 text-[10px] text-gray-400 italic">
            Each input agent runs independently; the Agentic AI group-chat debate (Bull → Bear → Risk → Portfolio Manager) reasons over them, then governance gates apply.
            Full methodology: <a href="/methodology" className="underline text-[#2e8b57]">/methodology</a>
          </div>
        </div>
      )}
    </div>
  );
}
