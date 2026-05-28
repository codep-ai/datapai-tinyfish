/**
 * /debate/[ticker] — Public, demo-ready animated debate replay.
 *
 * Designed as the "demo moment" for B2B prospects: paste the URL in a
 * deck or email, and the receiver sees the AI agents actually debate
 * the stock in front of them — Bull, Bear, Risk, Portfolio Manager
 * speaking in sequence with typewriter animation. No login required.
 *
 * Server component pulls:
 *   - StockSynthesis (final call + agent_signals + gate_decisions)
 *   - DebateTranscript (raw arguments from sys_agent_debate_log_full)
 *
 * Client child DebateReplay handles the animation.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────────────┐
 *   │ Header: ticker / exchange / quick-switch dropdown        │
 *   ├──────────────┬─────────────────────────┬─────────────────┤
 *   │ Input agents │  Animated chat thread   │ Governance gates │
 *   │ (left rail)  │  (Bull → Bear → ...)    │ (right rail)     │
 *   │              │  + final synthesis card │                  │
 *   └──────────────┴─────────────────────────┴─────────────────┘
 *   Reflector lessons row (if any) · footer linking to /methodology
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStockSynthesisFlexible, getDebateTranscript } from "@/lib/db";
import { fetchPrices } from "@/lib/price";
import DebateReplay from "../../components/DebateReplay";

interface PageProps {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ exchange?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { ticker } = await params;
  const { exchange } = await searchParams;
  const exLabel = (exchange || "US").toUpperCase();
  return {
    title: `${ticker.toUpperCase()} AI Debate Replay — DataPai`,
    description: `Watch DataPai's 4-AI-agent debate (Bull · Bear · Risk · Portfolio Manager) on ${ticker.toUpperCase()} ${exLabel}. See exactly how the BUY / SELL / HOLD call was made.`,
  };
}

// Featured tickers for the quick-switch dropdown — covers the demo names.
const FEATURED: Array<{ ticker: string; exchange: string; label: string }> = [
  { ticker: "AAPL",  exchange: "US",  label: "AAPL · Apple"        },
  { ticker: "MSFT",  exchange: "US",  label: "MSFT · Microsoft"    },
  { ticker: "NVDA",  exchange: "US",  label: "NVDA · NVIDIA"       },
  { ticker: "GOOGL", exchange: "US",  label: "GOOGL · Alphabet"    },
  { ticker: "TSLA",  exchange: "US",  label: "TSLA · Tesla"        },
  { ticker: "AMD",   exchange: "US",  label: "AMD"                  },
  { ticker: "BHP",   exchange: "ASX", label: "BHP · BHP Group"     },
  { ticker: "CBA",   exchange: "ASX", label: "CBA · Commonwealth Bank" },
  { ticker: "CSL",   exchange: "ASX", label: "CSL"                  },
  { ticker: "RIO",   exchange: "ASX", label: "RIO · Rio Tinto"     },
];

// Direction → label/color helpers (kept in sync with DebateReplay component).
const directionStyles: Record<string, { bg: string; fg: string; label: string }> = {
  STRONG_BUY:  { bg: "#dcfce7", fg: "#15803d", label: "STRONG BUY" },
  BUY:         { bg: "#dcfce7", fg: "#166534", label: "BUY"        },
  HOLD:        { bg: "#fefce8", fg: "#854d0e", label: "HOLD"       },
  SELL:        { bg: "#fef2f2", fg: "#991b1b", label: "SELL"       },
  STRONG_SELL: { bg: "#fef2f2", fg: "#7f1d1d", label: "STRONG SELL"},
};

const agentDisplayName: Record<string, string> = {
  technical:       "Technical Analyst",
  fundamental:     "Fundamental Composite",
  macro:           "Macro Agent",
  market_activity: "Market Activity",
  news:            "News Classifier",
};

const gateDisplayName: Record<string, string> = {
  quality_gate:    "Quality Gate",
  regime_gate:     "Regime Gate",
  sanity_override: "Sanity Override",
  critical_news:   "Critical News",
};

export default async function DebatePage({ params, searchParams }: PageProps) {
  const { ticker: rawTicker } = await params;
  const { exchange: rawExchange } = await searchParams;
  const ticker = rawTicker.toUpperCase();
  const exchange = (rawExchange || "US").toUpperCase();

  // Fetch in parallel — synthesis + transcript + recent prices (for the
  // "price at debate" anchor in the meta row).
  const [synthesis, transcript, recentPrices] = await Promise.all([
    getStockSynthesisFlexible(ticker, exchange),
    getDebateTranscript(ticker, exchange),
    fetchPrices(ticker, 14, exchange).catch(() => []),
  ]);

  if (!synthesis) {
    // Soft 404 — show a helpful empty state instead of a hard 404
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          No debate yet for {ticker} ({exchange})
        </h1>
        <p className="text-gray-600 mb-6">
          We haven't synthesised this stock yet. The 4-agent debate runs nightly
          via Airflow on stocks shown on the landing pages or watchlisted by users.
          Try one of these instead:
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {FEATURED.map((f) => (
            <Link
              key={`${f.ticker}-${f.exchange}`}
              href={`/debate/${f.ticker}?exchange=${f.exchange}`}
              className="text-sm px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold"
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const dir = synthesis.direction || "HOLD";
  const dirStyle = directionStyles[dir] ?? directionStyles.HOLD;

  // ── Date / price meta — anchors "at this price, this is what the AI thought" ──
  const debateDateRaw = synthesis.computed_at ? new Date(synthesis.computed_at) : null;
  const debateDateStr = debateDateRaw
    ? debateDateRaw.toLocaleString("en-US", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
        timeZone: "UTC", timeZoneName: "short",
      })
    : "—";

  // ── Price-at-debate: prefer the stored snapshot (migration 046) ────────
  // The synthesis row has price_at_debate / price_currency / price_as_of_date
  // frozen at write time — that is the EXACT price the AI agents saw and
  // is immune to future price-table reloads or split-adjustment changes.
  // We fall back to the recent-prices lookup only if the snapshot is null
  // (older rows pre-migration-046).
  let priceAtDebate: number | null =
    typeof synthesis.price_at_debate === "number" ? synthesis.price_at_debate : null;
  let priceAtDebateDate: string | null = synthesis.price_as_of_date ?? null;
  let priceLatest: number | null = null;
  let priceLatestDate: string | null = null;

  if (recentPrices.length > 0) {
    const sorted = [...recentPrices].sort((a, b) => a.date.localeCompare(b.date));
    priceLatest = sorted[sorted.length - 1].close;
    priceLatestDate = sorted[sorted.length - 1].date;
    // Fill in price_at_debate from lookup ONLY if snapshot was missing
    if (priceAtDebate == null && debateDateRaw) {
      const debateDay = debateDateRaw.toISOString().slice(0, 10);
      const onOrBefore = sorted.filter((p) => p.date <= debateDay);
      const pick = onOrBefore.length > 0 ? onOrBefore[onOrBefore.length - 1] : sorted[0];
      priceAtDebate = pick.close;
      priceAtDebateDate = pick.date;
    }
  }
  const priceDeltaPct =
    priceAtDebate != null && priceLatest != null && priceAtDebate > 0
      ? ((priceLatest - priceAtDebate) / priceAtDebate) * 100
      : null;

  // Currency: stored snapshot wins; fall back to exchange-based default
  const storedCurrency = synthesis.price_currency;
  const currencySymbol =
    storedCurrency === "USD" ? "$"
    : storedCurrency === "AUD" ? "A$"
    : storedCurrency === "HKD" ? "HK$"
    : storedCurrency === "VND" ? "₫"
    : storedCurrency === "GBP" ? "£"
    : storedCurrency === "JPY" ? "¥"
    : exchange === "ASX" ? "A$"
    : exchange === "HKEX" ? "HK$"
    : exchange === "HOSE" ? "₫"
    : "$";

  // Surface non-empty agent_signals + gate_decisions for the side rails
  const agents = Object.entries(synthesis.agent_signals ?? {}).filter(
    ([, sig]) => sig != null
  );
  const gates = Object.entries(synthesis.gate_decisions ?? {}).filter(
    ([, dec]) => dec != null
  );
  const firedGateCount = gates.filter(([, d]) => d!.fired).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {/* Header: ticker + final call summary + ticker switcher */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#2e8b57] mb-1">
            AI Debate Replay
          </p>
          <h1 className="text-3xl font-bold text-gray-900 flex items-baseline gap-3 flex-wrap">
            {ticker}
            <span className="text-gray-400 text-lg font-normal">{exchange}</span>
            <span
              className="text-xs px-2.5 py-1 rounded-full font-bold tracking-wide align-middle"
              style={{ background: dirStyle.fg, color: "#fff" }}
            >
              {dirStyle.label}
            </span>
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Watch the Bull, Bear, Risk Manager, and Portfolio Manager argue this
            stock in sequence. Then see every input signal and governance gate.
          </p>
        </div>

        {/* Quick-switch */}
        <div className="flex flex-col items-end gap-2">
          <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
            Try another stock
          </label>
          <div className="flex flex-wrap gap-1.5 justify-end max-w-md">
            {FEATURED.map((f) => {
              const active = f.ticker === ticker && f.exchange === exchange;
              return (
                <Link
                  key={`${f.ticker}-${f.exchange}`}
                  href={`/debate/${f.ticker}?exchange=${f.exchange}`}
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    active
                      ? "bg-[#2e8b57] text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  {f.ticker}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Meta row — anchors the debate to a specific moment in time + price */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Debate run</span>
          <span className="font-semibold text-gray-900">{debateDateStr}</span>
        </div>

        {priceAtDebate != null && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Price at debate</span>
            <span className="font-semibold text-gray-900 tabular-nums">
              {currencySymbol}{priceAtDebate < 1 ? priceAtDebate.toFixed(4) : priceAtDebate.toFixed(2)}
            </span>
            {priceAtDebateDate && (
              <span className="text-[10px] text-gray-400">({priceAtDebateDate})</span>
            )}
          </div>
        )}

        {priceLatest != null && priceLatestDate !== priceAtDebateDate && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Latest</span>
            <span className="font-semibold text-gray-900 tabular-nums">
              {currencySymbol}{priceLatest < 1 ? priceLatest.toFixed(4) : priceLatest.toFixed(2)}
            </span>
            {priceLatestDate && (
              <span className="text-[10px] text-gray-400">({priceLatestDate})</span>
            )}
            {priceDeltaPct != null && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  priceDeltaPct >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                }`}
              >
                {priceDeltaPct >= 0 ? "+" : ""}{priceDeltaPct.toFixed(2)}%
              </span>
            )}
          </div>
        )}

        <div className="flex-1" />
        <div className="text-[10px] text-gray-400 italic">
          Next scheduled debate: tonight 22:00 UTC (US) / 08:00 UTC (ASX)
        </div>
      </div>

      {/* Main 3-column layout: input agents / chat / gates */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_240px] gap-5">
        {/* Left rail — input agents */}
        <aside className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            Input signals ({agents.length})
          </div>
          {agents.length === 0 && (
            <div className="text-xs text-gray-500 italic">No input agent data captured.</div>
          )}
          {agents.map(([slug, sig]) => {
            const sigDir = (sig!.direction || "").toUpperCase();
            const sigDc = directionStyles[sigDir] ?? { bg: "#f3f4f6", fg: "#374151", label: sigDir || "—" };
            return (
              <div key={slug} className="bg-white border border-gray-200 rounded-lg p-2.5">
                <div className="text-xs font-semibold text-gray-900 mb-1">
                  {agentDisplayName[slug] ?? slug}
                </div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                    style={{ background: sigDc.bg, color: sigDc.fg }}
                  >
                    {sigDc.label}
                  </span>
                  {typeof sig!.confidence === "number" && (
                    <span className="text-[10px] text-gray-500">
                      {Math.round(sig!.confidence * 100)}%
                    </span>
                  )}
                </div>
                {sig!.summary && (
                  <div className="text-[11px] text-gray-600 leading-snug">
                    {sig!.summary.length > 110 ? sig!.summary.slice(0, 108) + "…" : sig!.summary}
                  </div>
                )}
              </div>
            );
          })}
        </aside>

        {/* Center — animated debate replay */}
        <div>
          <DebateReplay
            ticker={ticker}
            exchange={exchange}
            bull={transcript?.bull_arguments ?? []}
            bear={transcript?.bear_arguments ?? []}
            risk={transcript?.risk_arguments ?? []}
            pm={transcript?.pm_arguments ?? []}
            direction={dir}
            confidence={Number(synthesis.confidence) || 0}
            conviction={synthesis.conviction || "LOW"}
            thesis={synthesis.thesis || ""}
          />
        </div>

        {/* Right rail — governance gates */}
        <aside className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            Governance gates {firedGateCount > 0 && (
              <span className="text-amber-700">· {firedGateCount} fired</span>
            )}
          </div>
          {gates.length === 0 && (
            <div className="text-xs text-gray-500 italic">No gate data captured.</div>
          )}
          {gates.map(([slug, dec]) => {
            const fired = dec!.fired;
            return (
              <div
                key={slug}
                className={`border rounded-lg p-2.5 ${fired ? "bg-amber-50 border-amber-300" : "bg-gray-50 border-gray-200"}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${fired ? "bg-amber-500 text-white" : "bg-gray-300 text-gray-700"}`}
                  >
                    {fired ? "FIRED" : "PASS"}
                  </span>
                  <span className="text-xs font-semibold text-gray-900">
                    {gateDisplayName[slug] ?? slug}
                  </span>
                </div>
                {fired ? (
                  <div className="text-[11px] text-amber-900 leading-snug">
                    {dec!.reason && <div>{dec!.reason}</div>}
                    {dec!.demoted_from && dec!.demoted_to && (
                      <div className="font-mono mt-0.5">
                        {dec!.demoted_from} → {dec!.demoted_to}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[10px] text-gray-500 italic">passed</div>
                )}
              </div>
            );
          })}

          {/* Reflector */}
          {(synthesis.reflector_lessons?.lessons_count ?? 0) > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2.5 mt-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-indigo-700 mb-1">
                📚 Reflector
              </div>
              <div className="text-[11px] text-indigo-900 leading-snug">
                {synthesis.reflector_lessons!.lessons_count} past-debate lessons
                injected into prompts.
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Footer */}
      <footer className="mt-8 pt-5 border-t border-gray-200 flex items-center justify-between flex-wrap gap-3">
        <div className="text-xs text-gray-500">
          Not financial advice.{" "}
          <Link href="/methodology" className="underline text-[#2e8b57]">
            How every agent works →
          </Link>
        </div>
        <div className="flex gap-2 text-xs">
          <Link
            href={`/ticker/${ticker}/intel?exchange=${exchange}`}
            className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold"
          >
            Full intel for {ticker} →
          </Link>
          <Link
            href="/performance"
            className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold"
          >
            All current AI calls →
          </Link>
        </div>
      </footer>
    </div>
  );
}
