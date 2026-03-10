import Link from "next/link";
import Image from "next/image";
import { ASX_UNIVERSE } from "@/lib/universe";
import { getAlertSummaryMap, getRecentRuns } from "@/lib/db";
import LiveScanProgress from "../components/LiveScanProgress";
import TickerSearch from "../components/TickerSearch";

export const dynamic = "force-dynamic";

export default function AsxPage() {
  const alertMap = getAlertSummaryMap();
  const recentRuns = getRecentRuns(3);
  const lastRun = recentRuns[0] ?? null;
  const asxAlertCount = ASX_UNIVERSE.filter((t) => !!alertMap[t.symbol]).length;

  return (
    <div>
      {/* ── Full-width hero (gold/navy for Australia feel) ── */}
      <div
        className="w-full flex flex-col justify-center"
        style={{
          background: "linear-gradient(45deg, #003087, #005eb8)",
          paddingTop: "36px",
          paddingBottom: "36px",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 space-y-4">
          {/* Badge */}
          <div className="flex items-center gap-3">
            <span className="bg-yellow-400 text-blue-900 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">
              🇦🇺 ASX · Australia
            </span>
            <Image src="/logos/asx.svg" width={40} height={22} alt="ASX" style={{ height: "22px", width: "auto" }} />
          </div>

          {/* Headline */}
          <h1 className="text-5xl font-bold text-white drop-shadow-sm leading-tight">
            ASX Company Intelligence<br />
            <span className="text-white/80">Powered by DataP.ai &amp; TinyFish</span>
          </h1>

          <p className="text-white/75 text-xl">
            Monitoring ASX announcements for financial signals —<br />
            guidance changes, risk disclosures &amp; tone shifts.
          </p>

          {/* Try your own ASX ticker */}
          <div className="pt-1">
            <p className="text-white/60 text-sm mb-2 font-medium uppercase tracking-wide">Try any ASX ticker</p>
            <TickerSearch />
          </div>

          {/* CTA */}
          <div className="flex gap-3 pt-1">
            <Link
              href="/alerts"
              className="px-6 py-3 rounded-lg font-bold uppercase tracking-wide transition-all hover:-translate-y-0.5"
              style={{ fontSize: "0.9rem", background: "#FFD700", color: "#003087", textShadow: "none" }}
            >
              ⚡ View All Alerts →
            </Link>
            <Link
              href="/"
              className="px-6 py-3 rounded-lg font-bold uppercase tracking-wide transition-all hover:-translate-y-0.5 border border-white/30 text-white/90"
              style={{ fontSize: "0.9rem", background: "rgba(255,255,255,0.1)" }}
            >
              🇺🇸 US Markets
            </Link>
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
            <span>Last scan: <strong>{new Date(lastRun.started_at).toLocaleString()}</strong></span>
            <span className="text-gray-300">·</span>
            <span><strong>{lastRun.scanned_count}</strong> scanned</span>
            <span className="text-gray-300">·</span>
            <span style={{ color: "#003087" }}><strong>{asxAlertCount}</strong> ASX tickers with data</span>
            <Link href={`/run/${lastRun.id}`} className="ml-auto text-gray-400 hover:text-gray-700 underline underline-offset-2 text-xs">
              View run detail →
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

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {ASX_UNIVERSE.map((t) => {
              const analysis = alertMap[t.symbol];
              const hasAlert = !!analysis;
              const confidence = analysis?.confidence ?? 0;

              return (
                <Link
                  key={t.symbol}
                  href={`/ticker/${t.symbol}`}
                  className="relative rounded-xl px-4 py-4 transition-all duration-200 group shadow-sm hover:-translate-y-0.5"
                  style={hasAlert
                    ? { background: "#fffbe6", border: "1.5px solid #FFD700" }
                    : { background: "#ffffff", border: "1px solid #e5e7eb" }
                  }
                >
                  {hasAlert && (
                    <span
                      className="absolute -top-2.5 -right-2.5 text-xs font-bold px-2 py-0.5 rounded-full shadow"
                      style={{ background: "#FFD700", color: "#003087" }}
                    >
                      {analysis.alert_score > 0 ? "+" : ""}{analysis.alert_score.toFixed(1)}
                    </span>
                  )}
                  <div className={`font-bold text-base ${hasAlert ? "text-[#003087]" : "text-[#003087]"} group-hover:opacity-80`}>
                    {t.symbol}
                  </div>
                  <div className="text-gray-400 text-xs mt-0.5 truncate">{t.name}</div>
                  {hasAlert && (
                    <div className="mt-2 space-y-0.5">
                      <div className="text-xs font-medium" style={{ color: "#92400e" }}>
                        {analysis.changed_pct != null && analysis.changed_pct > 90
                          ? "Significant change"
                          : analysis.changed_pct != null
                          ? `${analysis.changed_pct.toFixed(1)}% changed`
                          : "—"}
                      </div>
                      <div className="text-xs text-gray-400">
                        conf {Math.round(confidence * 100)}%
                      </div>
                    </div>
                  )}
                  {!hasAlert && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-300">Not yet scanned</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Scan notice */}
          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 px-6 py-4 text-sm text-blue-700">
            <strong>ASX monitoring is being activated.</strong> Run a live scan to fetch the latest ASX announcements for all monitored companies.
            Use the "Run Live Scan" button on the home page, or the agent will scan automatically on its next scheduled run.
          </div>
        </div>

        {/* How it works for ASX */}
        <div>
          <h2 className="text-2xl font-bold text-[#252525] mb-5">How ASX Monitoring Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { step: "1", label: "TinyFish Fetches ASX", desc: "Real-browser agent reads the ASX announcements feed for each monitored company" },
              { step: "2", label: "DataP.ai Cleans", desc: "Removes boilerplate, hashes announcement content, stores versioned snapshots in SQLite" },
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
