"use client";

import { useState, useRef, useEffect, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  sector: string | null;
  price?: number | null;
  change_1d_pct?: number | null;
  change_1m_pct?: number | null;
  volume?: number | null;
}

export default function TickerSearch({
  placeholder,
  intelMode = false,
  onAddToWatchlist,
  showWatchlistAction = false,
}: {
  placeholder?: string;
  intelMode?: boolean;
  onAddToWatchlist?: (symbol: string, exchange: string, name: string) => void;
  showWatchlistAction?: boolean;
} = {}) {
  const [query, setQuery] = useState("");
  const [market, setMarket] = useState<"US" | "ASX">("US");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [addedTickers, setAddedTickers] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const router = useRouter();

  // Default watchlist add handler (calls API directly)
  const handleAddToWatchlist = onAddToWatchlist ?? (async (symbol: string, exchange: string, name: string) => {
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, exchange, name }),
      });
      if (res.ok) {
        setAddedTickers((prev) => new Set(prev).add(`${symbol}:${exchange}`));
      }
    } catch { /* ignore */ }
  });

  // Debounced search
  const doSearch = useCallback(
    (q: string, ex: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (q.length < 1) {
        setResults([]);
        setIsOpen(false);
        return;
      }
      setLoading(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `/api/stocks/lookup?q=${encodeURIComponent(q)}&exchange=${ex}`
          );
          if (res.ok) {
            const data = await res.json();
            setResults(data.results ?? []);
            setIsOpen(true);
            setSelectedIdx(-1);
          }
        } catch {
          /* ignore */
        } finally {
          setLoading(false);
        }
      }, 200);
    },
    []
  );

  useEffect(() => {
    doSearch(query, market);
  }, [query, market, doSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function navigateTo(r: SearchResult) {
    const path =
      intelMode
        ? `/ticker/${r.symbol}/intel`
        : r.exchange === "ASX"
        ? `/asx/${r.symbol.replace(".AX", "")}`
        : `/ticker/${r.symbol}`;
    setIsOpen(false);
    setQuery("");
    router.push(path);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (selectedIdx >= 0 && results[selectedIdx]) {
      navigateTo(results[selectedIdx]);
      return;
    }
    const clean = query.trim().toUpperCase().replace(/[^A-Z0-9.]/g, "");
    if (!clean) return;
    const path =
      intelMode
        ? `/ticker/${clean}/intel`
        : market === "ASX"
        ? `/asx/${clean}`
        : `/ticker/${clean}`;
    setIsOpen(false);
    setQuery("");
    router.push(path);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  const fmtPrice = (n: number | null | undefined) =>
    n != null ? `$${n.toFixed(2)}` : "";
  const fmtPct = (n: number | null | undefined) =>
    n != null ? `${n >= 0 ? "+" : ""}${n.toFixed(1)}%` : "";
  const fmtVol = (n: number | null | undefined) => {
    if (n == null) return "";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return `${n}`;
  };

  return (
    <div ref={containerRef} className="relative" style={{ minWidth: 360 }}>
      <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-wrap">
        {/* Market toggle */}
        <div className="flex rounded-lg overflow-hidden border border-white/30 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setMarket("US")}
            className="px-3 py-2 transition-colors"
            style={{
              background:
                market === "US" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.15)",
              color: "#fff",
            }}
          >
            US
          </button>
          <button
            type="button"
            onClick={() => setMarket("ASX")}
            className="px-3 py-2 transition-colors"
            style={{
              background:
                market === "ASX" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.15)",
              color: "#fff",
            }}
          >
            ASX
          </button>
        </div>

        {/* Symbol / company name input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value.toUpperCase())}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={
            placeholder ??
            (market === "ASX"
              ? "Search ticker or company name..."
              : "Search ticker or company name...")
          }
          className="rounded-lg px-4 py-2 text-[#252525] font-bold text-base placeholder:font-normal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
          style={{ width: 280, background: "rgba(255,255,255,0.95)" }}
          autoComplete="off"
        />

        {/* Submit */}
        <button
          type="submit"
          className="px-5 py-2 rounded-lg font-bold text-white uppercase tracking-wide text-sm transition-all hover:brightness-110 hover:-translate-y-0.5"
          style={{ background: "#fd8412" }}
        >
          {loading ? "..." : "Analyse"}
        </button>
      </form>

      {/* Autocomplete dropdown */}
      {isOpen && results.length > 0 && (
        <div
          className="absolute z-50 mt-1 w-full max-h-[400px] overflow-y-auto rounded-xl shadow-2xl border border-gray-200"
          style={{ background: "#fff", left: 0, minWidth: 500 }}
        >
          {results.map((r, idx) => (
            <div
              key={`${r.symbol}-${r.exchange}`}
              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors border-b border-gray-50 ${
                idx === selectedIdx ? "bg-orange-50" : "hover:bg-gray-50"
              }`}
              onClick={() => navigateTo(r)}
              onMouseEnter={() => setSelectedIdx(idx)}
            >
              {/* Ticker badge */}
              <div className="flex-shrink-0 w-[70px]">
                <span
                  className="inline-block px-2 py-0.5 rounded text-xs font-bold"
                  style={{
                    background: r.exchange === "ASX" ? "#dbeafe" : "#f0fdf4",
                    color: r.exchange === "ASX" ? "#1e40af" : "#166534",
                  }}
                >
                  {r.symbol.replace(".AX", "")}
                </span>
              </div>

              {/* Company name + sector */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-800 truncate">
                  {r.name}
                </div>
                <div className="text-[10px] text-gray-400 truncate">
                  {r.exchange}
                  {r.sector ? ` · ${r.sector}` : ""}
                </div>
              </div>

              {/* Price info */}
              <div className="flex-shrink-0 text-right" style={{ minWidth: 90 }}>
                {r.price != null && (
                  <>
                    <div className="text-sm font-bold text-gray-800">
                      {fmtPrice(r.price)}
                    </div>
                    <div
                      className="text-[10px] font-semibold"
                      style={{
                        color:
                          (r.change_1d_pct ?? 0) >= 0 ? "#16a34a" : "#dc2626",
                      }}
                    >
                      {fmtPct(r.change_1d_pct)}
                      {r.volume != null && (
                        <span className="text-gray-400 ml-1">
                          vol {fmtVol(r.volume)}
                        </span>
                      )}
                    </div>
                  </>
                )}
                {r.price == null && (
                  <span className="text-[10px] text-gray-300">no price</span>
                )}
              </div>

              {/* Watchlist quick-add button */}
              {showWatchlistAction && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToWatchlist(r.symbol, r.exchange, r.name);
                  }}
                  className="flex-shrink-0 px-2 py-1 rounded text-[10px] font-bold transition-colors"
                  style={
                    addedTickers.has(`${r.symbol}:${r.exchange}`)
                      ? { color: "#fff", background: "#16a34a", border: "1px solid #16a34a" }
                      : { color: "#fd8412", border: "1px solid #fd8412" }
                  }
                  title={addedTickers.has(`${r.symbol}:${r.exchange}`) ? "Added!" : "Add to watchlist"}
                  disabled={addedTickers.has(`${r.symbol}:${r.exchange}`)}
                >
                  {addedTickers.has(`${r.symbol}:${r.exchange}`) ? "Added" : "+ Watch"}
                </button>
              )}
            </div>
          ))}
          <div className="px-4 py-1.5 text-[10px] text-gray-400 text-center border-t">
            {results.length} results · Search by ticker or company name
          </div>
        </div>
      )}

      {/* No results message */}
      {isOpen && results.length === 0 && query.length >= 2 && !loading && (
        <div
          className="absolute z-50 mt-1 w-full rounded-xl shadow-lg border border-gray-200 px-4 py-3 text-sm text-gray-500 text-center"
          style={{ background: "#fff" }}
        >
          No stocks found for &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}
