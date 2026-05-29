"use client";

/**
 * /admin/failure-patterns — Macro learning loop review UI.
 *
 * Surfaces the failure_patterns table populated by stock_failure_analyzer
 * Airflow DAG (nightly 06:30 UTC). Each row is a cluster of failed
 * debates with an LLM-suggested remediation.
 *
 * Admin workflow:
 *   1. Read pattern + suggested action
 *   2. Decide: open → triaged → fix_proposed → fix_applied → resolved
 *      OR: open → wontfix
 *   3. Add a resolution_note explaining what was done
 *
 * Filter by status / horizon. Sort by impact (loss_rate × n_obs).
 */

import { useCallback, useEffect, useState } from "react";

interface FailurePattern {
  pattern_id: number;
  computed_at: string;
  horizon_days: number;
  signature: Record<string, unknown>;
  signature_text: string;
  n_observations: number;
  n_losses: number;
  loss_rate: number;
  avg_return_missed: number | null;
  example_tickers: string[] | null;
  suggested_action: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution_note: string | null;
}

const STATUS_ORDER = ["open", "triaged", "fix_proposed", "fix_applied", "resolved", "wontfix"];
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open:         { bg: "bg-amber-100",   text: "text-amber-800"   },
  triaged:      { bg: "bg-blue-100",    text: "text-blue-800"    },
  fix_proposed: { bg: "bg-indigo-100",  text: "text-indigo-800"  },
  fix_applied:  { bg: "bg-purple-100",  text: "text-purple-800"  },
  resolved:     { bg: "bg-emerald-100", text: "text-emerald-800" },
  wontfix:      { bg: "bg-gray-200",    text: "text-gray-700"    },
};

export default function FailurePatternsPage() {
  const [patterns, setPatterns] = useState<FailurePattern[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterHorizon, setFilterHorizon] = useState<string>("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filterStatus) qs.set("status", filterStatus);
      if (filterHorizon) qs.set("horizon", filterHorizon);
      const res = await fetch(`/api/admin/failure-patterns?${qs.toString()}`);
      const j = await res.json();
      if (j.ok) {
        setPatterns(j.patterns || []);
        setCounts(j.counts || {});
      }
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterHorizon]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (patternId: number, newStatus: string, note?: string) => {
    setSavingId(patternId);
    try {
      const res = await fetch("/api/admin/failure-patterns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pattern_id: patternId,
          status: newStatus,
          resolution_note: note,
        }),
      });
      const j = await res.json();
      if (j.ok) {
        await load();
      } else {
        alert(`Update failed: ${j.error}`);
      }
    } catch (err) {
      alert(`Update failed: ${err}`);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 border-b border-gray-200 pb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[#2e8b57] mb-1">
          Admin · Macro Learning Loop
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Failure Patterns
        </h1>
        <p className="mt-2 text-sm text-gray-600 max-w-3xl">
          Clusters of past debates that lost together. Populated nightly by{" "}
          <code className="bg-gray-100 text-gray-700 px-1 rounded text-xs">stock_failure_analyzer</code> DAG.
          Each row has an LLM-suggested remediation. Review, decide, mark resolved.
        </p>
      </header>

      {/* Status pill counts */}
      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_ORDER.map((s) => {
          const n = counts[s] ?? 0;
          const sc = STATUS_COLORS[s];
          const active = filterStatus === s;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(active ? "" : s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.text} ${active ? "ring-2 ring-offset-1 ring-gray-400" : "hover:opacity-80"}`}
            >
              {s} <span className="font-bold">{n}</span>
            </button>
          );
        })}
        {filterStatus && (
          <button onClick={() => setFilterStatus("")} className="text-xs text-gray-500 underline">
            clear status filter
          </button>
        )}
        <div className="flex-1" />
        <select
          value={filterHorizon}
          onChange={(e) => setFilterHorizon(e.target.value)}
          className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-700"
        >
          <option value="">All horizons</option>
          <option value="7">7-day</option>
          <option value="30">30-day</option>
          <option value="90">90-day</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading…</div>
      ) : patterns.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          No failure patterns match. Either the analyzer hasn&apos;t run yet (06:30 UTC daily) or all clusters are below threshold.
        </div>
      ) : (
        <div className="space-y-2">
          {patterns.map((p) => {
            const sc = STATUS_COLORS[p.status] ?? STATUS_COLORS.open;
            const isOpen = expanded === p.pattern_id;
            return (
              <div
                key={p.pattern_id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Header row */}
                <div
                  className="px-4 py-3 flex items-start justify-between gap-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpanded(isOpen ? null : p.pattern_id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${sc.bg} ${sc.text}`}>
                        {p.status}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        #{p.pattern_id} · {p.horizon_days}d horizon
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(p.computed_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 font-mono mb-1">
                      {p.signature_text}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span>
                        <span className="font-bold text-gray-900">{p.n_losses}</span> / {p.n_observations} obs
                      </span>
                      <span>
                        loss rate <span className="font-bold text-amber-700">{p.loss_rate}%</span>
                      </span>
                      {p.avg_return_missed != null && (
                        <span>
                          avg missed <span className="font-bold text-red-600">{p.avg_return_missed.toFixed(2)}%</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-gray-400 text-xs flex-shrink-0">{isOpen ? "▲" : "▼"}</span>
                </div>

                {/* Expanded body */}
                {isOpen && (
                  <div className="px-4 py-4 border-t border-gray-100 bg-gray-50/40 space-y-4">
                    {p.suggested_action && (
                      <section>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                          🤖 LLM-suggested remediation
                        </div>
                        <div className="text-sm text-gray-800 leading-relaxed bg-white border border-gray-200 rounded p-3">
                          {p.suggested_action}
                        </div>
                      </section>
                    )}

                    {p.example_tickers && p.example_tickers.length > 0 && (
                      <section>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                          Worst-affected tickers
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {p.example_tickers.map((t, i) => (
                            <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">
                              {t}
                            </span>
                          ))}
                        </div>
                      </section>
                    )}

                    <section>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                        Raw signature
                      </div>
                      <pre className="text-[11px] bg-white border border-gray-200 rounded p-2 overflow-x-auto font-mono text-gray-700">
                        {JSON.stringify(p.signature, null, 2)}
                      </pre>
                    </section>

                    {p.resolution_note && (
                      <section>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                          Resolution note
                          {p.reviewed_by && (
                            <span className="text-gray-400 font-normal normal-case ml-2">
                              by {p.reviewed_by} on {p.reviewed_at ? new Date(p.reviewed_at).toLocaleDateString() : "—"}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 bg-emerald-50 border border-emerald-200 rounded p-2">
                          {p.resolution_note}
                        </div>
                      </section>
                    )}

                    {/* Status action buttons */}
                    <section className="pt-2 border-t border-gray-200">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                        Set status
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {STATUS_ORDER.filter((s) => s !== p.status).map((s) => {
                          const sc2 = STATUS_COLORS[s];
                          const needsNote = s === "resolved" || s === "wontfix" || s === "fix_applied";
                          return (
                            <button
                              key={s}
                              disabled={savingId === p.pattern_id}
                              onClick={(e) => {
                                e.stopPropagation();
                                let note: string | undefined = undefined;
                                if (needsNote) {
                                  const v = prompt(`Note for "${s}"? (optional)`);
                                  if (v) note = v;
                                }
                                updateStatus(p.pattern_id, s, note);
                              }}
                              className={`text-xs px-2.5 py-1 rounded ${sc2.bg} ${sc2.text} font-semibold hover:opacity-80 disabled:opacity-40`}
                            >
                              → {s}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
