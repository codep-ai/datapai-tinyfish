"use client";

import { useState } from "react";
import { UNIVERSE } from "@/lib/universe";

type TickerStatus = "pending" | "scanning" | "ok" | "changed" | "failed";

interface TickerState {
  status: TickerStatus;
  score?: number;
  confidence?: number;
  error?: string;
}

interface CompleteEvent {
  runId: string;
  succeeded: number;
  failed: number;
  changed: number;
  alerts: number;
}

export default function LiveScanProgress() {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [tickers, setTickers] = useState<Record<string, TickerState>>({});
  const [summary, setSummary] = useState<CompleteEvent | null>(null);
  const [runId, setRunId] = useState<string | null>(null);

  async function startScan() {
    setRunning(true);
    setDone(false);
    setSummary(null);
    setRunId(null);
    // Reset all to pending
    const initial: Record<string, TickerState> = {};
    for (const t of UNIVERSE) initial[t.symbol] = { status: "pending" };
    setTickers(initial);

    try {
      const res = await fetch("/api/run", { method: "POST" });
      if (!res.body) throw new Error("No response stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const json = line.slice(5).trim();
          if (!json) continue;
          try {
            const event = JSON.parse(json);
            if (event.type === "start") {
              setRunId(event.runId);
            } else if (event.type === "ticker") {
              setTickers((prev) => ({
                ...prev,
                [event.ticker]: {
                  status: event.status,
                  score: event.score,
                  confidence: event.confidence,
                  error: event.error,
                },
              }));
            } else if (event.type === "complete") {
              setSummary(event as CompleteEvent);
              setDone(true);
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error("Scan error:", err);
    } finally {
      setRunning(false);
      setDone(true);
    }
  }

  const statusIcon: Record<TickerStatus, string> = {
    pending: "○",
    scanning: "⟳",
    ok: "✓",
    changed: "⚡",
    failed: "✗",
  };

  const statusColor: Record<TickerStatus, string> = {
    pending: "#d1d5db",
    scanning: "#f9b116",
    ok: "#2e8b57",
    changed: "#f97316",
    failed: "#ef4444",
  };

  const completedCount = Object.values(tickers).filter(
    (t) => t.status !== "pending" && t.status !== "scanning"
  ).length;
  const total = UNIVERSE.length;
  const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <div className="w-full space-y-4">
      {/* Trigger button */}
      {!running && !done && (
        <button
          onClick={startScan}
          className="px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          style={{ background: "rgba(255,255,255,0.2)", border: "1.5px solid rgba(255,255,255,0.6)" }}
        >
          ▶ Run Live Scan
        </button>
      )}

      {/* Progress while running */}
      {(running || done) && (
        <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm space-y-4 text-left max-w-2xl mx-auto">
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background: done ? "#2e8b57" : "#f9b116",
                }}
              />
            </div>
            <span className="text-white/80 text-sm font-mono">
              {completedCount}/{total}
            </span>
          </div>

          {/* Ticker grid */}
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
            {UNIVERSE.map((t) => {
              const state = tickers[t.symbol] ?? { status: "pending" };
              return (
                <div
                  key={t.symbol}
                  className="rounded px-2 py-1.5 text-center"
                  style={{
                    background:
                      state.status === "changed"
                        ? "rgba(249,177,22,0.25)"
                        : state.status === "failed"
                        ? "rgba(239,68,68,0.2)"
                        : "rgba(255,255,255,0.1)",
                  }}
                >
                  <div
                    className="text-xs font-mono"
                    style={{
                      color:
                        state.status === "scanning"
                          ? "#f9b116"
                          : "rgba(255,255,255,0.9)",
                    }}
                  >
                    <span>{statusIcon[state.status]}</span>{" "}
                    <span className="font-bold">{t.symbol}</span>
                  </div>
                  {state.status === "changed" && state.score != null && (
                    <div className="text-[10px] mt-0.5" style={{ color: "#f9b116" }}>
                      score {state.score > 0 ? "+" : ""}
                      {state.score.toFixed(1)}
                    </div>
                  )}
                  {state.status === "scanning" && (
                    <div className="text-[10px] mt-0.5 text-white/50 animate-pulse">
                      scanning…
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary when done */}
          {done && summary && (
            <div className="border-t border-white/20 pt-3 flex flex-wrap gap-4 text-sm text-white/80">
              <span>✓ {summary.succeeded} succeeded</span>
              <span style={{ color: "#f9b116" }}>⚡ {summary.changed} changed</span>
              {summary.failed > 0 && (
                <span style={{ color: "#ef4444" }}>✗ {summary.failed} failed</span>
              )}
              {runId && (
                <a
                  href={`/run/${runId}`}
                  className="ml-auto text-white/60 hover:text-white underline underline-offset-2 text-xs"
                >
                  View run detail →
                </a>
              )}
            </div>
          )}

          {/* Done actions */}
          {done && (
            <div className="flex gap-3">
              <a
                href="/alerts"
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ background: "#f9b116", color: "#fff", fontWeight: 800 }}
              >
                View Alerts
              </a>
              <button
                onClick={() => { setDone(false); setTickers({}); setSummary(null); }}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white/70 hover:text-white border border-white/30"
              >
                Scan Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
