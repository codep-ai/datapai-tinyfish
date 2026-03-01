export interface PricePoint {
  date: string;
  close: number;
  volume: number;
}

const BASE_PRICES: Record<string, number> = {
  ACMR: 22, AEHR: 12, ATRC: 18, CRVL: 95, ERII: 90,
  FLNC: 14, GATO: 8,  HIMS: 22, IIIV: 22, KTOS: 25,
  LBRT: 19, MARA: 18, MGNI: 9,  MNDY: 230,NOVA: 11,
  NTST: 14, PHAT: 8,  PRTS: 5,  SHYF: 15, TMDX: 55,
};

export function getMockPrices(ticker: string, days = 30): PricePoint[] {
  const base = BASE_PRICES[ticker] ?? 20;
  const points: PricePoint[] = [];
  let price = base;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    // Pseudo-random walk seeded by ticker + day
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
