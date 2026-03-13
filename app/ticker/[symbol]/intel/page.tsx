/**
 * /ticker/[symbol]/intel  —  AI analysis page for a specific stock
 *
 * Green hero (consistent with all other pages), light main content.
 * Shows all 3 AI features via TechAnalyticsPanel with full width.
 * Signals are pre-warmed by the scan pipeline; otherwise generated on demand.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { UNIVERSE_ALL } from "@/lib/universe";
import { getTickerSnapshots, getLatestAnalysisWithAgentContent, lookupStock } from "@/lib/db";
import { resolveTickerUrl } from "@/lib/scan-pipeline";
import TechAnalyticsPanel from "../../../components/TechAnalyticsPanel";
import WatchlistButton from "../../../components/WatchlistButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();
  const ticker = UNIVERSE_ALL.find((t) => t.symbol === sym);
  return {
    title: `${sym} AI analysis — TinyFish × DataP.ai`,
    description: `Real-time AI technical signal, chart vision and trading analysis for ${ticker?.name ?? sym}.`,
  };
}

export default async function IntelPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();

  const ticker = UNIVERSE_ALL.find((t) => t.symbol === sym);
  const dirEntry = ticker ? null : lookupStock(sym);
  const exchangeLabel = (ticker?.exchange ?? dirEntry?.exchange ?? "NASDAQ") as string;
  const companyName = ticker?.name ?? dirEntry?.name ?? sym;

  const snapshots = getTickerSnapshots(sym, 1);
  const latestSnap = snapshots[0] ?? null;
  const signalSource = getLatestAnalysisWithAgentContent(sym);

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
              AI analysis
            </Link>
            <span className="text-white/40">›</span>
            <Link
              href={`/ticker/${sym}`}
              className="text-white/70 hover:text-white transition-colors font-medium"
            >
              {sym}
            </Link>
            <span className="text-white/40">›</span>
            <span className="text-white/90">AI analysis</span>
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
              🌊 TinyFish IR scan
            </span>
            <span className="text-white/50 text-sm">+</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}>
              Yahoo Finance OHLCV
            </span>
            <span className="text-white/50 text-sm">→</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}>
              Gemini + GPT‑5.1
            </span>
            <span className="text-white/50 text-sm">→</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.25)", color: "#fff", fontWeight: 700 }}>
              Actionable Signal
            </span>
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-3 flex-wrap pt-1">
            <WatchlistButton symbol={sym} exchange={exchangeLabel} name={companyName} />
            <Link
              href={`/ticker/${sym}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)" }}
            >
              ← IR Signal page
            </Link>
            <Link
              href={`/ticker/${sym}/report`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:brightness-110"
              style={{ background: "#fd8412", color: "#fff" }}
            >
              📋 Full Report
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main content (light, consistent with other pages) ─────────────── */}
      <div className="min-h-screen bg-[#fcfcfd]">
        <div className="max-w-5xl mx-auto px-8 py-10">
          <TechAnalyticsPanel
            symbol={sym}
            exchange={exchangeLabel}
            snapshotText={(latestSnap?.cleaned_text ?? latestSnap?.text ?? "").slice(0, 4000)}
            latestHeadline={
              signalSource?.agent_what_changed
                ? signalSource.agent_what_changed.slice(0, 200)
                : `${companyName} — recent IR page update`
            }
          />
        </div>

        {/* Bottom nav between stocks */}
        <div className="max-w-5xl mx-auto px-8 pb-16">
          <div className="border-t border-gray-200 pt-8">
            <p className="text-gray-400 text-sm mb-4">Other stocks in the monitored universe</p>
            <div className="flex flex-wrap gap-2">
              {UNIVERSE_ALL.filter((t) => t.symbol !== sym).slice(0, 18).map((t) => (
                <Link
                  key={t.symbol}
                  href={`/ticker/${t.symbol}/intel`}
                  className="px-3 py-1 rounded-full text-xs font-bold transition-all hover:-translate-y-0.5"
                  style={t.exchange === "ASX"
                    ? { background: "rgba(59,130,246,0.1)", color: "#2563eb", border: "1px solid rgba(59,130,246,0.25)" }
                    : { background: "rgba(46,139,87,0.1)", color: "#166534", border: "1px solid rgba(46,139,87,0.25)" }}
                >
                  {t.symbol}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
