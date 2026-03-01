import Link from "next/link";
import { getLatestAlerts } from "@/lib/db";
import { UNIVERSE } from "@/lib/universe";

function scoreColor(score: number): string {
  if (score > 1) return "text-red-600";
  if (score > 0) return "text-amber-600";
  if (score < -1) return "text-green-600";
  return "text-gray-400";
}

/** Yellow-highlight rows where anything changed; deeper amber for high-risk scores */
function rowStyle(score: number): React.CSSProperties {
  if (score > 1) return { background: "#fff3e0" };    // warm amber — high risk language
  if (score > 0) return { background: "#fffbea" };    // light yellow — moderate change
  if (score < -1) return { background: "#f0fdf4" };   // light green — positive shift
  return {};
}

export const dynamic = "force-dynamic";

export default function AlertsPage() {
  const alerts = getLatestAlerts(50);
  const universe = Object.fromEntries(UNIVERSE.map((t) => [t.symbol, t.name]));
  const changed = alerts.filter((a) => a.alert_score !== 0).length;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#252525]">Change Alerts</h1>
          <p className="text-gray-500 text-sm mt-1">
            Latest detected page changes per stock — sorted by risk score (higher = more cautious language on their site).
          </p>
        </div>
        {changed > 0 && (
          <span
            className="text-sm font-bold px-4 py-1.5 rounded self-start"
            style={{ background: "#f9b116", color: "#252525" }}
          >
            {changed} stock{changed !== 1 ? "s" : ""} with changes
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <div className="text-gray-400 text-lg mb-2">No changes detected yet</div>
          <p className="text-gray-400 text-sm mb-6">
            Run a scan from the home page to start tracking company page changes.
          </p>
          <Link
            href="/"
            className="bg-brand-dark hover:bg-brand-darker text-white px-5 py-2 rounded text-sm font-semibold uppercase tracking-wide transition-colors"
          >
            Go Home →
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
          {/* Legend */}
          <div className="px-6 pt-4 pb-2 flex flex-wrap gap-4 text-xs text-gray-400 border-b border-gray-100">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#fffbea", border: "1px solid #f9b116" }} />
              Moderate change
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#fff3e0", border: "1px solid #fb923c" }} />
              High-risk language shift
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#f0fdf4", border: "1px solid #4ade80" }} />
              Positive / more committed language
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 text-left text-xs uppercase tracking-wide">
                <th className="py-3 px-6">Ticker</th>
                <th className="py-3 pr-6">Company</th>
                <th className="py-3 pr-6 text-right">Risk Score</th>
                <th className="py-3 pr-6 text-right">% Changed</th>
                <th className="py-3 pr-6 text-right">Added</th>
                <th className="py-3 pr-6 text-right">Removed</th>
                <th className="py-3 pr-6">Detected</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-gray-100 transition-colors hover:brightness-95"
                  style={rowStyle(a.alert_score)}
                >
                  <td className="py-3 px-6">
                    <Link
                      href={`/ticker/${a.ticker}`}
                      className="text-brand font-bold hover:text-brand-light"
                    >
                      {a.ticker}
                    </Link>
                  </td>
                  <td className="py-3 pr-6 text-gray-700">
                    {universe[a.ticker] ?? a.ticker}
                  </td>
                  <td className={`py-3 pr-6 text-right font-bold ${scoreColor(a.alert_score)}`}>
                    {a.alert_score > 0 ? "+" : ""}{a.alert_score.toFixed(2)}
                  </td>
                  <td className="py-3 pr-6 text-right text-gray-700">
                    {a.percent_changed.toFixed(1)}%
                  </td>
                  <td className="py-3 pr-6 text-right text-green-600 font-medium">
                    +{a.added_lines}
                  </td>
                  <td className="py-3 pr-6 text-right text-red-600 font-medium">
                    −{a.removed_lines}
                  </td>
                  <td className="py-3 pr-6 text-gray-400 text-xs">
                    {new Date(a.computed_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
