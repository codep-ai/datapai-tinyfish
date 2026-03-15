/**
 * app/brokers/page.tsx
 * Stock Broker Comparison — US & Australia (bilingual EN / ZH)
 *
 * LEGAL NOTE: All data is sourced from publicly available broker websites and
 * regulatory disclosures. This is factual information only — not financial
 * advice, not a recommendation to use any particular broker.  Fees change
 * frequently; always verify directly with the broker before opening an account.
 * User ratings sourced from Trustpilot (trustpilot.com).
 */

import { getLang } from "@/lib/getLang";
import { t } from "@/lib/translations";
import {
  AU_BROKERS,
  US_BROKERS,
  DATA_REVIEWED_DATE,
  type Broker,
  type Market,
} from "@/lib/brokers";
import { getLatestRatings, type TrustpilotRating } from "@/lib/trustpilot-scanner";

// ── Small presentational helpers ─────────────────────────────────────────────

function Check({ val }: { val: boolean | null }) {
  if (val === null) return <span className="text-gray-300 text-sm">—</span>;
  return val
    ? <span style={{ color: "seagreen" }} className="font-bold text-base">✓</span>
    : <span className="text-gray-300 text-sm">✗</span>;
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`text-left py-3 px-4 text-xs font-semibold text-white/80 uppercase tracking-wide whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`py-3 px-4 text-sm text-gray-700 border-b border-gray-100 align-top ${className}`}>
      {children}
    </td>
  );
}

/** Filled/empty star row for a score 0–5 */
function Stars({ score }: { score: number }) {
  const full = Math.floor(score);
  const half = score - full >= 0.25 && score - full < 0.75;
  const empty = 5 - full - (half ? 1 : 0);
  const color = score >= 4.0 ? "#00b67a" : score >= 3.0 ? "#fd8412" : "#e74c3c";
  return (
    <span style={{ color, fontSize: "0.75rem", letterSpacing: "1px" }}>
      {"★".repeat(full)}
      {half ? "½" : ""}
      {"☆".repeat(empty)}
    </span>
  );
}

/** TrustScore cell — score + star visual + review count + Trustpilot link */
function RatingCell({ rating, url }: { rating: TrustpilotRating | null; url: string | null }) {
  if (!rating) {
    return <span className="text-gray-300 text-xs">—</span>;
  }
  const color = rating.score >= 4.0 ? "#00b67a" : rating.score >= 3.0 ? "#fd8412" : "#e74c3c";
  const reviews = rating.reviewCount >= 1000
    ? `${(rating.reviewCount / 1000).toFixed(1)}k`
    : String(rating.reviewCount);
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-bold" style={{ color }}>
          {rating.score.toFixed(1)}
        </span>
        <Stars score={rating.score} />
      </div>
      {rating.reviewCount > 0 && (
        <div className="text-[10px] text-gray-400">{reviews} reviews</div>
      )}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-[10px] text-gray-400 hover:underline block"
        >
          Trustpilot ↗
        </a>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default async function BrokersPage({
  searchParams,
}: {
  searchParams: Promise<{ market?: string }>;
}) {
  const [lang, params, ratings] = await Promise.all([
    getLang(),
    searchParams,
    getLatestRatings(),
  ]);
  const market: Market = (params.market?.toUpperCase() === "AU" ? "AU" : "US") as Market;

  const brokers: Broker[] = market === "AU" ? AU_BROKERS : US_BROKERS;
  const isAU = market === "AU";

  return (
    <div>
      {/* ── Green hero ──────────────────────────────────────────────────────── */}
      <div
        style={{ background: "linear-gradient(45deg, seagreen, darkseagreen)" }}
        className="text-white px-8 py-12"
      >
        <div className="max-w-7xl mx-auto space-y-4">

          {/* Breadcrumb */}
          <p className="text-white/60 text-sm">
            <a href="/" className="hover:text-white/90 transition-colors">Home</a>
            {" › "}
            <span>{t(lang, "broker_hero_title")}</span>
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            {t(lang, "broker_hero_title")}
          </h1>
          <p className="text-white/80 text-lg max-w-2xl">
            {t(lang, isAU ? "broker_hero_desc_au" : "broker_hero_desc_us")}
          </p>

          {/* Country switcher */}
          <div className="flex gap-2 pt-2">
            <a
              href="/brokers?market=US"
              className="px-5 py-2 rounded-full font-semibold text-sm transition-all"
              style={market === "US"
                ? { background: "#fd8412", color: "white" }
                : { background: "rgba(255,255,255,0.15)", color: "white" }}
            >
              {t(lang, "broker_btn_us")}
            </a>
            <a
              href="/brokers?market=AU"
              className="px-5 py-2 rounded-full font-semibold text-sm transition-all"
              style={market === "AU"
                ? { background: "#fd8412", color: "white" }
                : { background: "rgba(255,255,255,0.15)", color: "white" }}
            >
              {t(lang, "broker_btn_au")}
            </a>
          </div>

          {/* CHESS explainer (AU only) */}
          {isAU && (
            <div className="bg-white/10 rounded-lg px-4 py-3 max-w-2xl text-sm text-white/90">
              <strong>CHESS</strong> — {t(lang, "broker_chess_explain")}
            </div>
          )}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-10">

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label={t(lang, "broker_stat_count")} value={String(brokers.length)} />
          <StatCard
            label={t(lang, "broker_stat_zero_comm")}
            value={String(brokers.filter(b => b.commissionStocks.startsWith("$0") || b.commissionStocks.startsWith("AUD $0")).length)}
          />
          <StatCard
            label={t(lang, "broker_stat_intl")}
            value={String(brokers.filter(b => b.internationalMarkets !== null).length)}
          />
          <StatCard
            label={isAU ? t(lang, "broker_stat_chess") : t(lang, "broker_stat_ira")}
            value={
              isAU
                ? String(brokers.filter(b => b.chessSponsored === true).length)
                : String(brokers.filter(b => b.hasIRA === true).length)
            }
          />
        </div>

        {/* ── Comparison table ─────────────────────────────────────────────── */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {isAU ? "🇦🇺" : "🇺🇸"} {t(lang, "broker_section_compare")}
          </h2>

          <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200">
            <table className="w-full min-w-[1000px] border-collapse bg-white">
              <thead>
                <tr style={{ background: "linear-gradient(90deg, seagreen, darkseagreen)" }}>
                  <Th className="rounded-tl-xl">{t(lang, "broker_th_broker")}</Th>
                  <Th>{t(lang, "broker_th_stock_comm")}</Th>
                  <Th>{t(lang, "broker_th_etf_comm")}</Th>
                  <Th>{t(lang, "broker_th_options")}</Th>
                  <Th>{t(lang, "broker_th_acct_min")}</Th>
                  <Th>{t(lang, "broker_th_au_stocks")}</Th>
                  <Th>{t(lang, "broker_th_us_stocks")}</Th>
                  <Th>{t(lang, "broker_th_intl")}</Th>
                  <Th>{t(lang, "broker_th_etfs")}</Th>
                  <Th>{t(lang, "broker_th_crypto")}</Th>
                  {isAU && <Th>{t(lang, "broker_th_chess")}</Th>}
                  {isAU && <Th>{t(lang, "broker_th_smsf")}</Th>}
                  {!isAU && <Th>{t(lang, "broker_th_ira")}</Th>}
                  {!isAU && <Th>{t(lang, "broker_th_solo401k")}</Th>}
                  <Th>{t(lang, "broker_th_fractional")}</Th>
                  <Th>{t(lang, "broker_th_mobile")}</Th>
                  <Th className="rounded-tr-xl">{t(lang, "broker_th_rating")}</Th>
                </tr>
              </thead>
              <tbody>
                {brokers.map((b, i) => (
                  <tr
                    key={b.id}
                    className="hover:bg-green-50/40 transition-colors"
                    style={i % 2 === 1 ? { background: "#f9fafb" } : {}}
                  >
                    <Td>
                      <div className="font-semibold text-gray-900">{b.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{b.tagline}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
                          {b.regulator}
                        </span>
                        <a
                          href={b.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-[10px] text-emerald-600 hover:underline"
                        >
                          {t(lang, "broker_visit_site")}
                        </a>
                        <a
                          href={b.signupUrl}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-[10px] font-semibold px-2 py-0.5 rounded transition-opacity hover:opacity-80"
                          style={{ background: "#fd8412", color: "white" }}
                        >
                          {t(lang, "broker_open_account")}
                        </a>
                      </div>
                      {b.note && (
                        <div className="text-[11px] text-gray-400 mt-1 italic">{b.note}</div>
                      )}
                    </Td>
                    <Td className="font-medium">{b.commissionStocks}</Td>
                    <Td>{b.commissionETFs}</Td>
                    <Td>{b.commissionOptions ?? <span className="text-gray-300 text-sm">—</span>}</Td>
                    <Td>{b.accountMin}</Td>
                    <Td><Check val={b.hasAUStocks} /></Td>
                    <Td><Check val={b.hasUSStocks} /></Td>
                    <Td>
                      {b.internationalMarkets
                        ? <span className="text-[11px] font-medium px-1.5 py-0.5 rounded" style={{ background: "#e8f5e9", color: "seagreen" }}>{b.internationalMarkets}</span>
                        : <span className="text-gray-300 text-sm">✗</span>}
                    </Td>
                    <Td><Check val={b.hasETFs} /></Td>
                    <Td><Check val={b.hasCrypto} /></Td>
                    {isAU && <Td><Check val={b.chessSponsored} /></Td>}
                    {isAU && <Td><Check val={b.hasSMSF} /></Td>}
                    {!isAU && <Td><Check val={b.hasIRA} /></Td>}
                    {!isAU && <Td><Check val={b.hasSolo401k} /></Td>}
                    <Td><Check val={b.hasFractionalShares} /></Td>
                    <Td><Check val={b.hasMobileApp} /></Td>
                    <Td>
                      <RatingCell rating={ratings[b.id] ?? null} url={b.trustpilotUrl} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── International access cards ────────────────────────────────────── */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            🌏 {t(lang, "broker_section_intl")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {brokers.map(b => (
              <IntlCard key={b.id} broker={b} isAU={isAU} homeOnlyLabel={t(lang, "broker_intl_home_only")} fxNote={t(lang, "broker_intl_fx_note")} />
            ))}
          </div>
        </div>

        {/* ── Disclaimer ───────────────────────────────────────────────────── */}
        <div className="border-t border-gray-200 pt-6 space-y-2">
          <p className="text-sm text-gray-500 leading-relaxed">
            <strong className="text-gray-700">{lang === "zh" ? "免责声明：" : "Disclaimer:"}</strong>{" "}
            {t(lang, "broker_disclaimer")}{" "}
            {isAU && <>{t(lang, "broker_disclaimer_au")}{" "}</>}
            {t(lang, "broker_disclaimer_data")} <strong>{DATA_REVIEWED_DATE}</strong>.{" "}
            {t(lang, "broker_disclaimer_norel")}
          </p>
          <p className="text-xs text-gray-400">
            {t(lang, "broker_disclaimer_tp")}
          </p>
        </div>

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
      <div className="text-2xl font-bold" style={{ color: "seagreen" }}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function IntlCard({
  broker,
  isAU,
  homeOnlyLabel,
  fxNote,
}: {
  broker: Broker;
  isAU: boolean;
  homeOnlyLabel: string;
  fxNote: string;
}) {
  const homeMarkets: string[] = [];
  if (broker.hasAUStocks) homeMarkets.push("🇦🇺 ASX");
  if (broker.hasUSStocks && broker.market === "US") homeMarkets.push("🇺🇸 NYSE / NASDAQ");

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 space-y-2">
      <div className="font-semibold text-gray-900 text-sm">{broker.name}</div>
      <div className="flex flex-wrap gap-1.5">
        {homeMarkets.map(m => (
          <span key={m} className="text-[11px] px-2 py-0.5 rounded-full"
            style={{ background: "#f0f0f0", color: "#555" }}>
            {m}
          </span>
        ))}
        {broker.internationalMarkets ? (
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: "#e8f5e9", color: "#2e6e44" }}>
            🌏 {broker.internationalMarkets}
          </span>
        ) : (
          <span className="text-[11px] px-2 py-0.5 rounded-full"
            style={{ background: "#f5f5f5", color: "#aaa" }}>
            {homeOnlyLabel}
          </span>
        )}
      </div>
      {broker.internationalMarkets && isAU && (
        <p className="text-[11px] text-gray-400">{fxNote}</p>
      )}
    </div>
  );
}
