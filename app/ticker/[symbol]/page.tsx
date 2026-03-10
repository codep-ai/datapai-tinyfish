import { notFound } from "next/navigation";
import Link from "next/link";
import { UNIVERSE, ASX_UNIVERSE, UNIVERSE_ALL } from "@/lib/universe";
import { getTickerSnapshots, getTickerAnalyses, getTickerDiffs } from "@/lib/db";
import { fetchPrices } from "@/lib/price";
import PriceChart from "./PriceChart";
import { agentSignalLabel, validationLabel, changeTypeLabel } from "@/lib/agent";

export const dynamic = "force-dynamic";

// ─── Badge helpers ────────────────────────────────────────────────────────────

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

function ChangeTypeBadge({ changeType }: { changeType: string | null }) {
  if (!changeType) return null;
  const config: Record<string, { bg: string; border: string; text: string }> = {
    CONTENT_CHANGE: { bg: "#f0fdf4", border: "#4ade80", text: "#166534" },
    ARCHIVE_CHANGE: { bg: "#f9fafb", border: "#d1d5db", text: "#6b7280" },
    LAYOUT_CHANGE:  { bg: "#f0f9ff", border: "#7dd3fc", text: "#0c4a6e" },
  };
  const c = config[changeType] ?? { bg: "#f9fafb", border: "#d1d5db", text: "#6b7280" };
  return (
    <span
      className="text-xs font-semibold px-3 py-1 rounded-full"
      style={{ background: c.bg, border: `1.5px solid ${c.border}`, color: c.text }}
    >
      {changeTypeLabel(changeType)}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string | null }) {
  if (!severity) return null;
  const config: Record<string, { bg: string; text: string }> = {
    HIGH:   { bg: "#fef2f2", text: "#991b1b" },
    MEDIUM: { bg: "#fffbea", text: "#92400e" },
    LOW:    { bg: "#f0fdf4", text: "#166534" },
  };
  const c = config[severity] ?? { bg: "#f5f5f5", text: "#666" };
  return (
    <span
      className="text-sm font-bold px-3 py-1 rounded-full uppercase tracking-wider"
      style={{ background: c.bg, color: c.text }}
    >
      {severity}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TickerPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const ticker = UNIVERSE_ALL.find((t) => t.symbol === symbol.toUpperCase());
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

  const cats: string[] = latest?.categories_json ? JSON.parse(latest.categories_json) : [];
  const qualityFlags = latestSnap?.quality_flags_json
    ? (JSON.parse(latestSnap.quality_flags_json) as Record<string, boolean>)
    : {};
  const hasFlags = Object.values(qualityFlags).some(Boolean);
  const hasAgentSignal = !!latest?.agent_signal_type;
  const hasValidation = !!latest?.validation_status;
  const hasInvestigation = !!latest?.investigation_summary;
  const investigationSources: string[] = latest?.investigation_sources
    ? JSON.parse(latest.investigation_sources)
    : [];

  return (
    <div>

      {/* ── Full-width green hero (matches home page style) ─────────────────── */}
      <div
        className="w-full"
        style={{ background: "linear-gradient(45deg, seagreen, darkseagreen)", paddingTop: "32px", paddingBottom: "36px" }}
      >
        <div className="max-w-5xl mx-auto px-8 space-y-4">

          {/* Back link */}
          <Link href="/alerts" className="text-white/70 hover:text-white text-sm font-medium inline-block">
            ← All Alerts
          </Link>

          {/* Ticker + company name */}
          <div className="flex items-end gap-4 flex-wrap">
            <h1 className="text-6xl font-bold text-white drop-shadow-sm">{ticker.symbol}</h1>
            <span className="text-2xl text-white/80 font-light pb-1">{ticker.name}</span>
          </div>

          {/* Source URL */}
          <a href={ticker.url} target="_blank" rel="noopener noreferrer"
            className="text-white/70 hover:text-white text-sm inline-block">
            {ticker.url} ↗
          </a>

          {/* Alert status line */}
          {latest && Math.abs(latest.alert_score) > 0.3 && (
            <p className="text-white text-lg font-semibold">
              {latest.alert_score > 1
                ? "⚠ Word-score alert: page shifted toward more cautious language."
                : latest.alert_score < -1
                ? "✓ Word-score: language has become more confident and committed."
                : "~ Moderate wording change detected on this page."}
              <span className="ml-3 text-white/60 text-base font-normal">
                {hasAgentSignal
                  ? `AG2 signal: ${latest.agent_signal_type?.replace(/_/g, " ")}`
                  : "No AG2 financial signal"}
                {" · "}conf {Math.round(latest.confidence * 100)}%
                {hasFlags && " · ⚠ quality flags"}
              </span>
            </p>
          )}

          {/* Orange CTA — compact button, opens in new tab */}
          <div className="pt-1">
            <Link
              href={`/ticker/${sym}/report`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white uppercase tracking-wide text-sm shadow-md transition-all hover:brightness-110 hover:-translate-y-0.5"
              style={{ background: "#fd8412" }}
            >
              📋 View Full AI Report →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-8 py-10 space-y-10">

      {/* ── Agent Flow ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 px-8 py-5 flex items-center gap-3 flex-wrap text-sm font-medium text-gray-500">
        <span className="text-brand font-bold text-base">TinyFish</span>
        <span className="text-gray-300 text-lg">→</span>
        <span>Diff Engine</span>
        <span className="text-gray-300 text-lg">→</span>
        <span className={latest?.change_type === "CONTENT_CHANGE" ? "text-green-600 font-semibold" : latest?.change_type ? "text-gray-400" : ""}>
          Signal Quality Filter
        </span>
        <span className="text-gray-300 text-lg">→</span>
        <span className={hasAgentSignal ? "text-amber-600 font-semibold" : ""}>
          Financial Signal Agent
        </span>
        <span className="text-gray-300 text-lg">→</span>
        <span className={hasInvestigation ? "text-purple-600 font-semibold" : ""}>
          Investigation Agent
        </span>
        <span className="text-gray-300 text-lg">→</span>
        <span className={hasValidation ? "text-blue-600 font-semibold" : ""}>
          Cross-Validation Agent
        </span>
        <span className="text-gray-300 text-lg">→</span>
        <span className={latest?.agent_what_changed ? "text-green-600 font-semibold" : ""}>
          AI Explanation
        </span>
        <span className="ml-auto text-gray-300 text-xs hidden md:block">
          Web execution by TinyFish · Financial intelligence by DataP.ai
        </span>
      </div>

      {/* ── Financial Signal ───────────────────────────────────────────────── */}
      {latest && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-3xl font-bold text-[#252525]">🎯 DataP.ai Financial Intelligent Agent — Signal Detection</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <ChangeTypeBadge changeType={latest.change_type} />
              <span className="text-base text-gray-400">
                {hasAgentSignal ? "Detected & powered by DataP.ai Financial Agents" : "Local scoring only"}
              </span>
            </div>
          </div>
          <div className="px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="text-gray-400 text-sm mb-2 uppercase tracking-wider font-medium">Signal Type</div>
              <div className="font-bold text-[#252525] text-lg leading-snug">
                {hasAgentSignal
                  ? agentSignalLabel(latest.agent_signal_type)
                  : <span className="text-gray-300 font-normal">Not detected</span>}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-2 uppercase tracking-wider font-medium">Severity</div>
              {latest.agent_severity
                ? <SeverityBadge severity={latest.agent_severity} />
                : <span className="text-gray-300 text-lg">—</span>}
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-2 uppercase tracking-wider font-medium">Confidence</div>
              {(() => {
                const conf = latest.agent_confidence ?? latest.confidence;
                const pct = Math.round(conf * 100);
                const color = conf >= 0.7 ? "#2e8b57" : conf >= 0.4 ? "#f97316" : "#9ca3af";
                const label = conf >= 0.7 ? "High" : conf >= 0.4 ? "Growing" : "Early signal";
                const tooltip = conf < 0.5
                  ? "Confidence increases with more scan history and corroborating sources"
                  : undefined;
                return (
                  <div>
                    <div className="text-4xl font-bold" style={{ color }}>{pct}%</div>
                    {/* Visual bar */}
                    <div className="mt-2 h-1.5 rounded-full bg-gray-100 w-24">
                      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <div className="text-xs mt-1 font-medium" style={{ color }} title={tooltip}>{label}</div>
                  </div>
                );
              })()}
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-2 uppercase tracking-wider font-medium">Relevance Score</div>
              {latest.financial_relevance_score != null ? (
                <div
                  className="text-4xl font-bold"
                  style={{
                    color: latest.financial_relevance_score >= 0.6 ? "#dc2626"
                      : latest.financial_relevance_score >= 0.3 ? "#f97316"
                      : "#9ca3af",
                  }}
                >
                  {Math.round(latest.financial_relevance_score * 100)}%
                </div>
              ) : (
                <ValidationBadge status={latest.validation_status} />
              )}
            </div>
          </div>
          {latest.agent_financial_relevance && (
            <div className="px-8 pb-8">
              <div className="text-gray-400 text-sm mb-2 uppercase tracking-wider font-medium">Financial Relevance</div>
              <p className="text-base text-gray-700 leading-relaxed">{latest.agent_financial_relevance}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Language Shift Scores ──────────────────────────────────────────── */}
      {latest && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-3xl font-bold text-[#252525]">📊 Language Shift Scores</h2>
            <p className="text-sm text-gray-400 mt-1">New vs. previous scan · per 1,000 words on cleaned text</p>
          </div>
          <div className="px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "Commitment", value: latest.commitment_delta, invert: true, hint: "↓ = risk" },
              { label: "Hedging",    value: latest.hedging_delta,   invert: false, hint: "↑ = risk" },
              { label: "Risk Words", value: latest.risk_delta,      invert: false, hint: "↑ = risk" },
            ].map(({ label, value, invert, hint }) => {
              const isRisk = invert ? value < 0 : value > 0;
              const color = isRisk ? "#dc2626" : value < -0.01 || (!invert && value < 0) ? "#2e8b57" : "#9ca3af";
              return (
                <div key={label} className="text-center p-6 rounded-xl border border-gray-100 bg-gray-50">
                  <div className="text-gray-500 text-sm font-medium mb-1">{label}</div>
                  <div className="text-gray-400 text-xs mb-3">{hint}</div>
                  <div className="text-4xl font-bold" style={{ color }}>
                    {value > 0 ? "+" : ""}{value.toFixed(2)}
                  </div>
                </div>
              );
            })}
            <div
              className="text-center p-6 rounded-xl"
              style={
                latest.alert_score > 1
                  ? { background: "#fff3e0", border: "2px solid #fb923c" }
                  : latest.alert_score < -1
                  ? { background: "#f0fdf4", border: "2px solid #4ade80" }
                  : { background: "#fffbea", border: "2px solid #fd8412" }
              }
            >
              <div className="text-gray-500 text-sm font-medium mb-1">Overall Score</div>
              <div className="text-gray-400 text-xs mb-3">composite</div>
              <div
                className="text-4xl font-bold"
                style={{
                  color: latest.alert_score > 1 ? "#dc2626" : latest.alert_score < -1 ? "#2e8b57" : "#b45309",
                }}
              >
                {latest.alert_score > 0 ? "+" : ""}{latest.alert_score.toFixed(2)}
              </div>
            </div>
          </div>
          {cats.length > 0 && (
            <div className="px-8 pb-8 flex gap-3 flex-wrap">
              {cats.map((c) => (
                <span key={c} className="px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                  {c.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Cross-Validation ───────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100">
          <h2 className="text-3xl font-bold text-[#252525]">🔍 DataP.ai Financial Intelligent Agent — Cross-Validation</h2>
          <p className="text-sm text-gray-400 mt-1">Signal verified against filings · press releases · public sources</p>
        </div>
        <div className="px-8 py-8 space-y-5">
          {hasValidation ? (
            <>
              <div className="flex items-center gap-4 flex-wrap">
                <ValidationBadge status={latest?.validation_status ?? null} />
                {latest?.agent_signal_type && (
                  <span className="text-base text-gray-500">
                    Signal: <strong>{agentSignalLabel(latest.agent_signal_type)}</strong>
                  </span>
                )}
              </div>
              {latest?.validation_summary && (
                <p className="text-base text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-6 border border-gray-100">
                  {latest.validation_summary}
                </p>
              )}
            </>
          ) : (
            <p className="text-base text-gray-400 bg-gray-50 rounded-xl p-6 border border-gray-100">
              {!latest
                ? "No scan data yet. Run a scan to populate."
                : !process.env.AGENT_BACKEND_BASE_URL
                ? "Cross-validation requires the AG2 agent backend. Set AGENT_BACKEND_BASE_URL to enable."
                : "Cross-validation unavailable — no signal detected or backend unreachable."}
            </p>
          )}
        </div>
      </div>

      {/* ── Investigation Agent ────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-3xl font-bold text-[#252525]">🔎 DataP.ai Financial Intelligent Agent — Investigation</h2>
            <p className="text-sm text-gray-400 mt-1">Probes press releases · exchange filings · IR pages for corroborating evidence</p>
          </div>
          {hasInvestigation && (latest?.corroborating_count ?? 0) > 0 && (
            <span className="px-4 py-2 rounded-full text-sm font-bold"
              style={{ background: "#f3e8ff", color: "#6b21a8", border: "1.5px solid #d8b4fe" }}>
              {latest!.corroborating_count} corroborating source{(latest!.corroborating_count ?? 0) !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="px-8 py-8 space-y-5">
          {hasInvestigation ? (
            <>
              <p className="text-base text-gray-700 leading-relaxed bg-purple-50 rounded-xl p-6 border border-purple-100">
                {latest!.investigation_summary}
              </p>
              {investigationSources.length > 0 && (
                <div>
                  <div className="text-gray-400 text-sm mb-3 uppercase tracking-wider font-medium">Sources checked</div>
                  <div className="flex gap-2 flex-wrap">
                    {investigationSources.map((src) => (
                      <span key={src} className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                        {src}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-base text-gray-400 bg-gray-50 rounded-xl p-6 border border-gray-100">
              {!latest
                ? "No scan data yet. Run a scan to populate."
                : !process.env.AGENT_BACKEND_BASE_URL
                ? "Investigation requires the AG2 agent backend. Set AGENT_BACKEND_BASE_URL to enable."
                : "No investigation data — signal may have been suppressed by quality filter, or no backend signal detected."}
            </p>
          )}
        </div>
      </div>

      {/* ── Price Context ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100">
          <h2 className="text-3xl font-bold text-[#252525]">📈 Price Context</h2>
          <p className="text-sm text-gray-400 mt-1">30-day chart · orange markers = scan dates</p>
        </div>
        <div className="px-8 py-8">
          <PriceChart
            data={prices}
            scanDates={snapshots.map((s) => s.fetched_at.slice(0, 10))}
          />
          {prices.length > 0 && (() => {
            const sorted = [...prices].sort((a, b) => a.date.localeCompare(b.date));
            const last  = sorted[sorted.length - 1];
            const prev  = sorted[sorted.length - 2];
            const oneDayChange = prev ? ((last.close - prev.close) / prev.close) * 100 : null;
            const last5 = sorted.slice(-5);
            const low5  = Math.min(...last5.map((p) => p.close));
            const high5 = Math.max(...last5.map((p) => p.close));
            return (
              <div className="mt-6 grid grid-cols-3 gap-6">
                {[
                  { label: "Last close", value: `$${last.close.toFixed(2)}`, color: "#252525" },
                  {
                    label: "1d change",
                    value: oneDayChange != null
                      ? (oneDayChange >= 0 ? "+" : "") + oneDayChange.toFixed(2) + "%"
                      : "—",
                    color: oneDayChange == null ? "#9ca3af" : oneDayChange >= 0 ? "#2e8b57" : "#dc2626",
                  },
                  { label: "5d range", value: `$${low5.toFixed(2)} – $${high5.toFixed(2)}`, color: "#252525" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-5 text-center border border-gray-100">
                    <div className="text-gray-400 text-sm mb-2">{label}</div>
                    <div className="text-2xl font-bold" style={{ color }}>{value}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Change History ─────────────────────────────────────────────────── */}
      {analyses.length > 0 && (
        <div>
          <h2 className="text-3xl font-bold text-[#252525] mb-5">Change History</h2>
          <div className="space-y-3">
            {analyses.map((a) => {
              const aCats: string[] = a.categories_json ? JSON.parse(a.categories_json) : [];
              return (
                <div
                  key={a.id}
                  className="bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-between shadow-sm"
                >
                  <div>
                    <div className="text-gray-400 text-sm mb-2">
                      {new Date(a.fetched_at).toLocaleString()}
                    </div>
                    <div className="flex gap-2 mt-1 flex-wrap items-center">
                      <ChangeTypeBadge changeType={a.change_type} />
                      {a.agent_signal_type && (
                        <span className="text-xs px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold">
                          {agentSignalLabel(a.agent_signal_type)}
                        </span>
                      )}
                      {(a.corroborating_count ?? 0) > 0 && (
                        <span className="text-xs px-3 py-1 rounded-full font-semibold"
                          style={{ background: "#f3e8ff", color: "#6b21a8" }}>
                          🔎 {a.corroborating_count} source{a.corroborating_count !== 1 ? "s" : ""}
                        </span>
                      )}
                      {aCats.map((c) => (
                        <span key={c} className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
                          {c.replace(/_/g, " ")}
                        </span>
                      ))}
                      {a.validation_status && <ValidationBadge status={a.validation_status} />}
                      <span className="text-sm text-gray-400">conf {Math.round(a.confidence * 100)}%</span>
                    </div>
                  </div>
                  <div
                    className="text-3xl font-bold ml-6"
                    style={{
                      color: a.alert_score > 1 ? "#dc2626" : a.alert_score < -1 ? "#2e8b57" : "#b45309",
                    }}
                  >
                    {a.alert_score > 0 ? "+" : ""}{a.alert_score.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── No data state ──────────────────────────────────────────────────── */}
      {!latest && (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
          <div className="text-5xl mb-4">📡</div>
          <div className="text-2xl font-bold text-gray-400 mb-3">No scan data yet</div>
          <p className="text-base text-gray-400">
            Run a scan from the home page to populate signals for {ticker.name}.
          </p>
          <Link
            href="/"
            className="inline-block mt-6 bg-brand text-white px-8 py-3 rounded-xl text-base font-semibold hover:opacity-90"
          >
            Go Home →
          </Link>
        </div>
      )}

      </div>
    </div>
  );
}
