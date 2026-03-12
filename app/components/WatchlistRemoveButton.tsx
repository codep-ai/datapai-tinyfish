"use client";

import { useState } from "react";

export default function WatchlistRemoveButton({ symbol }: { symbol: string }) {
  const [removed, setRemoved] = useState(false);
  const [loading, setLoading] = useState(false);

  if (removed) return null;

  async function handleRemove() {
    setLoading(true);
    try {
      const res = await fetch(`/api/watchlist/${symbol}`, { method: "DELETE" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      setRemoved(true);
    } catch (err) {
      console.error("Remove watchlist error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleRemove}
      disabled={loading}
      className="mt-2 text-[10px] text-gray-300 hover:text-red-400 transition-colors disabled:opacity-50"
      title={`Remove ${symbol} from watchlist`}
    >
      {loading ? "⟳" : "✕"} Remove
    </button>
  );
}
