import Link from "next/link";
import { getLatestAnalyses } from "@/lib/db";
import { UNIVERSE } from "@/lib/universe";

export const dynamic = "force-dynamic";

function scoreColor(score: number): string {
  if (score > 1) return "text-red-600";
  if (score > 0) return "text-amber-600";
  if (score < -1) return "text-green-600";
  return "text-gray-400";
}

function rowStyle(score: number): React.CSSProperties {
  if (score > 1) return { background: "#fff3e0" };
  if (score > 0) return { background: "#fffbea" };
  if (score < -1) return { background: "#f0fdf4" };
  return {};
}

function confidenceBadge(confidence: number) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 80 ? "#2e8b57" : pct >= 50 ? "#f97316" : "#9ca3af";
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{ background: color + "20", color }}
    >
      {pct}%
    </span>
  );
}

function qualityFlags(flagsJson: string | null) {
  if (!flagsJson) return null;
  try {
    const flags = JSON.parse(flagsJson) as Record<string, boolean>;
    const active = Object.entries(flags)
      .filter(([, v]) => v)
      .map(([k]) => k.replace(/_/g, " "));
    if (active.length === 0) return null;
    return (
      <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
        ⚠ {active.join(", ")}
      </span>
    );
  } catch {
    return null;
  }
}

export default function AlertsPage() {
  const analyses = getLatestAnalyses(100);
  const universe = Object.fromEntries(UNIVERSE.map((t) => [t.symbol, t.name]));
  const changed = analyses.filter((a) => a.alert_score !== 0).length;
  const highConf = analyses.filter((a) => a.confidence >= 0.6).length;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#252525]">Change Alerts</h1>
          <p className="text-gray-500 text-sm mt-1">
            Detected page wording changes — sorted by alert score. Confidence ≥ 60% means quality text was found.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {changed > 0 && (
            <span
              className="text-sm px-4 py-1.5 rounded"
              style={{ background: "#f9b116", color: "#ffffff", fontWeight: 800, textShadow: "0 1px 2px rgba(0,0,0,0.25)" }}
            >
              {changed} stock{changed !== 1 ? "s" : ""} with changes
            </span>
          )}
          {highConf > 0 && (
            <span className="text-sm px-3 py-1.5 rounded bg-green-50 text-green-700 font-semibold">
              {highConf} high-confidence
            </span>
          )}
        </div>
      </div>

      {analyses.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <div className="text-gray-400 text-lg mb-2">No analyses yet</div>
          <p className="text-gray-400 text-sm mb-6">Run a scan from the home page to detect company page changes.</p>
          <Link href="/" className="bg-brand-dark hover:bg-brand-darker text-white px-5 py-2 rounded text-sm font-semibold uppercase tracking-wide transition-colors">
            Go Home →
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
          {/* Legend */}
          <div className="px-6 pt-4 pb-2 flex flex-wrap gap-4 text-xs text-gray-400 border-b border-gray-100">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#fffbea", border: "1px solid #f9b116" }} />Moderate change
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#fff3e0", border: "1px solid #fb923c" }} />High-risk language
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#f0fdf4", border: "1px solid #4ade80" }} />Positive / more committed
            </span>
            <span className="ml-auto">Confidence = quality of extracted text (0–100%)</span>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 text-left text-xs uppercase tracking-wide">
                <th className="py-3 px-6">Ticker</th>
                <th className="py-3 pr-4">Company</th>
                <th className="py-3 pr-4 text-right">Score</th>
                <th className="py-3 pr-4 text-right">Changed</th>
                <th className="py-3 pr-4 text-right">Conf.</th>
                <th className="py-3 pr-4">Categories</th>
                <th className="py-3 pr-4">Quality</th>
                <th className="py-3 pr-4">Scanned</th>
              </tr>
            </thead>
            <tbody>
              {analyses.map((a) => {
                const cats: string[] = a.categories_json ? JSON.parse(a.categories_json) : [];
                return (
                  <tr
                    key={a.id}
                    className="border-b border-gray-100 hover:brightness-95 transition-colors"
                    style={rowStyle(a.alert_score)}
                  >
                    <td className="py-3 px-6">
                      <Link href={`/ticker/${a.ticker}`} className="text-brand font-bold hover:text-brand-light">
                        {a.ticker}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-gray-700 max-w-[140px] truncate">
                      {universe[a.ticker] ?? a.ticker}
                    </td>
                    <td className={`py-3 pr-4 text-right font-bold ${scoreColor(a.alert_score)}`}>
                      {a.alert_score > 0 ? "+" : ""}{a.alert_score.toFixed(2)}
                    </td>
                    <td className="py-3 pr-4 text-right text-gray-700">
                      {(a as { changed_pct?: number }).changed_pct?.toFixed(1) ?? "—"}%
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {confidenceBadge(a.confidence)}
                    </td>
                    <td className="py-3 pr-4">
                      {cats.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {cats.map((c) => (
                            <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                              {c.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-3 pr-4">
                      {qualityFlags((a as { quality_flags_json?: string }).quality_flags_json ?? null) ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-3 pr-4 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(a.fetched_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
