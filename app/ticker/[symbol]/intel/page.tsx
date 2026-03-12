/**
 * /ticker/[symbol]/intel  —  AI Intelligence page for a specific stock
 *
 * Dark-themed hero (consistent with AI branding), same layout as ticker page.
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
    title: `${sym} AI Intelligence — TinyFish × DataP.ai`,
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
      {/* ── Dark gradient hero (AI / tech feel) ────────────────────────────── */}
      <div
        className="w-full"
        style={{
          background: "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)",
          paddingTop: "32px",
          paddingBottom: "36px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="max-w-5xl mx-auto px-8 space-y-4">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <Link href="/intel" className="text-white/40 hover:text-white/70 transition-colors">
              AI Intel
            </Link>
            <span className="text-white/20">›</span>
            <Link
              href={`/ticker/${sym}`}
              className="text-white/40 hover:text-white/70 transition-colors"
            >
              {sym}
            </Link>
            <span className="text-white/20">›</span>
            <span className="text-white/60">AI Intelligence</span>
          </div>

          {/* Ticker + company name */}
          <div className="flex items-end gap-4 flex-wrap">
            <h1 className="text-5xl font-bold text-white drop-shadow-sm">{sym}</h1>
            <span className="text-xl text-white/60 font-light pb-1">{companyName}</span>
            <span
              className="text-xs font-bold px-3 py-1 rounded-full mb-1"
              style={{ background: "rgba(99,102,241,0.3)", color: "#a5b4fc" }}
            >
              {exchangeLabel}
            </span>
          </div>

          {/* Data pipeline trace */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(46,139,87,0.3)", color: "#86efac" }}>
              🌊 TinyFish IR scan
            </span>
            <span className="text-white/25 text-sm">+</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
              Yahoo Finance OHLCV
            </span>
            <span className="text-white/25 text-sm">→</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(99,102,241,0.3)", color: "#a5b4fc" }}>
              Gemini + GPT‑5.1
            </span>
            <span className="text-white/25 text-sm">→</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(253,132,18,0.3)", color: "#fdba74" }}>
              Actionable Signal
            </span>
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-3 flex-wrap pt-1">
            <WatchlistButton symbol={sym} exchange={exchangeLabel} name={companyName} />
            <Link
              href={`/ticker/${sym}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              ← IR Signal page
            </Link>
            <Link
              href={`/ticker/${sym}/report`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              📋 Full Report
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div
        className="min-h-screen"
        style={{ background: "linear-gradient(180deg, #0f0f23 0%, #111827 100%)" }}
      >
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
          <div className="border-t border-white/5 pt-8">
            <p className="text-white/30 text-sm mb-4">Other stocks in the monitored universe</p>
            <div className="flex flex-wrap gap-2">
              {UNIVERSE_ALL.filter((t) => t.symbol !== sym).slice(0, 18).map((t) => (
                <Link
                  key={t.symbol}
                  href={`/ticker/${t.symbol}/intel`}
                  className="px-3 py-1 rounded-full text-xs font-bold transition-all hover:-translate-y-0.5"
                  style={t.exchange === "ASX"
                    ? { background: "rgba(59,130,246,0.15)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.2)" }
                    : { background: "rgba(46,139,87,0.15)", color: "#86efac", border: "1px solid rgba(46,139,87,0.2)" }}
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
