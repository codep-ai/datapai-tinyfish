import Link from "next/link";
import { UNIVERSE, ASX_UNIVERSE, UNIVERSE_ALL } from "@/lib/universe";
import { getTickerSnapshots, getTickerAnalyses, getTickerDiffs, getLatestAnalysisWithAgentContent, getTickerScanCount, lookupStock, getLatestMaterialEvents } from "@/lib/db";
import { getLang } from "@/lib/getLang";
import { loadTranslations } from "@/lib/i18n";
import { t } from "@/lib/translations";
import { BreakingNewsPanel } from "../../components/BreakingNewsAlert";
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
  const sym = decodeURIComponent(symbol).toUpperCase();
  const lang = await getLang();
  const labels = await loadTranslations(lang);

  // Resolve display info regardless of universe membership
  let ticker: typeof UNIVERSE_ALL[number] | undefined = UNIVERSE_ALL.find((t) => t.symbol === sym);
  const dirEntry = await lookupStock(sym, lang);
  const exchangeLabel = (ticker?.exchange ?? dirEntry?.exchange ?? "NASDAQ") as string;
  // Prefer localized name from DB, fallback to hardcoded universe, then symbol
  const companyName = dirEntry?.name ?? ticker?.name ?? sym;
  const defaultUrl = ticker?.url ?? resolveTickerUrl(sym, exchangeLabel);

  // ── Market Index: skip scan check, render index detail page ──────────────
  const isIndex = exchangeLabel === "INDEX";
  if (isIndex && !ticker) {
    const prices = await fetchPrices(sym, 90, "INDEX");
    return (
      <div>
        <div
          className="w-full"
          style={{ background: "linear-gradient(45deg, seagreen, darkseagreen)", paddingTop: "32px", paddingBottom: "36px" }}
        >
          <div className="max-w-5xl mx-auto px-8 space-y-4">
            <Link href="/indexes" className="text-white/70 hover:text-white text-sm font-medium inline-block">
              ← {t(labels, "back_to_indexes")}
            </Link>
            <div className="flex items-end gap-4 flex-wrap">
              <h1 className="text-5xl font-bold text-white drop-shadow-sm"
                style={{ fontFamily: "var(--font-rajdhani)" }}>{companyName}</h1>
              <span className="text-xl text-white/60 font-light pb-1">{sym}</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-white/60 text-sm px-3 py-1 rounded-full border border-white/20 bg-white/10">
                {dirEntry?.exchange === "INDEX" ? (dirEntry as unknown as { region?: string })?.region ?? "Global" : "Index"}
              </span>
              {prices.length > 0 && (
                <>
                  <span className="text-white text-xl font-bold">{prices[prices.length - 1].close.toLocaleString()}</span>
                  {prices.length >= 2 && (() => {
                    const chg = ((prices[prices.length - 1].close - prices[prices.length - 2].close) / prices[prices.length - 2].close) * 100;
                    return (
                      <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${chg >= 0 ? "bg-green-500/20 text-green-100" : "bg-red-500/20 text-red-200"}`}>
                        {chg >= 0 ? "+" : ""}{chg.toFixed(2)}%
                      </span>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">
          {/* Price Chart */}
          {prices.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-800 mb-4"
                style={{ fontFamily: "var(--font-rajdhani)" }}>{t(labels, "ticker_price_chart")}</h2>
              <PriceChart data={prices} exchange="INDEX" />
            </div>
          )}

          {/* Technical Analysis */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4"
              style={{ fontFamily: "var(--font-rajdhani)" }}>{t(labels, "ticker_technical_analysis")}</h2>
            <TechAnalyticsPanel symbol={sym} exchange="INDEX" />
          </div>
        </div>
      </div>
    );
  }

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
      // Still fetch breaking news even for unmonitored tickers
      const unmonitoredNews = await getLatestMaterialEvents(sym, exchangeLabel, 72, 10);
      return (
        <div>
          <div
            className="w-full"
            style={{ background: "linear-gradient(45deg, seagreen, darkseagreen)", paddingTop: "32px", paddingBottom: "36px" }}
          >
            <div className="max-w-5xl mx-auto px-8 space-y-4">
              <Link href="/" className="text-white/70 hover:text-white text-sm font-medium inline-block">
                ← {t(labels, "back_to_home")}
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
                <TickerScanButton symbol={sym} isMonitored={false} resolvedUrl={defaultUrl} scanLabel={t(labels, "btn_scan_stock")} />
                <WatchlistButton
                  symbol={sym}
                  exchange={exchangeLabel}
                  name={companyName !== sym ? companyName : undefined}
                  loginLabel={t(labels, "btn_login_watch")}
                  watchLabel={t(labels, "btn_watch")}
                  watchingLabel={t(labels, "btn_watching")}
                  addLabel={t(labels, "btn_add_watchlist")}
                />
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-8 py-10 space-y-6">
            {/* Breaking news even for unmonitored tickers */}
            {unmonitoredNews.length > 0 && (
              <BreakingNewsPanel events={unmonitoredNews} />
            )}
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

  const [snapshots, analyses, diffs, prices, materialEvents] = await Promise.all([
    getTickerSnapshots(sym, 5),
    getTickerAnalyses(sym, 5),
    getTickerDiffs(sym, 5),
    fetchPrices(sym, 30, exchangeLabel),
    getLatestMaterialEvents(sym, exchangeLabel, 72, 10),
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
            ← {t(labels, "ticker_all_alerts")}
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
              loginLabel={t(labels, "btn_login_watch")}
              watchLabel={t(labels, "btn_watch")}
              watchingLabel={t(labels, "btn_watching")}
              addLabel={t(labels, "btn_add_watchlist")}
            />
            <Link
              href={`/ticker/${sym}/report`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white uppercase tracking-wide text-sm shadow-md transition-all hover:brightness-110 hover:-translate-y-0.5"
              style={{ background: "#fd8412" }}
            >
              📋 {t(labels, "ticker_ir_report")} →
            </Link>
            <TickerScanButton symbol={sym} isMonitored={true} resolvedUrl={ticker.url} rescanLabel={t(labels, "btn_rescan")} />
          </div>
          {/* Analysis type quick-access row */}
          <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr", justifyItems: "start" }}>
            <Link
              href={`/ticker/${sym}/intel?run=ta`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white uppercase tracking-wide text-sm shadow-md transition-all hover:brightness-110 hover:-translate-y-0.5"
              style={{ background: "#fd8412" }}
            >
              📈 {t(labels, "ticker_ta_btn")}
            </Link>
            <Link
              href={`/ticker/${sym}/intel?run=fa`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white uppercase tracking-wide text-sm shadow-md transition-all hover:brightness-110 hover:-translate-y-0.5"
              style={{ background: "#fd8412" }}
            >
              📊 {t(labels, "ticker_fa_btn")}
            </Link>
            <Link
              href={`/ticker/${sym}/intel?run=ma`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white uppercase tracking-wide text-sm shadow-md transition-all hover:brightness-110 hover:-translate-y-0.5"
              style={{ background: "#fd8412" }}
            >
              🌐 {t(labels, "ticker_ma_btn")}
            </Link>
            <Link
              href={`/ticker/${sym}/intel?run=ca`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white uppercase tracking-wide text-sm shadow-md transition-all hover:brightness-110 hover:-translate-y-0.5"
              style={{ background: "#fd8412" }}
            >
              💬 {t(labels, "ticker_ca_btn")}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-8 py-10 space-y-10">

      {/* ── Breaking News Alerts ───────────────────────────────────────────── */}
      {materialEvents.length > 0 && (
        <BreakingNewsPanel events={materialEvents} />
      )}

      {/* ── Price Context (moved to top per user request) ────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100">
          <h2 className="text-3xl font-bold text-[#252525]">📈 {t(labels, "ticker_price_context")}</h2>
          <p className="text-sm text-gray-400 mt-1">{t(labels, "ticker_price_context_desc")}</p>
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
                  { label: t(labels, "ticker_last_close"), value: `${cp}${last.close.toFixed(2)}`, color: "#252525" },
                  {
                    label: t(labels, "ticker_1d_change"),
                    value: oneDayChange != null
                      ? (oneDayChange >= 0 ? "+" : "") + oneDayChange.toFixed(2) + "%"
                      : "—",
                    color: oneDayChange == null ? "#9ca3af" : oneDayChange >= 0 ? "#2e8b57" : "#dc2626",
                  },
                  { label: t(labels, "ticker_5d_range"), value: `${cp}${low5.toFixed(2)} – ${cp}${high5.toFixed(2)}`, color: "#252525" },
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

      {/* ── Agent Flow ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 px-8 py-5 space-y-3">
        <div className="flex items-center gap-3 flex-wrap text-sm font-medium text-gray-500">
          <span className="text-brand font-bold text-base">TinyFish</span>
          <span className="text-gray-300 text-lg">→</span>
          <span>{t(labels, "ticker_flow_diff")}</span>
          <span className="text-gray-300 text-lg">→</span>
          <span className={latest?.change_type === "CONTENT_CHANGE" ? "text-green-600 font-semibold" : latest?.change_type ? "text-gray-400" : ""}>
            {t(labels, "ticker_flow_quality")}
          </span>
          <span className="text-gray-300 text-lg">→</span>
          <span className={hasAgentSignal ? "text-amber-600 font-semibold" : ""}>
            {t(labels, "ticker_flow_signal")}
          </span>
          <span className="text-gray-300 text-lg">→</span>
          <span className={hasInvestigation ? "text-purple-600 font-semibold" : ""}>
            {t(labels, "ticker_flow_investigation")}
          </span>
          <span className="text-gray-300 text-lg">→</span>
          <span className={hasValidation ? "text-blue-600 font-semibold" : ""}>
            {t(labels, "ticker_flow_validation")}
          </span>
          <span className="text-gray-300 text-lg">→</span>
          <span className={signalSource?.agent_what_changed ? "text-green-600 font-semibold" : ""}>
            {t(labels, "ticker_flow_explanation")}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
          <span>📦 {totalScans} {t(labels, "ticker_scans_stored")}</span>
          {latestSnap && <span>🕐 {t(labels, "last_scan_label")} {new Date(latestSnap.fetched_at).toLocaleString()}</span>}
          {latestSignal && !signalIsFromLatest && (
            <span className="text-amber-600 font-medium">
              ⚡ {t(labels, "ticker_signal_from")} {new Date(latestSignal.fetched_at).toLocaleDateString()}
            </span>
          )}
          {latestIsNoSignal && signalIsFromLatest && (
            <span className="text-green-600 font-medium">✓ {t(labels, "ticker_no_signal")}</span>
          )}
          <span className="ml-auto hidden md:block">{t(labels, "ticker_powered_tagline")}</span>
        </div>
      </div>

      {/* ── Financial Signal ───────────────────────────────────────────────── */}
      {latest && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-3xl font-bold text-[#252525]">🎯 {t(labels, "ticker_signal_detection")}</h2>
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
              <div className="text-gray-400 text-sm mb-2 uppercase tracking-wider font-medium">{t(labels, "ticker_signal_type")}</div>
              <div className="font-bold text-[#252525] text-lg leading-snug">
                {hasAgentSignal
                  ? agentSignalLabel(signalSource?.agent_signal_type ?? null)
                  : latestIsNoSignal
                  ? <span className="text-green-600 font-semibold text-base">✓ All clear</span>
                  : <span className="text-gray-300 font-normal">Not yet detected</span>}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-2 uppercase tracking-wider font-medium">{t(labels, "ticker_severity")}</div>
              {signalSource?.agent_severity && hasAgentSignal
                ? <SeverityBadge severity={signalSource.agent_severity} />
                : <span className="text-gray-300 text-lg">—</span>}
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-2 uppercase tracking-wider font-medium">{t(labels, "ticker_confidence")}</div>
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
              <div className="text-gray-400 text-sm mb-2 uppercase tracking-wider font-medium">{t(labels, "ticker_relevance_score")}</div>
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
              <div className="text-gray-400 text-sm mb-2 uppercase tracking-wider font-medium">{t(labels, "ticker_financial_relevance")}</div>
              <p className="text-base text-gray-700 leading-relaxed">{(signalSource ?? latest).agent_financial_relevance}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Language Shift Scores ──────────────────────────────────────────── */}
      {latest && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-3xl font-bold text-[#252525]">📊 {t(labels, "ticker_language_shift")}</h2>
            <p className="text-sm text-gray-400 mt-1">{t(labels, "ticker_language_shift_desc")}</p>
          </div>
          <div className="px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: t(labels, "ticker_commitment"), value: latest.commitment_delta, invert: true, hint: "↓ = risk" },
              { label: t(labels, "ticker_hedging"),    value: latest.hedging_delta,   invert: false, hint: "↑ = risk" },
              { label: t(labels, "ticker_risk_words"), value: latest.risk_delta,      invert: false, hint: "↑ = risk" },
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
              <div className="text-gray-500 text-sm font-medium mb-1">{t(labels, "ticker_overall_score")}</div>
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
          <h2 className="text-3xl font-bold text-[#252525]">🔍 {t(labels, "ticker_cross_validation")}</h2>
          <p className="text-sm text-gray-400 mt-1">{t(labels, "ticker_cross_validation_desc")}</p>
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
            <h2 className="text-3xl font-bold text-[#252525]">🔎 {t(labels, "ticker_investigation")}</h2>
            <p className="text-sm text-gray-400 mt-1">{t(labels, "ticker_investigation_desc")}</p>
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
          <h2 className="text-3xl font-bold text-[#252525] mb-5">{t(labels, "ticker_change_history")}</h2>
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
          <div className="text-2xl font-bold text-gray-400 mb-3">{t(labels, "ticker_no_data")}</div>
          <p className="text-base text-gray-400">
            {t(labels, "ticker_no_data_desc")} {ticker.name}
          </p>
          <Link
            href="/"
            className="inline-block mt-6 bg-brand text-white px-8 py-3 rounded-xl text-base font-semibold hover:opacity-90"
          >
            {t(labels, "back_to_home")} →
          </Link>
        </div>
      )}

      </div>
    </div>
  );
}
