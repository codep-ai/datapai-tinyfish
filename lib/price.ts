/**
 * lib/price.ts  (V5)
 * Fetches price data from LOCAL Postgres DB first (instant, validated),
 * falls back to Yahoo Finance if DB has insufficient data.
 * Non-US tickers have exchange suffixes in both DB and Yahoo (e.g. ".AX", ".HK").
 */

import { getPool } from "./db";

export interface PricePoint {
  date: string;  // YYYY-MM-DD or ISO timestamp for intraday
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Suffix map: prices table stores tickers with exchange suffix
const SUFFIX_MAP: Record<string, string> = {
  ASX: ".AX", HKEX: ".HK", HOSE: ".VN", SET: ".BK",
  KLSE: ".KL", IDX: ".JK", LSE: ".L", SSE: ".SS", SZSE: ".SZ", TWSE: ".TW",
};

function dbTicker(ticker: string, exchange?: string): string {
  const suffix = exchange ? (SUFFIX_MAP[exchange] ?? "") : "";
  return suffix ? `${ticker}${suffix}` : ticker;
}

// ─── DB-first price fetch ────────────────────────────────────────────────

export async function fetchPrices(
  ticker: string,
  days = 30,
  exchange?: string
): Promise<PricePoint[]> {
  const dt = dbTicker(ticker, exchange);

  // 1. Try local Postgres (instant, validated data)
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT trade_date::text as date, open, high, low, close, volume
       FROM datapai.prices
       WHERE ticker = $1
       ORDER BY trade_date DESC
       LIMIT $2`,
      [dt, days],
    );
    if (rows.length >= 5) {
      return rows.reverse().map((r: { date: string; open: number; high: number; low: number; close: number; volume: number }) => ({
        date: r.date,
        open: Math.round((r.open ?? r.close) * 100) / 100,
        high: Math.round((r.high ?? r.close) * 100) / 100,
        low: Math.round((r.low ?? r.close) * 100) / 100,
        close: Math.round(r.close * 100) / 100,
        volume: Math.round(r.volume ?? 0),
      }));
    }
  } catch (dbErr) {
    console.warn(`[price] DB fetch failed for ${dt}:`, dbErr);
  }

  // 2. Fall back to Yahoo Finance
  const yahooSymbol = dbTicker(ticker, exchange);
  try {
    const now = Math.floor(Date.now() / 1000);
    const from = now - days * 24 * 60 * 60;
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}` +
      `?period1=${from}&period2=${now}&interval=1d`;

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`Yahoo ${res.status}`);

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const timestamps: number[] = result?.timestamp ?? [];
    const quote = result?.indicators?.quote?.[0] ?? {};
    const opens: number[] = quote.open ?? [];
    const highs: number[] = quote.high ?? [];
    const lows: number[] = quote.low ?? [];
    const closes: number[] = quote.close ?? [];
    const volumes: number[] = quote.volume ?? [];

    if (timestamps.length === 0) throw new Error("empty response");

    const points: PricePoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i];
      if (close == null) continue;
      const date = new Date(timestamps[i] * 1000).toISOString().slice(0, 10);
      points.push({
        date,
        open: Math.round((opens[i] ?? close) * 100) / 100,
        high: Math.round((highs[i] ?? close) * 100) / 100,
        low: Math.round((lows[i] ?? close) * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume: volumes[i] ?? 0,
      });
    }

    return points.slice(-days);
  } catch (err) {
    console.warn(`[price] Yahoo Finance failed for ${yahooSymbol}, using mock:`, err);
    return getMockPrices(ticker, days, exchange);
  }
}

// ─── Intraday price fetch (from ohlcv_intraday view) ─────────────────────

export async function fetchIntradayPrices(
  ticker: string,
  exchange?: string
): Promise<PricePoint[]> {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT ts::text as date, open, high, low, close, volume
       FROM datapai.ohlcv_intraday
       WHERE ticker = $1 AND exchange = $2
       ORDER BY ts ASC`,
      [ticker, exchange ?? "US"],
    );
    return rows.map((r: { date: string; open: number; high: number; low: number; close: number; volume: number }) => ({
      date: r.date,
      open: Math.round(r.open * 100) / 100,
      high: Math.round(r.high * 100) / 100,
      low: Math.round(r.low * 100) / 100,
      close: Math.round(r.close * 100) / 100,
      volume: Math.round(r.volume ?? 0),
    }));
  } catch (err) {
    console.warn(`[price] Intraday fetch failed for ${ticker}:`, err);
    return [];
  }
}

// ─── Mock fallback (deterministic, seeded by ticker) ─────────────────────

// US stock approximate prices (USD)
const BASE_PRICES_US: Record<string, number> = {
  ACMR: 22, AEHR: 12, ATRC: 18, CRVL: 95, ERII: 90,
  FLNC: 14, GATO: 8,  HIMS: 22, IIIV: 22, KTOS: 25,
  LBRT: 19, MARA: 18, MGNI: 9,  MNDY: 230, NOVA: 11,
  NTST: 14, PHAT: 8,  PRTS: 5,  SHYF: 15, TMDX: 55,
};

// ASX stock approximate prices (AUD)
const BASE_PRICES_ASX: Record<string, number> = {
  BHP: 45,  CBA: 155, CSL: 280, WBC: 32,  ANZ: 30,
  NAB: 38,  RIO: 115, WES: 70,  FMG: 22,  MQG: 215,
  TWE: 12,  GMG: 35,  STO: 8,   ORG: 11,  WDS: 28,
  TLS: 4,   WOW: 35,  QAN: 8,
};

export function getMockPrices(ticker: string, days = 30, exchange?: string): PricePoint[] {
  const priceMap = exchange === "ASX" ? BASE_PRICES_ASX : BASE_PRICES_US;
  const defaultBase = exchange === "ASX" ? 15 : 20;
  const base = priceMap[ticker] ?? defaultBase;
  const points: PricePoint[] = [];
  let price = base;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const seed = ticker.charCodeAt(0) * 31 + i;
    const change = ((seed % 7) - 3) * 0.01 * base;
    price = Math.max(price + change, 1);
    const volume = Math.round((seed % 500 + 200) * 1000);
    const c = Math.round(price * 100) / 100;
    points.push({
      date: dateStr,
      open: Math.round((c - change * 0.5) * 100) / 100,
      high: Math.round((c + Math.abs(change)) * 100) / 100,
      low: Math.round((c - Math.abs(change)) * 100) / 100,
      close: c,
      volume,
    });
  }
  return points;
}
