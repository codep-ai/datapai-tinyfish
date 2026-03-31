/**
 * /taiwan  —  Taiwan Stock Exchange (TWSE)
 * Top blue chips shown, rest searchable via ticker search.
 * Targeting Taiwan + global Chinese-speaking investors.
 */

import Link from "next/link";
import { getAlertSummaryMap, getRecentRuns, getScannedTickerSet, getActiveStocks, countActiveStocks, getLatestPricesForWatchlist } from "@/lib/db";
import { getLang } from "@/lib/getLang";
import { loadTranslations } from "@/lib/i18n";
import { t } from "@/lib/translations";
import TickerSearch from "../components/TickerSearch";
import WatchlistButton from "../components/WatchlistButton";
import StockViewToggle from "../components/StockViewToggle";
import ScreenshotImport from "../components/ScreenshotImport";
import LiveScanProgress from "../components/LiveScanProgress";

export const dynamic = "force-dynamic";

function fmtTWD(value: number): string {
  return value.toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function TaiwanPage() {
  const lang = await getLang();
  const stocks = await getActiveStocks("TWSE", lang, 30, true);
  const [labels, alertMap, scannedSet, recentRuns, totalTw, priceMap] = await Promise.all([
    loadTranslations(lang),
    getAlertSummaryMap(),
    getScannedTickerSet(),
    getRecentRuns(3),
    countActiveStocks("TWSE"),
    getLatestPricesForWatchlist(stocks.map((s) => ({ symbol: s.symbol, exchange: "TWSE" }))),
  ]);
  const lastRun = recentRuns[0] ?? null;

  return (
    <div>
      <div
        className="w-full flex flex-col justify-center"
        style={{ background: "linear-gradient(45deg, seagreen, darkseagreen)", paddingTop: "28px", paddingBottom: "28px" }}
      >
        <div className="max-w-6xl mx-auto px-6 space-y-3">
          <h1 className="text-2xl font-bold text-white">
            {t(labels, "hero_title_twse")}
          </h1>

          <p className="text-white/80 text-sm font-medium">
            {t(labels, "section_twse_label")} —{" "}
            <span className="text-white font-bold">{totalTw.toLocaleString()} {t(labels, "hero_stocks_covered")}</span>{" "}
            · {t(labels, "hero_powered_by")}{" "}
            <a href="https://tinyfish.ai" target="_blank" rel="noopener noreferrer"
              className="text-white font-bold underline underline-offset-2 hover:text-white/80 transition-colors">
              TinyFish
            </a>
          </p>

          <TickerSearch
            placeholder={t(labels, "intel_search")}
            markets={[{ code: "TWSE", label: "TWSE" }]}
            analyseLabel={t(labels, "analyse_btn")}
            lang={lang}
          />

          <div className="flex gap-3 items-center flex-wrap relative">
            <Link href="/alerts"
              className="px-6 py-2.5 rounded-lg font-bold uppercase tracking-wide transition-all hover:-translate-y-0.5"
              style={{ fontSize: "0.9rem", background: "#fff", color: "#2e8b57" }}>
              {t(labels, "hero_view_alerts")} →
            </Link>
            <LiveScanProgress exchange="TWSE" heroButton labels={labels} />
            <details className="group">
              <summary className="px-6 py-2.5 rounded-lg font-bold uppercase tracking-wide transition-all hover:-translate-y-0.5 cursor-pointer list-none inline-flex items-center gap-2"
                style={{ fontSize: "0.9rem", background: "#fd8412", color: "#fff" }}>
                {t(labels, "import_title")}
              </summary>
              <div className="absolute left-0 right-0 mt-3 bg-white/95 rounded-xl p-5 backdrop-blur-sm z-50 shadow-lg">
                <ScreenshotImport mode="watchlist" labels={labels} />
              </div>
            </details>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">

        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-3xl font-bold text-[#252525]">
              {t(labels, "section_twse_stocks")}
              <span className="text-lg font-normal text-gray-400 ml-2">{t(labels, "section_twse_label")}</span>
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <Link href="/alerts" className="hover:underline" style={{ color: "#2e8b57" }}>{t(labels, "hero_view_alerts")} →</Link>
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
                {sorted.map((tk) => {
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
                      <div className="absolute top-1.5 right-1.5 z-10">
                        <WatchlistButton compact symbol={tk.symbol} exchange="TWSE" name={tk.name} />
                      </div>
                      <Link href={`/ticker/${tk.symbol}?exchange=TWSE`} className="block pr-6">
                        <div className="font-bold text-base group-hover:opacity-80" style={{ color: "#2e8b57" }}>{tk.symbol}</div>
                        <div className="text-gray-400 text-xs mt-0.5 truncate">{tk.name}</div>
                        <div className="mt-2 space-y-0.5">
                          {closeNum !== null && !isNaN(closeNum) ? (
                            <>
                              <div className="text-sm font-semibold text-gray-700">NT${fmtTWD(closeNum)}</div>
                              <div className="text-xs font-medium" style={{ color: isUp ? "#16a34a" : "#dc2626" }}>
                                {changePct !== null && !isNaN(changePct) ? `${isUp ? "+" : ""}${changePct.toFixed(2)}%` : ""}
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-gray-300 mt-1">{t(labels, "no_price_data")}</div>
                          )}
                        </div>
                        {hasAlert && (
                          <div className="mt-1.5 pt-1.5 border-t border-gray-100 space-y-0.5">
                            <div className="text-xs font-medium" style={{ color: "#92400e" }}>
                              {analysis.changed_pct != null && analysis.changed_pct > 90 ? t(labels, "significant_change") : analysis.changed_pct != null ? `${analysis.changed_pct.toFixed(1)}% ${t(labels, "changed")}` : "—"}
                            </div>
                            <div className="text-xs text-gray-400">{t(labels, "confidence_label")} {Math.round(confidence * 100)}%</div>
                          </div>
                        )}
                        {!hasAlert && hasSnapshot && (
                          <div className="mt-1.5 pt-1.5 border-t border-gray-100"><span className="text-xs text-gray-400">✓ {t(labels, "baseline_saved")}</span></div>
                        )}
                        {!hasAlert && !hasSnapshot && (
                          <div className="mt-1.5 pt-1.5 border-t border-gray-100"><span className="text-xs text-gray-300">{t(labels, "not_yet_scanned")}</span></div>
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
                      <th className="px-4 py-3 font-semibold text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((tk, idx) => {
                      const price = priceMap[tk.symbol];
                      const closeNum = price ? Number(price.close) : null;
                      const changePct = price ? Number(price.change_pct) : null;
                      const isUp = changePct !== null && !isNaN(changePct) && changePct >= 0;
                      const rowBg = changePct !== null && !isNaN(changePct) && changePct < 0 ? "#fef2f2" : changePct !== null && !isNaN(changePct) && changePct >= 0 ? "#f0fdf4" : "#fff";
                      return (
                        <tr key={tk.symbol} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors" style={{ background: rowBg }}>
                          <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <Link href={`/ticker/${tk.symbol}?exchange=TWSE`} className="font-bold hover:opacity-80" style={{ color: "#2e8b57" }}>{tk.symbol}</Link>
                          </td>
                          <td className="px-4 py-3 text-gray-500 truncate max-w-[200px]">{tk.name}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-700">
                            {closeNum !== null && !isNaN(closeNum) ? `NT$${fmtTWD(closeNum)}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold" style={{ color: isUp ? "#16a34a" : "#dc2626" }}>
                            {changePct !== null && !isNaN(changePct) ? `${isUp ? "+" : ""}${changePct.toFixed(2)}%` : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <WatchlistButton compact symbol={tk.symbol} exchange="TWSE" name={tk.name} />
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
      </div>
    </div>
  );
}
