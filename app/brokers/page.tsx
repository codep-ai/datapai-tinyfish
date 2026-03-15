/**
 * app/brokers/page.tsx
 * Stock Broker Comparison — US & Australia
 *
 * LEGAL NOTE: All data is sourced from publicly available broker websites and
 * regulatory disclosures. This is factual information only — not financial
 * advice, not a recommendation to use any particular broker.  Fees change
 * frequently; always verify directly with the broker.
 */

import { getLang } from "@/lib/getLang";
import {
  AU_BROKERS,
  US_BROKERS,
  DATA_REVIEWED_DATE,
  type Broker,
  type Market,
} from "@/lib/brokers";

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

// ── Main page ─────────────────────────────────────────────────────────────────

export default async function BrokersPage({
  searchParams,
}: {
  searchParams: Promise<{ market?: string }>;
}) {
  const [lang, params] = await Promise.all([getLang(), searchParams]);
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
            <span>Broker Comparison</span>
          </p>

          {/* Title */}
          <h1 className="text-3xl font-bold tracking-tight">
            Stock Broker Comparison
          </h1>
          <p className="text-white/80 text-lg max-w-2xl">
            Factual comparison of publicly listed fees and features for the top
            retail stock brokers in the{" "}
            {isAU ? "Australian" : "US"} market.
          </p>

          {/* Country switcher */}
          <div className="flex gap-2 pt-2">
            <a
              href="/brokers?market=US"
              className="px-5 py-2 rounded-full font-semibold text-sm transition-all"
              style={
                market === "US"
                  ? { background: "#fd8412", color: "white" }
                  : { background: "rgba(255,255,255,0.15)", color: "white" }
              }
            >
              🇺🇸 US Brokers
            </a>
            <a
              href="/brokers?market=AU"
              className="px-5 py-2 rounded-full font-semibold text-sm transition-all"
              style={
                market === "AU"
                  ? { background: "#fd8412", color: "white" }
                  : { background: "rgba(255,255,255,0.15)", color: "white" }
              }
            >
              🇦🇺 AU Brokers
            </a>
          </div>

          {/* Quick legend for AU-specific concept */}
          {isAU && (
            <div className="bg-white/10 rounded-lg px-4 py-3 max-w-2xl text-sm text-white/90">
              <strong>CHESS Sponsored</strong> means you directly hold shares on the ASX
              CHESS system in your own name (HIN), rather than via the broker as custodian.
              This is an important legal distinction for AU investors.
            </div>
          )}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-10">

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Brokers listed" value={String(brokers.length)} />
          <StatCard
            label="With $0 stock commission"
            value={String(brokers.filter(b => b.commissionStocks.startsWith("$0")).length)}
          />
          <StatCard
            label="With international market access"
            value={String(brokers.filter(b => b.internationalMarkets !== null).length)}
          />
          <StatCard
            label={isAU ? "CHESS sponsored" : "With IRA / retirement"}
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
            {isAU ? "🇦🇺 Australian" : "🇺🇸 US"} Broker Comparison
          </h2>

          <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200">
            <table className="w-full min-w-[900px] border-collapse bg-white">
              <thead>
                <tr style={{ background: "linear-gradient(90deg, seagreen, darkseagreen)" }}>
                  <Th className="rounded-tl-xl">Broker</Th>
                  <Th>Stock commission</Th>
                  <Th>ETF commission</Th>
                  <Th>Options</Th>
                  <Th>Acct min</Th>
                  <Th>AU stocks</Th>
                  <Th>US stocks</Th>
                  <Th>Intl stocks</Th>
                  <Th>ETFs</Th>
                  <Th>Crypto</Th>
                  {isAU && <Th>CHESS</Th>}
                  {isAU && <Th>SMSF</Th>}
                  {!isAU && <Th>IRA</Th>}
                  <Th>Fractional</Th>
                  <Th className="rounded-tr-xl">Mobile</Th>
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
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
                          {b.regulator}
                        </span>
                        <a
                          href={b.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-[10px] text-emerald-600 hover:underline"
                        >
                          Visit site ↗
                        </a>
                      </div>
                      {b.note && (
                        <div className="text-[11px] text-gray-400 mt-1 italic">
                          {b.note}
                        </div>
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
                    <Td><Check val={b.hasFractionalShares} /></Td>
                    <Td><Check val={b.hasMobileApp} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── International access breakdown ───────────────────────────────── */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            International Stock Access
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {brokers.map(b => (
              <IntlCard key={b.id} broker={b} isAU={isAU} />
            ))}
          </div>
        </div>

        {/* ── Disclaimer ───────────────────────────────────────────────────── */}
        <div className="border-t border-gray-200 pt-6">
          <p className="text-sm text-gray-500 leading-relaxed">
            <strong className="text-gray-700">Disclaimer:</strong> The information on
            this page is sourced from publicly available broker websites, PDS documents,
            and regulatory disclosures. It is provided for general informational purposes
            only and is <strong>not financial advice</strong> and not a recommendation
            to use any particular broker. Fees, features, and regulatory status can change
            at any time — always verify current information directly with the broker before
            opening an account. Data last reviewed: <strong>{DATA_REVIEWED_DATE}</strong>.{" "}
            {isAU && (
              <>
                Australian investors should consider whether a product is appropriate for
                their circumstances and read the relevant Product Disclosure Statement (PDS)
                before investing.{" "}
              </>
            )}
            DataP.ai has no commercial relationship with any broker listed on this page.
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

function IntlCard({ broker, isAU }: { broker: Broker; isAU: boolean }) {
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
            Home market only
          </span>
        )}
      </div>
      {broker.internationalMarkets && isAU && (
        <p className="text-[11px] text-gray-400">
          Currency conversion applies — check broker FX rates before trading
        </p>
      )}
    </div>
  );
}
