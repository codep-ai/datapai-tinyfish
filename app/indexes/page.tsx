"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

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

const REGION_ORDER = ["US", "ASX", "ASIA", "EU"];
const REGION_LABELS: Record<string, string> = {
  US: "United States",
  ASX: "Australia",
  ASIA: "Asia Pacific",
  EU: "Europe",
};
const REGION_FLAGS: Record<string, string> = {
  US: "\u{1F1FA}\u{1F1F8}",
  ASX: "\u{1F1E6}\u{1F1FA}",
  ASIA: "\u{1F30F}",
  EU: "\u{1F1EA}\u{1F1FA}",
};

function ChgCell({ val }: { val: number | null }) {
  if (val === null || val === undefined) return <span className="text-gray-300">—</span>;
  const color = val >= 0 ? "#15803d" : "#dc2626";
  return (
    <span className="text-xs font-semibold tabular-nums" style={{ color }}>
      {val >= 0 ? "+" : ""}{val.toFixed(2)}%
    </span>
  );
}

function RsiChip({ rsi }: { rsi: number | null }) {
  if (rsi === null) return <span className="text-gray-300 text-xs">—</span>;
  const bg = rsi >= 70 ? "#fef2f2" : rsi <= 30 ? "#dcfce7" : "#f3f4f6";
  const fg = rsi >= 70 ? "#991b1b" : rsi <= 30 ? "#166534" : "#6b7280";
  const label = rsi >= 70 ? "OB" : rsi <= 30 ? "OS" : "";
  return (
    <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: bg, color: fg }}>
      {rsi.toFixed(0)}{label ? ` ${label}` : ""}
    </span>
  );
}

function MacdChip({ trend }: { trend: string | null }) {
  if (!trend) return <span className="text-gray-300 text-xs">—</span>;
  const bull = trend === "BULLISH";
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: bull ? "#dcfce7" : "#fef2f2", color: bull ? "#166534" : "#991b1b" }}>
      {bull ? "BULL" : "BEAR"}
    </span>
  );
}

function TrendChip({ sma50, sma200 }: { sma50: number | null; sma200: number | null }) {
  if (!sma50 || !sma200) return <span className="text-gray-300 text-xs">—</span>;
  const bull = sma50 > sma200;
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded"
      style={{ background: bull ? "#dcfce7" : "#fef2f2", color: bull ? "#166534" : "#991b1b" }}>
      {bull ? "▲ Golden" : "▼ Death"}
    </span>
  );
}

export default function IndexesPage() {
  const [data, setData] = useState<IndexRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/indexes/overview");
      const json = await res.json();
      if (json.ok) setData(json.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const grouped = REGION_ORDER.map((r) => ({
    region: r,
    label: REGION_LABELS[r] || r,
    flag: REGION_FLAGS[r] || "",
    indexes: data.filter((d) => d.region === r),
  })).filter((g) => g.indexes.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Global Market Indexes</h1>
        <p className="text-sm text-gray-500 mb-6">
          16 major indexes across 4 regions — updated daily with full technical analysis
        </p>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading indexes...</div>
        ) : (
          <div className="space-y-8">
            {grouped.map((g) => (
              <div key={g.region}>
                <h2 className="text-lg font-semibold text-gray-800 mb-3">
                  {g.flag} {g.label}
                </h2>
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="text-left px-4 py-2">Index</th>
                        <th className="text-right px-3 py-2">Level</th>
                        <th className="text-right px-3 py-2">1D</th>
                        <th className="text-right px-3 py-2">5D</th>
                        <th className="text-right px-3 py-2">1M</th>
                        <th className="text-right px-3 py-2">3M</th>
                        <th className="text-right px-3 py-2">1Y</th>
                        <th className="text-center px-3 py-2">RSI</th>
                        <th className="text-center px-3 py-2">MACD</th>
                        <th className="text-center px-3 py-2">Trend</th>
                        <th className="text-right px-3 py-2">vs 52w High</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.indexes.map((idx) => (
                        <tr key={idx.ticker} className="border-t border-gray-100 hover:bg-blue-50/40 transition-colors">
                          <td className="px-4 py-2.5">
                            <Link href={`/ticker/${encodeURIComponent(idx.ticker)}`}
                              className="font-semibold text-blue-700 hover:underline">
                              {idx.name}
                            </Link>
                            <div className="text-[10px] text-gray-400">{idx.ticker}</div>
                          </td>
                          <td className="text-right px-3 py-2 font-semibold tabular-nums text-gray-900">
                            {idx.latest_close ? idx.latest_close.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}
                          </td>
                          <td className="text-right px-3 py-2"><ChgCell val={idx.change_1d_pct} /></td>
                          <td className="text-right px-3 py-2"><ChgCell val={idx.change_5d_pct} /></td>
                          <td className="text-right px-3 py-2"><ChgCell val={idx.change_1m_pct} /></td>
                          <td className="text-right px-3 py-2"><ChgCell val={idx.change_3m_pct} /></td>
                          <td className="text-right px-3 py-2"><ChgCell val={idx.change_1y_pct} /></td>
                          <td className="text-center px-3 py-2"><RsiChip rsi={idx.rsi_14} /></td>
                          <td className="text-center px-3 py-2"><MacdChip trend={idx.macd_trend} /></td>
                          <td className="text-center px-3 py-2"><TrendChip sma50={idx.sma_50} sma200={idx.sma_200} /></td>
                          <td className="text-right px-3 py-2">
                            {idx.pct_from_52w_high !== null ? (
                              <span className="text-xs tabular-nums text-gray-600">
                                {idx.pct_from_52w_high.toFixed(1)}%
                              </span>
                            ) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 text-xs text-gray-400 text-center">
          Data as of market close. RSI, MACD, and trend indicators computed from daily OHLCV.
        </div>
      </div>
    </div>
  );
}
