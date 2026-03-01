import { notFound } from "next/navigation";
import Link from "next/link";
import { getRun, getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

interface TickerRow {
  ticker: string;
  url: string;
  fetched_at: string;
  word_count: number;
  quality_flags_json: string | null;
  alert_score: number | null;
  confidence: number | null;
  categories_json: string | null;
  llm_summary_paid: string | null;
  changed_pct: number | null;
  added_lines: number | null;
  removed_lines: number | null;
}

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = getRun(id);
  if (!run) notFound();

  const rows = getDb()
    .prepare(
      `SELECT s.ticker, s.url, s.fetched_at, s.word_count, s.quality_flags_json,
              a.alert_score, a.confidence, a.categories_json, a.llm_summary_paid,
              d.changed_pct, d.added_lines, d.removed_lines
       FROM snapshots s
       LEFT JOIN diffs d ON d.snapshot_new_id = s.id
       LEFT JOIN analyses a ON a.snapshot_new_id = s.id
       WHERE s.run_id = ?
       ORDER BY COALESCE(a.alert_score, 0) DESC`
    )
    .all(id) as TickerRow[];

  const changed = rows.filter((r) => r.changed_pct != null && r.changed_pct > 0).length;
  const failed = rows.length < 20 ? 20 - rows.length : 0;
  const hasLLM = rows.some((r) => r.llm_summary_paid);

  const duration =
    run.finished_at
      ? Math.round(
          (new Date(run.finished_at).getTime() -
            new Date(run.started_at).getTime()) /
            1000
        )
      : null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← Home</Link>
          </div>
          <h1 className="text-2xl font-bold text-[#252525]">Run Detail</h1>
          <p className="text-gray-400 text-xs font-mono mt-1">{id}</p>
        </div>
        <span
          className="px-3 py-1.5 rounded text-sm font-bold"
          style={{
            background: run.status === "SUCCESS" ? "#f0fdf4" : run.status === "RUNNING" ? "#fffbea" : "#fef2f2",
            color: run.status === "SUCCESS" ? "#2e8b57" : run.status === "RUNNING" ? "#b45309" : "#dc2626",
          }}
        >
          {run.status}
        </span>
      </div>

      {/* Run stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Scanned", value: run.scanned_count, color: "#2e8b57" },
          { label: "Changed", value: run.changed_count ?? changed, color: "#f97316" },
          { label: "Alerts created", value: run.alerts_created, color: "#f9b116" },
          { label: "Failed", value: run.failed_count ?? failed, color: "#ef4444" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Run metadata */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-sm space-y-2 text-gray-600">
        <div className="flex gap-8 flex-wrap">
          <span><span className="text-gray-400">Started:</span> {new Date(run.started_at).toLocaleString()}</span>
          {run.finished_at && (
            <span><span className="text-gray-400">Finished:</span> {new Date(run.finished_at).toLocaleString()}</span>
          )}
          {duration != null && (
            <span><span className="text-gray-400">Duration:</span> {duration}s</span>
          )}
          {run.tinyfish_run_ref && (
            <span><span className="text-gray-400">TinyFish run ref:</span> <code className="font-mono text-xs bg-gray-100 px-1 rounded">{run.tinyfish_run_ref}</code></span>
          )}
          {hasLLM && (
            <span className="text-green-600 font-medium">✓ AI summaries included</span>
          )}
        </div>
      </div>

      {/* Per-ticker results */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
        <div className="px-6 pt-4 pb-2 border-b border-gray-100">
          <h2 className="font-semibold text-[#252525]">Per-Ticker Results</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-400 text-left text-xs uppercase tracking-wide">
              <th className="py-3 px-6">Ticker</th>
              <th className="py-3 pr-4">Score</th>
              <th className="py-3 pr-4">Changed</th>
              <th className="py-3 pr-4">+Lines</th>
              <th className="py-3 pr-4">−Lines</th>
              <th className="py-3 pr-4">Conf.</th>
              <th className="py-3 pr-4">Words</th>
              <th className="py-3 pr-4">Categories</th>
              <th className="py-3 pr-4">AI</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const cats: string[] = r.categories_json ? JSON.parse(r.categories_json) : [];
              const flags = r.quality_flags_json ? JSON.parse(r.quality_flags_json) : {};
              const noisy = Object.values(flags as Record<string, boolean>).some(Boolean);
              return (
                <tr
                  key={r.ticker}
                  className="border-b border-gray-100 hover:bg-gray-50"
                  style={r.changed_pct && r.changed_pct > 0 ? { background: "#fffbea" } : {}}
                >
                  <td className="py-3 px-6">
                    <Link href={`/ticker/${r.ticker}`} className="text-brand font-bold hover:underline">
                      {r.ticker}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 font-bold" style={{ color: r.alert_score && r.alert_score > 0 ? "#f97316" : r.alert_score && r.alert_score < 0 ? "#2e8b57" : "#9ca3af" }}>
                    {r.alert_score != null ? (r.alert_score > 0 ? "+" : "") + r.alert_score.toFixed(2) : "—"}
                  </td>
                  <td className="py-3 pr-4 text-gray-700">
                    {r.changed_pct != null ? r.changed_pct.toFixed(1) + "%" : "—"}
                  </td>
                  <td className="py-3 pr-4 text-green-600 font-medium">
                    {r.added_lines != null ? "+" + r.added_lines : "—"}
                  </td>
                  <td className="py-3 pr-4 text-red-600 font-medium">
                    {r.removed_lines != null ? "−" + r.removed_lines : "—"}
                  </td>
                  <td className="py-3 pr-4">
                    {r.confidence != null ? (
                      <span className="text-xs font-bold" style={{ color: r.confidence >= 0.7 ? "#2e8b57" : r.confidence >= 0.4 ? "#f97316" : "#9ca3af" }}>
                        {Math.round(r.confidence * 100)}%
                      </span>
                    ) : "—"}
                  </td>
                  <td className="py-3 pr-4 text-gray-500">
                    {r.word_count > 0 ? r.word_count.toLocaleString() : "—"}
                    {noisy && <span className="ml-1 text-amber-500 text-xs" title="Quality flags detected">⚠</span>}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {cats.map((c) => (
                        <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{c.replace(/_/g, " ")}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    {r.llm_summary_paid ? (
                      <span className="text-[10px] text-green-600 font-medium">✓ summary</span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
