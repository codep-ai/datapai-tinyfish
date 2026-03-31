"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries, HistogramSeries, LineSeries, AreaSeries, type IChartApi } from "lightweight-charts";

interface Bar {
  ts?: string;    // intraday: ISO timestamp
  date?: string;  // daily: YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Props {
  data: Bar[];
  currency?: string;
  height?: number;
  exchange?: string;
}

// Market hours per exchange (local time) — for setting intraday chart x-axis range
const MARKET_HOURS: Record<string, { open: [number, number]; close: [number, number] }> = {
  US:   { open: [9, 30],  close: [16, 0] },
  ASX:  { open: [10, 0],  close: [16, 0] },
  HKEX: { open: [9, 30],  close: [16, 0] },
  SET:  { open: [10, 0],  close: [16, 30] },
  KLSE: { open: [9, 0],   close: [17, 0] },
  IDX:  { open: [9, 0],   close: [16, 15] },
  HOSE: { open: [9, 0],   close: [15, 0] },
  SSE:  { open: [9, 30],  close: [15, 0] },
  SZSE: { open: [9, 30],  close: [15, 0] },
  LSE:  { open: [8, 0],   close: [16, 30] },
};

// ── TA computation helpers ───────────────────────────────────────────────

function sma(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += closes[j];
    result.push(sum / period);
  }
  return result;
}

function ema(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) { result.push(closes[0]); continue; }
    if (i < period - 1) { result.push(null); continue; }
    const prev = result[i - 1] ?? closes[i];
    result.push(closes[i] * k + prev * (1 - k));
  }
  return result;
}

function computeRSI(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = [];
  let avgGain = 0, avgLoss = 0;
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) { result.push(null); continue; }
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    if (i <= period) {
      avgGain += gain / period;
      avgLoss += loss / period;
      result.push(i === period ? 100 - 100 / (1 + avgGain / (avgLoss || 0.001)) : null);
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      result.push(100 - 100 / (1 + avgGain / (avgLoss || 0.001)));
    }
  }
  return result;
}

function computeMACD(closes: number[]): { macd: (number | null)[]; signal: (number | null)[]; hist: (number | null)[] } {
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (ema12[i] != null && ema26[i] != null) macdLine.push(ema12[i]! - ema26[i]!);
    else macdLine.push(null);
  }
  const validMacd = macdLine.filter((v): v is number => v != null);
  const signalLine = ema(validMacd, 9);
  // Map signal back to full array
  const signal: (number | null)[] = [];
  let si = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] != null) { signal.push(signalLine[si] ?? null); si++; }
    else signal.push(null);
  }
  const hist: (number | null)[] = macdLine.map((m, i) =>
    m != null && signal[i] != null ? m - signal[i]! : null
  );
  return { macd: macdLine, signal, hist };
}

function computeKDJ(data: Bar[], kPeriod = 9, dPeriod = 3): { k: (number | null)[]; d: (number | null)[]; j: (number | null)[] } {
  const kArr: (number | null)[] = [];
  const dArr: (number | null)[] = [];
  const jArr: (number | null)[] = [];
  let prevK = 50, prevD = 50;
  for (let i = 0; i < data.length; i++) {
    if (i < kPeriod - 1) { kArr.push(null); dArr.push(null); jArr.push(null); continue; }
    let highest = -Infinity, lowest = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (data[j].high > highest) highest = data[j].high;
      if (data[j].low < lowest) lowest = data[j].low;
    }
    const rsv = highest !== lowest ? ((data[i].close - lowest) / (highest - lowest)) * 100 : 50;
    const k = (2 / 3) * prevK + (1 / 3) * rsv;
    const d = (2 / 3) * prevD + (1 / 3) * k;
    const j = 3 * k - 2 * d;
    kArr.push(k); dArr.push(d); jArr.push(j);
    prevK = k; prevD = d;
  }
  return { k: kArr, d: dArr, j: jArr };
}

// ── MA colors ────────────────────────────────────────────────────────────

const MA_CONFIG = [
  { period: 5, color: "#f59e0b", label: "MA5" },
  { period: 10, color: "#8b5cf6", label: "MA10" },
  { period: 20, color: "#3b82f6", label: "MA20" },
  { period: 50, color: "#ef4444", label: "MA50" },
  { period: 200, color: "#6b7280", label: "MA200" },
];

// ── Toggle button style ──────────────────────────────────────────────────

function ToggleBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-0.5 text-[10px] font-semibold rounded transition-colors"
      style={active
        ? { background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }
        : { background: "#f9fafb", color: "#9ca3af", border: "1px solid #e5e7eb" }
      }
    >
      {label}
    </button>
  );
}

// ── Main Component ───────────────────────────────────────────────────────

export default function CandlestickChart({ data, currency = "$", height = 320, exchange }: Props) {
  const mainRef = useRef<HTMLDivElement>(null);
  const rsiRef = useRef<HTMLDivElement>(null);
  const macdRef = useRef<HTMLDivElement>(null);
  const kdjRef = useRef<HTMLDivElement>(null);
  const chartsRef = useRef<IChartApi[]>([]);

  const [chartType, setChartType] = useState<"line" | "candle">("line");
  const [showMA, setShowMA] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [showKDJ, setShowKDJ] = useState(false);

  useEffect(() => {
    // Clean up all charts
    for (const c of chartsRef.current) { try { c.remove(); } catch {} }
    chartsRef.current = [];

    if (!mainRef.current || data.length === 0) return;

    const isDaily = !!(data[0]?.date && data[0].date.length === 10);
    // For intraday: timestamps are market-local (no timezone), treat as UTC
    // so lightweight-charts displays the local market time on the x-axis
    const toTime = (d: Bar) => isDaily
      ? (d.date as string) as any
      : (Math.floor(new Date((d.ts || d.date || "") + "Z").getTime() / 1000) as any);

    const closes = data.map((d) => d.close);

    // ── Shared chart options ──────────────────────────────────────────
    const sharedOpts = {
      layout: { background: { color: "#ffffff" }, textColor: "#9ca3af", fontSize: 11 },
      grid: { vertLines: { color: "#f5f5f5" }, horzLines: { color: "#f5f5f5" } },
      crosshair: { mode: 0 as const },
      rightPriceScale: { borderColor: "#e5e7eb" },
      timeScale: { borderColor: "#e5e7eb", timeVisible: true, secondsVisible: false, visible: false },
    };

    // ── Main chart (candles + volume + MA) ─────────────────────────────
    const mainChart = createChart(mainRef.current, {
      ...sharedOpts,
      height,
      timeScale: { ...sharedOpts.timeScale, visible: !showRSI && !showMACD && !showKDJ },
    });
    chartsRef.current.push(mainChart);

    // Price series: line or candle
    if (chartType === "candle") {
      const candleData = data.map((d) => ({ time: toTime(d), open: d.open, high: d.high, low: d.low, close: d.close }));
      const candleSeries = mainChart.addSeries(CandlestickSeries, {
        upColor: "#10b981", downColor: "#ef4444",
        borderDownColor: "#ef4444", borderUpColor: "#10b981",
        wickDownColor: "#ef4444", wickUpColor: "#10b981",
      });
      candleSeries.setData(candleData);
    } else {
      const lineData = data.map((d) => ({ time: toTime(d), value: d.close }));
      const isUp = data.length >= 2 && data[data.length - 1].close >= data[0].close;
      const color = isUp ? "#10b981" : "#ef4444";
      const areaSeries = mainChart.addSeries(AreaSeries, {
        lineColor: color, lineWidth: 2,
        topColor: isUp ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
        bottomColor: isUp ? "rgba(16, 185, 129, 0.02)" : "rgba(239, 68, 68, 0.02)",
        priceLineVisible: true, lastValueVisible: true,
      });
      areaSeries.setData(lineData);
    }

    // Volume
    const volumeSeries = mainChart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" }, priceScaleId: "volume",
    });
    volumeSeries.setData(data.map((d) => ({
      time: toTime(d), value: d.volume,
      color: d.close >= d.open ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)",
    })));
    mainChart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

    // MA overlays
    if (showMA) {
      for (const ma of MA_CONFIG) {
        if (data.length < ma.period) continue;
        const vals = sma(closes, ma.period);
        const lineData = vals
          .map((v, i) => v != null ? { time: toTime(data[i]), value: v } : null)
          .filter(Boolean) as { time: any; value: number }[];
        const series = mainChart.addSeries(LineSeries, {
          color: ma.color, lineWidth: 1, priceLineVisible: false,
          lastValueVisible: false, crosshairMarkerVisible: false,
        });
        series.setData(lineData);
      }
    }

    mainChart.timeScale().fitContent();

    // ── Sub-charts sync helper ────────────────────────────────────────
    const subCharts: IChartApi[] = [];

    function createSubChart(container: HTMLDivElement, subHeight: number, isLast: boolean): IChartApi {
      const sub = createChart(container, {
        ...sharedOpts,
        height: subHeight,
        timeScale: { ...sharedOpts.timeScale, visible: isLast },
      });
      subCharts.push(sub);
      chartsRef.current.push(sub);
      return sub;
    }

    // ── Helper: build time array once for sub-panel alignment ──────
    // All sub-panels use the FULL time array from data[] so their logical
    // indices stay aligned with the main chart — prevents x-axis mismatch.
    const allTimes = data.map((d) => toTime(d));
    function filterValid(vals: (number | null)[]): { time: any; value: number }[] {
      return vals
        .map((v, i) => v != null ? { time: allTimes[i], value: v } : null)
        .filter(Boolean) as { time: any; value: number }[];
    }

    // ── RSI panel ─────────────────────────────────────────────────────
    if (showRSI && rsiRef.current) {
      const isLast = !showMACD && !showKDJ;
      const rsiChart = createSubChart(rsiRef.current, 100, isLast);
      const rsiVals = computeRSI(closes);
      const rsiSeries = rsiChart.addSeries(LineSeries, {
        color: "#8b5cf6", lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true,
      });
      rsiSeries.setData(filterValid(rsiVals));
      rsiSeries.createPriceLine({ price: 70, color: "#ef4444", lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
      rsiSeries.createPriceLine({ price: 30, color: "#10b981", lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
    }

    // ── MACD panel ────────────────────────────────────────────────────
    if (showMACD && macdRef.current) {
      const isLast = !showKDJ;
      const macdChart = createSubChart(macdRef.current, 100, isLast);
      const { macd, signal, hist } = computeMACD(closes);

      const histData = hist
        .map((v, i) => v != null ? { time: allTimes[i], value: v, color: v >= 0 ? "rgba(16, 185, 129, 0.5)" : "rgba(239, 68, 68, 0.5)" } : null)
        .filter(Boolean) as any[];

      const histSeries = macdChart.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false });
      histSeries.setData(histData);
      const macdSeries = macdChart.addSeries(LineSeries, { color: "#3b82f6", lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false });
      macdSeries.setData(filterValid(macd));
      const sigSeries = macdChart.addSeries(LineSeries, { color: "#f59e0b", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      sigSeries.setData(filterValid(signal));
    }

    // ── KDJ panel ─────────────────────────────────────────────────────
    if (showKDJ && kdjRef.current) {
      const kdjChart = createSubChart(kdjRef.current, 100, true);
      const { k, d, j } = computeKDJ(data);

      const kSeries = kdjChart.addSeries(LineSeries, { color: "#3b82f6", lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false });
      kSeries.setData(filterValid(k));
      const dSeries = kdjChart.addSeries(LineSeries, { color: "#f59e0b", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      dSeries.setData(filterValid(d));
      const jSeries = kdjChart.addSeries(LineSeries, { color: "#8b5cf6", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      jSeries.setData(filterValid(j));
      kSeries.createPriceLine({ price: 80, color: "#ef4444", lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
      kSeries.createPriceLine({ price: 20, color: "#10b981", lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
    }

    // ── Sync time scales: main chart is the master ───────────────────
    const allCharts = [mainChart, ...subCharts];

    mainChart.timeScale().fitContent();

    // Intraday: pad right side to show full market hours using rightOffset
    // rightOffset = number of empty bar slots after the last data point
    // Calculated from: (market close - last bar) / 5 min interval
    if (!isDaily && exchange && MARKET_HOURS[exchange] && data.length > 0) {
      const mkt = MARKET_HOURS[exchange];
      const lastBar = data[data.length - 1];
      const lastTs = lastBar.ts ?? lastBar.date ?? "";
      // Extract hours:minutes from last bar timestamp
      const timePart = lastTs.substring(11, 16); // "HH:MM"
      const [lastH, lastM] = timePart.split(":").map(Number);
      const lastMinutes = lastH * 60 + lastM;
      const closeMinutes = mkt.close[0] * 60 + mkt.close[1];
      const remainingBars = Math.max(0, Math.ceil((closeMinutes - lastMinutes) / 5));
      if (remainingBars > 0) {
        mainChart.timeScale().applyOptions({ rightOffset: remainingBars });
      }
    }

    const mainRange = mainChart.timeScale().getVisibleLogicalRange();
    if (mainRange) {
      for (const sub of subCharts) {
        sub.timeScale().setVisibleLogicalRange(mainRange);
      }
    }

    // Keep them synced on pan/zoom
    let syncing = false;
    for (const c of allCharts) {
      c.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (syncing || !range) return;
        syncing = true;
        for (const other of allCharts) {
          if (other !== c) other.timeScale().setVisibleLogicalRange(range);
        }
        syncing = false;
      });
    }

    // Responsive resize
    const resizeObserver = new ResizeObserver(() => {
      if (mainRef.current) {
        const w = mainRef.current.clientWidth;
        for (const c of allCharts) c.applyOptions({ width: w });
      }
    });
    resizeObserver.observe(mainRef.current);

    return () => {
      resizeObserver.disconnect();
      for (const c of chartsRef.current) { try { c.remove(); } catch {} }
      chartsRef.current = [];
    };
  }, [data, currency, height, chartType, showMA, showRSI, showMACD, showKDJ]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-400 text-sm" style={{ height }}>
        No data available
      </div>
    );
  }

  return (
    <div>
      {/* Chart type + Indicator toggles */}
      <div className="flex gap-1.5 mb-2">
        <ToggleBtn label="Line" active={chartType === "line"} onClick={() => setChartType("line")} />
        <ToggleBtn label="Candle" active={chartType === "candle"} onClick={() => setChartType("candle")} />
        <span className="w-px bg-gray-200 mx-1" />
        <ToggleBtn label="MA" active={showMA} onClick={() => setShowMA(!showMA)} />
        <ToggleBtn label="RSI" active={showRSI} onClick={() => setShowRSI(!showRSI)} />
        <ToggleBtn label="MACD" active={showMACD} onClick={() => setShowMACD(!showMACD)} />
        <ToggleBtn label="KDJ" active={showKDJ} onClick={() => setShowKDJ(!showKDJ)} />
        {showMA && (
          <div className="flex items-center gap-2 ml-2 text-[10px]">
            {MA_CONFIG.map((m) => (
              <span key={m.period} style={{ color: m.color }}>{m.label}</span>
            ))}
          </div>
        )}
      </div>

      {/* Main chart */}
      <style>{`[class*="tv-lightweight-charts"] a[href*="tradingview"] { display: none !important; }`}</style>
      <div ref={mainRef} />

      {/* RSI sub-panel */}
      {showRSI && (
        <div>
          <div className="text-[10px] text-gray-400 mt-1 mb-0.5 px-1">RSI(14)</div>
          <div ref={rsiRef} />
        </div>
      )}

      {/* MACD sub-panel */}
      {showMACD && (
        <div>
          <div className="text-[10px] text-gray-400 mt-1 mb-0.5 px-1">
            MACD(12,26,9)
          </div>
          <div ref={macdRef} />
        </div>
      )}

      {/* KDJ sub-panel */}
      {showKDJ && (
        <div>
          <div className="text-[10px] text-gray-400 mt-1 mb-0.5 px-1">
            KDJ(9,3,3)
          </div>
          <div ref={kdjRef} />
        </div>
      )}
    </div>
  );
}
