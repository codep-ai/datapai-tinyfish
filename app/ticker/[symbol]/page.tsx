import { notFound } from "next/navigation";
import Link from "next/link";
import { UNIVERSE } from "@/lib/universe";
import { getTickerSnapshots, getTickerAnalyses, getTickerDiffs } from "@/lib/db";
import { fetchPrices } from "@/lib/price";
import PriceChart from "./PriceChart";
import { PRIVATE_LLM_ENABLED } from "@/lib/llm";

export const dynamic = "force-dynamic";

function deltaChip(label: string, value: number, invert = false) {
  const isRisk = invert ? value < 0 : value > 0;
  const color = isRisk ? "#dc2626" : value < 0 ? "#2e8b57" : "#9ca3af";
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
      <div className="text-gray-400 text-xs mb-1">{label}</div>
      <div className="text-xl font-bold" style={{ color }}>
        {value > 0 ? "+" : ""}{value.toFixed(2)}
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

  const sym = symbol.toUpperCase();
  const [snapshots, analyses, diffs, prices] = await Promise.all([
    Promise.resolve(getTickerSnapshots(sym, 5)),
    Promise.resolve(getTickerAnalyses(sym, 5)),
    Promise.resolve(getTickerDiffs(sym, 5)),
    fetchPrices(sym, 30),
  ]);

  const latest = analyses[0] ?? null;
  const latestDiff = diffs[0] ?? null;
  const latestSnap = snapshots[0] ?? null;
  const prevSnap = snapshots[1] ?? null;

  const cats: string[] = latest?.categories_json ? JSON.parse(latest.categories_json) : [];
  const evidenceQuotes: string[] = latest?.reasoning_evidence_json ? JSON.parse(latest.reasoning_evidence_json) : [];
  const qualityFlags = latestSnap?.quality_flags_json ? JSON.parse(latestSnap.quality_flags_json) as Record<string, boolean> : {};
  const hasFlags = Object.values(qualityFlags).some(Boolean);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-[#252525]">{ticker.symbol}</h1>
            <span className="text-gray-400 text-lg">{ticker.name}</span>
            {cats.map((c) => (
              <span key={c} className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">
                {c.replace(/_/g, " ")}
              </span>
            ))}
          </div>
          <a href={ticker.url} target="_blank" rel="noopener noreferrer"
            className="text-brand hover:text-brand-light text-sm">
            {ticker.url} ↗
          </a>
        </div>
        <Link href="/alerts" className="text-gray-400 hover:text-[#252525] text-sm">← All Alerts</Link>
      </div>

      {/* Alert banner */}
      {latest && Math.abs(latest.alert_score) > 0.3 && (
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
          ⚠&nbsp;
          {latest.alert_score > 1
            ? "High-risk language detected — this company's page shifted to more cautious wording."
            : latest.alert_score < -1
            ? "Positive signal — language has become more confident and committed."
            : "Moderate wording change detected on this company's page."}
          <span className="ml-auto text-xs font-normal opacity-70">
            Confidence: {Math.round(latest.confidence * 100)}%
            {hasFlags && " · ⚠ quality flags"}
          </span>
        </div>
      )}

      {/* Score chips */}
      {latest && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-semibold text-[#252525]">Language Shift Scores</h2>
            <span className="text-xs text-gray-400">(new vs. previous scan · per 1,000 words on cleaned text)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {deltaChip("Commitment ↓ = risk", latest.commitment_delta, true)}
            {deltaChip("Hedging ↑ = risk", latest.hedging_delta)}
            {deltaChip("Risk Words ↑ = risk", latest.risk_delta)}
            <div className="rounded-lg p-4 text-center shadow-sm"
              style={
                latest.alert_score > 1
                  ? { background: "#fff3e0", border: "1.5px solid #fb923c" }
                  : latest.alert_score < -1
                  ? { background: "#f0fdf4", border: "1.5px solid #4ade80" }
                  : { background: "#fffbea", border: "1.5px solid #f9b116" }
              }
            >
              <div className="text-gray-400 text-xs mb-1">Overall Score</div>
              <div className="text-xl font-bold"
                style={{ color: latest.alert_score > 1 ? "#dc2626" : latest.alert_score < -1 ? "#2e8b57" : "#b45309" }}
              >
                {latest.alert_score > 0 ? "+" : ""}{latest.alert_score.toFixed(2)}
              </div>
              <div className="text-gray-400 text-xs mt-1">composite</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs: Evidence / AI Summary / Price ── */}
      <div className="space-y-0">
        {/* Tab 1: Evidence */}
        <details open className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-3">
          <summary className="px-6 py-4 cursor-pointer font-semibold text-[#252525] list-none flex items-center justify-between">
            <span>📄 Evidence</span>
            <span className="text-gray-400 text-sm font-normal">Source · Snapshot · Diff</span>
          </summary>
          <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
            {latestSnap ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400 text-xs mb-1 uppercase tracking-wide">Source URL</div>
                    <a href={latestSnap.url} target="_blank" rel="noopener noreferrer"
                      className="text-brand hover:underline break-all">{latestSnap.url}</a>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs mb-1 uppercase tracking-wide">Scanned at</div>
                    <div className="text-gray-700">{new Date(latestSnap.fetched_at).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs mb-1 uppercase tracking-wide">Snapshot hash (content fingerprint)</div>
                    <code className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                      {latestSnap.content_hash.slice(0, 32)}…
                    </code>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs mb-1 uppercase tracking-wide">Word count (cleaned)</div>
                    <div className="text-gray-700">{latestSnap.word_count.toLocaleString()} words</div>
                  </div>
                  {latestDiff?.id && (
                    <div>
                      <div className="text-gray-400 text-xs mb-1 uppercase tracking-wide">Similarity to previous</div>
                      <div className="text-gray-700">{Math.round(latestDiff.similarity * 100)}% identical lines</div>
                    </div>
                  )}
                  {hasFlags && (
                    <div>
                      <div className="text-gray-400 text-xs mb-1 uppercase tracking-wide">Quality flags</div>
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(qualityFlags).filter(([, v]) => v).map(([k]) => (
                          <span key={k} className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-600">⚠ {k.replace(/_/g, " ")}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Diff snippet */}
                {latestDiff && (
                  <div>
                    <div className="text-gray-400 text-xs mb-2 uppercase tracking-wide">
                      Diff snippet — {latestDiff.changed_pct.toFixed(1)}% changed
                      · +{latestDiff.added_lines} / −{latestDiff.removed_lines} lines
                    </div>
                    <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap font-mono text-gray-700 leading-relaxed">
                      {latestDiff.snippet}
                    </pre>
                  </div>
                )}

                {/* Evidence quotes */}
                {evidenceQuotes.length > 0 && (
                  <div>
                    <div className="text-gray-400 text-xs mb-2 uppercase tracking-wide">Evidence quotes from changed lines</div>
                    <div className="space-y-2">
                      {evidenceQuotes.map((q, i) => (
                        <blockquote key={i} className="border-l-4 border-brand pl-4 text-sm text-gray-700 italic">
                          &ldquo;{q}&rdquo;
                        </blockquote>
                      ))}
                    </div>
                  </div>
                )}

                {/* Before/after text (collapsed) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {prevSnap && (
                    <details className="group">
                      <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 mb-1">▶ Before text (collapsed)</summary>
                      <pre className="bg-gray-50 border border-red-100 rounded p-3 text-xs overflow-auto max-h-48 font-mono text-gray-600 whitespace-pre-wrap">
                        {prevSnap.cleaned_text.slice(0, 1500)}…
                      </pre>
                    </details>
                  )}
                  <details className="group">
                    <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 mb-1">▶ After text (collapsed)</summary>
                    <pre className="bg-gray-50 border border-green-100 rounded p-3 text-xs overflow-auto max-h-48 font-mono text-gray-600 whitespace-pre-wrap">
                      {latestSnap.cleaned_text.slice(0, 1500)}…
                    </pre>
                  </details>
                </div>
              </>
            ) : (
              <div className="text-gray-400">No scan data yet. Run a scan to populate evidence.</div>
            )}
          </div>
        </details>

        {/* Tab 2: AI Summary */}
        <details open className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-3">
          <summary className="px-6 py-4 cursor-pointer font-semibold text-[#252525] list-none flex items-center justify-between">
            <span>🤖 AI Summary</span>
            <span className="text-gray-400 text-sm font-normal">Paid LLM · Private LLM · Categories</span>
          </summary>
          <div className="px-6 pb-6 space-y-5 border-t border-gray-100 pt-4">
            {/* Paid LLM */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="text-gray-700 font-medium text-sm">Paid LLM Summary</div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600">GPT / Gemini</span>
              </div>
              {latest?.llm_summary_paid ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {latest.llm_summary_paid}
                </div>
              ) : (
                <div className="text-gray-400 text-sm bg-gray-50 rounded-lg p-4 border border-gray-100">
                  {!latest ? "No scan data yet." :
                    !process.env.PAID_LLM_API_KEY
                      ? "Set PAID_LLM_API_KEY in environment to enable AI summaries."
                      : "No summary generated — quality gate not met or no evidence quotes found."}
                </div>
              )}
            </div>

            {/* Private LLM */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="text-gray-700 font-medium text-sm">Private LLM Note</div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">
                  {PRIVATE_LLM_ENABLED ? "enabled" : "enterprise option"}
                </span>
              </div>
              {latest?.llm_summary_private ? (
                <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 text-sm text-purple-800">
                  {latest.llm_summary_private}
                </div>
              ) : (
                <div className="text-gray-400 text-sm bg-gray-50 rounded-lg p-4 border border-gray-100">
                  Private LLM mode: <strong>disabled</strong> — enterprise option.
                  Receives only pre-computed scores (no raw text) to protect sensitive data.
                  Set <code className="font-mono text-xs">PRIVATE_LLM_ENABLED=true</code> to enable.
                </div>
              )}
            </div>

            {/* Categories + Confidence */}
            {latest && (
              <div className="flex flex-wrap gap-4 items-center text-sm">
                <div>
                  <div className="text-gray-400 text-xs mb-1">Categories</div>
                  <div className="flex gap-2 flex-wrap">
                    {cats.length > 0
                      ? cats.map((c) => (
                          <span key={c} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                            {c.replace(/_/g, " ")}
                          </span>
                        ))
                      : <span className="text-gray-300 text-xs">none detected</span>}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs mb-1">Confidence score</div>
                  <div className="text-2xl font-bold" style={{ color: latest.confidence >= 0.7 ? "#2e8b57" : latest.confidence >= 0.4 ? "#f97316" : "#9ca3af" }}>
                    {Math.round(latest.confidence * 100)}%
                  </div>
                </div>
              </div>
            )}
          </div>
        </details>

        {/* Tab 3: Price Context */}
        <details open className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-3">
          <summary className="px-6 py-4 cursor-pointer font-semibold text-[#252525] list-none flex items-center justify-between">
            <span>📈 Price Context</span>
            <span className="text-gray-400 text-sm font-normal">30-day chart · scan markers</span>
          </summary>
          <div className="px-6 pb-6 border-t border-gray-100 pt-4">
            <PriceChart data={prices} scanDates={snapshots.map((s) => s.fetched_at.slice(0, 10))} />
            {prices.length > 0 && prices[prices.length - 1] && (
              <div className="mt-3 flex gap-6 text-sm text-gray-500">
                <span>Latest close: <strong>${prices[prices.length - 1].close}</strong></span>
                <span>30d range: ${Math.min(...prices.map((p) => p.close)).toFixed(2)} – ${Math.max(...prices.map((p) => p.close)).toFixed(2)}</span>
                {snapshots.length > 0 && (
                  <span className="text-brand">▼ = scan date</span>
                )}
              </div>
            )}
          </div>
        </details>
      </div>

      {/* History */}
      {analyses.length > 1 && (
        <div>
          <h2 className="text-lg font-semibold text-[#252525] mb-3">Change History</h2>
          <div className="space-y-2">
            {analyses.map((a) => {
              const aCats: string[] = a.categories_json ? JSON.parse(a.categories_json) : [];
              return (
                <div key={a.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-gray-400 text-xs">{new Date(a.fetched_at).toLocaleString()}</span>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {aCats.map((c) => (
                        <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{c.replace(/_/g, " ")}</span>
                      ))}
                      <span className="text-xs text-gray-400">conf {Math.round(a.confidence * 100)}%</span>
                    </div>
                  </div>
                  <div className="font-bold text-lg"
                    style={{ color: a.alert_score > 1 ? "#dc2626" : a.alert_score < -1 ? "#2e8b57" : "#b45309" }}>
                    {a.alert_score > 0 ? "+" : ""}{a.alert_score.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scan history */}
      {snapshots.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[#252525] mb-3">Page Scan History</h2>
          <div className="space-y-2">
            {snapshots.map((s) => {
              const flags = s.quality_flags_json ? JSON.parse(s.quality_flags_json) as Record<string, boolean> : {};
              const flagged = Object.values(flags).some(Boolean);
              return (
                <div key={s.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between text-sm shadow-sm">
                  <span className="text-gray-400">{new Date(s.fetched_at).toLocaleString()}</span>
                  <span className="font-mono text-xs text-gray-300">{s.content_hash.slice(0, 16)}…</span>
                  <span className="text-gray-500">{s.word_count.toLocaleString()} words</span>
                  {flagged && <span className="text-amber-500 text-xs">⚠ quality flags</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
