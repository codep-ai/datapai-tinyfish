"use client";

/**
 * AgentPipelineAnimation — Airflow-style DAG visualisation of the real
 * pipeline running on EC2. Each node maps to an actual scheduled DAG.
 *
 * Goal: B2B prospects see "production-grade scheduled pipeline", not
 * "marketing diagram." Hover any node to read what it does, what it
 * produces, and when it runs. A travelling pulse cycles through the
 * stages so the picture feels alive without being noisy.
 *
 * Truth-anchored (2026-05-28 audit): exactly 4 input agents → 4 debate
 * personas → 4 governance gates → 1 Reflector. 13 active agents total.
 * Don't overstate.
 *
 * Schedules below match production stock_*.py DAGs on EC2 Airflow.
 * Update both when the DAGs change — there's no other source of truth.
 */

import { useEffect, useState } from "react";

type NodeKind = "ingest" | "input_agent" | "debate" | "gate" | "output" | "reflector";

interface PipelineNode {
  id: string;
  label: string;
  sublabel?: string;
  dag?: string;           // Airflow DAG name on EC2
  schedule?: string;      // human-readable cron description
  produces?: string;      // DB table or downstream consumer
  col: number;            // 0-indexed column position
  row: number;            // 0-indexed row position
  kind: NodeKind;
}

interface PipelineEdge {
  from: string;
  to: string;
  label?: string;
}

// ── Pipeline definition (matches EC2 production DAGs) ───────────────────────
const NODES: PipelineNode[] = [
  // Column 0 — RAW DATA INGESTION (the "feeders")
  { id: "eod",       label: "Daily Prices",   sublabel: "OHLCV",       dag: "stock_eod_dynamic",        schedule: "Per market close",       produces: "datapai.prices",        col: 0, row: 0, kind: "ingest" },
  { id: "fund_etl",  label: "Fundamentals",   sublabel: "10-K/10-Q",   dag: "stock_fundamentals_weekly", schedule: "Weekly Mon 02:00",       produces: "datapai.fundamental_lite", col: 0, row: 1, kind: "ingest" },
  { id: "ir_scan",   label: "IR Page Scan",   sublabel: "TinyFish",    dag: "stock_tinyfish_scan",       schedule: "Daily 04:00",            produces: "datapai.snapshots",     col: 0, row: 2, kind: "ingest" },
  { id: "news_in",   label: "News Fetch",     sublabel: "Google + 8-K", dag: "stock_news_monitor",        schedule: "Every 30 min, 06-22 UTC", produces: "datapai.news_events",   col: 0, row: 3, kind: "ingest" },

  // Column 1 — INPUT AGENTS (compute signals)
  { id: "ta",        label: "Technical",      sublabel: "RSI · MACD · MAs",    dag: "stock_weekly_ta + monthly + EOD daily", schedule: "Daily after EOD",      produces: "datapai.ta_signals",     col: 1, row: 0, kind: "input_agent" },
  { id: "fa",        label: "Fundamental",    sublabel: "Val · Qual · Growth · Analyst", dag: "stock_fundamentals_weekly",    schedule: "Weekly Mon 02:00",     produces: "fundamental_lite",       col: 1, row: 1, kind: "input_agent" },
  { id: "ma",        label: "Market Activity",sublabel: "IR-page diffs",         dag: "stock_tinyfish_scan",                schedule: "Daily 04:00",          produces: "tinyfish events",        col: 1, row: 2, kind: "input_agent" },
  { id: "news",      label: "News Classifier",sublabel: "severity + sentiment",   dag: "stock_news_monitor",                 schedule: "Every 30 min",         produces: "material events",        col: 1, row: 3, kind: "input_agent" },

  // Column 2 — DEBATE (AG2 GroupChat)
  { id: "bull",      label: "Bull",            sublabel: "🐂 bullish case",        dag: "stock_synthesis (asx/us)",          schedule: "18:00 local Mon-Fri",  produces: "bull_arguments",         col: 2, row: 0, kind: "debate" },
  { id: "bear",      label: "Bear",            sublabel: "🐻 bearish case",        dag: "stock_synthesis (asx/us)",          schedule: "18:00 local Mon-Fri",  produces: "bear_arguments",         col: 2, row: 1, kind: "debate" },
  { id: "risk",      label: "Risk Manager",    sublabel: "🛡 position sizing",     dag: "stock_synthesis (asx/us)",          schedule: "18:00 local Mon-Fri",  produces: "risk_arguments",         col: 2, row: 2, kind: "debate" },
  { id: "pm",        label: "Portfolio Mgr",   sublabel: "⚖️ final call",          dag: "stock_synthesis (asx/us)",          schedule: "18:00 local Mon-Fri",  produces: "pm_arguments + JSON",    col: 2, row: 3, kind: "debate" },

  // Column 3 — GATES
  { id: "g_quality", label: "Quality Gate",    sublabel: "demote C/D",             dag: "stock_synthesis",                    schedule: "inline post-debate",   produces: "gate_decisions JSONB",   col: 3, row: 0, kind: "gate" },
  { id: "g_regime",  label: "Regime Gate",     sublabel: "TA+FA bearish",          dag: "stock_synthesis",                    schedule: "inline post-debate",   produces: "gate_decisions JSONB",   col: 3, row: 1, kind: "gate" },
  { id: "g_sanity",  label: "Sanity Override", sublabel: "impossible flip",        dag: "stock_synthesis",                    schedule: "inline post-debate",   produces: "gate_decisions JSONB",   col: 3, row: 2, kind: "gate" },
  { id: "g_crit",    label: "Critical News",   sublabel: "fraud / bankruptcy",     dag: "stock_synthesis",                    schedule: "inline post-debate",   produces: "force SELL override",    col: 3, row: 3, kind: "gate" },

  // Column 4 — OUTPUT + REFLECTOR (the learning loop)
  { id: "synthesis", label: "stock_synthesis", sublabel: "BUY / HOLD / SELL row",  dag: "stock_synthesis",                    schedule: "Mon-Fri 18:00 local",  produces: "datapai.stock_synthesis",col: 4, row: 1, kind: "output"   },
  { id: "reflector", label: "Reflector",       sublabel: "7d/30d/90d grader",      dag: "stock_reflector",                    schedule: "Daily 06:00 UTC",      produces: "sys_agent_memory lessons", col: 4, row: 3, kind: "reflector" },
];

const EDGES: PipelineEdge[] = [
  // raw → input agents
  { from: "eod",      to: "ta"   },
  { from: "fund_etl", to: "fa"   },
  { from: "ir_scan",  to: "ma"   },
  { from: "news_in",  to: "news" },
  // input agents → all 4 debate personas (each persona sees all signals)
  { from: "ta",   to: "bull" },
  { from: "fa",   to: "bull" },
  { from: "ma",   to: "bull" },
  { from: "news", to: "bull" },
  { from: "ta",   to: "bear" },
  { from: "fa",   to: "bear" },
  { from: "ma",   to: "bear" },
  { from: "news", to: "bear" },
  { from: "bull", to: "risk" },
  { from: "bear", to: "risk" },
  { from: "risk", to: "pm"   },
  // PM → gates
  { from: "pm", to: "g_quality" },
  { from: "pm", to: "g_regime"  },
  { from: "pm", to: "g_sanity"  },
  { from: "pm", to: "g_crit"    },
  // gates → final
  { from: "g_quality", to: "synthesis" },
  { from: "g_regime",  to: "synthesis" },
  { from: "g_sanity",  to: "synthesis" },
  { from: "g_crit",    to: "synthesis" },
  // synthesis → reflector (after 7/30/90 days realised return)
  { from: "synthesis", to: "reflector" },
  // reflector feedback loop back into debate (lessons inject into next debate)
  { from: "reflector", to: "bull", label: "lessons" },
  { from: "reflector", to: "bear", label: "lessons" },
  { from: "reflector", to: "risk", label: "lessons" },
  { from: "reflector", to: "pm",   label: "lessons" },
];

// ── Layout constants ───────────────────────────────────────────────────────
const COL_WIDTH = 220;
const ROW_HEIGHT = 90;
const NODE_W = 180;
const NODE_H = 64;
const N_COLS = 5;
const N_ROWS = 4;
const CANVAS_W = COL_WIDTH * N_COLS;
const CANVAS_H = ROW_HEIGHT * N_ROWS + 60;

const COL_LABELS = [
  { idx: 0, label: "Raw Data",      sub: "Ingestion DAGs"   },
  { idx: 1, label: "Input Agents",  sub: "4 signal sources" },
  { idx: 2, label: "AG2 Debate",    sub: "4-persona GroupChat" },
  { idx: 3, label: "Gates",         sub: "4 guardrails"     },
  { idx: 4, label: "Output + Learn",sub: "Synthesis + Reflector" },
];

function nodePos(n: PipelineNode) {
  const x = n.col * COL_WIDTH + (COL_WIDTH - NODE_W) / 2;
  const y = n.row * ROW_HEIGHT + 50;
  return { x, y, cx: x + NODE_W / 2, cy: y + NODE_H / 2 };
}

function kindStyles(k: NodeKind) {
  switch (k) {
    case "ingest":      return { bg: "#1e3a8a", border: "#3b82f6", text: "#dbeafe" };
    case "input_agent": return { bg: "#064e3b", border: "#10b981", text: "#d1fae5" };
    case "debate":      return { bg: "#5b21b6", border: "#a78bfa", text: "#ede9fe" };
    case "gate":        return { bg: "#7c2d12", border: "#fb923c", text: "#fed7aa" };
    case "output":      return { bg: "#9d174d", border: "#f472b6", text: "#fce7f3" };
    case "reflector":   return { bg: "#312e81", border: "#818cf8", text: "#e0e7ff" };
  }
}

// Which "stage" is currently active in the auto-loop animation
const PULSE_STAGES: NodeKind[] = ["ingest", "input_agent", "debate", "gate", "output", "reflector"];
const STAGE_MS = 1500;

export default function AgentPipelineAnimation() {
  const [stage, setStage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setStage((s) => (s + 1) % PULSE_STAGES.length), STAGE_MS);
    return () => clearInterval(t);
  }, [paused]);

  const activeKind = PULSE_STAGES[stage];

  return (
    <div
      className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl overflow-hidden shadow-xl border border-gray-700"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Grid pattern background */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative px-4 py-5 sm:px-6 sm:py-6">
        {/* Caption */}
        <div className="text-center mb-3">
          <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-400 font-bold mb-1">
            Production DAG · 13 AI agents
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Every BUY / SELL / HOLD is the output of scheduled Airflow DAGs
          </h2>
          <p className="text-xs text-gray-400 mt-1.5">
            Hover any node for schedule + output table · auto-plays the data flow
          </p>
        </div>

        {/* Pipeline canvas */}
        <div className="relative overflow-x-auto">
          <svg
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            className="w-full"
            style={{ minWidth: "900px", height: `${CANVAS_H * 0.85}px` }}
          >
            {/* Column headers */}
            {COL_LABELS.map(({ idx, label, sub }) => {
              const x = idx * COL_WIDTH + COL_WIDTH / 2;
              const colKind = (
                idx === 0 ? "ingest"
                : idx === 1 ? "input_agent"
                : idx === 2 ? "debate"
                : idx === 3 ? "gate"
                : "output"
              ) as NodeKind;
              const colActive = colKind === activeKind || (idx === 4 && activeKind === "reflector");
              return (
                <g key={idx}>
                  <text
                    x={x}
                    y={18}
                    textAnchor="middle"
                    className="font-bold"
                    style={{ fontSize: 10, letterSpacing: "0.18em", fill: colActive ? "#34d399" : "#6b7280" }}
                  >
                    {label.toUpperCase()}
                  </text>
                  <text
                    x={x}
                    y={32}
                    textAnchor="middle"
                    style={{ fontSize: 9, fill: "#9ca3af" }}
                  >
                    {sub}
                  </text>
                </g>
              );
            })}

            {/* Edges */}
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#4b5563" />
              </marker>
              <marker id="arrowLit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#34d399" />
              </marker>
              <marker id="arrowReflector" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#a78bfa" />
              </marker>
            </defs>
            {EDGES.map((e, i) => {
              const a = NODES.find((n) => n.id === e.from);
              const b = NODES.find((n) => n.id === e.to);
              if (!a || !b) return null;
              const pa = nodePos(a);
              const pb = nodePos(b);
              const isReflectorEdge = e.from === "reflector";
              const litThisStage =
                (a.kind === activeKind && b.kind !== "reflector") ||
                (a.kind === "output" && b.kind === "reflector" && activeKind === "reflector");
              // Reflector edges curve over the top (visual loopback)
              const path = isReflectorEdge
                ? `M ${pa.x + NODE_W / 2},${pa.y} C ${pa.x},${pa.y - 60} ${pb.x + NODE_W / 2},${pb.y - 60} ${pb.x + NODE_W},${pb.y + NODE_H / 2}`
                : `M ${pa.x + NODE_W},${pa.cy} C ${pa.x + NODE_W + 50},${pa.cy} ${pb.x - 50},${pb.cy} ${pb.x},${pb.cy}`;
              return (
                <path
                  key={i}
                  d={path}
                  fill="none"
                  stroke={isReflectorEdge ? "#a78bfa" : litThisStage ? "#34d399" : "#374151"}
                  strokeWidth={isReflectorEdge ? 1.2 : litThisStage ? 2 : 1}
                  strokeDasharray={isReflectorEdge ? "3 3" : litThisStage ? "0" : "2 4"}
                  opacity={isReflectorEdge ? 0.6 : litThisStage ? 1 : 0.5}
                  markerEnd={`url(#${isReflectorEdge ? "arrowReflector" : litThisStage ? "arrowLit" : "arrow"})`}
                />
              );
            })}

            {/* Nodes */}
            {NODES.map((n) => {
              const p = nodePos(n);
              const s = kindStyles(n.kind);
              const isActive = n.kind === activeKind;
              const isHover = hover === n.id;
              return (
                <g
                  key={n.id}
                  onMouseEnter={() => { setHover(n.id); setPaused(true); }}
                  onMouseLeave={() => setHover(null)}
                  style={{ cursor: "help" }}
                >
                  <rect
                    x={p.x}
                    y={p.y}
                    width={NODE_W}
                    height={NODE_H}
                    rx={8}
                    fill={s.bg}
                    stroke={isActive || isHover ? s.border : `${s.border}55`}
                    strokeWidth={isActive || isHover ? 2 : 1}
                    style={{
                      filter: isActive
                        ? `drop-shadow(0 0 8px ${s.border}88)`
                        : isHover
                        ? `drop-shadow(0 0 4px ${s.border}66)`
                        : "none",
                      transition: "all 0.4s",
                    }}
                  />
                  <text x={p.cx} y={p.y + 22} textAnchor="middle" style={{ fontSize: 11, fontWeight: 700, fill: "#fff" }}>
                    {n.label}
                  </text>
                  {n.sublabel && (
                    <text x={p.cx} y={p.y + 38} textAnchor="middle" style={{ fontSize: 9, fill: s.text }}>
                      {n.sublabel}
                    </text>
                  )}
                  {n.dag && (
                    <text x={p.cx} y={p.y + 54} textAnchor="middle" style={{ fontSize: 8, fill: "#9ca3af", fontFamily: "monospace" }}>
                      {n.dag.length > 26 ? n.dag.slice(0, 24) + "…" : n.dag}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Hover tooltip (HTML overlay — easier than SVG <foreignObject>) */}
          {hover && (() => {
            const n = NODES.find((x) => x.id === hover);
            if (!n) return null;
            const p = nodePos(n);
            const xPct = (p.x + NODE_W + 12) / CANVAS_W * 100;
            const yPct = (p.y - 8) / CANVAS_H * 100;
            const clampedXPct = Math.min(xPct, 70);
            return (
              <div
                className="absolute z-10 bg-gray-950 border border-gray-700 rounded-lg p-3 shadow-2xl pointer-events-none text-xs max-w-[260px]"
                style={{ left: `${clampedXPct}%`, top: `${Math.max(2, yPct)}%` }}
              >
                <div className="font-bold text-white mb-1">{n.label}</div>
                {n.sublabel && <div className="text-gray-400 text-[10px] mb-2">{n.sublabel}</div>}
                {n.dag && (
                  <div className="mb-1">
                    <span className="text-[10px] text-emerald-400 uppercase tracking-wider">DAG · </span>
                    <span className="font-mono text-gray-200">{n.dag}</span>
                  </div>
                )}
                {n.schedule && (
                  <div className="mb-1">
                    <span className="text-[10px] text-emerald-400 uppercase tracking-wider">Runs · </span>
                    <span className="text-gray-200">{n.schedule}</span>
                  </div>
                )}
                {n.produces && (
                  <div>
                    <span className="text-[10px] text-emerald-400 uppercase tracking-wider">Writes · </span>
                    <span className="font-mono text-gray-200">{n.produces}</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Footer caption: legend + Reflector explanation */}
        <div className="flex items-center justify-between flex-wrap gap-3 mt-3 pt-3 border-t border-gray-700">
          <div className="flex gap-3 flex-wrap text-[10px]">
            {[
              { kind: "ingest" as NodeKind,      label: "Ingest"    },
              { kind: "input_agent" as NodeKind, label: "Input"     },
              { kind: "debate" as NodeKind,      label: "Debate"    },
              { kind: "gate" as NodeKind,        label: "Gate"      },
              { kind: "output" as NodeKind,      label: "Synthesis" },
              { kind: "reflector" as NodeKind,   label: "Reflector" },
            ].map(({ kind, label }) => {
              const s = kindStyles(kind);
              return (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ background: s.bg, border: `1px solid ${s.border}` }} />
                  <span className="text-gray-300">{label}</span>
                </div>
              );
            })}
          </div>
          <div className="text-[10px] text-purple-300 italic">
            📚 Purple dashed loop = Reflector feeds learned lessons back into the next debate
          </div>
        </div>
      </div>
    </div>
  );
}
