/**
 * /china  —  China A-Shares (SSE + SZSE)
 * Top blue chips shown, rest searchable via ticker search.
 * Red/gold theme matching Chinese market branding.
 */

import Link from "next/link";
import { getAlertSummaryMap, getRecentRuns, getScannedTickerSet, getActiveStocks, countActiveStocks } from "@/lib/db";
import { getLang } from "@/lib/getLang";
import { loadTranslations } from "@/lib/i18n";
import { t } from "@/lib/translations";
import TickerSearch from "../components/TickerSearch";
import WatchlistButton from "../components/WatchlistButton";
import StockViewToggle from "../components/StockViewToggle";

export const dynamic = "force-dynamic";

function fmtCNY(value: number): string {
  return value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function ChinaPage() {
  const lang = await getLang();

  // Fetch SSE and SZSE stocks in parallel
  const [sseStocks, szseStocks] = await Promise.all([
    getActiveStocks("SSE", lang, 20, true),
    getActiveStocks("SZSE", lang, 20, true),
  ]);
  const allStocks = [...sseStocks, ...szseStocks];

  const [labels, alertMap, scannedSet, recentRuns, totalSSE, totalSZSE] = await Promise.all([
    loadTranslations(lang),
    getAlertSummaryMap(),
    getScannedTickerSet(),
    getRecentRuns(3),
    countActiveStocks("SSE"),
    countActiveStocks("SZSE"),
  ]);
  const lastRun = recentRuns[0] ?? null;

  function renderStockGrid(stocks: typeof sseStocks, exchange: string) {
    const sorted = [...stocks].sort((a, b) => {
      const pctA = (a as any).change_1d_pct ?? -Infinity;
      const pctB = (b as any).change_1d_pct ?? -Infinity;
      return (isNaN(pctB) ? -Infinity : pctB) - (isNaN(pctA) ? -Infinity : pctA);
    });

    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {sorted.map((tk) => {
          const analysis = alertMap[tk.symbol];
          const hasAlert = !!analysis;
          const hasSnapshot = scannedSet.has(tk.symbol);
          const confidence = analysis?.confidence ?? 0;
          const closeNum = (tk as any).price ? Number((tk as any).price) : null;
          const changePct = (tk as any).change_1d_pct != null ? Number((tk as any).change_1d_pct) : null;
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
                <WatchlistButton compact symbol={tk.symbol} exchange={exchange} name={tk.name} />
              </div>
              <Link href={`/ticker/${tk.symbol}?exchange=${exchange}`} className="block pr-6">
                <div className="font-bold text-base group-hover:opacity-80" style={{ color: "#2e8b57" }}>{tk.symbol}</div>
                <div className="text-gray-400 text-xs mt-0.5 truncate">{tk.name}</div>
                <div className="mt-2 space-y-0.5">
                  {closeNum !== null && !isNaN(closeNum) ? (
                    <>
                      <div className="text-sm font-semibold text-gray-700">&yen;{fmtCNY(closeNum)}</div>
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
                      {analysis.changed_pct != null && analysis.changed_pct > 90 ? t(labels, "significant_change") : analysis.changed_pct != null ? `${analysis.changed_pct.toFixed(1)}% ${t(labels, "changed")}` : "\u2014"}
                    </div>
                    <div className="text-xs text-gray-400">{t(labels, "confidence_label")} {Math.round(confidence * 100)}%</div>
                  </div>
                )}
                {!hasAlert && hasSnapshot && (
                  <div className="mt-1.5 pt-1.5 border-t border-gray-100"><span className="text-xs text-gray-400">{"\u2713"} {t(labels, "baseline_saved")}</span></div>
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
  }

  return (
    <div>
      {/* Hero — red/gold Chinese market theme */}
      <div
        className="w-full flex flex-col justify-center"
        style={{
          background: "linear-gradient(45deg, seagreen, darkseagreen)",
          paddingTop: "28px",
          paddingBottom: "28px",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 space-y-3">
          <h1 className="text-2xl font-bold text-white">
            {t(labels, "hero_title_china")}
          </h1>

          <p className="text-white/80 text-sm font-medium">
            {t(labels, "section_china_market")} &mdash;{" "}
            <span className="text-yellow-300 font-bold">{(totalSSE + totalSZSE).toLocaleString()} {t(labels, "hero_stocks_covered")}</span>{" "}
            &middot; {t(labels, "hero_powered_by")}{" "}
            <a href="https://tinyfish.ai" target="_blank" rel="noopener noreferrer"
              className="text-white font-bold underline underline-offset-2 hover:text-white/80 transition-colors">
              TinyFish
            </a>
          </p>

          <TickerSearch
            placeholder={t(labels, "intel_search")}
            markets={[{ code: "SSE", label: "SSE" }, { code: "SZSE", label: "SZSE" }]}
            analyseLabel={t(labels, "analyse_btn")}
            lang={lang}
          />

          <div className="flex gap-3 items-center flex-wrap">
            <Link
              href="/alerts"
              className="px-6 py-2.5 rounded-lg font-bold uppercase tracking-wide transition-all hover:-translate-y-0.5"
              style={{ fontSize: "0.9rem", background: "#fff", color: "#2e8b57" }}
            >
              {t(labels, "hero_view_alerts")} &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">

        {/* SSE Section */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-3xl font-bold text-[#252525]">
              {t(labels, "section_sse_stocks")}
              <span className="text-lg font-normal text-gray-400 ml-2">{t(labels, "section_sse_label")}</span>
            </h2>
          </div>
          <StockViewToggle gridView={renderStockGrid(sseStocks, "SSE")} listView={renderStockGrid(sseStocks, "SSE")} />
        </div>

        {/* SZSE Section */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-3xl font-bold text-[#252525]">
              {t(labels, "section_szse_stocks")}
              <span className="text-lg font-normal text-gray-400 ml-2">{t(labels, "section_szse_label")}</span>
            </h2>
          </div>
          <StockViewToggle gridView={renderStockGrid(szseStocks, "SZSE")} listView={renderStockGrid(szseStocks, "SZSE")} />
        </div>
      </div>
    </div>
  );
}
