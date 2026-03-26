"use client";

import { useState, useEffect, useRef } from "react";

const STEPS = [
  "Fetching page",
  "Extracting content",
  "Cleaning text",
  "Computing diff",
  "Running full pipeline",
  "Running AI analysis",
];

interface ScanEvent {
  step: string;
  status: "start" | "done" | "error";
  message?: string;
}

interface RunData {
  status: string;
  scanned_count: number;
  changed_count: number;
  failed_count: number;
}

interface Props {
  symbol: string;
  /** True if already in UNIVERSE_ALL (show as "Re-scan"); false = first-time scan */
  isMonitored?: boolean;
  /** Source URL the scan will use (shown below progress) */
  resolvedUrl?: string;
  rescanLabel?: string;
  scanLabel?: string;
  /** Exchange for linking back to ticker page with disambiguation */
  exchange?: string;
}

export default function TickerScanButton({ symbol, isMonitored = false, resolvedUrl, rescanLabel, scanLabel, exchange }: Props) {
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">("idle");
  const [runId, setRunId] = useState<string | null>(null);
  const [steps, setSteps] = useState<{ step: string; status: string; message?: string }[]>([]);
  const [run, setRun] = useState<RunData | null>(null);
  const [scanUrl, setScanUrl] = useState<string>(resolvedUrl ?? "");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  async function poll(id: string) {
    try {
      const res = await fetch(`/api/run/${id}`);
      if (!res.ok) return;
      const data = await res.json() as { run: RunData; scanEvents: ScanEvent[] };

      setRun(data.run);

      // Collect latest step events for this ticker
      const seen = new Map<string, { step: string; status: string; message?: string }>();
      for (const ev of (data.scanEvents || [])) {
        seen.set(ev.step, { step: ev.step, status: ev.status, message: ev.message });
      }
      setSteps(Array.from(seen.values()));

      if (data.run.status === "SUCCESS" || data.run.status === "FAILED") {
        stopPolling();
        setPhase(data.run.status === "SUCCESS" ? "done" : "error");
      }
    } catch {}
  }

  async function startScan() {
    setPhase("running");
    setSteps([]);
    setRun(null);
    try {
      const res = await fetch(`/api/ticker/${symbol}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { runId: string; resolvedUrl: string; name: string };
      setRunId(data.runId);
      if (data.resolvedUrl) setScanUrl(data.resolvedUrl);
      pollRef.current = setInterval(() => poll(data.runId), 2000);
      poll(data.runId);
    } catch (err) {
      console.error("Scan failed:", err);
      setPhase("error");
    }
  }

  useEffect(() => () => stopPolling(), []);

  const stepIcon = (status: string) =>
    status === "done" ? "✓" : status === "error" ? "✗" : "⟳";
  const stepColor = (status: string) =>
    status === "done" ? "#2e8b57" : status === "error" ? "#ef4444" : "#fd8412";

  // ── Idle ────────────────────────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <button
        onClick={startScan}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-white text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
        style={{ background: isMonitored ? "rgba(255,255,255,0.18)" : "#2e8b57", border: isMonitored ? "1.5px solid rgba(255,255,255,0.5)" : "none" }}
      >
        {isMonitored ? `🔄 ${rescanLabel ?? "Re-scan"}` : `⚡ ${scanLabel ?? "Scan This Stock"}`}
      </button>
    );
  }

  // ── Running / Done / Error ───────────────────────────────────────────────────
  return (
    <div
      className="rounded-2xl p-5 space-y-4 text-left"
      style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.2)", maxWidth: "520px" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        {phase === "running" && (
          <span className="text-white font-bold text-sm animate-pulse">⟳ Scanning {symbol}…</span>
        )}
        {phase === "done" && (
          <span className="text-white font-bold text-sm">✓ Scan complete</span>
        )}
        {phase === "error" && (
          <span className="font-bold text-sm" style={{ color: "#ef4444" }}>✗ Scan failed</span>
        )}
      </div>

      {/* Step-by-step progress */}
      <div className="space-y-1.5">
        {STEPS.map((s) => {
          const ev = steps.find((e) => e.step === s);
          const status = ev?.status ?? "pending";
          if (status === "pending" && phase === "running") {
            // Only show upcoming steps dimly while running
            const lastDoneIdx = STEPS.map((st) => steps.find((e) => e.step === st)?.status).lastIndexOf("done");
            const thisIdx = STEPS.indexOf(s);
            if (thisIdx > lastDoneIdx + 1) return null;
          }
          return (
            <div key={s} className="flex items-start gap-2 text-sm">
              <span
                className="mt-0.5 text-xs font-bold w-4 shrink-0"
                style={{ color: ev ? stepColor(status) : "rgba(255,255,255,0.25)" }}
              >
                {ev ? stepIcon(status) : "○"}
              </span>
              <div>
                <span style={{ color: ev ? "#fff" : "rgba(255,255,255,0.4)" }}>{s}</span>
                {ev?.message && (
                  <span className="ml-2 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {ev.message}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Source URL */}
      {scanUrl && (
        <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
          Source: {scanUrl}
        </p>
      )}

      {/* Run summary */}
      {run && phase === "done" && (
        <div className="border-t border-white/20 pt-3 flex flex-wrap gap-4 text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
          {run.changed_count > 0
            ? <span style={{ color: "#fd8412" }}>⚡ Change detected</span>
            : <span>No significant change vs. last snapshot</span>
          }
        </div>
      )}

      {/* Actions when done */}
      {(phase === "done" || phase === "error") && (
        <div className="flex gap-2 flex-wrap pt-1">
          {phase === "done" && (
            <button
              onClick={() => { window.location.href = `/ticker/${symbol}${exchange ? `?exchange=${exchange}` : ""}`; }}
              className="px-4 py-2 rounded-lg text-sm font-bold text-white transition-all hover:-translate-y-0.5"
              style={{ background: "#fd8412" }}
            >
              View Results →
            </button>
          )}
          <button
            onClick={() => { setPhase("idle"); setSteps([]); setRun(null); setRunId(null); stopPolling(); }}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-white/30 text-white/70 hover:text-white"
          >
            {phase === "error" ? "Retry" : "Scan Again"}
          </button>
        </div>
      )}

      {runId && (
        <a
          href={`/run/${runId}`}
          className="block text-[11px] underline underline-offset-2"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          View full run log →
        </a>
      )}
    </div>
  );
}
