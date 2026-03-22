/**
 * /ticker/[symbol]/intel  —  AI analysis page for a specific stock
 *
 * Green hero (consistent with all other pages), light main content.
 * Shows all 3 AI features via TechAnalyticsPanel with full width:
 *   1. Technical Signal  (TA — RSI/MACD/Bollinger/EMA)
 *   2. Chart Vision      (Gemini Vision chart pattern recognition)
 *   3. Fundamental Analysis (FA — valuation, cashflow, macro, investment thesis)
 * Signals are pre-warmed by the scan pipeline; otherwise generated on demand.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { UNIVERSE_ALL } from "@/lib/universe";
import { getTickerSnapshots, getLatestAnalysisWithAgentContent, lookupStock, getCachedTaSignal } from "@/lib/db";
import { fetchPrices } from "@/lib/price";
import { getLang } from "@/lib/getLang";
import { t } from "@/lib/translations";
import TechAnalyticsPanel from "../../../components/TechAnalyticsPanel";
import WatchlistButton from "../../../components/WatchlistButton";
import StockChatPanel from "../../../components/StockChatPanel";
import PriceChart from "../PriceChart";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  const sym = decodeURIComponent(symbol).toUpperCase();
  const ticker = UNIVERSE_ALL.find((t) => t.symbol === sym);
  return {
    title: `${sym} AI analysis — TinyFish × DataP.ai`,
    description: `Real-time AI technical signal, chart vision and fundamental analysis for ${ticker?.name ?? sym}.`,
  };
}

export default async function IntelPage({
  params,
  searchParams,
}: {
  params: Promise<{ symbol: string }>;
  searchParams?: Promise<Record<string, string>>;
}) {
  const { symbol } = await params;
  const sp = await searchParams;
  const autoRun = (sp?.run ?? null) as string | null;
  const sym = decodeURIComponent(symbol).toUpperCase();
  const lang = await getLang();

  const ticker = UNIVERSE_ALL.find((tk) => tk.symbol === sym);
  // Always look up from DB so we get sector for Market Intel (even for UNIVERSE_ALL tickers)
  const dirEntry = await lookupStock(sym);
  const exchangeLabel = (ticker?.exchange ?? dirEntry?.exchange ?? "NASDAQ") as string;
  const companyName = ticker?.name ?? dirEntry?.name ?? sym;

  const [snapshots, signalSource, cachedTaSignal, prices] = await Promise.all([
    getTickerSnapshots(sym, 1),
    getLatestAnalysisWithAgentContent(sym),
    getCachedTaSignal(sym, 48),
    fetchPrices(sym, 30, exchangeLabel === "ASX" ? "ASX" : undefined),
  ]);
  const latestSnap = snapshots[0] ?? null;

  // Sector: from stock_directory (lookupStock already fetched it)
  const sectorLabel = dirEntry?.sector ?? null;

  return (
    <div>
      {/* ── Green hero (consistent with all other pages) ───────────────────── */}
      <div
        className="w-full"
        style={{ background: "linear-gradient(45deg, seagreen, darkseagreen)", paddingTop: "32px", paddingBottom: "36px" }}
      >
        <div className="max-w-5xl mx-auto px-8 space-y-4">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <Link href="/intel" className="text-white/70 hover:text-white transition-colors font-medium">
              {t(lang, "stock_breadcrumb")}
            </Link>
            <span className="text-white/40">›</span>
            <Link
              href={`/ticker/${sym}`}
              className="text-white/70 hover:text-white transition-colors font-medium"
            >
              {sym}
            </Link>
            <span className="text-white/40">›</span>
            <span className="text-white/90">{t(lang, "stock_breadcrumb")}</span>
          </div>

          {/* Ticker + company name */}
          <div className="flex items-end gap-4 flex-wrap">
            <h1 className="text-5xl font-bold text-white drop-shadow-sm">{sym}</h1>
            <span className="text-xl text-white/80 font-light pb-1">{companyName}</span>
            <span
              className="text-xs font-bold px-3 py-1 rounded-full mb-1"
              style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }}
            >
              {exchangeLabel}
            </span>
          </div>

          {/* Data pipeline trace */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}>
              {t(lang, "stock_pipeline_tf")}
            </span>
            <span className="text-white/50 text-sm">+</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}>
              {t(lang, "stock_pipeline_yf")}
            </span>
            <span className="text-white/50 text-sm">→</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}>
              {t(lang, "stock_pipeline_ai")}
            </span>
            <span className="text-white/50 text-sm">→</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.25)", color: "#fff", fontWeight: 700 }}>
              {t(lang, "stock_pipeline_sig")}
            </span>
          </div>

          {/* CTAs row 1 */}
          <div className="flex items-center gap-3 flex-wrap pt-1">
            <WatchlistButton symbol={sym} exchange={exchangeLabel} name={companyName} />
            <Link
              href={`/ticker/${sym}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)" }}
            >
              {t(lang, "stock_cta_ir")}
            </Link>
            <Link
              href={`/ticker/${sym}/report`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:brightness-110"
              style={{ background: "#fd8412", color: "#fff" }}
            >
              {t(lang, "stock_cta_report")}
            </Link>
          </div>
          {/* Analysis type quick-access row */}
          <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr", justifyItems: "start" }}>
            <Link
              href={`/ticker/${sym}/intel?run=ta`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white uppercase tracking-wide text-sm shadow-md transition-all hover:brightness-110 hover:-translate-y-0.5"
              style={{ background: "#fd8412" }}
            >
              📈 Technical Analysis (TA)
            </Link>
            <Link
              href={`/ticker/${sym}/intel?run=fa`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white uppercase tracking-wide text-sm shadow-md transition-all hover:brightness-110 hover:-translate-y-0.5"
              style={{ background: "#fd8412" }}
            >
              📊 Fundamental Analysis (FA)
            </Link>
            <Link
              href={`/ticker/${sym}/intel?run=ma`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white uppercase tracking-wide text-sm shadow-md transition-all hover:brightness-110 hover:-translate-y-0.5"
              style={{ background: "#fd8412" }}
            >
              🌐 Market Analysis (MA)
            </Link>
            <Link
              href={`/ticker/${sym}/intel?run=ca`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white uppercase tracking-wide text-sm shadow-md transition-all hover:brightness-110 hover:-translate-y-0.5"
              style={{ background: "#fd8412" }}
            >
              💬 Chart Analysis (CA)
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────────── */}
      <div className="min-h-screen bg-[#fcfcfd]">
        <div className="max-w-5xl mx-auto px-8 py-10">

          {/* ── 30-Day Price Chart ──────────────────────────────────────────── */}
          {prices.length > 0 && (
            <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-3">
                📈 {sym} — 30 Day Price
                {prices.length > 0 && (
                  <span className="ml-3 text-sm font-normal text-gray-500">
                    {exchangeLabel === "ASX" ? "A$" : "$"}{prices[prices.length - 1].close.toFixed(2)}
                    {prices.length >= 2 && (() => {
                      const chg = ((prices[prices.length - 1].close - prices[0].close) / prices[0].close) * 100;
                      return (
                        <span className={chg >= 0 ? "text-green-600 ml-2" : "text-red-600 ml-2"}>
                          {chg >= 0 ? "+" : ""}{chg.toFixed(1)}%
                        </span>
                      );
                    })()}
                  </span>
                )}
              </h2>
              <PriceChart data={prices} scanDates={[]} exchange={exchangeLabel} />
            </div>
          )}

            {/* ── AI Research Co-pilot (top of section) */}
          <StockChatPanel
            symbol={sym}
            exchange={exchangeLabel}
            lang={lang}
            taSignalMd={cachedTaSignal?.signal_md ?? undefined}
            snapshotText={(latestSnap?.cleaned_text ?? latestSnap?.text ?? "").slice(0, 3000)}
          />

          {/* ── All 3 AI features: TA Signal · Chart Vision · Fundamental Analysis */}
          <TechAnalyticsPanel
            symbol={sym}
            exchange={exchangeLabel}
            sector={sectorLabel}
            snapshotText={(latestSnap?.cleaned_text ?? latestSnap?.text ?? "").slice(0, 4000)}
            latestHeadline={
              signalSource?.agent_what_changed
                ? signalSource.agent_what_changed.slice(0, 200)
                : `${companyName} — recent IR page update`
            }
            lang={lang}
            autoRun={autoRun}
          />

        </div>

        {/* Bottom nav between stocks */}
        <div className="max-w-5xl mx-auto px-8 pb-16">
          <div className="border-t border-gray-200 pt-8">
            <p className="text-gray-400 text-sm mb-4">{t(lang, "stock_other")}</p>
            <div className="flex flex-wrap gap-2">
              {UNIVERSE_ALL.filter((tk) => tk.symbol !== sym).slice(0, 18).map((tk) => (
                <Link
                  key={tk.symbol}
                  href={`/ticker/${tk.symbol}/intel`}
                  className="px-3 py-1 rounded-full text-xs font-bold transition-all hover:-translate-y-0.5"
                  style={tk.exchange === "ASX"
                    ? { background: "rgba(59,130,246,0.1)", color: "#2563eb", border: "1px solid rgba(59,130,246,0.25)" }
                    : { background: "rgba(46,139,87,0.1)", color: "#166534", border: "1px solid rgba(46,139,87,0.25)" }}
                >
                  {tk.symbol}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
