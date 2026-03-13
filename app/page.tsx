import Link from "next/link";
import Image from "next/image";
import { UNIVERSE } from "@/lib/universe";
import { getAlertSummaryMap, getRecentRuns } from "@/lib/db";
import LiveScanProgress from "./components/LiveScanProgress";
import TickerSearch from "./components/TickerSearch";
import WatchlistButton from "./components/WatchlistButton";

export const dynamic = "force-dynamic";

export default async function Home() {
  const alertMap = await getAlertSummaryMap();
  const alertCount = Object.keys(alertMap).length;
  const recentRuns = await getRecentRuns(3);
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
            US Stocks · Website Change Intelligence
          </h1>

          <p className="text-white/80 text-sm font-medium">
            Spot language shifts on company websites before they move stock prices —{" "}
            <span className="text-white font-bold">9,000+ US &amp; ASX stocks</span>{" "}
            covered · powered by{" "}
            <a href="https://tinyfish.ai" target="_blank" rel="noopener noreferrer"
              className="text-white font-bold underline underline-offset-2 hover:text-white/80 transition-colors">
              TinyFish
            </a>{" "}
            real-browser technology &amp; AI agents
          </p>

          <TickerSearch />

          <div className="flex gap-3 items-center flex-wrap">
            {alertCount > 0 && (
              <Link
                href="/alerts"
                className="px-6 py-2.5 rounded-lg font-bold uppercase tracking-wide transition-all hover:-translate-y-0.5"
                style={{ fontSize: "0.9rem", background: "#fd8412", color: "#fff" }}
              >
                ⚡ View {alertCount} Alert{alertCount !== 1 ? "s" : ""} →
              </Link>
            )}
            <LiveScanProgress heroButton />
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
            <span>Last scan: <strong>{new Date(lastRun.started_at).toLocaleString()}</strong></span>
            <span className="text-gray-300">·</span>
            <span><strong>{lastRun.scanned_count}</strong> scanned</span>
            <span className="text-gray-300">·</span>
            <span style={{ color: "#f97316" }}><strong>{lastRun.changed_count}</strong> changed</span>
            {lastRun.failed_count > 0 && (
              <>
                <span className="text-gray-300">·</span>
                <span
                  style={{ color: "#ef4444", cursor: "help" }}
                  title={`${lastRun.failed_count} IR pages were unreachable this scan — typically login-gated, paywalled, or temporarily down. These are retried automatically next run and do not affect signal quality for the stocks that completed successfully.`}
                >
                  <strong>{lastRun.failed_count}</strong> failed ⓘ
                </span>
              </>
            )}
            <Link href={`/run/${lastRun.id}`} className="ml-auto text-gray-400 hover:text-gray-700 underline underline-offset-2 text-xs">
              View run detail →
            </Link>
          </div>
        )}

        {/* Monitored universe */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-3xl font-bold text-[#252525]">Monitored Universe <span className="text-lg font-normal text-gray-400 ml-1">🇺🇸 US Markets</span></h2>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              {alertCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "#4ade80" }} />
                  = change detected
                </span>
              )}
              <Link href="/asx" className="text-brand hover:underline font-medium">🇦🇺 Australia →</Link>
              <Link href="/alerts" className="text-brand hover:underline">View all alerts →</Link>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {UNIVERSE.map((t) => {
              const analysis = alertMap[t.symbol];
              const hasAlert = !!analysis;
              const confidence = analysis?.confidence ?? 0;

              return (
                <div
                  key={t.symbol}
                  className="relative rounded-xl px-4 py-4 transition-all duration-200 group shadow-sm hover:-translate-y-0.5"
                  style={hasAlert
                    ? { background: "#f0fff4", border: "1.5px solid #4ade80" }
                    : { background: "#ffffff", border: "1px solid #e5e7eb" }
                  }
                >
                  {hasAlert && (
                    <span
                      className="absolute -top-2.5 -right-2.5 text-xs font-bold px-2 py-0.5 rounded-full shadow"
                      style={{ background: "#2e8b57", color: "#fff" }}
                    >
                      {analysis.alert_score > 0 ? "+" : ""}{analysis.alert_score.toFixed(1)}
                    </span>
                  )}
                  {/* Watchlist star — top-right of card */}
                  <div className="absolute top-1.5 right-1.5 z-10">
                    <WatchlistButton compact symbol={t.symbol} exchange="US" name={t.name} />
                  </div>
                  <Link href={`/ticker/${t.symbol}`} className="block pr-6">
                    <div className="font-bold text-base text-brand group-hover:opacity-80">
                      {t.symbol}
                    </div>
                    <div className="text-gray-400 text-xs mt-0.5 truncate">{t.name}</div>
                    {hasAlert && (
                      <div className="mt-2 space-y-0.5">
                        <div
                          className="text-xs font-medium"
                          style={{ color: "#166534" }}
                          title={analysis.changed_pct != null && analysis.changed_pct > 90
                            ? "Large baseline diff — page content significantly changed vs. initial snapshot"
                            : undefined}
                        >
                          {analysis.changed_pct != null
                            ? analysis.changed_pct > 90
                              ? "Significant change"
                              : `${analysis.changed_pct.toFixed(1)}% changed`
                            : "—"}
                        </div>
                        <div className="text-xs text-gray-400">
                          conf {Math.round(confidence * 100)}%
                        </div>
                      </div>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* How it works */}
        <div>
          <h2 className="text-3xl font-bold text-[#252525] mb-6">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Step 1 — TinyFish (special card with logo) */}
            <div className="bg-white border-2 border-[#2e8b57] rounded-2xl p-6 shadow-sm">
              <div className="text-brand font-bold text-3xl mb-3">1</div>
              <div className="flex items-center gap-2 mb-2">
                <Image src="/logos/tinyfish.svg" width={72} height={16} alt="TinyFish" style={{ height: "16px", width: "auto" }} />
                <span className="text-[#252525] font-bold text-lg">Fetches</span>
              </div>
              <div className="text-gray-500 text-base">Real browser rendering of JavaScript-heavy investor pages — no scraping shortcuts</div>
            </div>
            {/* Steps 2–4 */}
            {[
              { step: "2", label: "DataP.ai Cleans", desc: "Removes nav/footer noise, hashes content, stores versioned snapshots in SQLite" },
              { step: "3", label: "Diff & Score", desc: "Text diff detects wording shifts. Word-list scores measure commitment/hedging/risk" },
              { step: "4", label: "AI Signal", desc: "GPT/Gemini summary with direct quotes, confidence score, and price chart context" },
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
            DataP.ai Trust Layer — every alert is fully reproducible
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-base text-gray-500">
            <div>
              <div className="font-semibold text-gray-700 mb-2">Source &amp; Audit</div>
              Source URL · Snapshot hash · TinyFish run ID · Scan timestamp
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-2">Evidence</div>
              Before/after text · Diff snippet · Direct quotes from changed lines
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-2">AI Layer</div>
              Paid LLM summary (GPT/Gemini) · Signal classification · Confidence score
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
