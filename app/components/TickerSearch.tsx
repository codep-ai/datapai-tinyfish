"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function TickerSearch() {
  const [symbol, setSymbol] = useState("");
  const [market, setMarket] = useState<"US" | "ASX">("US");
  const router = useRouter();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const clean = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!clean) return;
    const path = market === "ASX" ? `/asx/${clean}` : `/ticker/${clean}`;
    router.push(path);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-wrap">
      {/* Market toggle */}
      <div className="flex rounded-lg overflow-hidden border border-white/30 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setMarket("US")}
          className="px-3 py-2 transition-colors"
          style={{
            background: market === "US" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.15)",
            color: "#fff",
          }}
        >
          🇺🇸 US
        </button>
        <button
          type="button"
          onClick={() => setMarket("ASX")}
          className="px-3 py-2 transition-colors"
          style={{
            background: market === "ASX" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.15)",
            color: "#fff",
          }}
        >
          🇦🇺 ASX
        </button>
      </div>

      {/* Symbol input */}
      <input
        type="text"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
        placeholder={market === "ASX" ? "e.g. BHP, CBA, CSL" : "e.g. AAPL, NVDA, TSLA"}
        maxLength={6}
        className="rounded-lg px-4 py-2 text-[#252525] font-bold text-base placeholder:font-normal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
        style={{ width: "200px", background: "rgba(255,255,255,0.95)" }}
      />

      {/* Submit */}
      <button
        type="submit"
        className="px-5 py-2 rounded-lg font-bold text-white uppercase tracking-wide text-sm transition-all hover:brightness-110 hover:-translate-y-0.5"
        style={{ background: "#fd8412" }}
      >
        Analyse →
      </button>
    </form>
  );
}
