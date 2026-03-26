"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import type { PricePoint } from "@/lib/price";

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

interface ChartPoint {
  label: string;
  close: number;
  volume: number;
  // For volume coloring: green if close >= open/prev, red otherwise
  volColor: string;
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

function fmtVolume(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(v);
}

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
  const [period, setPeriod] = useState<Period>("1M");
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

  // ── Build chart data based on period ───────────────────────────────────

  let chartData: ChartPoint[] = [];
  let prevClose: number | null = null;

  if (period === "1D" && intradayData && intradayData.length > 0) {
    // Intraday: use 15m bars
    // Get today's data (or most recent trading day)
    const dates = [...new Set(intradayData.map((d) => d.ts.slice(0, 10)))].sort();
    const latestDate = dates[dates.length - 1];
    const prevDate = dates.length > 1 ? dates[dates.length - 2] : null;

    const todayBars = intradayData.filter((d) => d.ts.startsWith(latestDate));
    if (prevDate) {
      const prevBars = intradayData.filter((d) => d.ts.startsWith(prevDate));
      if (prevBars.length > 0) prevClose = prevBars[prevBars.length - 1].close;
    }

    let prev = Number(todayBars[0]?.open ?? 0);
    chartData = todayBars.map((d) => {
      const c = Number(d.close);
      const color = c >= prev ? "#10b981" : "#ef4444";
      prev = c;
      return {
        label: d.ts.slice(11, 16), // HH:MM
        close: c,
        volume: Number(d.volume),
        volColor: color,
      };
    });
  } else {
    // Daily data: filter by period
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

    let prev = Number(filtered[0]?.close ?? 0);
    chartData = filtered.map((d) => {
      const c = Number(d.close);
      const color = c >= prev ? "#10b981" : "#ef4444";
      prev = c;
      return {
        label: d.date.slice(5), // MM-DD
        close: c,
        volume: Number(d.volume),
        volColor: color,
      };
    });
  }

  // Calculate change — coerce to numbers (DB may return strings)
  const first = Number(chartData[0]?.close ?? 0);
  const last = Number(chartData[chartData.length - 1]?.close ?? 0);
  const basePrice = Number(prevClose ?? first);
  const change = last - basePrice;
  const changePct = basePrice > 0 ? (change / basePrice) * 100 : 0;
  const isUp = change >= 0;
  const lineColor = isUp ? "#10b981" : "#ef4444";
  const fillColor = isUp ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)";

  // Price domain with padding
  const closes = chartData.map((d) => d.close).filter(Boolean);
  const minPrice = Math.min(...closes) * 0.998;
  const maxPrice = Math.max(...closes) * 1.002;

  // Tick interval
  const tickInterval = period === "1D"
    ? Math.max(1, Math.floor(chartData.length / 6))
    : Math.max(1, Math.floor(chartData.length / 8));

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

        {chartData.length > 0 && (
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
        <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
          Loading intraday data...
        </div>
      ) : period === "1D" && (!intradayData || intradayData.length === 0) ? (
        <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
          No intraday data available yet
        </div>
      ) : (
        <div>
          {/* Price chart */}
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#9ca3af", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
                interval={tickInterval}
              />
              <YAxis
                domain={[minPrice, maxPrice]}
                tick={{ fill: "#9ca3af", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${cp}${Number(v).toFixed(2)}`}
                width={65}
              />
              <Tooltip
                contentStyle={{
                  background: "#1a1a2e",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 12,
                  padding: "8px 12px",
                }}
                formatter={(val: number) => [`${cp}${val.toFixed(2)}`, "Price"]}
                labelStyle={{ color: "#9ca3af" }}
              />
              {prevClose && (
                <ReferenceLine
                  y={prevClose}
                  stroke="#9ca3af"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
              )}
              <Area
                type="monotone"
                dataKey="close"
                stroke={lineColor}
                strokeWidth={2}
                fill="url(#priceGradient)"
                dot={false}
                activeDot={{ r: 4, fill: lineColor }}
              />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Volume chart */}
          <ResponsiveContainer width="100%" height={60}>
            <ComposedChart data={chartData} margin={{ top: 0, right: 8, bottom: 4, left: 8 }}>
              <XAxis dataKey="label" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: "#1a1a2e",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 11,
                }}
                formatter={(val: number) => [fmtVolume(val), "Vol"]}
                labelStyle={{ color: "#9ca3af" }}
              />
              <Bar
                dataKey="volume"
                fill="#10b981"
                opacity={0.5}
                radius={[1, 1, 0, 0]}
                // Color each bar individually
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                shape={(props: any) => {
                  const { x, y, width, height, payload } = props;
                  return (
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill={payload.volColor}
                      opacity={0.5}
                      rx={1}
                    />
                  );
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
