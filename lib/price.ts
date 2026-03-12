/**
 * lib/price.ts  (V3)
 * Fetches real 30-day price data from Yahoo Finance chart API.
 * ASX-listed stocks use the ".AX" suffix required by Yahoo Finance.
 * Falls back to deterministic mock if the request fails.
 */

export interface PricePoint {
  date: string;  // YYYY-MM-DD
  close: number;
  volume: number;
}

// ─── Real price via Yahoo Finance ─────────────────────────────────────────

export async function fetchPrices(
  ticker: string,
  days = 30,
  exchange?: string
): Promise<PricePoint[]> {
  // Yahoo Finance requires ".AX" suffix for ASX-listed stocks
  const yahooSymbol = exchange === "ASX" ? `${ticker}.AX` : ticker;

  try {
    const now = Math.floor(Date.now() / 1000);
    const from = now - days * 24 * 60 * 60;
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}` +
      `?period1=${from}&period2=${now}&interval=1d`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`Yahoo ${res.status}`);

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const timestamps: number[] = result?.timestamp ?? [];
    const closes: number[] = result?.indicators?.quote?.[0]?.close ?? [];
    const volumes: number[] = result?.indicators?.quote?.[0]?.volume ?? [];

    if (timestamps.length === 0) throw new Error("empty response");

    const points: PricePoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i];
      if (close == null) continue;
      const date = new Date(timestamps[i] * 1000).toISOString().slice(0, 10);
      points.push({
        date,
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
    points.push({
      date: dateStr,
      close: Math.round(price * 100) / 100,
      volume,
    });
  }
  return points;
}
