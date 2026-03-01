"use client";

import { useState } from "react";

export default function RunScanButton() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/run", { method: "POST" });
      const data = await res.json();
      const ok = data.results?.filter((r: { status: string }) => r.status === "ok").length ?? 0;
      const err = data.results?.filter((r: { status: string }) => r.status === "error").length ?? 0;
      setResult(`Done — ${ok} succeeded, ${err} failed. Refresh to see updated scores.`);
    } catch (e) {
      setResult(`Error: ${String(e)}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleRun}
        disabled={running}
        className="border border-white/60 text-white hover:bg-white/10 px-6 py-2.5 rounded font-semibold uppercase tracking-wide text-sm transition-all duration-300 disabled:opacity-50"
        style={{
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => {
          if (!running) {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 6px rgba(0,0,0,.2)";
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "";
        }}
      >
        {running ? "Scanning pages…" : "Run Scan Now"}
      </button>
      {result && <p className="text-white/80 text-xs max-w-sm text-center">{result}</p>}
    </div>
  );
}
