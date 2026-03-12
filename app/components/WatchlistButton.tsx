"use client";

import { useState, useEffect } from "react";

interface WatchlistButtonProps {
  symbol: string;
  exchange?: string;
  name?: string;
  compact?: boolean; // icon-only mode for stock grid cards
}

type AuthState = "loading" | "unauthenticated" | "authenticated";

export default function WatchlistButton({ symbol, exchange = "US", name, compact }: WatchlistButtonProps) {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [inWatchlist, setInWatchlist] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/watchlist")
      .then((r) => {
        if (r.status === 401) {
          setAuthState("unauthenticated");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setAuthState("authenticated");
        const items: { symbol: string }[] = data.items ?? [];
        setInWatchlist(items.some((i) => i.symbol === symbol));
      })
      .catch(() => setAuthState("unauthenticated"));
  }, [symbol]);

  async function toggle() {
    if (authState !== "authenticated") return;
    setLoading(true);
    try {
      if (inWatchlist) {
        const res = await fetch(`/api/watchlist/${symbol}`, { method: "DELETE" });
        if (res.status === 401) { window.location.href = "/login"; return; }
        setInWatchlist(false);
      } else {
        const res = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol, exchange, name }),
        });
        if (res.status === 401) { window.location.href = "/login"; return; }
        setInWatchlist(true);
      }
    } catch (err) {
      console.error("Watchlist toggle error:", err);
    } finally {
      setLoading(false);
    }
  }

  // ── Compact (icon-only) mode for stock grid cards ──────────────────────
  if (compact) {
    if (authState === "loading") {
      return (
        <span className="flex items-center justify-center w-7 h-7 text-base text-gray-300 select-none" title="Loading…">
          ☆
        </span>
      );
    }
    if (authState === "unauthenticated") {
      return (
        <a
          href="/login"
          title="Log in to add to your watchlist"
          className="flex items-center justify-center w-7 h-7 text-base text-gray-400 hover:text-indigo-500 transition-colors"
        >
          ☆
        </a>
      );
    }
    return (
      <button
        onClick={toggle}
        disabled={loading}
        title={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
        className="flex items-center justify-center w-7 h-7 text-base transition-all hover:scale-125 disabled:opacity-50"
        style={{ color: inWatchlist ? "#d97706" : "#9ca3af" }}
      >
        {loading ? "⟳" : inWatchlist ? "⭐" : "☆"}
      </button>
    );
  }

  // ── Full mode ────────────────────────────────────────────────────────────

  // Not logged in → prompt to login
  if (authState === "unauthenticated") {
    return (
      <a
        href="/login"
        className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-4 py-2 transition-all duration-200 hover:-translate-y-0.5"
        style={{ background: "#f5f3ff", color: "#6366f1", border: "1.5px solid #c4b5fd" }}
        title="Log in to add to your watchlist"
      >
        🔐 Log in to Watch
      </a>
    );
  }

  // Loading skeleton
  if (authState === "loading") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg opacity-30 select-none"
        style={{ background: "#f3f4f6", color: "#9ca3af", border: "1.5px solid #e5e7eb" }}
      >
        ☆ Watch
      </span>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={inWatchlist ? "Remove from My Watchlist" : "Add to My Watchlist"}
      className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-4 py-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
      style={
        inWatchlist
          ? { background: "rgba(255,255,255,0.18)", color: "#ffffff", border: "1.5px solid rgba(255,255,255,0.5)" }
          : { background: "#f9fafb", color: "#374151", border: "1.5px solid #d1d5db" }
      }
    >
      {loading ? (
        <span className="animate-spin text-base">⟳</span>
      ) : inWatchlist ? (
        <span>⭐</span>
      ) : (
        <span>☆</span>
      )}
      {inWatchlist ? "Watching" : "Add to Watchlist"}
    </button>
  );
}
