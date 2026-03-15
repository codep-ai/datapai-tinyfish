import Link from "next/link";
import { UNIVERSE, ASX_UNIVERSE, UNIVERSE_ALL } from "@/lib/universe";
import { getTickerSnapshots, getTickerAnalyses, getTickerDiffs, getLatestAnalysisWithAgentContent, getTickerScanCount, lookupStock } from "@/lib/db";
import { fetchPrices } from "@/lib/price";
import PriceChart from "./PriceChart";
import { agentSignalLabel, validationLabel, changeTypeLabel } from "@/lib/agent";
import { resolveTickerUrl } from "@/lib/scan-pipeline";
import TickerScanButton from "../../components/TickerScanButton";
import WatchlistButton from "../../components/WatchlistButton";
import TechAnalyticsPanel from "../../components/TechAnalyticsPanel";

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
  const sym = symbol.toUpperCase();

  // Resolve display info regardless of universe membership
  let ticker: typeof UNIVERSE_ALL[number] | undefined = UNIVERSE_ALL.find((t) => t.symbol === sym);
  const dirEntry = ticker ? null : await lookupStock(sym);
  const exchangeLabel = (ticker?.exchange ?? dirEntry?.exchange ?? "NASDAQ") as string;
  const companyName = ticker?.name ?? dirEntry?.name ?? sym;
  const defaultUrl = ticker?.url ?? resolveTickerUrl(sym, exchangeLabel);

  // ── Unknown ticker: check if we already have scan data in DB ─────────────
  if (!ticker) {
    // If there are existing snapshots from a previous on-demand scan,
    // construct a virtual ticker and fall through to the full page render.
    const existingSnaps = await getTickerSnapshots(sym, 1);
    if (existingSnaps.length > 0) {
      ticker = {
        symbol: sym,
        name: companyName,
        url: existingSnaps[0].url,
        exchange: exchangeLabel as "NASDAQ" | "NYSE" | "ASX",
      };
    } else {
      // No data yet — show "not monitored" page with prominent Scan button
      return (
        <div>
          <div
            className="w-full"
            style={{ background: "linear-gradient(45deg, seagreen, darkseagreen)", paddingTop: "32px", paddingBottom: "36px" }}
          >
            <div className="max-w-5xl mx-auto px-8 space-y-4">
              <Link href="/" className="text-white/70 hover:text-white text-sm font-medium inline-block">
                ← Back to Home
              </Link>
              <div className="flex items-end gap-4 flex-wrap">
                <h1 className="text-6xl font-bold text-white drop-shadow-sm">{sym}</h1>
                <span className="text-2xl text-white/80 font-light pb-1">{companyName !== sym ? companyName : ""}</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-white/60 text-sm px-3 py-1 rounded-full border border-white/20 bg-white/10">
                  {exchangeLabel}
                </span>
                {dirEntry?.sector && (
                  <span className="text-white/50 text-sm">{dirEntry.sector}</span>
                )}
              </div>
              {/* ── Scan + Watchlist CTAs ── */}
              <div className="pt-2 flex items-center gap-3 flex-wrap">
                <TickerScanButton symbol={sym} isMonitored={false} resolvedUrl={defaultUrl} />
                <WatchlistButton
                  symbol={sym}
                  exchange={exchangeLabel}
                  name={companyName !== sym ? companyName : undefined}
                />
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-8 py-10 space-y-6">
            {/* What the scan will do */}
            <div className="bg-white border border-gray-100 rounded-2xl p-7 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-gray-800">
                ⚡ Run a full AI signal scan on {sym}
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                The scan will run the complete DataP.ai pipeline against <strong>{sym}</strong>:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {[
                  ["🌊 TinyFish Fetch", "Retrieves the latest IR page content using a real browser"],
                  ["🔍 Diff Engine", "Compares against the previous snapshot to find what changed"],
                  ["🎯 Signal Quality Filter", "Classifies the change as content, archive, or layout noise"],
                  ["🤖 Forward Guidance Agent", "Detects guidance withdrawal or hedging language"],
                  ["⚠️ Risk Disclosure Agent", "Identifies new or expanded risk language"],
                  ["📊 Tone Shift Agent", "Measures shift from confident to cautious language"],
                  ["🔬 Investigation Agent", "Cross-validates via ASX/SEC filings and press releases"],
                  ["✅ Cross-Validation", "Confirms signal across multiple data sources"],
                ].map(([title, desc]) => (
                  <div key={title as string} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                    <span className="text-base">{(title as string).split(" ")[0]}</span>
                    <div>
                      <p className="font-semibold text-gray-700 text-xs">{(title as string).slice(2)}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{desc as string}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 pt-2">
                Source URL: <span className="font-mono">{defaultUrl}</span>
              </p>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm text-sm text-gray-500">
              <p className="font-semibold text-gray-700 mb-3">Monitored universe</p>
              <div className="flex flex-wrap gap-2">
                {UNIVERSE_ALL.map((t) => (
                  <Link
                    key={t.symbol}
                    href={`/ticker/${t.symbol}`}
                    className="px-3 py-1 rounded-full text-xs font-bold transition-all hover:-translate-y-0.5"
                    style={t.exchange === "ASX"
                      ? { background: "#eff6ff", color: "#003087", border: "1px solid #bfdbfe" }
                      : { background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }}
                  >
                    {t.symbol}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  const [snapshots, analyses, diffs, prices] = await Promise.all([
    getTickerSnapshots(sym, 5),
    getTickerAnalyses(sym, 5),
    getTickerDiffs(sym, 5),
    fetchPrices(sym, 30, exchangeLabel),
  ]);

  const latest = analyses[0] ?? null;
  const latestDiff = diffs[0] ?? null;
  const latestSnap = snapshots[0] ?? null;
  const totalScans = await getTickerScanCount(sym);

  // Best-signal fallback: if the most recent scan has no AI signal, surface the
  // last scan that DID detect something so the page never looks empty.
  const latestSignal = await getLatestAnalysisWithAgentContent(sym);
  const signalIsFromLatest = latestSignal?.snapshot_new_id === latest?.snapshot_new_id;
  const signalSource = latestSignal ?? latest; // what we'll show for AI signal sections
  const latestIsNoSignal = latest?.agent_signal_type === "NO_SIGNAL";

  const cats: string[] = latest?.categories_json ? JSON.parse(latest.categories_json) : [];
  const qualityFlags = latestSnap?.quality_flags_json
    ? (JSON.parse(latestSnap.quality_flags_json) as Record<string, boolean>)
    : {};
  const hasFlags = Object.values(qualityFlags).some(Boolean);
  const hasAgentSignal = !!signalSource?.agent_signal_type && signalSource.agent_signal_type !== "NO_SIGNAL";
  const hasValidation = !!signalSource?.validation_status;
  const hasInvestigation = !!signalSource?.investigation_summary;
  const investigationSources: string[] = signalSource?.investigation_sources
    ? JSON.parse(signalSource.investigation_sources)
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

          {/* CTAs — Report + Re-scan + Watchlist */}
          <div className="pt-1 flex items-center gap-3 flex-wrap">
            <WatchlistButton
              symbol={sym}
              exchange={ticker.exchange ?? "US"}
              name={ticker.name}
            />
            <Link
              href={`/ticker/${sym}/report`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white uppercase tracking-wide text-sm shadow-md transition-all hover:brightness-110 hover:-translate-y-0.5"
              style={{ background: "#fd8412" }}
            >
              📋 IR Signal Report →
            </Link>
            <TickerScanButton symbol={sym} isMonitored={true} resolvedUrl={ticker.url} />
          </div>
          {/* Analysis type quick-access row */}
          <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr", justifyItems: "start" }}>
            <Link
              href={`/ticker/${sym}/intel?run=ta`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white uppercase tracking-wide text-sm shadow-md transition-all hover:brightness-110 hover:-translate-y-0.5"
              style={{ background: "#fd8412" }}
            >
              📈 Technical Analysis (TA)
            </Link>
            <Link
              href={`/ticker/${sym}/intel?run=fa`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white uppercase tracking-wide text-sm shadow-md transition-all hover:brightness-110 hover:-translate-y-0.5"
              style={{ background: "#fd8412" }}
            >
              📊 Fundamental Analysis (FA)
            </Link>
            <Link
              href={`/ticker/${sym}/intel?run=ma`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white uppercase tracking-wide text-sm shadow-md transition-all hover:brightness-110 hover:-translate-y-0.5"
              style={{ background: "#fd8412" }}
            >
              🌐 Market Analysis (MA)
            </Link>
            <Link
              href={`/ticker/${sym}/intel?run=ca`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white uppercase tracking-wide text-sm shadow-md transition-all hover:brightness-110 hover:-translate-y-0.5"
              style={{ background: "#fd8412" }}
            >
              💬 Chart Analysis (CA)
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-8 py-10 space-y-10">

      {/* ── Agent Flow ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 px-8 py-5 space-y-3">
        <div className="flex items-center gap-3 flex-wrap text-sm font-medium text-gray-500">
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
          <span className={signalSource?.agent_what_changed ? "text-green-600 font-semibold" : ""}>
            AI Explanation
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
          <span>📦 {totalScans} scans stored permanently in database</span>
          {latestSnap && <span>🕐 Last scan: {new Date(latestSnap.fetched_at).toLocaleString()}</span>}
          {latestSignal && !signalIsFromLatest && (
            <span className="text-amber-600 font-medium">
              ⚡ Showing AI signal from {new Date(latestSignal.fetched_at).toLocaleDateString()} — latest scan was no-signal
            </span>
          )}
          {latestIsNoSignal && signalIsFromLatest && (
            <span className="text-green-600 font-medium">✓ No new financial signal in latest scan</span>
          )}
          <span className="ml-auto hidden md:block">Web execution by TinyFish · Financial intelligence by DataP.ai</span>
        </div>
      </div>

      {/* ── Financial Signal ───────────────────────────────────────────────── */}
      {latest && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-3xl font-bold text-[#252525]">🎯 Signal Detection</h2>
              {!signalIsFromLatest && latestSignal && (
                <p className="text-sm text-amber-600 mt-1 font-medium">
                  📅 Signal from {new Date(latestSignal.fetched_at).toLocaleDateString()} · latest scan ({new Date(latest.fetched_at).toLocaleDateString()}) returned no new signal
                </p>
              )}
              {latestIsNoSignal && signalIsFromLatest && (
                <p className="text-sm text-green-600 mt-1 font-medium">
                  ✓ Latest scan confirmed: no new financial signal detected
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <ChangeTypeBadge changeType={latest.change_type} />
              <span className="text-base text-gray-400">
                {hasAgentSignal ? "Detected & powered by DataP.ai Financial Agents" : "Monitored · no signal"}
              </span>
            </div>
          </div>
          <div className="px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="text-gray-400 text-sm mb-2 uppercase tracking-wider font-medium">Signal Type</div>
              <div className="font-bold text-[#252525] text-lg leading-snug">
                {hasAgentSignal
                  ? agentSignalLabel(signalSource?.agent_signal_type ?? null)
                  : latestIsNoSignal
                  ? <span className="text-green-600 font-semibold text-base">✓ All clear</span>
                  : <span className="text-gray-300 font-normal">Not yet detected</span>}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-2 uppercase tracking-wider font-medium">Severity</div>
              {signalSource?.agent_severity && hasAgentSignal
                ? <SeverityBadge severity={signalSource.agent_severity} />
                : <span className="text-gray-300 text-lg">—</span>}
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-2 uppercase tracking-wider font-medium">Confidence</div>
              {(() => {
                const conf = (signalSource ?? latest).agent_confidence ?? (signalSource ?? latest).confidence;
                const pct = Math.round(conf * 100);
                const color = conf >= 0.7 ? "#2e8b57" : conf >= 0.4 ? "#f97316" : "#9ca3af";
                const label = conf >= 0.7 ? "High" : conf >= 0.4 ? "Growing" : "Early signal";
                const tooltip = conf < 0.5
                  ? "Confidence increases with more scan history and corroborating sources"
                  : undefined;
                return (
                  <div>
                    <div className="text-4xl font-bold" style={{ color }}>{pct}%</div>
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
              {(signalSource ?? latest).financial_relevance_score != null ? (
                <div
                  className="text-4xl font-bold"
                  style={{
                    color: ((signalSource ?? latest).financial_relevance_score ?? 0) >= 0.6 ? "#dc2626"
                      : ((signalSource ?? latest).financial_relevance_score ?? 0) >= 0.3 ? "#f97316"
                      : "#9ca3af",
                  }}
                >
                  {Math.round(((signalSource ?? latest).financial_relevance_score ?? 0) * 100)}%
                </div>
              ) : (
                <ValidationBadge status={(signalSource ?? latest).validation_status} />
              )}
            </div>
          </div>
          {(signalSource ?? latest).agent_financial_relevance && (
            <div className="px-8 pb-8">
              <div className="text-gray-400 text-sm mb-2 uppercase tracking-wider font-medium">Financial Relevance</div>
              <p className="text-base text-gray-700 leading-relaxed">{(signalSource ?? latest).agent_financial_relevance}</p>
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
          <h2 className="text-3xl font-bold text-[#252525]">🔍 Cross-Validation</h2>
          <p className="text-sm text-gray-400 mt-1">Signal verified against filings · press releases · public sources</p>
        </div>
        <div className="px-8 py-8 space-y-5">
          {hasValidation ? (
            <>
              {!signalIsFromLatest && latestSignal && (
                <p className="text-xs text-amber-600 font-medium">
                  📅 Validation from {new Date(latestSignal.fetched_at).toLocaleDateString()}
                </p>
              )}
              <div className="flex items-center gap-4 flex-wrap">
                <ValidationBadge status={signalSource?.validation_status ?? null} />
                {signalSource?.agent_signal_type && signalSource.agent_signal_type !== "NO_SIGNAL" && (
                  <span className="text-base text-gray-500">
                    Signal: <strong>{agentSignalLabel(signalSource.agent_signal_type)}</strong>
                  </span>
                )}
              </div>
              {signalSource?.validation_summary && (
                <p className="text-base text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-6 border border-gray-100">
                  {signalSource.validation_summary}
                </p>
              )}
            </>
          ) : (
            <p className="text-base bg-gray-50 rounded-xl p-6 border border-gray-100"
              style={{ color: latestIsNoSignal ? "#16a34a" : "#9ca3af" }}>
              {!latest
                ? "No scan data yet. Run a scan to populate."
                : latestIsNoSignal
                ? "✓ No signal detected in latest scan — cross-validation not required. All clear."
                : !signalSource
                ? "No agent signal detected across scan history — no cross-validation to show."
                : "Cross-validation unavailable — no signal detected or backend unreachable."}
            </p>
          )}
        </div>
      </div>

      {/* ── Investigation Agent ────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-3xl font-bold text-[#252525]">🔎 Investigation</h2>
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
              {!signalIsFromLatest && latestSignal && (
                <p className="text-xs text-amber-600 font-medium">
                  📅 Investigation from {new Date(latestSignal.fetched_at).toLocaleDateString()}
                </p>
              )}
              <p className="text-base text-gray-700 leading-relaxed bg-purple-50 rounded-xl p-6 border border-purple-100">
                {signalSource!.investigation_summary}
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
            <p className="text-base bg-gray-50 rounded-xl p-6 border border-gray-100"
              style={{ color: latestIsNoSignal ? "#16a34a" : "#9ca3af" }}>
              {!latest
                ? "No scan data yet. Run a scan to populate."
                : latestIsNoSignal
                ? "✓ No signal to investigate — latest scan returned all clear."
                : "No investigation data across scan history yet."}
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
            exchange={exchangeLabel}
          />
          {prices.length > 0 && (() => {
            const sorted = [...prices].sort((a, b) => a.date.localeCompare(b.date));
            const last  = sorted[sorted.length - 1];
            const prev  = sorted[sorted.length - 2];
            const oneDayChange = prev ? ((last.close - prev.close) / prev.close) * 100 : null;
            const last5 = sorted.slice(-5);
            const low5  = Math.min(...last5.map((p) => p.close));
            const high5 = Math.max(...last5.map((p) => p.close));
            const cp = exchangeLabel === "ASX" ? "A$" : "$";
            return (
              <div className="mt-6 grid grid-cols-3 gap-6">
                {[
                  { label: "Last close", value: `${cp}${last.close.toFixed(2)}`, color: "#252525" },
                  {
                    label: "1d change",
                    value: oneDayChange != null
                      ? (oneDayChange >= 0 ? "+" : "") + oneDayChange.toFixed(2) + "%"
                      : "—",
                    color: oneDayChange == null ? "#9ca3af" : oneDayChange >= 0 ? "#2e8b57" : "#dc2626",
                  },
                  { label: "5d range", value: `${cp}${low5.toFixed(2)} – ${cp}${high5.toFixed(2)}`, color: "#252525" },
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

      {/* ── AI Technical Intelligence ──────────────────────────────────────── */}
      <TechAnalyticsPanel
        symbol={sym}
        exchange={exchangeLabel}
        snapshotText={(latestSnap?.cleaned_text ?? latestSnap?.text ?? "").slice(0, 4000)}
        latestHeadline={
          signalSource?.agent_what_changed
            ? signalSource.agent_what_changed.slice(0, 200)
            : `${ticker.name} — recent IR page update`
        }
      />

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
