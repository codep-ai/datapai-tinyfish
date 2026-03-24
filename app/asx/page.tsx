import Link from "next/link";
import Image from "next/image";
import { ASX_UNIVERSE } from "@/lib/universe";
import { getAlertSummaryMap, getRecentRuns, getScannedTickerSet, getLatestPricesForWatchlist } from "@/lib/db";
import { getLang } from "@/lib/getLang";
import { loadTranslations } from "@/lib/i18n";
import { t } from "@/lib/translations";
import LiveScanProgress from "../components/LiveScanProgress";
import TickerSearch from "../components/TickerSearch";
import WatchlistButton from "../components/WatchlistButton";
import StockViewToggle from "../components/StockViewToggle";

export const dynamic = "force-dynamic";

export default async function AsxPage() {
  const lang = await getLang();
  const labels = await loadTranslations(lang);
  const [alertMap, scannedSet, recentRuns, priceMap] = await Promise.all([
    getAlertSummaryMap(),
    getScannedTickerSet(),
    getRecentRuns(3),
    getLatestPricesForWatchlist(ASX_UNIVERSE.map((t) => ({ symbol: t.symbol, exchange: "ASX" }))),
  ]);
  const lastRun = recentRuns[0] ?? null;
  const asxAlertCount = ASX_UNIVERSE.filter((t) => !!alertMap[t.symbol]).length;

  return (
    <div>
      {/* ── Full-width hero (gold/navy for Australia feel) ── */}
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
            {t(labels, "hero_title_asx")}
          </h1>

          <p className="text-white/80 text-sm font-medium">
            {t(labels, "hero_spot_shifts")} —{" "}
            <span className="text-white font-bold">2,000+ {t(labels, "hero_stocks_covered")}</span>{" "}
            {t(labels, "hero_covered_label")}{" "}
            <a href="https://tinyfish.ai" target="_blank" rel="noopener noreferrer"
              className="text-white font-bold underline underline-offset-2 hover:text-white/80 transition-colors">
              TinyFish
            </a>
          </p>

          <TickerSearch />

          <div className="flex gap-3 items-center flex-wrap">
            <Link
              href="/alerts"
              className="px-6 py-2.5 rounded-lg font-bold uppercase tracking-wide transition-all hover:-translate-y-0.5"
              style={{ fontSize: "0.9rem", background: "#fd8412", color: "#fff" }}
            >
              ⚡ {t(labels, "hero_view_alerts")} →
            </Link>
            <LiveScanProgress exchange="ASX" heroButton />
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">

        {/* Last scan summary */}
        {lastRun && (
          <div className="flex items-center gap-4 text-sm text-gray-500 border border-gray-100 rounded-lg px-4 py-3 bg-white shadow-sm">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: lastRun.status === "SUCCESS" ? "#003087" : lastRun.status === "RUNNING" ? "#FFD700" : "#ef4444" }}
            />
            <span>{t(labels, "last_scan_label")} <strong>{new Date(lastRun.started_at).toLocaleString()}</strong></span>
            <span className="text-gray-300">·</span>
            <span><strong>{lastRun.scanned_count}</strong> {t(labels, "scanned")}</span>
            <span className="text-gray-300">·</span>
            <span style={{ color: "#003087" }}><strong>{asxAlertCount}</strong> {t(labels, "tickers_with_data")}</span>
            <Link href={`/run/${lastRun.id}`} className="ml-auto text-gray-400 hover:text-gray-700 underline underline-offset-2 text-xs">
              {t(labels, "view_run_detail")} →
            </Link>
          </div>
        )}

        {/* ASX Monitored Universe */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-3xl font-bold text-[#252525]">
              ASX Blue Chips
              <span className="text-lg font-normal text-gray-400 ml-2">🇦🇺 Australian Securities Exchange</span>
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <Link href="/alerts" className="hover:underline" style={{ color: "#003087" }}>View all alerts →</Link>
            </div>
          </div>

          {(() => {
            const sorted = [...ASX_UNIVERSE].sort((a, b) => {
              const pctA = priceMap[a.symbol] ? Number(priceMap[a.symbol].change_pct) : -Infinity;
              const pctB = priceMap[b.symbol] ? Number(priceMap[b.symbol].change_pct) : -Infinity;
              return (isNaN(pctB) ? -Infinity : pctB) - (isNaN(pctA) ? -Infinity : pctA);
            });

            const gridView = (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {sorted.map((t) => {
                  const analysis = alertMap[t.symbol];
                  const hasAlert = !!analysis;
                  const hasSnapshot = scannedSet.has(t.symbol);
                  const confidence = analysis?.confidence ?? 0;
                  const price = priceMap[t.symbol];
                  const closeNum = price ? Number(price.close) : null;
                  const changePct = price ? Number(price.change_pct) : null;
                  const isUp = changePct !== null && !isNaN(changePct) && changePct >= 0;
                  const cardStyle = changePct !== null && !isNaN(changePct) && changePct < 0
                    ? { background: "#fef2f2", border: "1.5px solid #fca5a5" }
                    : changePct !== null && !isNaN(changePct) && changePct >= 0
                    ? { background: "#f0fdf4", border: "1.5px solid #86efac" }
                    : { background: "#ffffff", border: "1px solid #e5e7eb" };
                  return (
                    <div key={t.symbol} className="relative rounded-xl px-4 pt-6 pb-4 transition-all duration-200 group shadow-sm hover:-translate-y-0.5" style={cardStyle}>
                      {hasAlert && (
                        <span className="absolute -top-2.5 -right-2.5 text-xs font-bold px-2 py-0.5 rounded-full shadow" style={{ background: "#2e8b57", color: "#fff" }}>
                          {analysis.alert_score > 0 ? "+" : ""}{analysis.alert_score.toFixed(1)}
                        </span>
                      )}
                      <div className="absolute top-1.5 right-1.5 z-10">
                        <WatchlistButton compact symbol={t.symbol} exchange="ASX" name={t.name} />
                      </div>
                      <Link href={`/ticker/${t.symbol}`} className="block pr-6">
                        <div className="font-bold text-base text-[#003087] group-hover:opacity-80">{t.symbol}</div>
                        <div className="text-gray-400 text-xs mt-0.5 truncate">{t.name}</div>
                        <div className="mt-2 space-y-0.5">
                          {price && closeNum !== null && !isNaN(closeNum) ? (
                            <>
                              <div className="text-sm font-semibold text-gray-700">A${closeNum.toFixed(2)}</div>
                              <div className="text-xs font-medium" style={{ color: isUp ? "#16a34a" : "#dc2626" }}>
                                {changePct !== null && !isNaN(changePct) ? `${isUp ? "+" : ""}${changePct.toFixed(2)}%` : ""}
                              </div>
                              <div className="text-[10px] text-gray-300">{price.trade_date}</div>
                            </>
                          ) : (
                            <div className="text-xs text-gray-300 mt-1">No price data</div>
                          )}
                        </div>
                        {hasAlert && (
                          <div className="mt-1.5 pt-1.5 border-t border-gray-100 space-y-0.5">
                            <div className="text-xs font-medium" style={{ color: "#92400e" }}>
                              {analysis.changed_pct != null && analysis.changed_pct > 90 ? "Significant change" : analysis.changed_pct != null ? `${analysis.changed_pct.toFixed(1)}% changed` : "—"}
                            </div>
                            <div className="text-xs text-gray-400">conf {Math.round(confidence * 100)}%</div>
                          </div>
                        )}
                        {!hasAlert && hasSnapshot && (
                          <div className="mt-1.5 pt-1.5 border-t border-gray-100"><span className="text-xs text-gray-400">✓ Baseline saved</span></div>
                        )}
                        {!hasAlert && !hasSnapshot && (
                          <div className="mt-1.5 pt-1.5 border-t border-gray-100"><span className="text-xs text-gray-300">Not yet scanned</span></div>
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
                      <th className="px-4 py-3 font-semibold">Ticker</th>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold text-right">Price</th>
                      <th className="px-4 py-3 font-semibold text-right">Change %</th>
                      <th className="px-4 py-3 font-semibold text-right">Date</th>
                      <th className="px-4 py-3 font-semibold text-center">Scan</th>
                      <th className="px-4 py-3 font-semibold text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((t, idx) => {
                      const price = priceMap[t.symbol];
                      const closeNum = price ? Number(price.close) : null;
                      const changePct = price ? Number(price.change_pct) : null;
                      const isUp = changePct !== null && !isNaN(changePct) && changePct >= 0;
                      const analysis = alertMap[t.symbol];
                      const rowBg = changePct !== null && !isNaN(changePct) && changePct < 0 ? "#fef2f2" : changePct !== null && !isNaN(changePct) && changePct >= 0 ? "#f0fdf4" : "#fff";
                      return (
                        <tr key={t.symbol} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors" style={{ background: rowBg }}>
                          <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <Link href={`/ticker/${t.symbol}`} className="font-bold hover:opacity-80" style={{ color: "#003087" }}>{t.symbol}</Link>
                          </td>
                          <td className="px-4 py-3 text-gray-500 truncate max-w-[200px]">{t.name}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-700">
                            {closeNum !== null && !isNaN(closeNum) ? `A$${closeNum.toFixed(2)}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold" style={{ color: isUp ? "#16a34a" : "#dc2626" }}>
                            {changePct !== null && !isNaN(changePct) ? `${isUp ? "+" : ""}${changePct.toFixed(2)}%` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-gray-400">{price?.trade_date ?? "—"}</td>
                          <td className="px-4 py-3 text-center text-xs">
                            {analysis ? (
                              <span className="text-amber-700 font-medium">{analysis.changed_pct != null && analysis.changed_pct > 90 ? "Sig. change" : analysis.changed_pct != null ? `${analysis.changed_pct.toFixed(1)}%` : "—"}</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <WatchlistButton compact symbol={t.symbol} exchange="ASX" name={t.name} />
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

        {/* How it works for ASX */}
        <div>
          <h2 className="text-2xl font-bold text-[#252525] mb-5">How ASX Monitoring Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { step: "1", label: "TinyFish Fetches ASX", desc: "Real-browser agent reads the ASX announcements feed for each monitored company" },
              { step: "2", label: "DataP.ai Cleans", desc: "Removes boilerplate, hashes announcement content, stores versioned snapshots in Postgres" },
              { step: "3", label: "Diff & Score", desc: "Detects new announcements, wording changes and language shifts in corporate disclosures" },
              { step: "4", label: "DataP.ai Financial Agents", desc: "Multi-agent pipeline: guidance withdrawal, risk expansion, tone shift — with investigation & validation" },
            ].map((item) => (
              <div key={item.step} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="font-bold text-3xl mb-3" style={{ color: "#003087" }}>{item.step}</div>
                <div className="text-[#252525] font-bold text-lg mb-2">{item.label}</div>
                <div className="text-gray-500 text-base">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ASX-specific trust note */}
        <div className="border border-blue-200 rounded-2xl p-8 bg-white shadow-sm">
          <h3 className="font-bold text-xl text-[#003087] mb-4">
            🇦🇺 ASX Intelligence — Powered by DataP.ai &amp; TinyFish
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-base text-gray-500">
            <div>
              <div className="font-semibold text-gray-700 mb-2">Source</div>
              ASX announcement feed · Company IR pages · Market-sensitive disclosures
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-2">Signals Detected</div>
              Guidance withdrawal · Risk disclosure expansion · Tone softening · New major announcements
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-2">Coverage</div>
              ASX Blue Chips: BHP, CBA, CSL, NAB, ANZ, WBC, WES, MQG, TLS, WOW, RIO, FMG
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
