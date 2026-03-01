"use client";

import { useState } from "react";
import Link from "next/link";
import { UNIVERSE } from "@/lib/universe";

export default function Home() {
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
      setResult(`Done. ${ok} succeeded, ${err} failed.`);
    } catch (e) {
      setResult(`Error: ${String(e)}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="text-center space-y-4 pt-8">
        <div className="inline-flex items-center gap-2 bg-brand-bg border border-brand rounded-full px-4 py-1 text-brand text-sm">
          <span className="w-2 h-2 rounded-full bg-brand animate-pulse inline-block" />
          Powered by TinyFish real-browser fetching
        </div>
        <h1 className="text-4xl font-bold text-[#252525]">
          Stock Website Change Radar
        </h1>
        <p className="text-gray-500 max-w-xl mx-auto text-lg">
          Monitors IR/News pages of 20 US small-cap companies. Detects wording
          shifts, scores language changes, and surfaces alerts with stock price
          context.
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Link
            href="/alerts"
            className="bg-brand-dark hover:bg-brand-darker text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            View Alerts →
          </Link>
          <button
            onClick={handleRun}
            disabled={running}
            className="border border-gray-300 hover:border-gray-500 text-gray-600 hover:text-[#252525] px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {running ? "Fetching pages…" : "Run Scan Now"}
          </button>
        </div>
        {result && (
          <p className="text-brand text-sm">{result}</p>
        )}
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { step: "1", label: "Fetch", desc: "TinyFish renders JS-heavy IR pages in a real browser" },
          { step: "2", label: "Store", desc: "Daily snapshots stored in SQLite with content hashing" },
          { step: "3", label: "Diff", desc: "Text diff detects added/removed language" },
          { step: "4", label: "Score", desc: "Commitment, hedging, and risk word shifts computed" },
        ].map((item) => (
          <div key={item.step} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="text-brand font-bold text-2xl mb-2">{item.step}</div>
            <div className="text-[#252525] font-semibold mb-1">{item.label}</div>
            <div className="text-gray-500 text-sm">{item.desc}</div>
          </div>
        ))}
      </div>

      {/* Universe */}
      <div>
        <h2 className="text-xl font-semibold text-[#252525] mb-4">Monitored Universe</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {UNIVERSE.map((t) => (
            <Link
              key={t.symbol}
              href={`/ticker/${t.symbol}`}
              className="bg-white border border-gray-200 hover:border-brand rounded-lg px-4 py-3 transition-colors group shadow-sm"
            >
              <div className="text-brand font-bold group-hover:text-brand-light">{t.symbol}</div>
              <div className="text-gray-400 text-xs mt-0.5 truncate">{t.name}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
