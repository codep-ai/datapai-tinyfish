"use client";

import { useState, useEffect, useRef } from "react";

interface TickerInfo {
  symbol: string;
  name: string;
  exchange: string;
}

type TickerStatus = "pending" | "scanning" | "completed" | "failed";

interface TickerState {
  status: TickerStatus;
  score?: number;
  confidence?: number;
  currentStep?: string;
  changed?: boolean;
}

interface ScanEvent {
  ticker: string;
  step: string;
  status: "start" | "done" | "error";
  message?: string;
}

interface RunData {
  status: string;
  planned_count: number;
  completed_count: number;
  changed_count: number;
  failed_count: number;
  scanned_count: number;
}

interface SnapshotRow {
  ticker: string;
  alert_score: number | null;
  confidence: number | null;
  changed_pct: number | null;
}

interface WatchlistApiItem {
  symbol: string;
  exchange: string;
  name: string | null;
  added_at: string;
}

const STEPS = [
  "Fetching page",
  "Extracting content",
  "Cleaning text",
  "Computing diff",
  "Running AI analysis",
];

export default function LiveScanProgress({
  exchange,
  watchlist,
  heroButton,
}: {
  exchange?: "ASX" | "US";
  watchlist?: boolean;
  heroButton?: boolean; // solid orange CTA style, for inline placement alongside other buttons
}) {
  // Fetch universe dynamically from the API (watchlist or active stocks by exchange)
  const [dynamicUniverse, setDynamicUniverse] = useState<TickerInfo[]>([]);
  const [universeLoaded, setUniverseLoaded] = useState(false);

  useEffect(() => {
    if (watchlist) {
      // Fetch watchlist stocks
      fetch("/api/watchlist")
        .then((r) => r.json())
        .then((data) => {
          const items: WatchlistApiItem[] = data.items ?? [];
          const tickers: TickerInfo[] = items.map((item) => ({
            symbol: item.symbol,
            name: item.name ?? item.symbol,
            exchange: item.exchange,
          }));
          setDynamicUniverse(tickers);
          setUniverseLoaded(true);
        })
        .catch(() => setUniverseLoaded(true));
    } else {
      // Fetch active stocks from DB via the stocks API
      const exchangeParam = exchange ? `&exchange=${exchange}` : "";
      fetch(`/api/stocks/active?limit=500${exchangeParam}`)
        .then((r) => r.json())
        .then((data) => {
          const stocks: TickerInfo[] = (data.stocks ?? []).map((s: Record<string, string>) => ({
            symbol: s.symbol,
            name: s.name ?? s.symbol,
            exchange: s.exchange ?? "US",
          }));
          setDynamicUniverse(stocks);
          setUniverseLoaded(true);
        })
        .catch(() => setUniverseLoaded(true));
    }
  }, [watchlist, exchange]);

  const universe = dynamicUniverse;
  const isReady = universeLoaded;

  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [runId, setRunId] = useState<string | null>(null);
  const [tickers, setTickers] = useState<Record<string, TickerState>>({});
  const [run, setRun] = useState<RunData | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function poll(id: string) {
    try {
      const res = await fetch(`/api/run/${id}`);
      if (!res.ok) return;
      const data = await res.json() as { run: RunData; snapshots: SnapshotRow[]; scanEvents: ScanEvent[] };

      setRun(data.run);

      // Build ticker state from scan_events + snapshots
      const newTickers: Record<string, TickerState> = {};
      for (const t of universe) {
        newTickers[t.symbol] = { status: "pending" };
      }

      // Apply scan events to determine current step
      const tickerSteps: Record<string, { step: string; status: string }> = {};
      for (const ev of (data.scanEvents || [])) {
        tickerSteps[ev.ticker] = { step: ev.step, status: ev.status };
        if (newTickers[ev.ticker]) {
          newTickers[ev.ticker] = {
            ...newTickers[ev.ticker],
            status: ev.status === "error" ? "failed" : "scanning",
            currentStep: ev.step,
          };
        }
      }

      // Apply completed snapshots
      for (const snap of (data.snapshots || [])) {
        const lastEvent = tickerSteps[snap.ticker];
        const isChanged = snap.changed_pct != null && snap.changed_pct > 0;
        newTickers[snap.ticker] = {
          status: lastEvent?.status === "error" ? "failed" : "completed",
          score: snap.alert_score ?? undefined,
          confidence: snap.confidence ?? undefined,
          changed: isChanged,
          currentStep: lastEvent?.step,
        };
      }

      setTickers(newTickers);

      // Stop polling when run is done
      if (data.run.status === "SUCCESS" || data.run.status === "FAILED") {
        stopPolling();
        setPhase("done");
      }
    } catch (err) {
      console.error("Poll error:", err);
    }
  }

  async function startScan() {
    // For watchlist mode, refresh the watchlist universe right before scanning
    let scanUniverse = universe;
    if (watchlist) {
      try {
        const r = await fetch("/api/watchlist");
        const data = await r.json();
        const items: WatchlistApiItem[] = data.items ?? [];
        scanUniverse = items.map((item) => ({
          symbol: item.symbol,
          name: item.name ?? item.symbol,
          exchange: item.exchange,
        }));
        setDynamicUniverse(scanUniverse);
      } catch { /* use existing */ }
    }

    setPhase("running");
    setRun(null);
    const initial: Record<string, TickerState> = {};
    for (const t of scanUniverse) initial[t.symbol] = { status: "pending" };
    setTickers(initial);

    try {
      const url = watchlist
        ? "/api/run?watchlist=true"
        : exchange ? `/api/run?exchange=${exchange}` : "/api/run";
      const res = await fetch(url, { method: "POST" });
      const data = await res.json() as { runId: string };
      setRunId(data.runId);

      // Poll every 2 seconds
      pollRef.current = setInterval(() => poll(data.runId), 2000);
      poll(data.runId); // immediate first poll
    } catch (err) {
      console.error("Start scan error:", err);
      setPhase("idle");
    }
  }

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), []);

  const completedCount = Object.values(tickers).filter(
    (t) => t.status === "completed" || t.status === "failed"
  ).length;
  const total = run?.planned_count || universe.length;
  const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const isDone = phase === "done";

  const statusIcon: Record<TickerStatus, string> = {
    pending: "○",
    scanning: "⟳",
    completed: "✓",
    failed: "✗",
  };

  const statusColor: Record<TickerStatus, string> = {
    pending: "#d1d5db",
    scanning: "#fd8412",
    completed: "#2e8b57",
    failed: "#ef4444",
  };

  return (
    <div className={heroButton ? "space-y-4" : "w-full space-y-4"}>
      {/* Trigger button */}
      {phase === "idle" && (
        <>
          {watchlist && !universeLoaded ? (
            <button disabled className="px-6 py-3 rounded-lg font-semibold text-white/50 cursor-wait"
              style={{ background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.3)" }}>
              ⟳ Loading watchlist...
            </button>
          ) : watchlist && universe.length === 0 ? (
            <div className="text-white/60 text-sm py-2">
              ☆ Your watchlist is empty — add stocks using the ⭐ button on any ticker page.
            </div>
          ) : (
            <button
              onClick={startScan}
              className="px-6 py-3 rounded-lg font-bold uppercase tracking-wide transition-all hover:-translate-y-0.5"
              style={heroButton
                ? { fontSize: "0.9rem", background: "#fd8412", color: "#fff" }
                : { background: "rgba(255,255,255,0.2)", border: "1.5px solid rgba(255,255,255,0.6)", color: "#fff", fontWeight: 600 }
              }
            >
              ▶ {watchlist ? `Scan My Watchlist (${universe.length})` : "Run Live Scan"}
            </button>
          )}
        </>
      )}

      {/* Running button (disabled) */}
      {phase === "running" && (
        <button
          disabled
          className="px-6 py-3 rounded-lg font-semibold text-white/60 cursor-not-allowed"
          style={{ background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.3)" }}
        >
          ⟳ Scanning...
        </button>
      )}

      {/* Progress panel */}
      {(phase === "running" || phase === "done") && (
        <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm space-y-4 text-left max-w-2xl mx-auto">
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background: isDone ? "#2e8b57" : "#fd8412",
                }}
              />
            </div>
            <span className="text-white/80 text-sm font-mono">
              {completedCount}/{total}
            </span>
          </div>

          {/* Ticker grid */}
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
            {universe.map((t) => {
              const state = tickers[t.symbol] ?? { status: "pending" };
              const isChanged = state.status === "completed" && state.changed;
              return (
                <div
                  key={t.symbol}
                  className="rounded px-2 py-1.5 text-center"
                  style={{
                    background:
                      isChanged
                        ? "rgba(249,177,22,0.25)"
                        : state.status === "failed"
                        ? "rgba(239,68,68,0.2)"
                        : "rgba(255,255,255,0.1)",
                  }}
                >
                  <div
                    className="text-xs font-mono"
                    style={{ color: statusColor[state.status] }}
                  >
                    <span>{statusIcon[state.status]}</span>{" "}
                    <span className="font-bold text-white/90">{t.symbol}</span>
                    {t.exchange === "ASX" && (
                      <span className="ml-0.5 text-[8px] text-white/40">AU</span>
                    )}
                  </div>
                  {state.status === "scanning" && state.currentStep && (
                    <div className="text-[9px] mt-0.5 text-white/50 animate-pulse truncate">
                      {state.currentStep}
                    </div>
                  )}
                  {isChanged && state.score != null && (
                    <div className="text-[10px] mt-0.5" style={{ color: "#fd8412" }}>
                      {state.score > 0 ? "+" : ""}{state.score.toFixed(1)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Step legend */}
          {phase === "running" && (
            <div className="text-[10px] text-white/40 flex flex-wrap gap-x-4 gap-y-1">
              {STEPS.map((s) => (
                <span key={s}>· {s}</span>
              ))}
            </div>
          )}

          {/* Summary when done */}
          {isDone && run && (
            <div className="border-t border-white/20 pt-3 flex flex-wrap gap-4 text-sm text-white/80">
              <span>✓ {run.scanned_count} scanned</span>
              <span style={{ color: "#fd8412" }}>⚡ {run.changed_count} changed</span>
              {run.failed_count > 0 && (
                <span style={{ color: "#ef4444" }}>✗ {run.failed_count} failed</span>
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
          {isDone && (
            <div className="flex gap-3">
              <a
                href="/alerts"
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ background: "#fd8412", color: "#fff", fontWeight: 800 }}
              >
                View Alerts
              </a>
              <button
                onClick={() => { setPhase("idle"); setTickers({}); setRun(null); setRunId(null); stopPolling(); }}
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
