import { notFound } from "next/navigation";
import Link from "next/link";
import { UNIVERSE } from "@/lib/universe";
import { getTickerAlerts, getTickerSnapshots } from "@/lib/db";
import { getMockPrices } from "@/lib/price";
import PriceChart from "./PriceChart";

export const dynamic = "force-dynamic";

function deltaChip(label: string, value: number, invert = false) {
  const positive = invert ? value < 0 : value > 0;
  const color = positive ? "text-red-400" : value < 0 ? "text-green-400" : "text-slate-400";
  const sign = value > 0 ? "+" : "";
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
      <div className="text-slate-400 text-xs mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>
        {sign}{value.toFixed(2)}
      </div>
      <div className="text-slate-600 text-xs mt-1">per 1K words</div>
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">{ticker.symbol}</h1>
            <span className="text-slate-400 text-lg">{ticker.name}</span>
          </div>
          <a
            href={ticker.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm mt-1 block"
          >
            {ticker.url} ↗
          </a>
        </div>
        <Link
          href="/alerts"
          className="text-slate-400 hover:text-white text-sm transition-colors"
        >
          ← All Alerts
        </Link>
      </div>

      {/* Score Deltas */}
      {latest ? (
        <>
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">Latest Language Shift</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {deltaChip("Commitment Δ", latest.commitment_delta, true)}
              {deltaChip("Hedging Δ", latest.hedging_delta)}
              {deltaChip("Risk Δ", latest.risk_delta)}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
                <div className="text-slate-400 text-xs mb-1">Alert Score</div>
                <div
                  className={`text-xl font-bold ${
                    latest.alert_score > 1
                      ? "text-red-400"
                      : latest.alert_score < -1
                      ? "text-green-400"
                      : "text-yellow-400"
                  }`}
                >
                  {latest.alert_score > 0 ? "+" : ""}{latest.alert_score.toFixed(2)}
                </div>
                <div className="text-slate-600 text-xs mt-1">composite</div>
              </div>
            </div>
          </div>

          {/* Diff snippet */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">
              Diff Snippet — {latest.percent_changed.toFixed(1)}% changed
            </h2>
            <pre className="bg-slate-900 border border-slate-700 rounded-xl p-5 text-sm overflow-x-auto whitespace-pre-wrap text-slate-300 font-mono leading-relaxed">
              {latest.snippet}
            </pre>
            <div className="flex gap-6 mt-2 text-xs text-slate-500">
              <span className="text-green-400">+{latest.added_lines} added</span>
              <span className="text-red-400">−{latest.removed_lines} removed</span>
              <span>{new Date(latest.computed_at).toLocaleString()}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center text-slate-400">
          No alerts yet for {ticker.symbol}. Run a scan to collect snapshots.
        </div>
      )}

      {/* Price Chart */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">30-Day Price (Mock)</h2>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <PriceChart data={prices} />
        </div>
        <p className="text-slate-600 text-xs mt-2">
          * Mock price data for demo purposes only. Not financial data.
        </p>
      </div>

      {/* Alert History */}
      {alerts.length > 1 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Alert History</h2>
          <div className="space-y-2">
            {alerts.map((a) => (
              <div
                key={a.id}
                className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <span className="text-slate-500 text-xs">
                    {new Date(a.computed_at).toLocaleString()}
                  </span>
                  <div className="text-sm text-slate-300 mt-0.5">
                    {a.percent_changed.toFixed(1)}% changed · +{a.added_lines} / −{a.removed_lines}
                  </div>
                </div>
                <div
                  className={`font-bold text-lg ${
                    a.alert_score > 1
                      ? "text-red-400"
                      : a.alert_score < -1
                      ? "text-green-400"
                      : "text-yellow-400"
                  }`}
                >
                  {a.alert_score > 0 ? "+" : ""}{a.alert_score.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Snapshot info */}
      {snapshots.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Snapshots</h2>
          <div className="space-y-2">
            {snapshots.map((s) => (
              <div
                key={s.id}
                className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex items-center justify-between text-sm"
              >
                <span className="text-slate-400">{new Date(s.fetched_at).toLocaleString()}</span>
                <span className="text-slate-600 font-mono text-xs">{s.content_hash.slice(0, 16)}…</span>
                <span className="text-slate-400">{s.text.split(" ").length.toLocaleString()} words</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
