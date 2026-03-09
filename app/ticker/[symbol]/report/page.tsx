import { notFound } from "next/navigation";
import Link from "next/link";
import { UNIVERSE } from "@/lib/universe";
import { getTickerSnapshots, getTickerAnalyses, getTickerDiffs } from "@/lib/db";
import { agentSignalLabel, validationLabel } from "@/lib/agent";
import { PRIVATE_LLM_ENABLED } from "@/lib/llm";

export const dynamic = "force-dynamic";

function ValidationBadge({ status }: { status: string | null }) {
  const config: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    CONFIRMED:           { bg: "#f0fdf4", border: "#4ade80", text: "#166534", icon: "✓" },
    PARTIALLY_CONFIRMED: { bg: "#fffbea", border: "#fd8412", text: "#92400e", icon: "~" },
    NOT_CONFIRMED_YET:   { bg: "#f0f9ff", border: "#7dd3fc", text: "#0c4a6e", icon: "?" },
    SOURCE_UNAVAILABLE:  { bg: "#f9fafb", border: "#d1d5db", text: "#6b7280", icon: "—" },
  };
  const s = status ?? "SOURCE_UNAVAILABLE";
  const c = config[s] ?? config.SOURCE_UNAVAILABLE;
  return (
    <span
      className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full"
      style={{ background: c.bg, border: `2px solid ${c.border}`, color: c.text }}
    >
      {c.icon} {validationLabel(s)}
    </span>
  );
}

export default async function TickerReportPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const ticker = UNIVERSE.find((t) => t.symbol === symbol.toUpperCase());
  if (!ticker) notFound();

  const sym = symbol.toUpperCase();
  const [snapshots, analyses, diffs] = await Promise.all([
    Promise.resolve(getTickerSnapshots(sym, 5)),
    Promise.resolve(getTickerAnalyses(sym, 5)),
    Promise.resolve(getTickerDiffs(sym, 5)),
  ]);

  const latest   = analyses[0] ?? null;
  const latestDiff = diffs[0] ?? null;
  const latestSnap = snapshots[0] ?? null;
  const prevSnap   = snapshots[1] ?? null;

  const evidenceQuotes: string[] = latest?.reasoning_evidence_json
    ? JSON.parse(latest.reasoning_evidence_json) : [];
  const agentEvidence: string[] = latest?.agent_evidence_json
    ? JSON.parse(latest.agent_evidence_json) : [];
  const validationEvidence: string[] = latest?.validation_evidence_json
    ? JSON.parse(latest.validation_evidence_json) : [];
  const qualityFlags = latestSnap?.quality_flags_json
    ? (JSON.parse(latestSnap.quality_flags_json) as Record<string, boolean>) : {};
  const hasFlags = Object.values(qualityFlags).some(Boolean);
  const displayEvidence = agentEvidence.length > 0 ? agentEvidence : evidenceQuotes;
  const hasAgentExplanation = !!(latest?.agent_what_changed || latest?.agent_why_matters);

  return (
    <div className="max-w-4xl mx-auto px-8 py-12 space-y-10">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/ticker/${sym}`}
            className="text-base text-gray-400 hover:text-brand mb-3 inline-block"
          >
            ← Back to {sym}
          </Link>
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-4xl font-bold text-[#252525]">{sym}</h1>
            <span className="text-xl text-gray-400 font-light">{ticker.name}</span>
            <span className="text-base text-gray-400 font-medium px-4 py-1.5 rounded-full bg-gray-100">
              AI Report
            </span>
          </div>
          {latestSnap && (
            <div className="text-sm text-gray-400 mt-2">
              Last scanned: {new Date(latestSnap.fetched_at).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* ── No data ────────────────────────────────────────────────────────── */}
      {!latest && (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
          <div className="text-5xl mb-4">📡</div>
          <div className="text-2xl font-bold text-gray-400 mb-3">No report data yet</div>
          <p className="text-base text-gray-400 mb-6">Run a scan to generate the AI report for {ticker.name}.</p>
          <Link href="/" className="inline-block bg-brand text-white px-8 py-3 rounded-xl text-base font-semibold hover:opacity-90">
            Go Home →
          </Link>
        </div>
      )}

      {/* ── AG2 AI Explanation ─────────────────────────────────────────────── */}
      {latest && hasAgentExplanation && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3">
            <h2 className="text-2xl font-bold text-[#252525]">🤖 AI Explanation</h2>
            <span className="text-sm px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold">
              DataP.ai · AG2
            </span>
          </div>
          <div className="px-8 py-8 space-y-8">
            {latest.agent_what_changed && (
              <div>
                <div className="text-gray-400 text-sm uppercase tracking-wider font-medium mb-3">
                  What Changed
                </div>
                <p className="text-xl text-gray-800 leading-relaxed font-medium">
                  {latest.agent_what_changed}
                </p>
              </div>
            )}
            {latest.agent_why_matters && (
              <div>
                <div className="text-gray-400 text-sm uppercase tracking-wider font-medium mb-3">
                  Why It Matters
                </div>
                <p className="text-xl text-gray-800 leading-relaxed font-medium">
                  {latest.agent_why_matters}
                </p>
              </div>
            )}
            {latest.validation_status && (
              <div>
                <div className="text-gray-400 text-sm uppercase tracking-wider font-medium mb-3">
                  Validation Result
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <ValidationBadge status={latest.validation_status} />
                  {latest.validation_summary && (
                    <span className="text-base text-gray-600">{latest.validation_summary}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Paid LLM Summary ───────────────────────────────────────────────── */}
      {latest && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3">
            <h2 className="text-2xl font-bold text-[#252525]">
              {hasAgentExplanation ? "📄 LLM Summary" : "🤖 AI Summary"}
            </h2>
            <span className="text-sm px-3 py-1 rounded-full bg-green-50 text-green-700 font-medium">
              GPT / Gemini
            </span>
          </div>
          <div className="px-8 py-8 space-y-6">
            {latest.llm_summary_paid ? (
              <div className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-xl p-6 border border-gray-100">
                {latest.llm_summary_paid}
              </div>
            ) : (
              <p className="text-base text-gray-400 bg-gray-50 rounded-xl p-6 border border-gray-100">
                {!process.env.PAID_LLM_API_KEY
                  ? "Set PAID_LLM_API_KEY to enable AI summaries."
                  : "No summary generated — quality gate not met or no evidence quotes found."}
              </p>
            )}
            {PRIVATE_LLM_ENABLED && latest.llm_summary_private && (
              <div>
                <div className="text-gray-400 text-sm uppercase tracking-wider font-medium mb-3 flex items-center gap-2">
                  Private LLM Note
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">enterprise</span>
                </div>
                <div className="text-base text-purple-800 bg-purple-50 rounded-xl p-6 border border-purple-100">
                  {latest.llm_summary_private}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Evidence ───────────────────────────────────────────────────────── */}
      {latestSnap && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-[#252525]">📄 Evidence</h2>
            <p className="text-sm text-gray-400 mt-1">Source · Snapshot · Diff · Quotes</p>
          </div>
          <div className="px-8 py-8 space-y-8">

            {/* Meta grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-base">
              <div>
                <div className="text-gray-400 text-sm uppercase tracking-wider font-medium mb-2">Source URL</div>
                <a href={latestSnap.url} target="_blank" rel="noopener noreferrer"
                  className="text-brand hover:underline break-all">
                  {latestSnap.url}
                </a>
              </div>
              <div>
                <div className="text-gray-400 text-sm uppercase tracking-wider font-medium mb-2">Scanned at</div>
                <div className="text-gray-700">{new Date(latestSnap.fetched_at).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm uppercase tracking-wider font-medium mb-2">Content fingerprint</div>
                <code className="font-mono text-sm bg-gray-100 px-3 py-1.5 rounded-lg text-gray-600">
                  {latestSnap.content_hash.slice(0, 32)}…
                </code>
              </div>
              <div>
                <div className="text-gray-400 text-sm uppercase tracking-wider font-medium mb-2">Word count (cleaned)</div>
                <div className="text-gray-700 text-lg font-semibold">{latestSnap.word_count.toLocaleString()} words</div>
              </div>
              {latestDiff && (
                <div>
                  <div className="text-gray-400 text-sm uppercase tracking-wider font-medium mb-2">Similarity to previous</div>
                  <div className="text-gray-700 text-lg font-semibold">{Math.round(latestDiff.similarity * 100)}% identical lines</div>
                </div>
              )}
              {hasFlags && (
                <div>
                  <div className="text-gray-400 text-sm uppercase tracking-wider font-medium mb-2">Quality flags</div>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(qualityFlags).filter(([, v]) => v).map(([k]) => (
                      <span key={k} className="text-sm px-3 py-1 rounded-full bg-amber-50 text-amber-600 font-medium">
                        ⚠ {k.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Diff snippet */}
            {latestDiff && (
              <div>
                <div className="text-gray-400 text-sm uppercase tracking-wider font-medium mb-3">
                  Diff — {latestDiff.changed_pct.toFixed(1)}% changed · +{latestDiff.added_lines} / −{latestDiff.removed_lines} lines
                </div>
                <pre className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-sm overflow-x-auto whitespace-pre-wrap font-mono text-gray-700 leading-relaxed">
                  {latestDiff.snippet}
                </pre>
              </div>
            )}

            {/* Evidence quotes */}
            {displayEvidence.length > 0 && (
              <div>
                <div className="text-gray-400 text-sm uppercase tracking-wider font-medium mb-4 flex items-center gap-2">
                  Evidence Quotes
                  {agentEvidence.length > 0 && (
                    <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-600 font-medium">AG2 agent</span>
                  )}
                </div>
                <div className="space-y-4">
                  {displayEvidence.map((q, i) => (
                    <blockquote key={i} className="border-l-4 border-brand pl-6 py-1 text-base text-gray-700 italic leading-relaxed">
                      &ldquo;{q}&rdquo;
                    </blockquote>
                  ))}
                </div>
              </div>
            )}

            {/* Cross-validation supporting sources */}
            {validationEvidence.length > 0 && (
              <div>
                <div className="text-gray-400 text-sm uppercase tracking-wider font-medium mb-4">
                  Cross-Validation Sources
                </div>
                <ul className="space-y-3">
                  {validationEvidence.map((e, i) => (
                    <li key={i} className="text-base text-gray-600 flex items-start gap-3">
                      <span className="text-gray-300 mt-1 text-lg">•</span>
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Before / After */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {prevSnap && (
                <details className="group">
                  <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-600 mb-2 font-medium">
                    ▶ Before text (click to expand)
                  </summary>
                  <pre className="bg-gray-50 border border-red-100 rounded-xl p-4 text-sm overflow-auto max-h-64 font-mono text-gray-600 whitespace-pre-wrap leading-relaxed">
                    {prevSnap.cleaned_text.slice(0, 1500)}…
                  </pre>
                </details>
              )}
              <details className="group">
                <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-600 mb-2 font-medium">
                  ▶ After text (click to expand)
                </summary>
                <pre className="bg-gray-50 border border-green-100 rounded-xl p-4 text-sm overflow-auto max-h-64 font-mono text-gray-600 whitespace-pre-wrap leading-relaxed">
                  {latestSnap.cleaned_text.slice(0, 1500)}…
                </pre>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* ── Scan History ───────────────────────────────────────────────────── */}
      {snapshots.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-[#252525] mb-5">Page Scan History</h2>
          <div className="space-y-3">
            {snapshots.map((s) => {
              const flags = s.quality_flags_json
                ? (JSON.parse(s.quality_flags_json) as Record<string, boolean>) : {};
              const flagged = Object.values(flags).some(Boolean);
              return (
                <div key={s.id}
                  className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between shadow-sm">
                  <span className="text-base text-gray-500">{new Date(s.fetched_at).toLocaleString()}</span>
                  <code className="font-mono text-sm text-gray-300">{s.content_hash.slice(0, 16)}…</code>
                  <span className="text-base text-gray-600 font-medium">{s.word_count.toLocaleString()} words</span>
                  {flagged && <span className="text-amber-500 text-sm font-medium">⚠ quality flags</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Back link ──────────────────────────────────────────────────────── */}
      <div className="pt-4">
        <Link
          href={`/ticker/${sym}`}
          className="text-base text-brand hover:underline font-medium"
        >
          ← Back to {sym} overview
        </Link>
      </div>
    </div>
  );
}
