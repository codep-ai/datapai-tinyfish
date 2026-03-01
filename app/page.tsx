import Link from "next/link";
import { UNIVERSE } from "@/lib/universe";
import { getAlertSummaryMap } from "@/lib/db";
import RunScanButton from "./components/RunScanButton";
import ViewAlertsButton from "./components/ViewAlertsButton";

export const dynamic = "force-dynamic";

export default function Home() {
  const alertMap = getAlertSummaryMap();
  const alertCount = Object.keys(alertMap).length;

  return (
    <div>
      {/* ── Full-width green gradient hero ── */}
      <div
        className="w-full px-6 pt-14 pb-14 text-center"
        style={{ background: "linear-gradient(45deg, seagreen, darkseagreen)" }}
      >
        <div className="max-w-3xl mx-auto space-y-5">

          {/* Yellow badge — datap.ai #f9b116 CTA style, bold white text */}
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
            Monitors company news &amp; earnings pages of 20 US small-cap stocks.
            Detects wording shifts, scores language changes, and surfaces alerts
            with price context.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 justify-center pt-2 items-center">
            <ViewAlertsButton count={alertCount} />
            <RunScanButton />
          </div>

          {/* Partner logo chips */}
          <div className="flex items-center justify-center gap-4 pt-4 opacity-85">
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

      {/* ── Constrained content ── */}
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">

        {/* How it works */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: "1", label: "Fetch", desc: "TinyFish renders JavaScript-heavy company pages in a real browser" },
            { step: "2", label: "Store", desc: "Daily snapshots saved to database with content hashing" },
            { step: "3", label: "Diff", desc: "Text diff detects added or removed language" },
            { step: "4", label: "Score", desc: "Commitment, hedging, and risk word shifts computed via ag2 agents" },
          ].map((item) => (
            <div key={item.step} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="text-brand font-bold text-2xl mb-2">{item.step}</div>
              <div className="text-[#252525] font-semibold mb-1">{item.label}</div>
              <div className="text-gray-500 text-sm">{item.desc}</div>
            </div>
          ))}
        </div>

        {/* Monitored universe — ticker grid with live alert badges */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#252525]">Monitored Universe</h2>
            {alertCount > 0 && (
              <span className="text-xs text-gray-400">
                <span className="inline-block w-3 h-3 rounded-sm mr-1 align-middle" style={{ background: "#f9b116" }} />
                = page changed since last scan
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {UNIVERSE.map((t) => {
              const alert = alertMap[t.symbol];
              const hasAlert = !!alert;

              return (
                <Link
                  key={t.symbol}
                  href={`/ticker/${t.symbol}`}
                  className="relative rounded-lg px-4 py-3 transition-all duration-200 group shadow-sm"
                  style={
                    hasAlert
                      ? {
                          background: "#fffbea",
                          border: "1.5px solid #f9b116",
                        }
                      : {
                          background: "#ffffff",
                          border: "1px solid #e5e7eb",
                        }
                  }
                >
                  {/* Alert badge — top right */}
                  {hasAlert && (
                    <span
                      className="absolute -top-2 -right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow"
                      style={{ background: "#f9b116", color: "#252525" }}
                    >
                      {alert.alert_score > 0 ? "+" : ""}
                      {alert.alert_score.toFixed(1)}
                    </span>
                  )}

                  <div className={`font-bold text-sm ${hasAlert ? "text-[#252525]" : "text-brand"} group-hover:opacity-80`}>
                    {t.symbol}
                  </div>
                  <div className="text-gray-400 text-xs mt-0.5 truncate">{t.name}</div>

                  {/* Diff summary line */}
                  {hasAlert && (
                    <div className="mt-1.5 text-[10px] font-medium" style={{ color: "#b45309" }}>
                      {alert.percent_changed.toFixed(1)}% changed &nbsp;
                      <span className="text-green-700">+{alert.added_lines}</span>
                      {" / "}
                      <span className="text-red-600">−{alert.removed_lines}</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
