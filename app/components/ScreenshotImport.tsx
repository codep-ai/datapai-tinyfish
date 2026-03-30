"use client";

import { useState, useRef, useCallback } from "react";

interface Holding {
  ticker: string;
  exchange: string;
  shares: number | null;
  avg_cost: number | null;
  name: string | null;
  current_price: number | null;
  selected: boolean;
}

interface Props {
  mode: "watchlist" | "portfolio";
  onComplete?: () => void;
}

const EXCHANGES = ["US", "ASX", "HKEX", "SSE", "SZSE", "SET", "KLSE", "IDX", "HOSE", "LSE"];

type Phase = "idle" | "uploading" | "preview" | "saving" | "done";

export default function ScreenshotImport({ mode, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, WEBP)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Max 10MB.");
      return;
    }

    setError(null);
    setPhase("uploading");
    setPreview(URL.createObjectURL(file));

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/import-screenshot", { method: "POST", body: form });
      const data = await res.json();

      if (!data.ok || !data.holdings?.length) {
        setError(data.error || "No stocks found in this image. Try a clearer screenshot.");
        setPhase("idle");
        return;
      }

      setHoldings(data.holdings.map((h: any) => ({ ...h, selected: true })));
      setPhase("preview");
    } catch (err) {
      setError("Upload failed. Please try again.");
      setPhase("idle");
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleConfirm = useCallback(async () => {
    const selected = holdings.filter((h) => h.selected);
    if (!selected.length) return;

    setPhase("saving");
    let count = 0;

    for (const h of selected) {
      try {
        if (mode === "watchlist") {
          await fetch("/api/watchlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbol: h.ticker, exchange: h.exchange, name: h.name }),
          });
        } else {
          await fetch("/api/portfolio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ticker: h.ticker,
              exchange: h.exchange,
              shares: h.shares ?? 0,
              avg_cost: h.avg_cost ?? 0,
            }),
          });
        }
        count++;
      } catch {
        // Continue on individual failures
      }
    }

    setSavedCount(count);
    setPhase("done");
    if (onComplete) onComplete();
  }, [holdings, mode, onComplete]);

  const updateHolding = (idx: number, field: string, value: any) => {
    setHoldings((prev) => prev.map((h, i) => i === idx ? { ...h, [field]: value } : h));
  };

  // ── Idle: Upload Zone ──────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <div className="space-y-3">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-[#2e8b57] hover:bg-green-50/30 transition-colors"
        >
          <div className="text-4xl mb-2">📸</div>
          <p className="text-sm font-semibold text-gray-600">
            Drop a screenshot here, or click to upload
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Supports CommSec, Tiger, moomoo, Interactive Brokers, and more
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>
    );
  }

  // ── Uploading: Spinner ─────────────────────────────────────────────────
  if (phase === "uploading") {
    return (
      <div className="text-center py-12 space-y-4">
        {preview && (
          <img src={preview} alt="Screenshot" className="max-h-32 mx-auto rounded-lg shadow-sm opacity-50" />
        )}
        <div className="animate-spin text-3xl">⟳</div>
        <p className="text-sm text-gray-500">Analyzing screenshot with AI...</p>
      </div>
    );
  }

  // ── Preview: Editable Table ────────────────────────────────────────────
  if (phase === "preview") {
    const selectedCount = holdings.filter((h) => h.selected).length;
    return (
      <div className="space-y-4">
        {preview && (
          <img src={preview} alt="Screenshot" className="max-h-24 mx-auto rounded-lg shadow-sm" />
        )}
        <p className="text-sm text-gray-500 text-center">
          Found <strong>{holdings.length}</strong> stocks. Review and edit before adding.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="px-2 py-2 w-8"></th>
                <th className="px-2 py-2">Ticker</th>
                <th className="px-2 py-2">Exchange</th>
                {mode === "portfolio" && <th className="px-2 py-2">Shares</th>}
                {mode === "portfolio" && <th className="px-2 py-2">Avg Cost</th>}
                <th className="px-2 py-2">Name</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h, i) => (
                <tr key={i} className={`border-b ${h.selected ? "" : "opacity-40"}`}>
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={h.selected}
                      onChange={(e) => updateHolding(i, "selected", e.target.checked)}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={h.ticker}
                      onChange={(e) => updateHolding(i, "ticker", e.target.value.toUpperCase())}
                      className="w-20 border rounded px-2 py-1 text-xs font-mono"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={h.exchange}
                      onChange={(e) => updateHolding(i, "exchange", e.target.value)}
                      className="border rounded px-2 py-1 text-xs"
                    >
                      {EXCHANGES.map((ex) => <option key={ex} value={ex}>{ex}</option>)}
                    </select>
                  </td>
                  {mode === "portfolio" && (
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={h.shares ?? ""}
                        onChange={(e) => updateHolding(i, "shares", e.target.value ? Number(e.target.value) : null)}
                        className="w-20 border rounded px-2 py-1 text-xs"
                        placeholder="0"
                      />
                    </td>
                  )}
                  {mode === "portfolio" && (
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={h.avg_cost ?? ""}
                        onChange={(e) => updateHolding(i, "avg_cost", e.target.value ? Number(e.target.value) : null)}
                        className="w-24 border rounded px-2 py-1 text-xs"
                        placeholder="0.00"
                      />
                    </td>
                  )}
                  <td className="px-2 py-2 text-xs text-gray-400 truncate max-w-[150px]">
                    {h.name ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: "#2e8b57" }}
          >
            Add {selectedCount} to {mode === "watchlist" ? "Watchlist" : "Portfolio"}
          </button>
          <button
            onClick={() => { setPhase("idle"); setHoldings([]); setPreview(null); setError(null); }}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-gray-500 border border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Saving ─────────────────────────────────────────────────────────────
  if (phase === "saving") {
    return (
      <div className="text-center py-8">
        <div className="animate-spin text-2xl mb-3">⟳</div>
        <p className="text-sm text-gray-500">Adding stocks...</p>
      </div>
    );
  }

  // ── Done ───────────────────────────────────────────────────────────────
  return (
    <div className="text-center py-8 space-y-4">
      <div className="text-4xl">✓</div>
      <p className="text-sm font-semibold text-[#2e8b57]">
        Added {savedCount} stocks to your {mode}!
      </p>
      <button
        onClick={() => { setPhase("idle"); setHoldings([]); setPreview(null); setSavedCount(0); }}
        className="px-4 py-2 rounded-lg text-sm text-gray-500 border border-gray-300 hover:bg-gray-50"
      >
        Import another screenshot
      </button>
    </div>
  );
}
