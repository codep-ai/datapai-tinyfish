import { notFound } from "next/navigation";
import Link from "next/link";
import { getRun, getDb, getScanEvents } from "@/lib/db";

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
  signal_type: string | null;
  changed_pct: number | null;
  added_lines: number | null;
  removed_lines: number | null;
}

function tickerDisplayStatus(ticker: string, changed_pct: number | null, scanEvents: { ticker: string; status: string; created_at: string }[]): string {
  const events = scanEvents.filter((e) => e.ticker === ticker);
  if (events.length === 0) return "Queued";
  const lastStatus = events[events.length - 1].status;
  if (lastStatus === "error") return "Failed";
  if (changed_pct != null) return "Completed";
  return "Scanning";
}

function statusStyle(status: string): React.CSSProperties {
  if (status === "Completed") return { color: "#2e8b57" };
  if (status === "Failed") return { color: "#dc2626" };
  if (status === "Scanning") return { color: "#fd8412" };
  return { color: "#9ca3af" };
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
              a.signal_type,
              d.changed_pct, d.added_lines, d.removed_lines
       FROM snapshots s
       LEFT JOIN diffs d ON d.snapshot_new_id = s.id
       LEFT JOIN analyses a ON a.snapshot_new_id = s.id
       WHERE s.run_id = ?
       ORDER BY COALESCE(a.alert_score, 0) DESC`
    )
    .all(id) as TickerRow[];

  const scanEvents = getScanEvents(id);
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
            background: run.status === "SUCCESS" ? "#f0fdf4" : run.status === "RUNNING" ? "#fffbea" : run.status === "PENDING" ? "#f8fafc" : "#fef2f2",
            color: run.status === "SUCCESS" ? "#2e8b57" : run.status === "RUNNING" ? "#b45309" : run.status === "PENDING" ? "#6b7280" : "#dc2626",
          }}
        >
          {run.status}
        </span>
      </div>

      {/* Run stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Planned", value: run.planned_count || 20, color: "#6b7280" },
          { label: "Completed", value: run.completed_count ?? run.scanned_count, color: "#2e8b57" },
          { label: "Changed", value: run.changed_count, color: "#f97316" },
          { label: "Failed", value: run.failed_count, color: "#ef4444" },
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
            <span><span className="text-gray-400">Duration:</span> <strong>{duration}s</strong></span>
          )}
          {run.tinyfish_run_ref && (
            <span>
              <span className="text-gray-400">TinyFish run ref:</span>{" "}
              <code className="font-mono text-xs bg-gray-100 px-1 rounded">{run.tinyfish_run_ref}</code>
            </span>
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
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">Signal</th>
              <th className="py-3 pr-4">Score</th>
              <th className="py-3 pr-4">Changed</th>
              <th className="py-3 pr-4">+Lines</th>
              <th className="py-3 pr-4">−Lines</th>
              <th className="py-3 pr-4">Conf.</th>
              <th className="py-3 pr-4">Duration</th>
              <th className="py-3 pr-4">TinyFish ref</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const displayStatus = tickerDisplayStatus(r.ticker, r.changed_pct, scanEvents);
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
                  <td className="py-3 pr-4 font-semibold text-xs" style={statusStyle(displayStatus)}>
                    {displayStatus}
                  </td>
                  <td className="py-3 pr-4">
                    {r.signal_type ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                        style={{
                          background: r.signal_type === "CONTENT_CHANGE" ? "#f0fdf4" : r.signal_type === "ARCHIVE_CHANGE" ? "#f0f9ff" : "#f5f5f5",
                          color: r.signal_type === "CONTENT_CHANGE" ? "#166534" : r.signal_type === "ARCHIVE_CHANGE" ? "#075985" : "#6b7280",
                        }}>
                        {r.signal_type.replace(/_/g, " ")}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
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
                  <td className="py-3 pr-4 text-gray-400 text-xs">
                    {(() => {
                      const evts = scanEvents.filter((e) => e.ticker === r.ticker);
                      if (evts.length < 2) return "—";
                      const ms = new Date(evts[evts.length - 1].created_at).getTime() - new Date(evts[0].created_at).getTime();
                      return Math.round(ms / 1000) + "s";
                    })()}
                  </td>
                  <td className="py-3 pr-4">
                    {run.tinyfish_run_ref ? (
                      <code className="font-mono text-[9px] text-gray-400 bg-gray-50 px-1 rounded">
                        {run.tinyfish_run_ref.slice(0, 8)}…
                      </code>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* TinyFish Scan Step Log */}
      {scanEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[#252525] mb-3">TinyFish Scan Step Log</h2>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
              TinyFish execution infrastructure — {scanEvents.length} events logged
            </div>
            <div className="max-h-72 overflow-y-auto">
              {scanEvents.map((e, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2 border-b border-gray-50 text-xs hover:bg-gray-50">
                  <span className="text-gray-300 font-mono w-20 flex-shrink-0">{new Date(e.created_at).toLocaleTimeString()}</span>
                  <span className="font-bold text-[#252525] w-12 flex-shrink-0">{e.ticker}</span>
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: e.status === "done" ? "#2e8b57" : e.status === "error" ? "#ef4444" : "#fd8412" }}
                  />
                  <span className="text-gray-600">{e.step}</span>
                  {e.message && <span className="text-gray-400 ml-auto">{e.message}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
