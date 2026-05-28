"use client";

/**
 * AgentPipelineAnimation — auto-playing SVG/CSS visualisation of the
 * 17-agent pipeline. Sits at the top of /methodology as the "in 10
 * seconds, here's what we do" hero.
 *
 * Stages animate in sequence, looping forever:
 *   1. Input agents (8 nodes on the left) light up one by one
 *   2. A "data beam" travels right into the Debate stage
 *   3. Bull/Bear/Risk/PM nodes light up in order; chat bubbles flash
 *   4. Beam travels into Governance Gates (4 nodes); one randomly fires
 *   5. Final BUY / HOLD / SELL card emerges at the right
 *   6. Reflector arc loops back from the final call to the input column
 *      (the "learning" feedback)
 *
 * Pure CSS keyframes + a single React state ticker. No external animation
 * library. ~6-second loop. Pause-on-hover so demo'er can stop and explain.
 */

import { useEffect, useState } from "react";

const INPUT_AGENTS = [
  { slug: "technical",       label: "Technical",    short: "TA"   },
  { slug: "valuation",       label: "Valuation",    short: "Val"  },
  { slug: "quality",         label: "Quality",      short: "Qual" },
  { slug: "growth",          label: "Growth",       short: "Grow" },
  { slug: "analyst",         label: "Analyst",      short: "Anal" },
  { slug: "macro",           label: "Macro",        short: "Macro"},
  { slug: "market_activity", label: "Mkt Activity", short: "MA"   },
  { slug: "news",            label: "News",         short: "News" },
];

const DEBATE_AGENTS = [
  { slug: "bull", label: "Bull",  emoji: "🐂", color: "#16a34a" },
  { slug: "bear", label: "Bear",  emoji: "🐻", color: "#dc2626" },
  { slug: "risk", label: "Risk",  emoji: "🛡",  color: "#d97706" },
  { slug: "pm",   label: "PM",    emoji: "⚖️", color: "#4f46e5" },
];

const GATES = [
  { slug: "quality",  label: "Quality"  },
  { slug: "regime",   label: "Regime"   },
  { slug: "sanity",   label: "Sanity"   },
  { slug: "critical", label: "Critical News" },
];

const STAGE_DURATION_MS = 1400;   // each stage holds for ~1.4s
const TOTAL_STAGES = 5;            // input → debate → gates → final → reflector

export default function AgentPipelineAnimation() {
  const [stage, setStage] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setStage((s) => (s + 1) % TOTAL_STAGES);
    }, STAGE_DURATION_MS);
    return () => clearInterval(t);
  }, [paused]);

  // Which stage is "lit" right now
  const lit = {
    inputs:    stage >= 0,
    debate:    stage >= 1,
    gates:     stage >= 2,
    final:     stage >= 3,
    reflector: stage >= 4,
  };

  // Pick a "fired" gate randomly per loop for visual variety
  const firedGateIdx = stage % GATES.length;

  return (
    <div
      className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl overflow-hidden shadow-xl border border-gray-700"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Subtle grid pattern in the background for a "control room" feel */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative px-6 py-6 sm:px-8 sm:py-8">
        {/* Caption */}
        <div className="text-center mb-5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-400 font-bold mb-1">
            Live pipeline · 17 AI agents
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            From raw signals to a single, defensible BUY / SELL / HOLD
          </h2>
          <p className="text-xs text-gray-400 mt-1.5">
            Hover to pause · auto-plays the full data flow
          </p>
        </div>

        {/* Pipeline grid */}
        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr_1fr_1fr] gap-3 sm:gap-4 items-stretch">
          {/* ── Stage 1: Input agents ───────────────────────────────────── */}
          <Stage label="Step 1 · Gather" sublabel="8 input agents" active={lit.inputs}>
            <div className="grid grid-cols-2 gap-1.5">
              {INPUT_AGENTS.map((a, i) => (
                <Node
                  key={a.slug}
                  label={a.short}
                  active={lit.inputs}
                  pulseDelay={i * 100}
                  color="#10b981"
                />
              ))}
            </div>
          </Stage>

          {/* Beam 1→2 */}
          <Beam active={lit.debate} side="left" />

          {/* ── Stage 2: Debate ─────────────────────────────────────────── */}
          <Stage label="Step 2 · Debate" sublabel="AG2 GroupChat" active={lit.debate}>
            <div className="grid grid-cols-2 gap-1.5">
              {DEBATE_AGENTS.map((a, i) => (
                <Node
                  key={a.slug}
                  label={`${a.emoji} ${a.label}`}
                  active={lit.debate}
                  pulseDelay={i * 200}
                  color={a.color}
                />
              ))}
            </div>
            {lit.debate && (
              <div className="mt-2 text-[9px] text-gray-400 italic text-center">
                Bull ⇄ Bear · Risk weighs in · PM concludes
              </div>
            )}
          </Stage>

          {/* Beam 2→3 */}
          <Beam active={lit.gates} side="left" />

          {/* ── Stage 3: Gates ──────────────────────────────────────────── */}
          <Stage label="Step 3 · Guardrails" sublabel="4 governance gates" active={lit.gates}>
            <div className="grid grid-cols-2 gap-1.5">
              {GATES.map((g, i) => {
                const fired = lit.gates && i === firedGateIdx;
                return (
                  <Node
                    key={g.slug}
                    label={g.label}
                    active={lit.gates}
                    pulseDelay={i * 150}
                    color={fired ? "#f59e0b" : "#6b7280"}
                    badge={fired ? "FIRED" : "PASS"}
                  />
                );
              })}
            </div>
          </Stage>

          {/* Beam 3→4 */}
          <Beam active={lit.final} side="left" />

          {/* ── Stage 4: Final call ─────────────────────────────────────── */}
          <Stage label="Step 4 · Decide" sublabel="Final synthesis" active={lit.final}>
            <FinalCard active={lit.final} />
          </Stage>
        </div>

        {/* Reflector feedback arc spans the whole bottom */}
        <div className="mt-5 relative h-12 flex items-center">
          <svg viewBox="0 0 1000 60" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="reflectorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            {/* Backbone arc */}
            <path
              d="M 950,5 Q 500,80 50,5"
              fill="none"
              stroke="#374151"
              strokeWidth="1.5"
              strokeDasharray="4 6"
            />
            {/* Lit arc when reflector stage active */}
            {lit.reflector && (
              <path
                d="M 950,5 Q 500,80 50,5"
                fill="none"
                stroke="url(#reflectorGrad)"
                strokeWidth="2.5"
                style={{
                  strokeDasharray: 1800,
                  strokeDashoffset: 1800,
                  animation: "reflectorFlow 1300ms linear forwards",
                }}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={`text-[10px] uppercase tracking-[0.25em] font-bold transition-opacity duration-500 ${
                lit.reflector ? "text-purple-300 opacity-100" : "text-gray-600 opacity-60"
              }`}
            >
              📚 Reflector — feeds realised outcomes back to every agent
            </span>
          </div>
        </div>

        {/* Stage indicator dots */}
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: TOTAL_STAGES }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setPaused(true);
                setStage(i);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                stage === i ? "w-8 bg-emerald-400" : "w-1.5 bg-gray-600 hover:bg-gray-500"
              }`}
              aria-label={`Jump to stage ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* keyframes */}
      <style jsx>{`
        @keyframes reflectorFlow {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function Stage({
  label,
  sublabel,
  active,
  children,
}: {
  label: string;
  sublabel: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative rounded-xl border p-3 transition-all duration-500 ${
        active
          ? "bg-gray-800/80 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
          : "bg-gray-800/30 border-gray-700"
      }`}
    >
      <div className="mb-2">
        <div
          className={`text-[9px] uppercase tracking-[0.2em] font-bold ${
            active ? "text-emerald-400" : "text-gray-500"
          }`}
        >
          {label}
        </div>
        <div className={`text-xs ${active ? "text-gray-200" : "text-gray-500"}`}>
          {sublabel}
        </div>
      </div>
      {children}
    </div>
  );
}

function Node({
  label,
  active,
  pulseDelay,
  color,
  badge,
}: {
  label: string;
  active: boolean;
  pulseDelay: number;
  color: string;
  badge?: string;
}) {
  return (
    <div
      className="relative rounded-md px-2 py-1.5 text-center transition-all duration-300"
      style={{
        background: active ? `${color}22` : "rgba(255,255,255,0.04)",
        border: active ? `1px solid ${color}66` : "1px solid rgba(255,255,255,0.08)",
        boxShadow: active ? `0 0 8px ${color}55` : "none",
        animation: active ? `nodePulse 1.4s ease-in-out ${pulseDelay}ms infinite` : "none",
      }}
    >
      <div
        className="text-[10px] font-semibold leading-tight"
        style={{ color: active ? "#fff" : "#9ca3af" }}
      >
        {label}
      </div>
      {badge && (
        <div
          className="text-[8px] font-bold mt-0.5"
          style={{ color: badge === "FIRED" ? "#fbbf24" : "#9ca3af" }}
        >
          {badge}
        </div>
      )}
      <style jsx>{`
        @keyframes nodePulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
}

function Beam({ active, side }: { active: boolean; side: "left" | "right" }) {
  // Horizontal connector between stages. Visible only on desktop (md:flex)
  // because on mobile the stages stack vertically.
  return (
    <div className="hidden md:flex items-center justify-center -mx-1">
      <svg viewBox="0 0 40 100" className="w-full h-full" preserveAspectRatio="none">
        <line
          x1="0"
          y1="50"
          x2="40"
          y2="50"
          stroke="#374151"
          strokeWidth="2"
          strokeDasharray="2 4"
        />
        {active && (
          <>
            <line
              x1="0"
              y1="50"
              x2="40"
              y2="50"
              stroke="#10b981"
              strokeWidth="2.5"
              style={{
                strokeDasharray: 40,
                strokeDashoffset: 40,
                animation: "beamFlow 700ms ease-out forwards",
              }}
            />
            {/* Travelling particle */}
            <circle r="2.5" fill="#34d399">
              <animate
                attributeName="cx"
                from="0"
                to="40"
                dur="700ms"
                fill="freeze"
                repeatCount="1"
              />
              <animate
                attributeName="cy"
                from="50"
                to="50"
                dur="700ms"
                fill="freeze"
              />
              <animate
                attributeName="opacity"
                values="0;1;1;0"
                dur="700ms"
                fill="freeze"
              />
            </circle>
          </>
        )}
        <style jsx>{`
          @keyframes beamFlow {
            to {
              stroke-dashoffset: 0;
            }
          }
        `}</style>
      </svg>
      {/* side prop is unused visually but kept for potential L/R asymmetry */}
      {side === "right" && null}
    </div>
  );
}

function FinalCard({ active }: { active: boolean }) {
  // Cycles through the three outcomes for visual variety on each loop.
  const outcomes = [
    { dir: "BUY",  bg: "bg-emerald-500", emoji: "🟢", label: "BUY",  conf: "78%" },
    { dir: "HOLD", bg: "bg-amber-500",   emoji: "🟡", label: "HOLD", conf: "65%" },
    { dir: "SELL", bg: "bg-red-500",     emoji: "🔴", label: "SELL", conf: "82%" },
  ];
  const [pick, setPick] = useState(0);
  useEffect(() => {
    if (active) setPick((p) => (p + 1) % outcomes.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  const o = outcomes[pick];
  return (
    <div
      className={`rounded-lg p-3 transition-all duration-500 ${
        active ? "scale-100 opacity-100" : "scale-95 opacity-40"
      }`}
      style={{
        background: active ? `linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))` : "transparent",
        border: active ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="text-[9px] uppercase tracking-[0.15em] text-gray-400 mb-2 text-center">
        Final call
      </div>
      <div
        className={`${o.bg} text-white font-bold text-center py-2 rounded-md text-base tracking-wider transition-all duration-500`}
        style={{
          boxShadow: active ? `0 0 24px ${o.bg.includes("emerald") ? "#10b98166" : o.bg.includes("red") ? "#ef444466" : "#f59e0b66"}` : "none",
        }}
      >
        {o.emoji} {o.label}
      </div>
      <div className="text-[10px] text-center text-gray-400 mt-2">
        confidence <span className="font-bold text-white">{o.conf}</span>
      </div>
    </div>
  );
}
