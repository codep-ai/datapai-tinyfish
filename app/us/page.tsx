import Link from "next/link";
import Image from "next/image";
import { getAlertSummaryMap, getRecentRuns, getScannedTickerSet, getLatestPricesForWatchlist, getActiveStocks } from "@/lib/db";
import { getLang } from "@/lib/getLang";
import { loadTranslations } from "@/lib/i18n";
import { t } from "@/lib/translations";
import LiveScanProgress from "./components/LiveScanProgress";
import TickerSearch from "./components/TickerSearch";
import WatchlistButton from "./components/WatchlistButton";
import StockViewToggle from "./components/StockViewToggle";
import ScreenshotImport from "./components/ScreenshotImport";

export const dynamic = "force-dynamic";

export default async function Home() {
  const lang = await getLang();
  const labels = await loadTranslations(lang);
  const stocks = await getActiveStocks("US", lang, 30, true);
  const [alertMap, scannedSet, recentRuns, priceMap] = await Promise.all([
    getAlertSummaryMap(),
    getScannedTickerSet(),
    getRecentRuns(3),
    getLatestPricesForWatchlist(stocks.map((s) => ({ symbol: s.symbol, exchange: "US" }))),
  ]);
  const alertCount = Object.keys(alertMap).length;
  const lastRun = recentRuns[0] ?? null;
  return (
    <div>
      {/* ── Full-width hero ── */}
      <div
        className="w-full flex flex-col justify-center"
        style={{ background: "linear-gradient(45deg, seagreen, darkseagreen)", paddingTop: "28px", paddingBottom: "28px" }}
      >
        <div className="max-w-6xl mx-auto px-6 space-y-3">

          <h1 className="text-2xl font-bold text-white">
            {t(labels, "hero_title_us")}
          </h1>

          <p className="text-white/80 text-sm font-medium">
            {t(labels, "hero_spot_shifts")} —{" "}
            <span className="text-white font-bold">9,000+ {t(labels, "hero_stocks_covered")}</span>{" "}
            {t(labels, "hero_covered_label")}{" "}
            <a href="https://tinyfish.ai" target="_blank" rel="noopener noreferrer"
              className="text-white font-bold underline underline-offset-2 hover:text-white/80 transition-colors">
              TinyFish
            </a>{" "}
            {t(labels, "hero_realBrowser_agents")}
          </p>

          <div data-tour="search-bar">
            <TickerSearch placeholder={t(labels, "intel_search")} analyseLabel={t(labels, "analyse_btn")} lang={lang} />
          </div>

          <div className="flex gap-3 items-center flex-wrap relative">
            {alertCount > 0 && (
              <Link
                href="/alerts"
                className="px-6 py-2.5 rounded-lg font-bold uppercase tracking-wide transition-all hover:-translate-y-0.5"
                style={{ fontSize: "0.9rem", background: "#fd8412", color: "#fff" }}
              >
                ⚡ {t(labels, "hero_view_n_alerts")} {alertCount} {t(labels, "hero_alerts_suffix")} →
              </Link>
            )}
            <LiveScanProgress heroButton labels={labels} />
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
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">

        {/* Last scan summary — Feature 12 */}
        {lastRun && (
          <div className="flex items-center gap-4 text-sm text-gray-500 border border-gray-100 rounded-lg px-4 py-3 bg-white shadow-sm">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: lastRun.status === "SUCCESS" ? "#2e8b57" : lastRun.status === "RUNNING" ? "#fd8412" : "#ef4444" }}
            />
            <span>{t(labels, "last_scan_label")} <strong>{new Date(lastRun.started_at).toLocaleString()}</strong></span>
            <span className="text-gray-300">·</span>
            <span><strong>{lastRun.scanned_count}</strong> {t(labels, "scanned")}</span>
            <span className="text-gray-300">·</span>
            <span style={{ color: "#f97316" }}><strong>{lastRun.changed_count}</strong> {t(labels, "changed")}</span>
            {lastRun.failed_count > 0 && (
              <>
                <span className="text-gray-300">·</span>
                <span
                  style={{ color: "#ef4444", cursor: "help" }}
                  title={`${lastRun.failed_count} IR pages were unreachable this scan — typically login-gated, paywalled, or temporarily down. These are retried automatically next run and do not affect signal quality for the stocks that completed successfully.`}
                >
                  <strong>{lastRun.failed_count}</strong> {t(labels, "failed")} ⓘ
                </span>
              </>
            )}
            <Link href={`/run/${lastRun.id}`} className="ml-auto text-gray-400 hover:text-gray-700 underline underline-offset-2 text-xs">
              {t(labels, "view_run_detail")} →
            </Link>
          </div>
        )}

        {/* Monitored universe */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-3xl font-bold text-[#252525]">{t(labels, "section_top_stocks")} <span className="text-lg font-normal text-gray-400 ml-1">🇺🇸 {t(labels, "section_us_market")}</span></h2>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              {alertCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "#4ade80" }} />
                  = {t(labels, "change_detected")}
                </span>
              )}
              <Link href="/asx" className="text-brand hover:underline font-medium">🇦🇺 {t(labels, "nav_asx_short")} →</Link>
              <Link href="/alerts" className="text-brand hover:underline">{t(labels, "hero_view_alerts")} →</Link>
            </div>
          </div>

          {(() => {
            const sorted = [...stocks].sort((a, b) => {
              const pctA = priceMap[a.symbol] ? Number(priceMap[a.symbol].change_pct) : -Infinity;
              const pctB = priceMap[b.symbol] ? Number(priceMap[b.symbol].change_pct) : -Infinity;
              return (isNaN(pctB) ? -Infinity : pctB) - (isNaN(pctA) ? -Infinity : pctA);
            });

            const gridView = (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {sorted.map((tk, idx) => {
                  const analysis = alertMap[tk.symbol];
                  const hasAlert = !!analysis;
                  const hasSnapshot = scannedSet.has(tk.symbol);
                  const confidence = analysis?.confidence ?? 0;
                  const price = priceMap[tk.symbol];
                  const closeNum = price ? Number(price.close) : null;
                  const changePct = price ? Number(price.change_pct) : null;
                  const isUp = changePct !== null && !isNaN(changePct) && changePct >= 0;
                  const cardStyle = changePct !== null && !isNaN(changePct) && changePct < 0
                    ? { background: "#fef2f2", border: "1.5px solid #fca5a5" }
                    : changePct !== null && !isNaN(changePct) && changePct >= 0
                    ? { background: "#f0fdf4", border: "1.5px solid #86efac" }
                    : { background: "#ffffff", border: "1px solid #e5e7eb" };
                  return (
                    <div key={tk.symbol} className="relative rounded-xl px-4 pt-6 pb-4 transition-all duration-200 group shadow-sm hover:-translate-y-0.5" style={cardStyle}>
                      {hasAlert && (
                        <span className="absolute -top-2.5 -right-2.5 text-xs font-bold px-2 py-0.5 rounded-full shadow" style={{ background: "#2e8b57", color: "#fff" }}>
                          {analysis.alert_score > 0 ? "+" : ""}{analysis.alert_score.toFixed(1)}
                        </span>
                      )}
                      <div className="absolute top-1.5 right-1.5 z-10" {...(idx === 0 ? { "data-tour": "watchlist-star" } : {})}>
                        <WatchlistButton compact symbol={tk.symbol} exchange="US" name={tk.name} />
                      </div>
                      <Link href={`/ticker/${tk.symbol}?exchange=${tk.exchange}`} className="block pr-6">
                        <div className="font-bold text-base text-brand group-hover:opacity-80">{tk.symbol}</div>
                        <div className="text-gray-400 text-xs mt-0.5 truncate">{tk.name}</div>
                        <div className="mt-2 space-y-0.5">
                          {price && closeNum !== null && !isNaN(closeNum) ? (
                            <>
                              <div className="text-sm font-semibold text-gray-700">${closeNum.toFixed(2)}</div>
                              <div className="text-xs font-medium" style={{ color: isUp ? "#16a34a" : "#dc2626" }}>
                                {changePct !== null && !isNaN(changePct) ? `${isUp ? "+" : ""}${changePct.toFixed(2)}%` : ""}
                              </div>
                              <div className="text-[10px] text-gray-300">{price.trade_date}</div>
                            </>
                          ) : (
                            <div className="text-xs text-gray-300 mt-1">{t(labels, "no_price_data")}</div>
                          )}
                        </div>
                        {hasAlert && (
                          <div className="mt-1.5 pt-1.5 border-t border-gray-100 space-y-0.5">
                            <div className="text-xs font-medium" style={{ color: "#166534" }}
                              title={analysis.changed_pct != null && analysis.changed_pct > 90 ? "Large baseline diff — page content significantly changed vs. initial snapshot" : undefined}>
                              {analysis.changed_pct != null ? (analysis.changed_pct > 90 ? t(labels, "significant_change") : `${analysis.changed_pct.toFixed(1)}% ${t(labels, "changed")}`) : "—"}
                            </div>
                            <div className="text-xs text-gray-400">conf {Math.round(confidence * 100)}%</div>
                          </div>
                        )}
                        {!hasAlert && hasSnapshot && (
                          <div className="mt-1.5 pt-1.5 border-t border-gray-100">
                            <span className="text-xs text-gray-400">✓ {t(labels, "baseline_saved")}</span>
                          </div>
                        )}
                      </Link>
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
                      <th className="px-4 py-3 font-semibold text-right">{t(labels, "price")}</th>
                      <th className="px-4 py-3 font-semibold text-right">{t(labels, "change_pct_label")}</th>
                      <th className="px-4 py-3 font-semibold text-right">{t(labels, "date_label")}</th>
                      <th className="px-4 py-3 font-semibold text-center">{t(labels, "scan_label")}</th>
                      <th className="px-4 py-3 font-semibold text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((tk, idx) => {
                      const price = priceMap[tk.symbol];
                      const closeNum = price ? Number(price.close) : null;
                      const changePct = price ? Number(price.change_pct) : null;
                      const isUp = changePct !== null && !isNaN(changePct) && changePct >= 0;
                      const analysis = alertMap[tk.symbol];
                      const rowBg = changePct !== null && !isNaN(changePct) && changePct < 0 ? "#fef2f2" : changePct !== null && !isNaN(changePct) && changePct >= 0 ? "#f0fdf4" : "#fff";
                      return (
                        <tr key={tk.symbol} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors" style={{ background: rowBg }}>
                          <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <Link href={`/ticker/${tk.symbol}?exchange=${tk.exchange}`} className="font-bold text-brand hover:opacity-80">{tk.symbol}</Link>
                          </td>
                          <td className="px-4 py-3 text-gray-500 truncate max-w-[200px]">{tk.name}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-700">
                            {closeNum !== null && !isNaN(closeNum) ? `$${closeNum.toFixed(2)}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold" style={{ color: isUp ? "#16a34a" : "#dc2626" }}>
                            {changePct !== null && !isNaN(changePct) ? `${isUp ? "+" : ""}${changePct.toFixed(2)}%` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-gray-400">{price?.trade_date ?? "—"}</td>
                          <td className="px-4 py-3 text-center text-xs">
                            {analysis ? (
                              <span className="text-green-700 font-medium">{analysis.changed_pct != null && analysis.changed_pct > 90 ? t(labels, "significant_change") : analysis.changed_pct != null ? `${analysis.changed_pct.toFixed(1)}%` : "—"}</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <WatchlistButton compact symbol={tk.symbol} exchange="US" name={tk.name} />
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

        {/* How it works */}
        <div>
          <h2 className="text-3xl font-bold text-[#252525] mb-6">{t(labels, "how_it_works")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { step: "1", label: t(labels, "step1_label"), desc: t(labels, "step1_desc") },
              { step: "2", label: t(labels, "step2_label"), desc: t(labels, "step2_desc") },
              { step: "3", label: t(labels, "step3_label"), desc: t(labels, "step3_desc") },
              { step: "4", label: t(labels, "step4_label"), desc: t(labels, "step4_desc") },
            ].map((item) => (
              <div key={item.step} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="text-brand font-bold text-3xl mb-3">{item.step}</div>
                <div className="text-[#252525] font-bold text-lg mb-2">{item.label}</div>
                <div className="text-gray-500 text-base">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust layer callout */}
        <div className="border border-gray-200 rounded-2xl p-8 bg-white shadow-sm">
          <h3 className="font-bold text-xl text-[#252525] mb-4">
            {t(labels, "trust_title")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-base text-gray-500">
            <div>
              <div className="font-semibold text-gray-700 mb-2">{t(labels, "trust_source")}</div>
              {t(labels, "trust_source_desc")}
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-2">{t(labels, "trust_evidence")}</div>
              {t(labels, "trust_evidence_desc")}
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-2">{t(labels, "trust_ai")}</div>
              {t(labels, "trust_ai_desc")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
