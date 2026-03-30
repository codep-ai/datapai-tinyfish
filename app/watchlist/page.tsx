/**
 * /watchlist — My Watchlist
 * Displays user's saved tickers (US + ASX mix) with prices, change %, alert badges + scan button.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { getWatchlist, getAlertSummaryMap, getLatestPricesForWatchlist, getMaterialEventsForTickers, getStockSynthesisFlexible, lookupStock, getUserById, type StockSynthesis } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { getLang } from "@/lib/getLang";
import { loadTranslations } from "@/lib/i18n";
import { t } from "@/lib/translations";
import LiveScanProgress from "../components/LiveScanProgress";
import TickerSearch from "../components/TickerSearch";
import WatchlistButton from "../components/WatchlistButton";
import EarlySupporterBadge from "../components/EarlySupporterBadge";
import { BreakingNewsBadge } from "../components/BreakingNewsAlert";
import StockViewToggle from "../components/StockViewToggle";
import ConvertedPrice from "../components/ConvertedPrice";
import ScreenshotImport from "../components/ScreenshotImport";

export const dynamic = "force-dynamic";

/** Translate BUY/SELL/HOLD/STRONG_BUY/STRONG_SELL direction labels */
const DIR_LABEL_KEY: Record<string, string> = {
  BUY: "signal_buy", SELL: "signal_sell", HOLD: "signal_hold",
  STRONG_BUY: "signal_strong_buy", STRONG_SELL: "signal_strong_sell",
};
function dirLabel(dir: string, labels: Record<string, string>): string {
  return labels[DIR_LABEL_KEY[dir] ?? ""] ?? dir.replace(/_/g, " ");
}

export default async function WatchlistPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login?redirect=/watchlist");
  }
  const lang = await getLang();
  const labels = await loadTranslations(lang);
  const dbUser = await getUserById(user.userId).catch(() => null);

  const rawItems = await getWatchlist(user.userId);
  // Look up localized names from stock_directory
  const nameEntries = await Promise.all(
    rawItems.map(async (i) => {
      const entry = await lookupStock(i.symbol, lang);
      return [i.symbol, entry?.name ?? i.name ?? i.symbol] as [string, string];
    })
  );
  const nameMap = Object.fromEntries(nameEntries);
  const items = rawItems.map((i) => ({ ...i, name: nameMap[i.symbol] ?? i.name }));

  const [alertMap, priceMap, newsMap] = await Promise.all([
    getAlertSummaryMap(),
    getLatestPricesForWatchlist(items.map((i) => ({ symbol: i.symbol, exchange: i.exchange }))),
    getMaterialEventsForTickers(items.map((i) => ({ symbol: i.symbol, exchange: i.exchange }))),
  ]);

  // Fetch AG2 synthesis for all watchlist tickers in parallel
  const synthEntries = await Promise.all(
    items.map(async (i) => {
      const synth = await getStockSynthesisFlexible(i.symbol, i.exchange);
      return [i.symbol, synth] as [string, StockSynthesis | null];
    })
  );
  const synthMap: Record<string, StockSynthesis> = {};
  for (const [sym, s] of synthEntries) {
    if (s) synthMap[sym] = s;
  }

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
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">⭐ {t(labels, "watchlist_title")}</h1>
            {dbUser?.badge === "early_supporter" && dbUser.badge_number != null && (
              <EarlySupporterBadge
                badgeNumber={dbUser.badge_number}
                label={(t(labels, "badge_early_supporter_hash") || "Early Supporter #{n}").replace("{n}", String(dbUser.badge_number))}
                description={t(labels, "badge_early_supporter_desc") || undefined}
              />
            )}
          </div>
          <p className="text-white/80 text-sm font-medium">
            {t(labels, "hero_spot_shifts")} —{" "}
            <span className="text-white font-bold">{t(labels, "hero_stocks_covered")}</span>{" "}
            {t(labels, "hero_covered_label")}
          </p>
          <TickerSearch showWatchlistAction placeholder={t(labels, "intel_search")} analyseLabel={t(labels, "analyse_btn")} lang={lang} />

          <div className="flex gap-3 items-center flex-wrap relative">
            <Link
              href="/alerts?watchlist=true"
              className="px-6 py-2.5 rounded-lg font-bold uppercase tracking-wide transition-all hover:-translate-y-0.5"
              style={{ fontSize: "0.9rem", background: "#fd8412", color: "#fff" }}
            >
              ⚡ {t(labels, "watchlist_view_alerts")} →
            </Link>
            <LiveScanProgress watchlist={true} heroButton labels={labels} />
            <details className="group">
              <summary
                className="px-6 py-2.5 rounded-lg font-bold uppercase tracking-wide transition-all hover:-translate-y-0.5 cursor-pointer list-none inline-flex items-center gap-2"
                style={{ fontSize: "0.9rem", background: "#fd8412", color: "#fff" }}
              >
                {t(labels, "import_title")}
              </summary>
              <div className="absolute left-0 right-0 mt-3 bg-white/95 rounded-xl p-5 backdrop-blur-sm z-50 shadow-lg">
                <ScreenshotImport mode="watchlist" labels={labels} />
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">

        {/* Empty state */}
        {items.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <div className="text-6xl">☆</div>
            <h2 className="text-2xl font-bold text-gray-600">{t(labels, "watchlist_empty")}</h2>
            <p className="text-gray-400 text-lg max-w-md mx-auto">
              {t(labels, "watchlist_empty_desc")}
            </p>
            <div className="flex justify-center gap-4 pt-4">
              <Link href="/"
                className="px-6 py-3 rounded-lg font-semibold text-white"
                style={{ background: "#2e8b57" }}>
                🇺🇸 US →
              </Link>
              <Link href="/asx"
                className="px-6 py-3 rounded-lg font-semibold text-white"
                style={{ background: "#003087" }}>
                🇦🇺 ASX →
              </Link>
              <Link href="/vietnam"
                className="px-6 py-3 rounded-lg font-semibold text-white"
                style={{ background: "#c8102e" }}>
                🇻🇳 HOSE →
              </Link>
            </div>
          </div>
        )}

        {/* AI Watchlist Overview — aggregated synthesis */}
        {items.length > 0 && (() => {
          const exchangeMap: Record<string, string> = {};
          for (const i of items) exchangeMap[i.symbol] = i.exchange ?? "US";
          const synthList = Object.entries(synthMap);
          const totalWithSynth = synthList.length;
          if (totalWithSynth === 0) return null;

          const buyCount = synthList.filter(([, s]) => s.direction === "BUY" || s.direction === "STRONG_BUY").length;
          const sellCount = synthList.filter(([, s]) => s.direction === "SELL" || s.direction === "STRONG_SELL").length;
          const holdCount = synthList.filter(([, s]) => s.direction === "HOLD").length;
          const avgConf = synthList.reduce((acc, [, s]) => acc + Number(s.confidence), 0) / totalWithSynth;
          const newsAlertCount = Object.values(newsMap).filter((evts) => evts.length > 0).length;
          const criticalNews = Object.entries(newsMap).filter(([, evts]) => evts.some((e) => e.severity === "CRITICAL"));

          const overallBias = buyCount > sellCount ? "BULLISH" : sellCount > buyCount ? "BEARISH" : "MIXED";
          const biasColor = overallBias === "BULLISH" ? "#166534" : overallBias === "BEARISH" ? "#991b1b" : "#92400e";
          const biasBg = overallBias === "BULLISH" ? "#f0fdf4" : overallBias === "BEARISH" ? "#fef2f2" : "#fffbeb";

          // Find top risks from bear theses
          const topSells = synthList
            .filter(([, s]) => s.direction === "SELL" || s.direction === "STRONG_SELL")
            .sort((a, b) => Number(b[1].confidence) - Number(a[1].confidence))
            .slice(0, 3);
          const topBuys = synthList
            .filter(([, s]) => s.direction === "BUY" || s.direction === "STRONG_BUY")
            .sort((a, b) => Number(b[1].confidence) - Number(a[1].confidence))
            .slice(0, 3);

          const latestComputed = synthList.reduce((latest, [, s]) => {
            const t = new Date(s.computed_at).getTime();
            return t > latest ? t : latest;
          }, 0);

          return (
            <div className="border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-5 flex items-center justify-between flex-wrap gap-3" style={{ background: biasBg, borderBottom: `1px solid ${biasColor}20` }}>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{t(labels, "wl_ai_overview")}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t(labels, "wl_debate_across")} {totalWithSynth}/{items.length} {t(labels, "wl_stocks")} · {t(labels, "wl_updated")} {new Date(latestComputed).toLocaleString()}
                  </p>
                </div>
                <span className="px-4 py-1.5 rounded-full text-sm font-bold" style={{ background: biasColor, color: "#fff" }}>
                  {overallBias === "BULLISH" ? t(labels, "wl_bullish") : overallBias === "BEARISH" ? t(labels, "wl_bearish") : t(labels, "wl_mixed")}
                </span>
              </div>

              <div className="px-6 py-5">
                {/* Signal distribution */}
                {(() => {
                  const buyStocks = synthList.filter(([, s]) => s.direction === "BUY" || s.direction === "STRONG_BUY").map(([sym]) => sym);
                  const sellStocks = synthList.filter(([, s]) => s.direction === "SELL" || s.direction === "STRONG_SELL").map(([sym]) => sym);
                  const holdStocks = synthList.filter(([, s]) => s.direction === "HOLD").map(([sym]) => sym);
                  const newsStocks = Object.entries(newsMap).filter(([, evts]) => evts.length > 0).map(([sym]) => sym);
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-5">
                      <div className="text-center p-3 rounded-xl bg-green-50 border border-green-100 cursor-default group relative"
                        title={buyStocks.length ? `${dirLabel("BUY", labels)}: ${buyStocks.join(", ")}` : ""}>
                        <div className="text-2xl font-bold text-green-700">{buyCount}</div>
                        <div className="text-xs text-green-600 font-medium">{dirLabel("BUY", labels)}</div>
                        {buyStocks.length > 0 && (
                          <div className="text-[10px] text-green-500 mt-1 leading-tight">{buyStocks.map((s) => <Link key={s} href={`/ticker/${s}?exchange=${exchangeMap[s] ?? "US"}`} className="underline hover:text-green-800 mr-1">{s}</Link>)}</div>
                        )}
                      </div>
                      <div className="text-center p-3 rounded-xl bg-gray-50 border border-gray-100 cursor-default"
                        title={holdStocks.length ? `${dirLabel("HOLD", labels)}: ${holdStocks.join(", ")}` : ""}>
                        <div className="text-2xl font-bold text-gray-600">{holdCount}</div>
                        <div className="text-xs text-gray-500 font-medium">{dirLabel("HOLD", labels)}</div>
                        {holdStocks.length > 0 && (
                          <div className="text-[10px] text-gray-400 mt-1 leading-tight">{holdStocks.map((s) => <Link key={s} href={`/ticker/${s}?exchange=${exchangeMap[s] ?? "US"}`} className="underline hover:text-gray-700 mr-1">{s}</Link>)}</div>
                        )}
                      </div>
                      <div className="text-center p-3 rounded-xl bg-red-50 border border-red-100 cursor-default"
                        title={sellStocks.length ? `${dirLabel("SELL", labels)}: ${sellStocks.join(", ")}` : ""}>
                        <div className="text-2xl font-bold text-red-700">{sellCount}</div>
                        <div className="text-xs text-red-600 font-medium">{dirLabel("SELL", labels)}</div>
                        {sellStocks.length > 0 && (
                          <div className="text-[10px] text-red-500 mt-1 leading-tight">{sellStocks.map((s) => <Link key={s} href={`/ticker/${s}?exchange=${exchangeMap[s] ?? "US"}`} className="underline hover:text-red-800 mr-1">{s}</Link>)}</div>
                        )}
                      </div>
                      <div className="text-center p-3 rounded-xl bg-blue-50 border border-blue-100">
                        <div className="text-2xl font-bold text-blue-700">{Math.round(avgConf * 100)}%</div>
                        <div className="text-xs text-blue-600 font-medium">{t(labels, "wl_avg_confidence")}</div>
                      </div>
                      <div className="text-center p-3 rounded-xl cursor-default" style={{
                        background: newsAlertCount > 0 ? "#fef2f2" : "#f9fafb",
                        border: newsAlertCount > 0 ? "1px solid #fca5a5" : "1px solid #e5e7eb",
                      }} title={newsStocks.length ? `Alerts: ${newsStocks.join(", ")}` : "No alerts"}>
                        <div className="text-2xl font-bold" style={{ color: newsAlertCount > 0 ? "#dc2626" : "#9ca3af" }}>{newsAlertCount}</div>
                        <div className="text-xs font-medium" style={{ color: newsAlertCount > 0 ? "#dc2626" : "#9ca3af" }}>{t(labels, "wl_news_alerts")}</div>
                        {newsStocks.length > 0 && (
                          <div className="text-[10px] mt-1 leading-tight" style={{ color: "#dc2626" }}>{newsStocks.map((s) => <Link key={s} href={`/ticker/${s}?exchange=${exchangeMap[s] ?? "US"}`} className="underline hover:text-red-800 mr-1">{s}</Link>)}</div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Critical news warning */}
                {criticalNews.length > 0 && (
                  <div className="rounded-lg px-4 py-3 mb-4" style={{ background: "#fef2f2", border: "1.5px solid #ef4444" }}>
                    <span className="text-sm font-bold text-red-800">
                      🚨 CRITICAL:{" "}
                      {criticalNews.map(([sym], i) => (
                        <span key={sym}>
                          {i > 0 && ", "}
                          <Link href={`/ticker/${sym}?exchange=${exchangeMap[sym] ?? "US"}`} className="underline hover:text-red-600">{sym}</Link>
                        </span>
                      ))}
                      {" "}— check breaking news immediately
                    </span>
                  </div>
                )}

                {/* Top signals — clickable links to ticker pages */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {topSells.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2">⚠️ {t(labels, "wl_top_sell")}</div>
                      {topSells.map(([sym, s]) => (
                        <Link key={sym} href={`/ticker/${sym}?exchange=${exchangeMap[sym] ?? "US"}`}
                          className="flex items-start gap-2 mb-2 p-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer">
                          <span className="text-xs font-bold text-red-600 min-w-[48px] underline">{sym}</span>
                          <span className="text-xs text-gray-600 line-clamp-2">{s.what_bears_say || s.key_risk || s.thesis}</span>
                          <span className="text-[10px] text-red-400 ml-auto shrink-0">→</span>
                        </Link>
                      ))}
                    </div>
                  )}
                  {topBuys.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2">🟢 {t(labels, "wl_top_buy")}</div>
                      {topBuys.map(([sym, s]) => (
                        <Link key={sym} href={`/ticker/${sym}?exchange=${exchangeMap[sym] ?? "US"}`}
                          className="flex items-start gap-2 mb-2 p-2 rounded-lg hover:bg-green-50 transition-colors cursor-pointer">
                          <span className="text-xs font-bold text-green-600 min-w-[48px] underline">{sym}</span>
                          <span className="text-xs text-gray-600 line-clamp-2">{s.what_bulls_say || s.thesis}</span>
                          <span className="text-[10px] text-green-400 ml-auto shrink-0">→</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Watchlist grid */}
        {items.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <span className="text-lg text-gray-400">
                {items.length} {t(labels, "wl_stocks")}
                {(() => {
                  const scanned = items.filter((i) => !!alertMap[i.symbol]);
                  const asxCount = items.filter((i) => i.exchange === "ASX").length;
                  const usCount = items.length - asxCount;
                  const lastScan = scanned.length > 0
                    ? new Date(
                        Math.max(...scanned.map((i) => new Date(alertMap[i.symbol].fetched_at).getTime()))
                      ).toLocaleString()
                    : null;
                  return (
                    <span className="text-sm text-gray-300 ml-2">
                      {lastScan && <>· {t(labels, "last_scan_label")} {lastScan} </>}
                      · {scanned.length} {t(labels, "scanned")}
                      {asxCount > 0 && <> · {asxCount} ASX</>}
                      {usCount > 0 && <> · {usCount} US</>}
                    </span>
                  );
                })()}
              </span>
              <Link href="/alerts?watchlist=true" className="text-sm hover:underline font-medium" style={{ color: "#2e8b57" }}>
                {t(labels, "watchlist_view_alerts")} →
              </Link>
            </div>

            {(() => {
              const sorted = [...items].sort((a, b) => {
                const pctA = priceMap[a.symbol] ? Number(priceMap[a.symbol].change_pct) : -Infinity;
                const pctB = priceMap[b.symbol] ? Number(priceMap[b.symbol].change_pct) : -Infinity;
                return (isNaN(pctB) ? -Infinity : pctB) - (isNaN(pctA) ? -Infinity : pctA);
              });

              const gridView = (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {sorted.map((item) => {
                    const analysis = alertMap[item.symbol];
                    const hasAlert = !!analysis;
                    const price = priceMap[item.symbol];
                    const newsEvents = newsMap[item.symbol] ?? [];
                    const synth = synthMap[item.symbol] ?? null;
                    const isAsx = item.exchange === "ASX";
                    const closeNum = price ? Number(price.close) : null;
                    const changePct = price ? Number(price.change_pct) : null;
                    const isUp = changePct !== null && !isNaN(changePct) && changePct >= 0;
                    const cardStyle = newsEvents.some((e) => e.severity === "CRITICAL")
                      ? { background: "#fef2f2", border: "2px solid #ef4444" }
                      : newsEvents.some((e) => e.severity === "HIGH")
                      ? { background: "#fff7ed", border: "2px solid #f97316" }
                      : changePct !== null && !isNaN(changePct) && changePct < 0
                      ? { background: "#fef2f2", border: "1.5px solid #fca5a5" }
                      : changePct !== null && !isNaN(changePct) && changePct >= 0
                      ? { background: "#f0fdf4", border: "1.5px solid #86efac" }
                      : { background: "#ffffff", border: "1px solid #e5e7eb" };
                    return (
                      <div key={item.symbol} className="relative rounded-xl px-4 pt-6 pb-4 transition-all duration-200 shadow-sm hover:-translate-y-0.5" style={cardStyle}>
                        {hasAlert && (
                          <span className="absolute -top-2.5 -right-2.5 text-xs font-bold px-2 py-0.5 rounded-full shadow" style={{ background: "#2e8b57", color: "#fff" }}>
                            {Number(analysis.alert_score) > 0 ? "+" : ""}{Number(analysis.alert_score).toFixed(1)}
                          </span>
                        )}
                        <div className="absolute top-1.5 right-1.5 z-10">
                          <WatchlistButton compact symbol={item.symbol} exchange={item.exchange ?? "US"} name={item.name ?? undefined} />
                        </div>
                        <div className="absolute top-2 left-2">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                            style={isAsx ? { background: "#dbeafe", color: "#1e40af" } : { background: "#f0fdf4", color: "#166534" }}>
                            {isAsx ? "AU" : "US"}
                          </span>
                        </div>
                        <Link href={`/ticker/${item.symbol}?exchange=${item.exchange ?? "US"}`} className="block group">
                          <div className="font-bold text-base text-brand group-hover:opacity-80">{item.symbol}</div>
                          <div className="text-gray-400 text-xs mt-0.5 truncate">{item.name ?? item.symbol}</div>
                        </Link>
                        <div className="mt-2 space-y-0.5">
                          {price && closeNum !== null && !isNaN(closeNum) ? (
                            <>
                              <div className="text-sm font-semibold text-gray-700">{isAsx ? "A$" : "$"}{closeNum.toFixed(2)}</div>
                              <ConvertedPrice price={closeNum} exchange={item.exchange ?? "US"} />
                              <div className="text-xs font-medium" style={{ color: isUp ? "#16a34a" : "#dc2626" }}>
                                {changePct !== null && !isNaN(changePct) ? `${isUp ? "+" : ""}${changePct.toFixed(2)}%` : ""}
                              </div>
                              <div className="text-[10px] text-gray-300">{price.trade_date}</div>
                            </>
                          ) : (
                            <div className="text-xs text-gray-300">{t(labels, "no_price_data")}</div>
                          )}
                        </div>
                        {synth && (
                          <div className="mt-2 rounded-lg px-2.5 py-1.5" style={{
                            background: synth.direction === "BUY" || synth.direction === "STRONG_BUY" ? "#f0fdf4" : synth.direction === "SELL" || synth.direction === "STRONG_SELL" ? "#fef2f2" : "#f9fafb",
                            border: `1px solid ${synth.direction === "BUY" || synth.direction === "STRONG_BUY" ? "#86efac" : synth.direction === "SELL" || synth.direction === "STRONG_SELL" ? "#fca5a5" : "#e5e7eb"}`,
                          }}>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px]">{synth.direction === "BUY" || synth.direction === "STRONG_BUY" ? "🟢" : synth.direction === "SELL" || synth.direction === "STRONG_SELL" ? "🔴" : "🟡"}</span>
                              <span className="text-[10px] font-bold uppercase" style={{ color: synth.direction === "BUY" || synth.direction === "STRONG_BUY" ? "#166534" : synth.direction === "SELL" || synth.direction === "STRONG_SELL" ? "#991b1b" : "#6b7280" }}>
                                {dirLabel(synth.direction, labels)}
                              </span>
                              <span className="text-[10px] text-gray-400">{Number(synth.confidence)}%</span>
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-2 leading-tight">{synth.thesis}</div>
                          </div>
                        )}
                        {newsEvents.length > 0 && <BreakingNewsBadge events={newsEvents} />}
                        {hasAlert && (
                          <div className="mt-1.5 pt-1.5 border-t border-gray-100">
                            <div className="text-xs font-medium" style={{ color: "#b45309" }}>
                              {analysis.changed_pct != null && analysis.changed_pct > 90 ? t(labels, "significant_change") : analysis.changed_pct != null ? `${analysis.changed_pct.toFixed(1)}% ${t(labels, "changed")}` : "—"}
                            </div>
                            <div className="text-[10px] text-gray-300">{new Date(analysis.fetched_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );

              const listView = (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                        <th className="px-4 py-3 font-semibold">#</th>
                        <th className="px-4 py-3 font-semibold">{t(labels, "ticker_label")}</th>
                        <th className="px-4 py-3 font-semibold">{t(labels, "name_label")}</th>
                        <th className="px-4 py-3 font-semibold text-center">Mkt</th>
                        <th className="px-4 py-3 font-semibold text-right">{t(labels, "price")}</th>
                        <th className="px-4 py-3 font-semibold text-right">{t(labels, "change_pct_label")}</th>
                        <th className="px-4 py-3 font-semibold text-right">{t(labels, "date_label")}</th>
                        <th className="px-4 py-3 font-semibold text-center">AI</th>
                        <th className="px-4 py-3 font-semibold text-center">{t(labels, "scan_label")}</th>
                        <th className="px-4 py-3 font-semibold text-center"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((item, idx) => {
                        const price = priceMap[item.symbol];
                        const closeNum = price ? Number(price.close) : null;
                        const changePct = price ? Number(price.change_pct) : null;
                        const isUp = changePct !== null && !isNaN(changePct) && changePct >= 0;
                        const isAsx = item.exchange === "ASX";
                        const synth = synthMap[item.symbol] ?? null;
                        const analysis = alertMap[item.symbol];
                        const newsEvents = newsMap[item.symbol] ?? [];
                        const hasCritical = newsEvents.some((e) => e.severity === "CRITICAL");
                        const rowBg = hasCritical ? "#fef2f2"
                          : changePct !== null && !isNaN(changePct) && changePct < 0 ? "#fef2f2"
                          : changePct !== null && !isNaN(changePct) && changePct >= 0 ? "#f0fdf4" : "#fff";
                        const synthColor = synth
                          ? (synth.direction === "BUY" || synth.direction === "STRONG_BUY" ? "#166534" : synth.direction === "SELL" || synth.direction === "STRONG_SELL" ? "#991b1b" : "#6b7280")
                          : "#9ca3af";
                        return (
                          <tr key={item.symbol} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors" style={{ background: rowBg, borderLeft: hasCritical ? "3px solid #ef4444" : undefined }}>
                            <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                            <td className="px-4 py-3">
                              <Link href={`/ticker/${item.symbol}?exchange=${item.exchange ?? "US"}`} className="font-bold text-brand hover:opacity-80">{item.symbol}</Link>
                            </td>
                            <td className="px-4 py-3 text-gray-500 truncate max-w-[180px]">{item.name ?? item.symbol}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                                style={isAsx ? { background: "#dbeafe", color: "#1e40af" } : { background: "#f0fdf4", color: "#166534" }}>
                                {isAsx ? "AU" : "US"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-700">
                              <div>{closeNum !== null && !isNaN(closeNum) ? `${isAsx ? "A$" : "$"}${closeNum.toFixed(2)}` : "—"}</div>
                              {closeNum !== null && !isNaN(closeNum) && (
                                <ConvertedPrice price={closeNum} exchange={item.exchange ?? "US"} />
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold" style={{ color: isUp ? "#16a34a" : "#dc2626" }}>
                              {changePct !== null && !isNaN(changePct) ? `${isUp ? "+" : ""}${changePct.toFixed(2)}%` : "—"}
                            </td>
                            <td className="px-4 py-3 text-right text-xs text-gray-400">{price?.trade_date ?? "—"}</td>
                            <td className="px-4 py-3 text-center text-xs">
                              {synth ? (
                                <span className="font-bold" style={{ color: synthColor }}>
                                  {dirLabel(synth.direction, labels)} {Number(synth.confidence)}%
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center text-xs">
                              {analysis ? (
                                <span className="text-amber-700 font-medium">{analysis.changed_pct != null && analysis.changed_pct > 90 ? "Sig." : analysis.changed_pct != null ? `${analysis.changed_pct.toFixed(1)}%` : "—"}</span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <WatchlistButton compact symbol={item.symbol} exchange={item.exchange ?? "US"} name={item.name ?? undefined} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );

              return <StockViewToggle gridView={gridView} listView={listView} gridLabel={t(labels, "view_grid")} listLabel={t(labels, "view_list")} />;
            })()}
          </div>
        )}

        {/* How watchlist scanning works */}
        <div className="border border-gray-200 rounded-2xl p-8 bg-white shadow-sm">
          <h3 className="font-bold text-xl text-[#252525] mb-4">
            ⭐ {t(labels, "how_it_works")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-base text-gray-500">
            <div>
              <div className="font-semibold text-gray-700 mb-2">{t(labels, "step1_label")}</div>
              {t(labels, "step1_desc")}
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-2">{t(labels, "step2_label")}</div>
              {t(labels, "step2_desc")}
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-2">{t(labels, "step3_label")}</div>
              {t(labels, "step3_desc")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
