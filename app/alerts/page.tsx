import Link from "next/link";
import { getLatestAlerts } from "@/lib/db";
import { UNIVERSE } from "@/lib/universe";

function scoreColor(score: number): string {
  if (score > 1) return "text-red-400";
  if (score > 0) return "text-yellow-400";
  if (score < -1) return "text-green-400";
  return "text-slate-400";
}

export const dynamic = "force-dynamic";

export default function AlertsPage() {
  const alerts = getLatestAlerts(50);
  const universe = Object.fromEntries(UNIVERSE.map((t) => [t.symbol, t.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Change Alerts</h1>
        <p className="text-slate-400 text-sm mt-1">
          Sorted by alert score (hedging + risk − commitment). Higher = more cautious language.
        </p>
      </div>

      {alerts.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
          <div className="text-slate-400 text-lg mb-4">No alerts yet</div>
          <p className="text-slate-500 text-sm mb-6">
            Run a scan from the home page to start monitoring.
          </p>
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Go Home →
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-left">
                <th className="py-3 pr-6">Ticker</th>
                <th className="py-3 pr-6">Company</th>
                <th className="py-3 pr-6 text-right">Alert Score</th>
                <th className="py-3 pr-6 text-right">Change %</th>
                <th className="py-3 pr-6 text-right">Added</th>
                <th className="py-3 pr-6 text-right">Removed</th>
                <th className="py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                >
                  <td className="py-3 pr-6">
                    <Link
                      href={`/ticker/${a.ticker}`}
                      className="text-blue-400 font-bold hover:text-blue-300"
                    >
                      {a.ticker}
                    </Link>
                  </td>
                  <td className="py-3 pr-6 text-slate-300">
                    {universe[a.ticker] ?? a.ticker}
                  </td>
                  <td className={`py-3 pr-6 text-right font-bold ${scoreColor(a.alert_score)}`}>
                    {a.alert_score > 0 ? "+" : ""}{a.alert_score.toFixed(2)}
                  </td>
                  <td className="py-3 pr-6 text-right text-slate-300">
                    {a.percent_changed.toFixed(1)}%
                  </td>
                  <td className="py-3 pr-6 text-right text-green-400">
                    +{a.added_lines}
                  </td>
                  <td className="py-3 pr-6 text-right text-red-400">
                    −{a.removed_lines}
                  </td>
                  <td className="py-3 text-slate-500 text-xs">
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
