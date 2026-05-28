"use client";

/**
 * DebateReplay — animated chat-style replay of the 4-persona AG2 debate.
 *
 * Mounted on /debate/[ticker]. Renders the Bull → Bear → Risk → PM
 * arguments as a sequenced conversation: each persona's message types
 * out, the next appears 700ms later. Auto-play by default with
 * pause/play/restart controls.
 *
 * Why this view exists: every other surface (intel page, performance row,
 * methodology) shows the synthesis as static text. This is the demo —
 * the moment a B2B prospect sees the agents actually arguing and walks
 * away convinced this isn't a single-prompt wrapper.
 *
 * Data: client-side props pulled from sys_agent_debate_log_full +
 * stock_synthesis on the server. We accept arrays of strings per persona
 * (the GroupChat captures multiple turns per agent in 1-round mode; we
 * concatenate non-trivial ones into a single bubble per persona).
 */

import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  ticker: string;
  exchange: string;
  bull: string[];
  bear: string[];
  risk: string[];
  pm: string[];
  // Final call (rendered after all bubbles appear)
  direction: string;
  confidence: number;
  conviction: string;
  thesis: string;
}

type PersonaSlug = "bull" | "bear" | "risk" | "pm";

const personaMeta: Record<PersonaSlug, {
  name: string;
  short: string;
  avatar: string;
  bg: string;
  accent: string;
  side: "left" | "right";
  role: string;
}> = {
  bull: {
    name: "Bull Analyst",
    short: "BULL",
    avatar: "🐂",
    bg:    "bg-emerald-50",
    accent: "border-emerald-300",
    side:  "left",
    role:  "Argues the bullish case",
  },
  bear: {
    name: "Bear Analyst",
    short: "BEAR",
    avatar: "🐻",
    bg:    "bg-red-50",
    accent: "border-red-300",
    side:  "right",
    role:  "Argues the bearish case + risks",
  },
  risk: {
    name: "Risk Manager",
    short: "RISK",
    avatar: "🛡",
    bg:    "bg-amber-50",
    accent: "border-amber-300",
    side:  "left",
    role:  "Sizes the position, sets stop-loss",
  },
  pm: {
    name: "Portfolio Manager",
    short: "PM",
    avatar: "⚖️",
    bg:    "bg-indigo-50",
    accent: "border-indigo-300",
    side:  "right",
    role:  "Final call — emits the JSON",
  },
};

const directionColor = (d?: string): { bg: string; fg: string; label: string; emoji: string } => {
  const dir = (d || "").toUpperCase();
  if (dir === "STRONG_BUY") return { bg: "#16a34a", fg: "#fff", label: "STRONG BUY", emoji: "🟢" };
  if (dir === "BUY")        return { bg: "#22c55e", fg: "#fff", label: "BUY",        emoji: "🟢" };
  if (dir === "HOLD")       return { bg: "#eab308", fg: "#111", label: "HOLD",       emoji: "🟡" };
  if (dir === "SELL")       return { bg: "#ef4444", fg: "#fff", label: "SELL",       emoji: "🔴" };
  if (dir === "STRONG_SELL")return { bg: "#b91c1c", fg: "#fff", label: "STRONG SELL",emoji: "🔴" };
  return { bg: "#9ca3af", fg: "#fff", label: dir || "—", emoji: "⚪" };
};

/** Pick the most informative argument from an array. */
function bestArgument(args: string[]): string {
  if (!args || args.length === 0) return "";
  // Skip leading kickoff-context messages that don't carry argumentation
  const filtered = args.filter((a) => !/^We need to debate|^=== SIGNAL|Stock:|Date:/im.test(a));
  // Prefer the longest non-trivial one (proxy for "most substantive")
  const candidates = (filtered.length ? filtered : args).filter((a) => a.length > 40);
  if (candidates.length === 0) return args[args.length - 1] || "";
  return candidates.sort((a, b) => b.length - a.length)[0];
}

/** Typing animation for one bubble — reveal characters at a steady rate. */
function useTypewriter(text: string, active: boolean, speedMs = 12) {
  const [out, setOut] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!active) {
      setOut("");
      return;
    }
    setOut("");
    let i = 0;
    const step = () => {
      i += Math.max(1, Math.floor(text.length / 200)); // ~200 frames total max
      setOut(text.slice(0, i));
      if (i < text.length) {
        timerRef.current = setTimeout(step, speedMs);
      }
    };
    timerRef.current = setTimeout(step, speedMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, active, speedMs]);
  return out;
}

function Bubble({
  persona,
  text,
  isActive,
  speedMs,
  isComplete,
}: {
  persona: PersonaSlug;
  text: string;
  isActive: boolean;
  speedMs: number;
  isComplete: boolean;
}) {
  const meta = personaMeta[persona];
  const typed = useTypewriter(text, isActive, speedMs);
  const showText = isComplete ? text : typed;
  return (
    <div className={`flex gap-3 ${meta.side === "right" ? "flex-row-reverse" : ""}`}>
      <div className="flex-shrink-0 flex flex-col items-center gap-1">
        <div className={`w-10 h-10 rounded-full ${meta.bg} ${meta.accent} border-2 flex items-center justify-center text-lg`}>
          {meta.avatar}
        </div>
        <div className="text-[9px] font-bold text-gray-500 tracking-wider">{meta.short}</div>
      </div>
      <div className={`flex-1 max-w-[80%] ${meta.side === "right" ? "items-end" : "items-start"} flex flex-col`}>
        <div className={`text-[10px] text-gray-500 mb-1 ${meta.side === "right" ? "text-right" : "text-left"}`}>
          <span className="font-semibold text-gray-700">{meta.name}</span>
          <span className="text-gray-400"> · {meta.role}</span>
        </div>
        <div className={`${meta.bg} ${meta.accent} border rounded-2xl px-4 py-3 text-sm text-gray-900 leading-snug shadow-sm whitespace-pre-wrap`}>
          {showText || (isActive && !isComplete ? <span className="text-gray-400 italic">typing…</span> : "")}
        </div>
      </div>
    </div>
  );
}

export default function DebateReplay(props: Props) {
  const { ticker, exchange, direction, confidence, conviction, thesis } = props;

  // Compose persona bubbles
  const personas = useMemo(() => {
    return [
      { slug: "bull" as const, text: bestArgument(props.bull) },
      { slug: "bear" as const, text: bestArgument(props.bear) },
      { slug: "risk" as const, text: bestArgument(props.risk) },
      { slug: "pm"   as const, text: bestArgument(props.pm) || thesis },
    ].filter((p) => p.text.trim().length > 0);
  }, [props.bull, props.bear, props.risk, props.pm, thesis]);

  const [activeIdx, setActiveIdx] = useState(-1); // -1 = not started; N = bubble N is typing
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMs, setSpeedMs] = useState(12);   // typing speed
  const advanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const finalShown = activeIdx >= personas.length;

  // Auto-advance: when a bubble finishes typing, schedule the next one.
  useEffect(() => {
    if (!isPlaying) return;
    if (activeIdx < 0) {
      // start
      setActiveIdx(0);
      return;
    }
    if (activeIdx >= personas.length) return; // done
    const current = personas[activeIdx];
    if (!current) return;
    // Approximate typing duration based on text length × speed
    const typingMs = Math.min(8000, current.text.length * speedMs * 0.8);
    const pauseMs = 900; // pause between speakers
    advanceTimerRef.current = setTimeout(() => {
      setActiveIdx((i) => i + 1);
    }, typingMs + pauseMs);
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, [activeIdx, isPlaying, speedMs, personas]);

  const restart = () => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    setActiveIdx(-1);
    setIsPlaying(true);
  };

  const dc = directionColor(direction);

  return (
    <div className="space-y-5">
      {/* Header / controls */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            AI Debate Replay
          </div>
          <div className="text-sm text-gray-900">
            <span className="font-bold">{ticker}</span>
            <span className="text-gray-400 mx-1.5">·</span>
            <span className="text-gray-600">{exchange}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="text-xs px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold"
          >
            {isPlaying ? "⏸ Pause" : "▶ Play"}
          </button>
          <button
            type="button"
            onClick={restart}
            className="text-xs px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold"
          >
            ↻ Restart
          </button>
          <select
            value={speedMs}
            onChange={(e) => setSpeedMs(Number(e.target.value))}
            className="text-xs px-2 py-1.5 rounded border border-gray-200 bg-white text-gray-700"
            aria-label="Animation speed"
          >
            <option value={24}>0.5×</option>
            <option value={12}>1×</option>
            <option value={6}>2×</option>
            <option value={3}>4×</option>
            <option value={1}>instant</option>
          </select>
        </div>
      </div>

      {/* Chat thread */}
      <div className="bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-2xl p-5 space-y-5 min-h-[400px]">
        {personas.length === 0 && (
          <div className="text-sm text-gray-500 italic text-center py-12">
            No debate transcript available for this ticker yet. The 4-agent debate
            runs nightly via Airflow — check back tomorrow.
          </div>
        )}
        {personas.map((p, i) => {
          const isActiveBubble = activeIdx === i;
          const hasAppeared = activeIdx >= i;
          if (!hasAppeared) return null;
          return (
            <Bubble
              key={`${p.slug}-${i}`}
              persona={p.slug}
              text={p.text}
              isActive={isActiveBubble}
              speedMs={speedMs}
              isComplete={activeIdx > i || speedMs <= 1}
            />
          );
        })}

        {/* Final synthesis card */}
        {finalShown && (
          <div className="mt-6 pt-5 border-t border-gray-200">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
              Final synthesis — Portfolio Manager's call
            </div>
            <div className="bg-white border-2 border-gray-300 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 flex-wrap mb-3">
                <span
                  className="text-sm px-3 py-1.5 rounded-full font-bold tracking-wide"
                  style={{ background: dc.bg, color: dc.fg }}
                >
                  {dc.emoji} {dc.label}
                </span>
                <span className="text-xs text-gray-700">
                  Confidence: <span className="font-bold">{Math.round(confidence * 100)}%</span>
                </span>
                <span className="text-xs text-gray-700">
                  Conviction: <span className="font-bold">{conviction}</span>
                </span>
              </div>
              {thesis && (
                <div className="text-sm text-gray-800 leading-relaxed">{thesis}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
