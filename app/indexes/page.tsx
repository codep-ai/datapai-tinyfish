"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Labels = Record<string, string>;

function useLabels(): Labels {
  const [labels, setLabels] = useState<Labels>({});
  useEffect(() => {
    const lang = getLangFromCookie();
    if (lang === "en") return;
    fetch(`/api/i18n/labels?lang=${lang}&category=index,screener,enum,market`)
      .then((r) => r.json())
      .then(setLabels)
      .catch(() => {});
  }, []);
  return labels;
}

function ll(labels: Labels, key: string, fallback: string): string {
  return labels[key] ?? fallback;
}

function getLangFromCookie(): string {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/(?:^|;\s*)lang=([^;]*)/);
  return match?.[1] ?? "en";
}

/* ── Types ── */

interface IndexRow {
  ticker: string;
  name: string;
  region: string;
  latest_close: number | null;
  change_1d_pct: number | null;
  change_5d_pct: number | null;
  change_1m_pct: number | null;
  change_3m_pct: number | null;
  change_1y_pct: number | null;
  rsi_14: number | null;
  macd_trend: string | null;
  sma_50: number | null;
  sma_200: number | null;
  golden_cross: boolean | null;
  pct_from_52w_high: number | null;
  trade_date: string | null;
}

interface FxRow {
  quote_currency: string;
  rate: number;
  trade_date: string;
  prev_rate: number | null;
  change_pct: number | null;
}

interface PriceRow {
  ticker: string;
  trade_date: string;
  close: number;
  prev_close: number | null;
  change_pct: number | null;
}

interface MarketsData {
  indexes: IndexRow[];
  fx: FxRow[];
  commodities: PriceRow[];
  crypto: PriceRow[];
}

/* ── Display name maps ── */

const COMMODITY_NAMES: Record<string, string> = {
  GOLD: "Gold",
  SILVER: "Silver",
  OIL_WTI: "Oil (WTI)",
  OIL_BRENT: "Oil (Brent)",
  COPPER: "Copper",
  NAT_GAS: "Natural Gas",
};

const COMMODITY_I18N_KEYS: Record<string, string> = {
  GOLD: "commodity_gold",
  SILVER: "commodity_silver",
  OIL_WTI: "commodity_oil_wti",
  OIL_BRENT: "commodity_oil_brent",
  COPPER: "commodity_copper",
  NAT_GAS: "commodity_nat_gas",
};

const COMMODITY_UNITS: Record<string, string> = {
  GOLD: "/oz",
  SILVER: "/oz",
  COPPER: "/lb",
  OIL_WTI: "/bbl",
  OIL_BRENT: "/bbl",
  NAT_GAS: "/MMBtu",
};

const CRYPTO_NAMES: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  SOL: "Solana",
};

const CRYPTO_I18N_KEYS: Record<string, string> = {
  BTC: "crypto_btc",
  ETH: "crypto_eth",
  SOL: "crypto_sol",
};

const FX_FLAGS: Record<string, string> = {
  AUD: "\u{1F1E6}\u{1F1FA}",
  CNY: "\u{1F1E8}\u{1F1F3}",
  GBP: "\u{1F1EC}\u{1F1E7}",
  GBX: "\u{1F1EC}\u{1F1E7}",
  HKD: "\u{1F1ED}\u{1F1F0}",
  IDR: "\u{1F1EE}\u{1F1E9}",
  MYR: "\u{1F1F2}\u{1F1FE}",
  THB: "\u{1F1F9}\u{1F1ED}",
  USD: "\u{1F1FA}\u{1F1F8}",
  VND: "\u{1F1FB}\u{1F1F3}",
};

const FX_NAMES: Record<string, string> = {
  AUD: "Australian Dollar",
  CNY: "Chinese Yuan",
  GBP: "British Pound",
  GBX: "British Pence",
  HKD: "Hong Kong Dollar",
  IDR: "Indonesian Rupiah",
  MYR: "Malaysian Ringgit",
  THB: "Thai Baht",
  USD: "US Dollar",
  VND: "Vietnamese Dong",
};

/* ── Index region groups ── */

const REGION_ORDER = ["US", "ASX", "ASIA", "EU"];

const REGION_LABELS_I18N: Record<string, Record<string, string>> = {
  US:   { en: "United States", zh: "\u7F8E\u56FD", "zh-TW": "\u7F8E\u570B", ja: "\u7C73\u56FD", ko: "\uBBF8\uAD6D", vi: "Hoa K\u1EF3", th: "\u0E2A\u0E2B\u0E23\u0E31\u0E10\u0E2D\u0E40\u0E21\u0E23\u0E34\u0E01\u0E32", ms: "Amerika Syarikat" },
  ASX:  { en: "Australia", zh: "\u6FB3\u5927\u5229\u4E9A", "zh-TW": "\u6FB3\u6D32", ja: "\u30AA\u30FC\u30B9\u30C8\u30E9\u30EA\u30A2", ko: "\uD638\uC8FC", vi: "\u00DAc", th: "\u0E2D\u0E2D\u0E2A\u0E40\u0E15\u0E23\u0E40\u0E25\u0E35\u0E22", ms: "Australia" },
  ASIA: { en: "Asia Pacific", zh: "\u4E9A\u592A\u5730\u533A", "zh-TW": "\u4E9E\u592A\u5730\u5340", ja: "\u30A2\u30B8\u30A2\u592A\u5E73\u6D0B", ko: "\uC544\uC2DC\uC544 \uD0DC\uD3C9\uC591", vi: "Ch\u00E2u \u00C1 - Th\u00E1i B\u00ECnh D\u01B0\u01A1ng", th: "\u0E40\u0E2D\u0E40\u0E0A\u0E35\u0E22\u0E41\u0E1B\u0E0B\u0E34\u0E1F\u0E34\u0E01", ms: "Asia Pasifik" },
  EU:   { en: "Europe", zh: "\u6B27\u6D32", "zh-TW": "\u6B50\u6D32", ja: "\u6B27\u5DDE", ko: "\uC720\uB7FD", vi: "Ch\u00E2u \u00C2u", th: "\u0E22\u0E38\u0E42\u0E23\u0E1B", ms: "Eropah" },
};

const REGION_FLAGS: Record<string, string> = {
  US: "\u{1F1FA}\u{1F1F8}",
  ASX: "\u{1F1E6}\u{1F1FA}",
  ASIA: "\u{1F30F}",
  EU: "\u{1F1EA}\u{1F1FA}",
};

function regionLabel(region: string): string {
  const lang = getLangFromCookie();
  return REGION_LABELS_I18N[region]?.[lang] ?? REGION_LABELS_I18N[region]?.en ?? region;
}

/* ── Shared UI components ── */

function ChgBadge({ val, size = "sm" }: { val: number | null; size?: "sm" | "md" }) {
  if (val === null || val === undefined) return <span className="text-gray-400">{"\u2014"}</span>;
  const positive = val >= 0;
  const bg = positive ? "rgba(22,163,74,0.12)" : "rgba(220,38,38,0.12)";
  const fg = positive ? "#15803d" : "#dc2626";
  const textSize = size === "md" ? "text-sm" : "text-xs";
  return (
    <span
      className={`${textSize} font-semibold tabular-nums px-2 py-0.5 rounded-full`}
      style={{ background: bg, color: fg }}
    >
      {positive ? "+" : ""}{val.toFixed(2)}%
    </span>
  );
}

function RsiChip({ rsi }: { rsi: number | null }) {
  if (rsi === null) return <span className="text-gray-300 text-xs">{"\u2014"}</span>;
  const bg = rsi >= 70 ? "#fef2f2" : rsi <= 30 ? "#dcfce7" : "#f3f4f6";
  const fg = rsi >= 70 ? "#991b1b" : rsi <= 30 ? "#166534" : "#6b7280";
  const label = rsi >= 70 ? "OB" : rsi <= 30 ? "OS" : "";
  return (
    <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: bg, color: fg }}>
      {rsi.toFixed(0)}{label ? ` ${label}` : ""}
    </span>
  );
}

function MacdChip({ trend, labels }: { trend: string | null; labels?: Labels }) {
  if (!trend) return <span className="text-gray-300 text-xs">{"\u2014"}</span>;
  const bull = trend === "BULLISH";
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: bull ? "#dcfce7" : "#fef2f2", color: bull ? "#166534" : "#991b1b" }}>
      {bull ? ll(labels ?? {}, "signal_bullish_chip", "BULL") : ll(labels ?? {}, "signal_bearish_chip", "BEAR")}
    </span>
  );
}

function TrendChip({ sma50, sma200, labels }: { sma50: number | null; sma200: number | null; labels?: Labels }) {
  if (!sma50 || !sma200) return <span className="text-gray-300 text-xs">{"\u2014"}</span>;
  const bull = sma50 > sma200;
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded"
      style={{ background: bull ? "#dcfce7" : "#fef2f2", color: bull ? "#166534" : "#991b1b" }}>
      {bull ? `\u25B2 ${ll(labels ?? {}, "screener_filter_golden", "Golden")}` : `\u25BC ${ll(labels ?? {}, "screener_filter_death", "Death")}`}
    </span>
  );
}

function SectionHeader({ icon, titleKey, fallback, labels }: {
  icon: string; titleKey: string; fallback: string; labels: Labels;
}) {
  return (
    <h2
      className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2"
      style={{ fontFamily: "var(--font-rajdhani)" }}
    >
      <span>{icon}</span>
      <span>{ll(labels, titleKey, fallback)}</span>
    </h2>
  );
}

function formatPrice(val: number, decimals?: number): string {
  const d = decimals ?? (val >= 100 ? 0 : val >= 1 ? 2 : 4);
  return val.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}

function formatFxRate(rate: number, currency: string): string {
  // Now showing XXX/USD (inverted from DB's USD/XXX)
  // VND/USD, IDR/USD are very small numbers — show more decimals
  if (rate === 0) return "—";
  if (rate < 0.001) return rate.toExponential(2);
  if (rate < 0.01) return rate.toFixed(6);
  if (rate < 1) return rate.toFixed(4);
  return rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

/* ── Main page component ── */

export default function MarketsPage() {
  const [data, setData] = useState<MarketsData | null>(null);
  const [loading, setLoading] = useState(true);
  const labels = useLabels();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/markets");
      const json = await res.json();
      if (json.ok) {
        setData({
          indexes: json.indexes ?? [],
          fx: json.fx ?? [],
          commodities: json.commodities ?? [],
          crypto: json.crypto ?? [],
        });
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const indexes = data?.indexes ?? [];
  const grouped = REGION_ORDER.map((r) => ({
    region: r,
    label: regionLabel(r),
    flag: REGION_FLAGS[r] || "",
    indexes: indexes.filter((d) => d.region === r),
  })).filter((g) => g.indexes.length > 0);

  const totalUp = indexes.filter((d) => (d.change_1d_pct ?? 0) > 0).length;
  const totalDown = indexes.filter((d) => (d.change_1d_pct ?? 0) < 0).length;

  return (
    <div>
      {/* ── Hero ── */}
      <div
        className="w-full flex flex-col justify-center"
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          paddingTop: "28px",
          paddingBottom: "28px",
        }}
      >
        <div className="max-w-7xl mx-auto px-8 space-y-3">
          <h1
            className="text-3xl font-bold text-white drop-shadow-sm"
            style={{ fontFamily: "var(--font-rajdhani)" }}
          >
            {ll(labels, "mkt_title", "Markets Overview")}
          </h1>
          <p className="text-white/70 text-sm">
            {ll(labels, "mkt_desc", "Global indexes, currencies, commodities, and crypto \u2014 all in one view")}
          </p>
          {!loading && indexes.length > 0 && (
            <div className="flex gap-4 text-sm">
              <span className="bg-white/15 text-emerald-300 px-3 py-1 rounded-full font-semibold">
                {totalUp} {ll(labels, "index_up", "up")}
              </span>
              <span className="bg-white/15 text-red-300 px-3 py-1 rounded-full font-semibold">
                {totalDown} {ll(labels, "index_down", "down")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-8 py-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="text-3xl animate-pulse">{"📊"}</div>
          </div>
        ) : (
          <div className="space-y-10">

            {/* ━━ Section 1: Global Indexes ━━ */}
            <section>
              <SectionHeader icon="" titleKey="mkt_section_indexes" fallback="Global Indexes" labels={labels} />
              <div className="space-y-6">
                {grouped.map((g) => (
                  <div key={g.region}>
                    <h3 className="text-sm font-semibold text-gray-600 mb-2"
                      style={{ fontFamily: "var(--font-rajdhani)" }}>
                      {g.flag} {g.label}
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                            <th className="text-left px-4 py-2">{ll(labels, "index_th_index", "Index")}</th>
                            <th className="text-right px-3 py-2">{ll(labels, "index_th_level", "Level")}</th>
                            <th className="text-right px-3 py-2">1D</th>
                            <th className="text-right px-3 py-2">5D</th>
                            <th className="text-right px-3 py-2">1M</th>
                            <th className="text-right px-3 py-2">3M</th>
                            <th className="text-right px-3 py-2">1Y</th>
                            <th className="text-center px-3 py-2">RSI</th>
                            <th className="text-center px-3 py-2">MACD</th>
                            <th className="text-center px-3 py-2">{ll(labels, "index_th_trend", "Trend")}</th>
                            <th className="text-right px-3 py-2">{ll(labels, "index_th_52w", "vs 52w High")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.indexes.map((idx) => (
                            <tr key={idx.ticker} className="border-t border-gray-100 hover:bg-blue-50/40 transition-colors">
                              <td className="px-4 py-2.5">
                                <Link href={`/ticker/${encodeURIComponent(idx.ticker)}?exchange=INDEX`}
                                  className="font-semibold text-blue-700 hover:underline">
                                  {idx.name}
                                </Link>
                                <div className="text-[10px] text-gray-400">{idx.ticker}</div>
                              </td>
                              <td className="text-right px-3 py-2 font-semibold tabular-nums text-gray-900">
                                {idx.latest_close ? idx.latest_close.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "\u2014"}
                              </td>
                              <td className="text-right px-3 py-2"><ChgBadge val={idx.change_1d_pct} /></td>
                              <td className="text-right px-3 py-2"><ChgBadge val={idx.change_5d_pct} /></td>
                              <td className="text-right px-3 py-2"><ChgBadge val={idx.change_1m_pct} /></td>
                              <td className="text-right px-3 py-2"><ChgBadge val={idx.change_3m_pct} /></td>
                              <td className="text-right px-3 py-2"><ChgBadge val={idx.change_1y_pct} /></td>
                              <td className="text-center px-3 py-2"><RsiChip rsi={idx.rsi_14} /></td>
                              <td className="text-center px-3 py-2"><MacdChip trend={idx.macd_trend} labels={labels} /></td>
                              <td className="text-center px-3 py-2"><TrendChip sma50={idx.sma_50} sma200={idx.sma_200} labels={labels} /></td>
                              <td className="text-right px-3 py-2">
                                {idx.pct_from_52w_high !== null ? (
                                  <span className="text-xs tabular-nums text-gray-600">
                                    {idx.pct_from_52w_high.toFixed(1)}%
                                  </span>
                                ) : "\u2014"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ━━ Section 2: Currency Rates ━━ */}
            {(data?.fx ?? []).length > 0 && (
              <section>
                <SectionHeader icon="" titleKey="mkt_section_fx" fallback="Currency Rates" labels={labels} />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(data?.fx ?? []).map((fx) => (
                    <div
                      key={fx.quote_currency}
                      className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 flex items-center justify-between hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{FX_FLAGS[fx.quote_currency] || ""}</span>
                        <div>
                          <div className="text-xs text-gray-400 font-medium">{fx.quote_currency} / USD</div>
                          <div className="text-[11px] text-gray-400">{FX_NAMES[fx.quote_currency] ?? fx.quote_currency}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold tabular-nums text-gray-900">
                          {formatFxRate(fx.rate > 0 ? 1 / fx.rate : 0, fx.quote_currency)}
                        </div>
                        <ChgBadge val={fx.change_pct} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ━━ Section 3: Commodities ━━ */}
            {(data?.commodities ?? []).length > 0 && (
              <section>
                <SectionHeader icon="" titleKey="mkt_section_commodities" fallback="Commodities" labels={labels} />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(data?.commodities ?? []).map((c) => (
                    <div
                      key={c.ticker}
                      className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 flex items-center justify-between hover:shadow-md transition-shadow"
                    >
                      <div>
                        <div className="font-semibold text-gray-800 text-sm">
                          {ll(labels, COMMODITY_I18N_KEYS[c.ticker] ?? "", COMMODITY_NAMES[c.ticker] ?? c.ticker)}
                        </div>
                        <div className="text-[11px] text-gray-400">{c.ticker}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold tabular-nums text-gray-900">
                          ${formatPrice(c.close)}<span className="text-[10px] text-gray-400 ml-0.5">{COMMODITY_UNITS[c.ticker] ?? ""}</span>
                        </div>
                        <ChgBadge val={c.change_pct} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ━━ Section 4: Crypto ━━ */}
            {(data?.crypto ?? []).length > 0 && (
              <section>
                <SectionHeader icon="" titleKey="mkt_section_crypto" fallback="Crypto" labels={labels} />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(data?.crypto ?? []).map((c) => (
                    <div
                      key={c.ticker}
                      className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 flex items-center justify-between hover:shadow-md transition-shadow"
                    >
                      <div>
                        <div className="font-semibold text-gray-800 text-sm">
                          {ll(labels, CRYPTO_I18N_KEYS[c.ticker] ?? "", CRYPTO_NAMES[c.ticker] ?? c.ticker)}
                        </div>
                        <div className="text-[11px] text-gray-400">{c.ticker}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold tabular-nums text-gray-900">
                          ${formatPrice(c.close)}
                        </div>
                        <ChgBadge val={c.change_pct} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        <div className="mt-8 text-xs text-gray-400 text-center">
          {ll(labels, "mkt_disclaimer", "Data as of market close. RSI, MACD, and trend indicators computed from daily OHLCV.")}
        </div>
      </div>
    </div>
  );
}
