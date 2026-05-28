"use client";

/**
 * AgentPipelineAnimation — Airflow-graph-style visualisation of the
 * production pipeline. Matches the real Airflow UI aesthetic: white
 * background, thin gray borders, monospace DAG names, small green
 * "success" status text — like the screenshot of stock_asx_eod's
 * graph view.
 *
 * Each node maps to an actual scheduled DAG on EC2 Airflow. Hover for
 * schedule + output table. Auto-loop highlights one stage at a time
 * with a subtle border-color change + green status indicator —
 * NOT a flashy glow.
 *
 * Truth: 4 input + 4 debate + 4 gates + 1 Reflector = 13 active.
 *
 * Schedules below match production stock_*.py DAGs.
 */

import { useEffect, useState } from "react";

type NodeKind = "ingest" | "input_agent" | "debate" | "gate" | "output" | "reflector";

interface PipelineNode {
  id: string;
  label: string;
  sublabel?: string;
  dag?: string;
  schedule?: string;
  produces?: string;
  operator?: string;  // "BashOperator" / "EmptyOperator" — Airflow speak
  col: number;
  row: number;
  kind: NodeKind;
}

interface PipelineEdge {
  from: string;
  to: string;
  label?: string;
}

const NODES: PipelineNode[] = [
  // Column 0 — Raw data ingestion
  { id: "eod",       label: "stock_eod_dynamic",        sublabel: "OHLCV",      dag: "stock_eod_dynamic",         schedule: "Per market close",            produces: "datapai.prices",          operator: "BashOperator",  col: 0, row: 0, kind: "ingest" },
  { id: "fund_etl",  label: "stock_fundamentals_weekly",sublabel: "10-K/10-Q",  dag: "stock_fundamentals_weekly", schedule: "Weekly Mon 02:00 UTC",        produces: "datapai.fundamental_lite",operator: "BashOperator",  col: 0, row: 1, kind: "ingest" },
  { id: "ir_scan",   label: "stock_tinyfish_scan",      sublabel: "IR pages",   dag: "stock_tinyfish_scan",       schedule: "Daily 04:00 UTC",             produces: "datapai.snapshots",       operator: "BashOperator",  col: 0, row: 2, kind: "ingest" },
  { id: "news_in",   label: "stock_news_monitor",       sublabel: "news + 8-K", dag: "stock_news_monitor",        schedule: "Every 30 min, 06-22 UTC",     produces: "datapai.news_events",     operator: "BashOperator",  col: 0, row: 3, kind: "ingest" },

  // Column 1 — Input agents (compute signals)
  { id: "ta",        label: "compute_ta_daily",         sublabel: "RSI · MACD · MAs",                dag: "stock_weekly_ta / monthly / EOD daily", schedule: "Daily after EOD",            produces: "datapai.ta_signals",     operator: "BashOperator", col: 1, row: 0, kind: "input_agent" },
  { id: "fa",        label: "Fundamental Composite",    sublabel: "Val · Qual · Growth · Analyst",   dag: "stock_fundamentals_weekly",             schedule: "Weekly Mon 02:00 UTC",       produces: "fundamental_lite scores",operator: "PythonAgent",  col: 1, row: 1, kind: "input_agent" },
  { id: "ma",        label: "Market Activity Agent",    sublabel: "IR-page diffs",                   dag: "stock_tinyfish_scan",                   schedule: "Daily 04:00 UTC",            produces: "tinyfish events",        operator: "PythonAgent",  col: 1, row: 2, kind: "input_agent" },
  { id: "news",      label: "News Classifier",          sublabel: "severity + sentiment via LLM",    dag: "stock_news_monitor",                    schedule: "Every 30 min",               produces: "material events",        operator: "PythonAgent",  col: 1, row: 3, kind: "input_agent" },

  // Column 2 — Agentic AI debate
  { id: "bull",      label: "Bull Analyst",             sublabel: "bullish case",                    dag: "stock_synthesis_(asx|us)",              schedule: "18:00 local Mon-Fri",        produces: "bull_arguments[]",       operator: "AIAgent",      col: 2, row: 0, kind: "debate" },
  { id: "bear",      label: "Bear Analyst",             sublabel: "bearish case",                    dag: "stock_synthesis_(asx|us)",              schedule: "18:00 local Mon-Fri",        produces: "bear_arguments[]",       operator: "AIAgent",      col: 2, row: 1, kind: "debate" },
  { id: "risk",      label: "Risk Manager",             sublabel: "position sizing",                 dag: "stock_synthesis_(asx|us)",              schedule: "18:00 local Mon-Fri",        produces: "risk_arguments[]",       operator: "AIAgent",      col: 2, row: 2, kind: "debate" },
  { id: "pm",        label: "Portfolio Manager",        sublabel: "final call JSON",                 dag: "stock_synthesis_(asx|us)",              schedule: "18:00 local Mon-Fri",        produces: "pm_arguments[] + JSON",  operator: "AIAgent",      col: 2, row: 3, kind: "debate" },

  // Column 3 — Governance gates
  { id: "g_quality", label: "Quality Gate",             sublabel: "demote C/D tier",                 dag: "stock_synthesis",                       schedule: "inline post-debate",         produces: "gate_decisions",         operator: "PythonAgent",  col: 3, row: 0, kind: "gate" },
  { id: "g_regime",  label: "Regime Gate",              sublabel: "TA+FA both bearish",              dag: "stock_synthesis",                       schedule: "inline post-debate",         produces: "gate_decisions",         operator: "PythonAgent",  col: 3, row: 1, kind: "gate" },
  { id: "g_sanity",  label: "Sanity Override",          sublabel: "impossible direction flip",       dag: "stock_synthesis",                       schedule: "inline post-debate",         produces: "gate_decisions",         operator: "PythonAgent",  col: 3, row: 2, kind: "gate" },
  { id: "g_crit",    label: "Critical News Override",   sublabel: "fraud / bankruptcy",              dag: "stock_synthesis",                       schedule: "inline post-debate",         produces: "force-SELL override",    operator: "PythonAgent",  col: 3, row: 3, kind: "gate" },

  // Column 4 — Output + learning
  { id: "synthesis", label: "stock_synthesis",          sublabel: "BUY / HOLD / SELL row",           dag: "stock_synthesis",                       schedule: "Mon-Fri 18:00 local",        produces: "datapai.stock_synthesis",operator: "BashOperator", col: 4, row: 1, kind: "output"   },
  { id: "reflector", label: "stock_reflector",          sublabel: "7d/30d/90d grader",               dag: "stock_reflector",                       schedule: "Daily 06:00 UTC",            produces: "sys_agent_memory",       operator: "BashOperator", col: 4, row: 3, kind: "reflector" },
];

const EDGES: PipelineEdge[] = [
  { from: "eod", to: "ta" }, { from: "fund_etl", to: "fa" }, { from: "ir_scan", to: "ma" }, { from: "news_in", to: "news" },
  { from: "ta",   to: "bull" }, { from: "fa",   to: "bull" }, { from: "ma",   to: "bull" }, { from: "news", to: "bull" },
  { from: "ta",   to: "bear" }, { from: "fa",   to: "bear" }, { from: "ma",   to: "bear" }, { from: "news", to: "bear" },
  { from: "bull", to: "risk" }, { from: "bear", to: "risk" }, { from: "risk", to: "pm" },
  { from: "pm", to: "g_quality" }, { from: "pm", to: "g_regime" }, { from: "pm", to: "g_sanity" }, { from: "pm", to: "g_crit" },
  { from: "g_quality", to: "synthesis" }, { from: "g_regime", to: "synthesis" }, { from: "g_sanity", to: "synthesis" }, { from: "g_crit", to: "synthesis" },
  { from: "synthesis", to: "reflector" },
  { from: "reflector", to: "bull", label: "lessons" },
  { from: "reflector", to: "bear", label: "lessons" },
  { from: "reflector", to: "risk", label: "lessons" },
  { from: "reflector", to: "pm",   label: "lessons" },
];

// Layout constants — generous so text is readable without zoom.
// (Earlier sizes were too small at default browser zoom on a wide monitor.)
const COL_WIDTH = 280;
const ROW_HEIGHT = 130;
const NODE_W = 250;
const NODE_H = 98;
const N_COLS = 5;
const N_ROWS = 4;
const CANVAS_W = COL_WIDTH * N_COLS;
const CANVAS_H = ROW_HEIGHT * N_ROWS + 60;

const COL_LABELS = [
  { idx: 0, label: "Step 1 · Ingest",  sub: "Data DAGs" },
  { idx: 1, label: "Step 2 · Input",   sub: "4 signal agents" },
  { idx: 2, label: "Step 3 · Debate",  sub: "Agentic AI · 4 personas" },
  { idx: 3, label: "Step 4 · Govern",  sub: "4 guardrails" },
  { idx: 4, label: "Step 5 · Decide + Learn", sub: "Output · Reflector" },
];

function nodePos(n: PipelineNode) {
  const x = n.col * COL_WIDTH + (COL_WIDTH - NODE_W) / 2;
  const y = n.row * ROW_HEIGHT + 48;
  return { x, y, cx: x + NODE_W / 2, cy: y + NODE_H / 2 };
}

const PULSE_STAGES: NodeKind[] = ["ingest", "input_agent", "debate", "gate", "output", "reflector"];
const STAGE_MS = 1700;

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
      className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm"
      style={{ background: "#f8fafc" }}   /* slate-50 — distinct from white page bg */
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Subtle Airflow-style grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#1f2937 1px, transparent 1px), linear-gradient(90deg, #1f2937 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative px-4 py-5 sm:px-6">
        {/* Header — matches real Airflow page chrome */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold tracking-[0.25em] text-emerald-700 uppercase">Production DAG</span>
            <span className="text-sm font-bold text-gray-900 font-mono">datapai_stock_intelligence</span>
            <span className="text-[10px] text-gray-500">·</span>
            <span className="text-[10px] text-gray-500">13 AI agents</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              auto-playing
            </span>
            <span className="text-[10px] text-gray-400">hover to pause</span>
          </div>
        </div>

        {/* Pipeline canvas */}
        <div className="relative overflow-x-auto">
          <svg
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            className="w-full"
            style={{ minWidth: "1200px", height: `${CANVAS_H * 0.88}px` }}
          >
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af" />
              </marker>
              <marker id="arrowLit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#059669" />
              </marker>
              <marker id="arrowReflector" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
              </marker>
            </defs>

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
                    style={{ fontSize: 12, letterSpacing: "0.18em", fontWeight: 700, fill: colActive ? "#059669" : "#6b7280" }}
                  >
                    {label.toUpperCase()}
                  </text>
                  <text x={x} y={34} textAnchor="middle" style={{ fontSize: 11, fill: "#9ca3af" }}>
                    {sub}
                  </text>
                </g>
              );
            })}

            {/* Edges */}
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
              const path = isReflectorEdge
                ? `M ${pa.x + NODE_W / 2},${pa.y} C ${pa.x},${pa.y - 60} ${pb.x + NODE_W / 2},${pb.y - 60} ${pb.x + NODE_W},${pb.y + NODE_H / 2}`
                : `M ${pa.x + NODE_W},${pa.cy} C ${pa.x + NODE_W + 40},${pa.cy} ${pb.x - 40},${pb.cy} ${pb.x},${pb.cy}`;
              return (
                <path
                  key={i}
                  d={path}
                  fill="none"
                  stroke={isReflectorEdge ? "#6366f1" : litThisStage ? "#059669" : "#d1d5db"}
                  strokeWidth={isReflectorEdge ? 1 : litThisStage ? 1.6 : 1}
                  strokeDasharray={isReflectorEdge ? "3 3" : litThisStage ? "0" : "0"}
                  opacity={isReflectorEdge ? 0.55 : litThisStage ? 1 : 0.55}
                  markerEnd={`url(#${isReflectorEdge ? "arrowReflector" : litThisStage ? "arrowLit" : "arrow"})`}
                />
              );
            })}

            {/* Nodes — Airflow-style flat boxes */}
            {NODES.map((n) => {
              const p = nodePos(n);
              const isActive = n.kind === activeKind;
              const isHover = hover === n.id;
              const isReflector = n.kind === "reflector";
              const lit = isActive || isHover;
              return (
                <g
                  key={n.id}
                  onMouseEnter={() => { setHover(n.id); setPaused(true); }}
                  onMouseLeave={() => setHover(null)}
                  style={{ cursor: "help" }}
                >
                  {/* Box — flat white like real Airflow */}
                  <rect
                    x={p.x}
                    y={p.y}
                    width={NODE_W}
                    height={NODE_H}
                    rx={4}
                    fill="#ffffff"
                    stroke={lit ? (isReflector ? "#6366f1" : "#059669") : "#d1d5db"}
                    strokeWidth={lit ? 1.5 : 1}
                    style={{ transition: "stroke 0.4s, stroke-width 0.4s" }}
                  />
                  {/* Task name (top, monospace) */}
                  <text
                    x={p.x + 12}
                    y={p.y + 22}
                    style={{ fontSize: 14, fontWeight: 700, fill: "#0f172a", fontFamily: "ui-monospace, SFMono-Regular, monospace" }}
                  >
                    {n.label.length > 28 ? n.label.slice(0, 26) + "…" : n.label}
                  </text>
                  {/* Status row — green dot + "success" or "running" */}
                  <circle cx={p.x + 17} cy={p.y + 42} r={4} fill={lit ? "#059669" : "#10b981"} />
                  <text
                    x={p.x + 27}
                    y={p.y + 46}
                    style={{ fontSize: 12, fill: lit ? "#059669" : "#10b981", fontWeight: 600 }}
                  >
                    {lit ? "running" : "success"}
                  </text>
                  {/* Sublabel (italic, gray) */}
                  {n.sublabel && (
                    <text
                      x={p.x + 12}
                      y={p.y + 66}
                      style={{ fontSize: 12, fill: "#475569", fontStyle: "italic" }}
                    >
                      {n.sublabel.length > 32 ? n.sublabel.slice(0, 30) + "…" : n.sublabel}
                    </text>
                  )}
                  {/* Operator type (bottom) */}
                  {n.operator && (
                    <text
                      x={p.x + 12}
                      y={p.y + 86}
                      style={{ fontSize: 11, fill: "#64748b", fontFamily: "ui-monospace, SFMono-Regular, monospace" }}
                    >
                      {n.operator}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Hover tooltip */}
          {hover && (() => {
            const n = NODES.find((x) => x.id === hover);
            if (!n) return null;
            const p = nodePos(n);
            const xPct = (p.x + NODE_W + 12) / CANVAS_W * 100;
            const yPct = (p.y - 8) / CANVAS_H * 100;
            const clampedXPct = Math.min(xPct, 70);
            return (
              <div
                className="absolute z-10 bg-white border border-gray-300 rounded-lg p-3 shadow-lg pointer-events-none text-xs max-w-[280px]"
                style={{ left: `${clampedXPct}%`, top: `${Math.max(2, yPct)}%` }}
              >
                <div className="font-semibold text-gray-900 mb-1 font-mono text-xs">{n.label}</div>
                {n.sublabel && <div className="text-gray-500 text-[10px] mb-2 italic">{n.sublabel}</div>}
                {n.dag && (
                  <div className="mb-1">
                    <span className="text-[10px] text-emerald-700 uppercase tracking-wider font-bold">dag · </span>
                    <span className="font-mono text-gray-700 text-[11px]">{n.dag}</span>
                  </div>
                )}
                {n.schedule && (
                  <div className="mb-1">
                    <span className="text-[10px] text-emerald-700 uppercase tracking-wider font-bold">schedule · </span>
                    <span className="text-gray-700 text-[11px]">{n.schedule}</span>
                  </div>
                )}
                {n.produces && (
                  <div>
                    <span className="text-[10px] text-emerald-700 uppercase tracking-wider font-bold">writes · </span>
                    <span className="font-mono text-gray-700 text-[11px]">{n.produces}</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Footer — Airflow-style status legend */}
        <div className="flex items-center justify-between flex-wrap gap-3 mt-4 pt-3 border-t border-gray-200 text-[10px]">
          <div className="flex gap-3 flex-wrap items-center">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-white border border-gray-300" />
              <span className="text-gray-600">idle</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-white border-2 border-emerald-600" />
              <span className="text-gray-600">running</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-white border border-indigo-500 border-dashed" />
              <span className="text-gray-600">Reflector feedback</span>
            </div>
          </div>
          <div className="text-gray-500 italic">
            📚 Dashed indigo loop = Reflector injects learned lessons into the next debate
          </div>
        </div>
      </div>
    </div>
  );
}
