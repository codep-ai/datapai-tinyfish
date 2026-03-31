"use client";

import { useState, useEffect, useCallback } from "react";
// Recharts removed — all charts now use lightweight-charts CandlestickChart
import type { PricePoint } from "@/lib/price";
import dynamic from "next/dynamic";

const CandlestickChart = dynamic(() => import("../../components/CandlestickChart"), { ssr: false });

// ── Types ────────────────────────────────────────────────────────────────────

type Period = "1D" | "1W" | "1M" | "3M" | "YTD" | "1Y";

interface IntradayPoint {
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}


interface Props {
  data: PricePoint[];
  scanDates?: string[];
  exchange?: string;
  symbol?: string;
  labels?: Record<string, string>;
}

// ── Currency helpers ─────────────────────────────────────────────────────────

const CURRENCY_MAP: Record<string, string> = {
  ASX: "A$", HKEX: "HK$", SET: "฿", KLSE: "RM", IDX: "Rp", HOSE: "₫",
  INDEX: "", US: "$",
};


// ── Period config ────────────────────────────────────────────────────────────

const PERIOD_DEFAULTS: Record<Period, { label: string; labelKey: string; days: number; isIntraday: boolean }> = {
  "1D": { label: "Intraday", labelKey: "chart_intraday", days: 1, isIntraday: true },
  "1W": { label: "1 Week", labelKey: "chart_1w", days: 7, isIntraday: false },
  "1M": { label: "1 Month", labelKey: "chart_1m", days: 30, isIntraday: false },
  "3M": { label: "3 Months", labelKey: "chart_3m", days: 90, isIntraday: false },
  "YTD": { label: "YTD", labelKey: "chart_ytd", days: 0, isIntraday: false },
  "1Y": { label: "1 Year", labelKey: "chart_1y", days: 365, isIntraday: false },
};

// ── Main Component ───────────────────────────────────────────────────────────

export default function PriceChart({ data, scanDates = [], exchange = "US", symbol, labels = {} }: Props) {
  const [period, setPeriod] = useState<Period>("1D");
  const [intradayData, setIntradayData] = useState<IntradayPoint[] | null>(null);
  const [loadingIntraday, setLoadingIntraday] = useState(false);

  const cp = CURRENCY_MAP[exchange] ?? "$";

  // Fetch intraday data when period is 1D
  const fetchIntraday = useCallback(async () => {
    if (!symbol) return;
    setLoadingIntraday(true);
    try {
      const res = await fetch(`/api/ticker/${symbol}/intraday?days=2&exchange=${exchange}`);
      const json = await res.json();
      if (json.ok && json.data?.length) {
        setIntradayData(json.data);
      } else {
        setIntradayData([]);
      }
    } catch {
      setIntradayData([]);
    } finally {
      setLoadingIntraday(false);
    }
  }, [symbol, exchange]);

  useEffect(() => {
    if (period === "1D" && intradayData === null) {
      fetchIntraday();
    }
  }, [period, intradayData, fetchIntraday]);

  // ── Build candlestick data based on period ─────────────────────────────

  type CandleBar = { ts?: string; date?: string; open: number; high: number; low: number; close: number; volume: number };
  let candleBars: CandleBar[] = [];

  if (period === "1D" && intradayData && intradayData.length > 0) {
    candleBars = intradayData.map((d) => ({
      ts: d.ts, open: Number(d.open), high: Number(d.high),
      low: Number(d.low), close: Number(d.close), volume: Number(d.volume),
    }));
  } else if (period !== "1D") {
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
    let filtered = sorted;
    if (period === "YTD") {
      const yearStart = new Date().getFullYear() + "-01-01";
      filtered = sorted.filter((d) => d.date >= yearStart);
    } else {
      const cfg = PERIOD_DEFAULTS[period];
      if (cfg.days > 0 && sorted.length > cfg.days) {
        filtered = sorted.slice(-cfg.days);
      }
    }
    candleBars = filtered.map((d) => ({
      date: d.date, open: Number(d.open), high: Number(d.high),
      low: Number(d.low), close: Number(d.close), volume: Number(d.volume),
    }));
  }

  // Calculate change
  const first = Number(candleBars[0]?.close ?? 0);
  const last = Number(candleBars[candleBars.length - 1]?.close ?? 0);
  const change = last - first;
  const changePct = first > 0 ? (change / first) * 100 : 0;
  const isUp = change >= 0;

  return (
    <div>
      {/* ── Period Tabs + Price Summary ── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-1">
          {(Object.keys(PERIOD_DEFAULTS) as Period[]).map((p) => {
            const cfg = PERIOD_DEFAULTS[p];
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  period === p
                    ? "bg-brand text-white shadow-sm"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {labels[cfg.labelKey] || cfg.label}
              </button>
            );
          })}
        </div>

        {candleBars.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-gray-800">
              {cp}{last.toFixed(2)}
            </span>
            <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
              isUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            }`}>
              {isUp ? "+" : ""}{change.toFixed(2)} ({isUp ? "+" : ""}{changePct.toFixed(2)}%)
            </span>
          </div>
        )}
      </div>

      {/* ── Chart ── */}
      {period === "1D" && loadingIntraday ? (
        <div className="h-[320px] flex items-center justify-center text-gray-400 text-sm">
          Loading intraday data...
        </div>
      ) : (
        <CandlestickChart
          data={candleBars}
          currency={cp}
          height={320}
          exchange={exchange}
        />
      )}
    </div>
  );
}
