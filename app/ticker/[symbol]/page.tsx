import { notFound } from "next/navigation";
import Link from "next/link";
import { UNIVERSE } from "@/lib/universe";
import { getTickerAlerts, getTickerSnapshots } from "@/lib/db";
import { getMockPrices } from "@/lib/price";
import PriceChart from "./PriceChart";

export const dynamic = "force-dynamic";

function deltaChip(label: string, value: number, invert = false) {
  const positive = invert ? value < 0 : value > 0;
  const color = positive ? "text-red-600" : value < 0 ? "text-green-600" : "text-gray-400";
  const sign = value > 0 ? "+" : "";
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
      <div className="text-gray-400 text-xs mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>
        {sign}{value.toFixed(2)}
      </div>
      <div className="text-gray-300 text-xs mt-1">per 1,000 words</div>
    </div>
  );
}

export default async function TickerPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const ticker = UNIVERSE.find((t) => t.symbol === symbol.toUpperCase());

  if (!ticker) notFound();

  const alerts = getTickerAlerts(symbol.toUpperCase(), 5);
  const snapshots = getTickerSnapshots(symbol.toUpperCase(), 2);
  const prices = getMockPrices(symbol.toUpperCase(), 30);

  const latest = alerts[0];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-[#252525]">{ticker.symbol}</h1>
            <span className="text-gray-400 text-lg">{ticker.name}</span>
          </div>
          <a
            href={ticker.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:text-brand-light text-sm mt-1 block"
          >
            {ticker.url} ↗
          </a>
        </div>
        <Link
          href="/alerts"
          className="text-gray-400 hover:text-[#252525] text-sm transition-colors"
        >
          ← All Alerts
        </Link>
      </div>

      {/* Latest change */}
      {latest ? (
        <>
          {/* Alert banner if score is notable */}
          {Math.abs(latest.alert_score) > 0.5 && (
            <div
              className="rounded-lg px-5 py-3 text-sm font-semibold flex items-center gap-2"
              style={
                latest.alert_score > 1
                  ? { background: "#fff3e0", color: "#92400e", border: "1.5px solid #fb923c" }
                  : latest.alert_score < -1
                  ? { background: "#f0fdf4", color: "#166534", border: "1.5px solid #4ade80" }
                  : { background: "#fffbea", color: "#92400e", border: "1.5px solid #f9b116" }
              }
            >
              <span>⚠</span>
              {latest.alert_score > 1
                ? "High-risk language detected — this company's page has shifted to more cautious wording."
                : latest.alert_score < -1
                ? "Positive signal — language has become more confident and committed."
                : "Moderate change detected on this company's page."}
            </div>
          )}

          {/* Score chips */}
          <div>
            <h2 className="text-lg font-semibold text-[#252525] mb-1">Language Shift Scores</h2>
            <p className="text-gray-400 text-xs mb-3">How the wording on this company's public page changed vs. the previous scan</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {deltaChip("Commitment ↓ bad", latest.commitment_delta, true)}
              {deltaChip("Hedging ↑ bad", latest.hedging_delta)}
              {deltaChip("Risk Words ↑ bad", latest.risk_delta)}
              <div
                className="rounded-lg p-4 text-center shadow-sm"
                style={
                  latest.alert_score > 1
                    ? { background: "#fff3e0", border: "1.5px solid #fb923c" }
                    : latest.alert_score < -1
                    ? { background: "#f0fdf4", border: "1.5px solid #4ade80" }
                    : { background: "#fffbea", border: "1.5px solid #f9b116" }
                }
              >
                <div className="text-gray-400 text-xs mb-1">Overall Risk Score</div>
                <div
                  className={`text-xl font-bold ${
                    latest.alert_score > 1
                      ? "text-red-600"
                      : latest.alert_score < -1
                      ? "text-green-600"
                      : "text-amber-600"
                  }`}
                >
                  {latest.alert_score > 0 ? "+" : ""}{latest.alert_score.toFixed(2)}
                </div>
                <div className="text-gray-400 text-xs mt-1">composite score</div>
              </div>
            </div>
          </div>

          {/* What changed */}
          <div>
            <h2 className="text-lg font-semibold text-[#252525] mb-1">
              What Changed on Their Page
            </h2>
            <p className="text-gray-400 text-xs mb-3">
              {latest.percent_changed.toFixed(1)}% of the page content changed since last scan
            </p>
            <pre className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-sm overflow-x-auto whitespace-pre-wrap text-gray-700 font-mono leading-relaxed">
              {latest.snippet}
            </pre>
            <div className="flex gap-6 mt-2 text-xs text-gray-400">
              <span className="text-green-600 font-medium">+{latest.added_lines} lines added</span>
              <span className="text-red-600 font-medium">−{latest.removed_lines} lines removed</span>
              <span>Detected: {new Date(latest.computed_at).toLocaleString()}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 shadow-sm">
          No changes detected yet for {ticker.symbol}. Run a scan to start tracking.
        </div>
      )}

      {/* Price Chart */}
      <div>
        <h2 className="text-lg font-semibold text-[#252525] mb-1">30-Day Price</h2>
        <p className="text-gray-400 text-xs mb-3">Mock data — for layout purposes only</p>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <PriceChart data={prices} />
        </div>
      </div>

      {/* Change history */}
      {alerts.length > 1 && (
        <div>
          <h2 className="text-lg font-semibold text-[#252525] mb-3">Change History</h2>
          <div className="space-y-2">
            {alerts.map((a) => (
              <div
                key={a.id}
                className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between shadow-sm"
              >
                <div>
                  <span className="text-gray-400 text-xs">
                    {new Date(a.computed_at).toLocaleString()}
                  </span>
                  <div className="text-sm text-gray-700 mt-0.5">
                    {a.percent_changed.toFixed(1)}% of page changed &nbsp;·&nbsp;
                    <span className="text-green-600">+{a.added_lines}</span>
                    {" / "}
                    <span className="text-red-600">−{a.removed_lines} lines</span>
                  </div>
                </div>
                <div
                  className={`font-bold text-lg ${
                    a.alert_score > 1
                      ? "text-red-600"
                      : a.alert_score < -1
                      ? "text-green-600"
                      : "text-amber-600"
                  }`}
                >
                  {a.alert_score > 0 ? "+" : ""}{a.alert_score.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Page scan history */}
      {snapshots.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[#252525] mb-3">Page Scan History</h2>
          <div className="space-y-2">
            {snapshots.map((s) => (
              <div
                key={s.id}
                className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between text-sm shadow-sm"
              >
                <span className="text-gray-400">{new Date(s.fetched_at).toLocaleString()}</span>
                <span className="text-gray-300 font-mono text-xs">{s.content_hash.slice(0, 16)}…</span>
                <span className="text-gray-400">{s.text.split(" ").length.toLocaleString()} words captured</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
