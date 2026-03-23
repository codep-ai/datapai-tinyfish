/**
 * app/brokers/BrokerTable.tsx
 * Client component — sortable broker comparison table.
 */
"use client";

import { useState, useMemo } from "react";
import type { Broker } from "@/lib/brokers";
import type { TrustpilotRating } from "@/lib/trustpilot-scanner";
import type { Lang } from "@/lib/translations";
import { t } from "@/lib/translations";

// ── Types ──────────────────────────────────────────────────────────────────────

type SortKey =
  | "rating" | "reviews" | "fee10k" | "acctMin" | "name"
  | "crypto" | "chess" | "smsf" | "ira" | "fractional";

type SortDir = "asc" | "desc";

// Default sort direction for each key
const DEFAULT_DIRS: Record<SortKey, SortDir> = {
  rating: "desc", reviews: "desc", fee10k: "asc",
  acctMin: "asc",  name: "asc",
  crypto: "desc",  chess: "desc", smsf: "desc",
  ira: "desc",     fractional: "desc",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function scoreOf(ratings: Record<string, TrustpilotRating>, id: string): number {
  const r = ratings[id];
  return r && r.score > 0 ? r.score : -1;
}

function reviewsOf(ratings: Record<string, TrustpilotRating>, id: string): number {
  return ratings[id]?.reviewCount ?? 0;
}

function parseAcctMin(s: string): number {
  const m = s.match(/\$(\d[\d,]*)/);
  return m ? parseInt(m[1].replace(/,/g, ""), 10) : 0;
}

function boolVal(v: boolean | null): number {
  return v === true ? 1 : 0;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Check({ val }: { val: boolean | null }) {
  if (val === null) return <span className="text-gray-300 text-sm">—</span>;
  return val
    ? <span style={{ color: "seagreen" }} className="font-bold text-base">✓</span>
    : <span className="text-gray-300 text-sm">✗</span>;
}

function Stars({ score }: { score: number }) {
  const full = Math.floor(score);
  const half = score - full >= 0.25 && score - full < 0.75;
  const empty = 5 - full - (half ? 1 : 0);
  const color = score >= 4.0 ? "#00b67a" : score >= 3.0 ? "#fd8412" : "#e74c3c";
  return (
    <span style={{ color, fontSize: "0.75rem", letterSpacing: "1px" }}>
      {"★".repeat(full)}{half ? "½" : ""}{"☆".repeat(empty)}
    </span>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`py-3 px-4 text-sm text-gray-700 border-b border-gray-100 align-top ${className}`}>
      {children}
    </td>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function BrokerTable({
  brokers,
  ratings,
  isAU,
  lang,
}: {
  brokers: Broker[];
  ratings: Record<string, TrustpilotRating>;
  isAU: boolean;
  lang: Lang;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("rating");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(DEFAULT_DIRS[key]);
    }
  }

  const sorted = useMemo(() => {
    return [...brokers].sort((a, b) => {
      let av = 0, bv = 0;
      switch (sortKey) {
        case "rating":    av = scoreOf(ratings, a.id);    bv = scoreOf(ratings, b.id);    break;
        case "reviews":   av = reviewsOf(ratings, a.id);  bv = reviewsOf(ratings, b.id);  break;
        case "fee10k":    av = a.fee10k ?? 9999;           bv = b.fee10k ?? 9999;           break;
        case "acctMin":   av = parseAcctMin(a.accountMin); bv = parseAcctMin(b.accountMin); break;
        case "crypto":    av = boolVal(a.hasCrypto);       bv = boolVal(b.hasCrypto);       break;
        case "chess":     av = boolVal(a.chessSponsored);  bv = boolVal(b.chessSponsored);  break;
        case "smsf":      av = boolVal(a.hasSMSF);         bv = boolVal(b.hasSMSF);         break;
        case "ira":       av = boolVal(a.hasIRA);          bv = boolVal(b.hasIRA);          break;
        case "fractional":av = boolVal(a.hasFractionalShares); bv = boolVal(b.hasFractionalShares); break;
        case "name":
          return sortDir === "asc"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [brokers, ratings, sortKey, sortDir]);

  // ── Column header helpers ────────────────────────────────────────────────────

  function SortTh({
    col,
    children,
    className = "",
  }: {
    col: SortKey;
    children: React.ReactNode;
    className?: string;
  }) {
    const active = sortKey === col;
    const icon = active ? (sortDir === "desc" ? " ▼" : " ▲") : " ⇅";
    return (
      <th
        className={`text-left py-3 px-4 text-xs font-semibold text-white/80 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-white transition-colors ${className}`}
        onClick={() => handleSort(col)}
      >
        {children}
        <span className="opacity-50 text-[10px]">{icon}</span>
      </th>
    );
  }

  function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
      <th className={`text-left py-3 px-4 text-xs font-semibold text-white/80 uppercase tracking-wide whitespace-nowrap ${className}`}>
        {children}
      </th>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200">
      <table className="w-full min-w-[1200px] border-collapse bg-white">
        <thead>
          <tr style={{ background: "linear-gradient(90deg, seagreen, darkseagreen)" }}>
            <SortTh col="name" className="rounded-tl-xl">{t(lang, "broker_th_broker")}</SortTh>
            <SortTh col="rating">{t(lang, "broker_th_rating")}</SortTh>
            <SortTh col="reviews">{t(lang, "broker_th_reviews")}</SortTh>
            <SortTh col="fee10k">{t(lang, "broker_th_fee10k")}</SortTh>
            <Th>{t(lang, "broker_th_stock_comm")}</Th>
            <SortTh col="acctMin">{t(lang, "broker_th_acct_min")}</SortTh>
            <Th>{t(lang, "broker_th_au_stocks")}</Th>
            <Th>{t(lang, "broker_th_us_stocks")}</Th>
            <Th>{t(lang, "broker_th_intl")}</Th>
            <SortTh col="crypto">{t(lang, "broker_th_crypto")}</SortTh>
            {isAU && <SortTh col="chess">{t(lang, "broker_th_chess")}</SortTh>}
            {isAU && <SortTh col="smsf">{t(lang, "broker_th_smsf")}</SortTh>}
            {!isAU && <SortTh col="ira">{t(lang, "broker_th_ira")}</SortTh>}
            {!isAU && <Th>{t(lang, "broker_th_solo401k")}</Th>}
            <SortTh col="fractional">{t(lang, "broker_th_fractional")}</SortTh>
            <Th>{t(lang, "broker_th_mobile")}</Th>
            {/* ETF & Options moved to end as requested */}
            <Th>{t(lang, "broker_th_etf_comm")}</Th>
            <Th className="rounded-tr-xl">{t(lang, "broker_th_options")}</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((b, i) => {
            const rating = ratings[b.id] ?? null;
            const hasRating = rating && rating.score > 0;
            const ratingColor = hasRating
              ? rating.score >= 4.0 ? "#00b67a" : rating.score >= 3.0 ? "#fd8412" : "#e74c3c"
              : undefined;
            const reviewStr = rating && rating.reviewCount > 0
              ? rating.reviewCount >= 1000
                ? `${(rating.reviewCount / 1000).toFixed(1)}k`
                : rating.reviewCount.toLocaleString()
              : null;

            return (
              <tr
                key={b.id}
                className="hover:bg-green-50/40 transition-colors"
                style={i % 2 === 1 ? { background: "#f9fafb" } : {}}
              >
                {/* Broker */}
                <Td>
                  <div className="font-semibold text-gray-900">{b.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{b.tagline}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
                      {b.regulator}
                    </span>
                    <a href={b.url} target="_blank" rel="noopener noreferrer nofollow"
                      className="text-[10px] text-emerald-600 hover:underline">
                      {t(lang, "broker_visit_site")}
                    </a>
                    <a href={b.signupUrl} target="_blank" rel="noopener noreferrer nofollow"
                      className="text-[10px] font-semibold px-2 py-0.5 rounded transition-opacity hover:opacity-80"
                      style={{ background: "#fd8412", color: "white" }}>
                      {t(lang, "broker_open_account")}
                    </a>
                  </div>
                  {b.note && (
                    <div className="text-[11px] text-gray-400 mt-1 italic">{b.note}</div>
                  )}
                </Td>

                {/* User Rating */}
                <Td>
                  {hasRating ? (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold" style={{ color: ratingColor }}>
                          {rating.score.toFixed(1)}
                        </span>
                        <Stars score={rating.score} />
                      </div>
                      {b.trustpilotUrl && (
                        <a href={b.trustpilotUrl} target="_blank" rel="noopener noreferrer nofollow"
                          className="text-[10px] text-gray-400 hover:underline block">
                          Trustpilot ↗
                        </a>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </Td>

                {/* Reviews */}
                <Td>
                  {reviewStr
                    ? <span className="text-sm text-gray-600">{reviewStr}</span>
                    : <span className="text-gray-300 text-xs">—</span>}
                </Td>

                {/* $10k Fee */}
                <Td>
                  {b.fee10k !== null ? (
                    <span className={`text-sm font-semibold ${b.fee10k === 0 ? "text-emerald-600" : "text-gray-800"}`}>
                      {b.fee10k === 0 ? "$0" : `$${b.fee10k.toFixed(2)}`}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </Td>

                {/* Stock Commission */}
                <Td className="font-medium">{b.commissionStocks}</Td>

                {/* Acct Min */}
                <Td>{b.accountMin}</Td>

                {/* Markets */}
                <Td><Check val={b.hasAUStocks} /></Td>
                <Td><Check val={b.hasUSStocks} /></Td>
                <Td>
                  {b.internationalMarkets
                    ? <span className="text-[11px] font-medium px-1.5 py-0.5 rounded"
                        style={{ background: "#e8f5e9", color: "seagreen" }}>
                        {b.internationalMarkets}
                      </span>
                    : <span className="text-gray-300 text-sm">✗</span>}
                </Td>

                {/* Crypto */}
                <Td><Check val={b.hasCrypto} /></Td>

                {/* AU-specific */}
                {isAU && <Td><Check val={b.chessSponsored} /></Td>}
                {isAU && <Td><Check val={b.hasSMSF} /></Td>}

                {/* US-specific */}
                {!isAU && <Td><Check val={b.hasIRA} /></Td>}
                {!isAU && <Td><Check val={b.hasSolo401k} /></Td>}

                {/* Fractional & Mobile */}
                <Td><Check val={b.hasFractionalShares} /></Td>
                <Td><Check val={b.hasMobileApp} /></Td>

                {/* ETF & Options — moved to end */}
                <Td>{b.commissionETFs}</Td>
                <Td>{b.commissionOptions ?? <span className="text-gray-300 text-sm">—</span>}</Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
