import Link from "next/link";
import { UNIVERSE } from "@/lib/universe";
import { getAlertSummaryMap, getRecentRuns } from "@/lib/db";
import ViewAlertsButton from "./components/ViewAlertsButton";
import LiveScanProgress from "./components/LiveScanProgress";

export const dynamic = "force-dynamic";

export default function Home() {
  const alertMap = getAlertSummaryMap();
  const alertCount = Object.keys(alertMap).length;
  const recentRuns = getRecentRuns(3);
  const lastRun = recentRuns[0] ?? null;

  return (
    <div>
      {/* ── Full-width green gradient hero ── */}
      <div
        className="w-full px-6 pt-14 pb-14 text-center"
        style={{ background: "linear-gradient(45deg, seagreen, darkseagreen)" }}
      >
        <div className="max-w-3xl mx-auto space-y-5">

          {/* Yellow badge */}
          <div
            className="inline-flex items-center gap-2 text-sm"
            style={{
              background: "#f9b116",
              color: "#ffffff",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              borderRadius: "6px",
              padding: "8px 20px",
              fontSize: "0.8rem",
              textShadow: "0 1px 2px rgba(0,0,0,0.25)",
            }}
          >
            <span className="w-2 h-2 rounded-full bg-white/60 animate-pulse inline-block" />
            DataPAI &nbsp;·&nbsp; Powered by TinyFish &amp; ag2
          </div>

          <h1 className="text-4xl font-bold text-white drop-shadow-sm">
            Stock Website Change Radar
          </h1>
          <p className="text-white/80 text-lg max-w-xl mx-auto">
            TinyFish scans real company investor pages. DataPAI cleans, diffs,
            scores, and surfaces language-shift alerts with evidence and price context.
          </p>

          {/* Live scan widget */}
          <div className="pt-2 flex justify-center">
            <LiveScanProgress />
          </div>

          {/* View alerts CTA */}
          <div className="flex justify-center pt-1">
            <ViewAlertsButton count={alertCount} />
          </div>

          {/* Partner chips */}
          <div className="flex items-center justify-center gap-4 pt-3 opacity-85">
            <span className="text-white/60 text-xs uppercase tracking-widest">Powered by</span>
            <span className="bg-white/95 rounded px-3 py-1 flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tinyfish-logo.svg" alt="TinyFish" style={{ height: "20px", width: "auto" }} />
            </span>
            <span className="text-white/50 text-sm">&amp;</span>
            <span className="bg-white/95 rounded px-3 py-1 flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ag2-logo.png" alt="ag2" style={{ height: "20px", width: "auto" }} />
            </span>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">

        {/* Last run status bar */}
        {lastRun && (
          <div className="flex items-center gap-4 text-sm text-gray-500 border border-gray-100 rounded-lg px-4 py-3 bg-white shadow-sm">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: lastRun.status === "SUCCESS" ? "#2e8b57" : lastRun.status === "RUNNING" ? "#f9b116" : "#ef4444" }}
            />
            <span>Last scan: <strong>{new Date(lastRun.started_at).toLocaleString()}</strong></span>
            <span>·</span>
            <span>{lastRun.scanned_count} scanned</span>
            <span>·</span>
            <span style={{ color: "#f97316" }}>{lastRun.changed_count} changed</span>
            {lastRun.failed_count > 0 && (
              <><span>·</span><span style={{ color: "#ef4444" }}>{lastRun.failed_count} failed</span></>
            )}
            <Link href={`/run/${lastRun.id}`} className="ml-auto text-gray-400 hover:text-gray-700 underline underline-offset-2 text-xs">
              View run detail →
            </Link>
          </div>
        )}

        {/* How it works */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: "1", label: "Fetch", desc: "TinyFish renders JavaScript-heavy investor pages in a real browser" },
            { step: "2", label: "Clean & Store", desc: "DataPAI removes nav/footer noise, hashes content, stores versioned snapshots" },
            { step: "3", label: "Diff & Score", desc: "Text diff detects wording shifts. Word-list scores measure commitment/hedging/risk" },
            { step: "4", label: "Alert & Explain", desc: "AI summary with direct quotes, confidence score, and price chart context" },
          ].map((item) => (
            <div key={item.step} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="text-brand font-bold text-2xl mb-2">{item.step}</div>
              <div className="text-[#252525] font-semibold mb-1">{item.label}</div>
              <div className="text-gray-500 text-sm">{item.desc}</div>
            </div>
          ))}
        </div>

        {/* Monitored universe */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#252525]">Monitored Universe</h2>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              {alertCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "#f9b116" }} />
                  = change detected
                </span>
              )}
              <Link href="/alerts" className="text-brand hover:underline">View all alerts →</Link>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {UNIVERSE.map((t) => {
              const analysis = alertMap[t.symbol];
              const hasAlert = !!analysis;
              const confidence = analysis?.confidence ?? 0;

              return (
                <Link
                  key={t.symbol}
                  href={`/ticker/${t.symbol}`}
                  className="relative rounded-lg px-4 py-3 transition-all duration-200 group shadow-sm hover:-translate-y-0.5"
                  style={hasAlert
                    ? { background: "#fffbea", border: "1.5px solid #f9b116" }
                    : { background: "#ffffff", border: "1px solid #e5e7eb" }
                  }
                >
                  {hasAlert && (
                    <span
                      className="absolute -top-2 -right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow"
                      style={{ background: "#f9b116", color: "#252525" }}
                    >
                      {analysis.alert_score > 0 ? "+" : ""}{analysis.alert_score.toFixed(1)}
                    </span>
                  )}
                  <div className={`font-bold text-sm ${hasAlert ? "text-[#252525]" : "text-brand"} group-hover:opacity-80`}>
                    {t.symbol}
                  </div>
                  <div className="text-gray-400 text-xs mt-0.5 truncate">{t.name}</div>
                  {hasAlert && (
                    <div className="mt-1.5 space-y-0.5">
                      <div className="text-[10px] font-medium" style={{ color: "#b45309" }}>
                        {(analysis as { changed_pct?: number }).changed_pct?.toFixed(1) ?? "?"}% changed
                      </div>
                      <div className="text-[9px] text-gray-400">
                        conf {Math.round(confidence * 100)}%
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Trust layer callout */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
          <h3 className="font-semibold text-[#252525] mb-3">
            📋 DataPAI Trust Layer — every alert is fully reproducible
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-500">
            <div>
              <div className="font-medium text-gray-700 mb-1">Source &amp; Audit</div>
              Source URL · Snapshot hash · TinyFish run ID · Scan timestamp
            </div>
            <div>
              <div className="font-medium text-gray-700 mb-1">Evidence</div>
              Before/after text · Diff snippet · Direct quotes from changed lines
            </div>
            <div>
              <div className="font-medium text-gray-700 mb-1">AI Layer</div>
              Paid LLM summary (GPT/Gemini) · Private LLM mode · Confidence score
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
