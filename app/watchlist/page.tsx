/**
 * /watchlist — My Watchlist
 * Displays user's saved tickers (US + ASX mix) with alert badges + a dedicated scan button.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { getWatchlist, getAlertSummaryMap } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import LiveScanProgress from "../components/LiveScanProgress";
import TickerSearch from "../components/TickerSearch";
import WatchlistButton from "../components/WatchlistButton";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login?redirect=/watchlist");
  }

  const items = await getWatchlist(user.userId);
  const alertMap = await getAlertSummaryMap();

  return (
    <div>
      {/* ── Hero ── */}
      <div
        className="w-full flex flex-col justify-center"
        style={{
          background: "linear-gradient(45deg, seagreen, darkseagreen)",
          paddingTop: "28px",
          paddingBottom: "28px",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 space-y-3">
          <h1 className="text-2xl font-bold text-white">⭐ My Watchlist</h1>
          <p className="text-white/80 text-sm font-medium">
            Spot language shifts on company websites before they move stock prices —{" "}
            <span className="text-white font-bold">9,000+ US &amp; ASX stocks</span>{" "}
            covered · powered by AI agents
          </p>
          <TickerSearch />

          <div className="flex gap-3 items-center flex-wrap">
            <Link
              href="/alerts?watchlist=true"
              className="px-6 py-2.5 rounded-lg font-bold uppercase tracking-wide transition-all hover:-translate-y-0.5"
              style={{ fontSize: "0.9rem", background: "#fd8412", color: "#fff" }}
            >
              ⚡ View My Alerts →
            </Link>
            <LiveScanProgress watchlist={true} heroButton />
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">

        {/* Empty state */}
        {items.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <div className="text-6xl">☆</div>
            <h2 className="text-2xl font-bold text-gray-600">Your watchlist is empty</h2>
            <p className="text-gray-400 text-lg max-w-md mx-auto">
              Search for a ticker above, visit any stock page, and click{" "}
              <strong>⭐ Add to Watchlist</strong> to start monitoring it.
            </p>
            <div className="flex justify-center gap-4 pt-4">
              <Link href="/"
                className="px-6 py-3 rounded-lg font-semibold text-white"
                style={{ background: "#2e8b57" }}>
                Browse US Stocks →
              </Link>
              <Link href="/asx"
                className="px-6 py-3 rounded-lg font-semibold text-white"
                style={{ background: "#6366f1" }}>
                Browse ASX Stocks →
              </Link>
            </div>
          </div>
        )}

        {/* Watchlist grid */}
        {items.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <span className="text-lg text-gray-400">
                {items.length} ticker{items.length !== 1 ? "s" : ""} · US &amp; ASX
              </span>
              <Link href="/alerts?watchlist=true" className="text-sm hover:underline font-medium" style={{ color: "#2e8b57" }}>
                View my alerts →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {items.map((item) => {
                const analysis = alertMap[item.symbol];
                const hasAlert = !!analysis;
                const confidence = analysis?.confidence ?? 0;
                const isAsx = item.exchange === "ASX";

                return (
                  <div
                    key={item.symbol}
                    className="relative rounded-xl px-4 pt-6 pb-4 transition-all duration-200 shadow-sm hover:-translate-y-0.5"
                    style={
                      hasAlert
                        ? { background: "#f0fff4", border: "1.5px solid #4ade80" }
                        : { background: "#ffffff", border: "1px solid #e5e7eb" }
                    }
                  >
                    {/* Alert score badge */}
                    {hasAlert && (
                      <span
                        className="absolute -top-2.5 -right-2.5 text-xs font-bold px-2 py-0.5 rounded-full shadow"
                        style={{ background: "#2e8b57", color: "#fff" }}
                      >
                        {analysis.alert_score > 0 ? "+" : ""}{analysis.alert_score.toFixed(1)}
                      </span>
                    )}

                    {/* Watchlist star — top-right */}
                    <div className="absolute top-1.5 right-1.5 z-10">
                      <WatchlistButton compact symbol={item.symbol} exchange={item.exchange ?? "US"} name={item.name ?? undefined} />
                    </div>

                    {/* Exchange badge */}
                    <div className="absolute top-2 left-2">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                        style={isAsx
                          ? { background: "#dbeafe", color: "#1e40af" }
                          : { background: "#f0fdf4", color: "#166534" }}>
                        {isAsx ? "🇦🇺" : "🇺🇸"}
                      </span>
                    </div>

                    {/* Ticker link */}
                    <Link href={`/ticker/${item.symbol}`} className="block group">
                      <div className="font-bold text-base text-brand group-hover:opacity-80">
                        {item.symbol}
                      </div>
                      <div className="text-gray-400 text-xs mt-0.5 truncate">
                        {item.name ?? item.symbol}
                      </div>
                    </Link>

                    {/* Alert detail */}
                    {hasAlert && (
                      <div className="mt-2 space-y-0.5">
                        <div className="text-xs font-medium" style={{ color: "#b45309" }}>
                          {analysis.changed_pct != null && analysis.changed_pct > 90
                            ? "Significant change"
                            : analysis.changed_pct != null
                            ? `${analysis.changed_pct.toFixed(1)}% changed`
                            : "—"}
                        </div>
                        <div className="text-xs text-gray-400">
                          conf {Math.round(confidence * 100)}%
                        </div>
                        <div className="text-xs text-gray-300 pt-0.5">
                          {new Date(analysis.fetched_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </div>
                      </div>
                    )}
                    {!hasAlert && (
                      <div className="mt-2">
                        <span className="text-xs text-gray-300">Not yet scanned</span>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* How watchlist scanning works */}
        <div className="border border-gray-200 rounded-2xl p-8 bg-white shadow-sm">
          <h3 className="font-bold text-xl text-[#252525] mb-4">
            ⭐ How Watchlist Scanning Works
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-base text-gray-500">
            <div>
              <div className="font-semibold text-gray-700 mb-2">Add Any Stock</div>
              Visit any US or ASX ticker page and click{" "}
              <strong>⭐ Add to Watchlist</strong>. Supports NASDAQ, NYSE, and ASX.
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-2">Scan On Demand</div>
              Click <strong>▶ Scan My Watchlist</strong> above to run the full AI pipeline
              on just your stocks — no full-universe scan needed.
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-2">US + ASX Mix</div>
              Freely mix US (NASDAQ/NYSE) and Australian (ASX) stocks. Each is fetched
              from the right source automatically.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
