/**
 * lib/intradayOnDemand.ts — On-demand intraday + quote data fetch.
 *
 * When a user views a ticker page for a stock not in demo/watchlist:
 *   1. Fetch 1-day 5m bars from Yahoo → cache in intraday table
 *   2. Fetch quote summary from Yahoo → cache in stock_fundamentals + stock_directory
 *
 * This gives non-registered users a complete ticker page (chart + fundamentals)
 * for ANY stock, even if we've never seen it before.
 */

import { getPool, type IntradayBar } from "./db";

// Exchange → Yahoo suffix
const YF_SUFFIX: Record<string, string> = {
  ASX: ".AX", HKEX: ".HK", HOSE: ".VN", SET: ".BK",
  KLSE: ".KL", IDX: ".JK", LSE: ".L", SSE: ".SS", SZSE: ".SZ",
};

// Exchange → per-market intraday table
const INTRADAY_TABLE: Record<string, string> = {
  US: "ohlcv_intraday_us", ASX: "ohlcv_intraday_asx",
  HKEX: "ohlcv_intraday_hkex", HOSE: "ohlcv_intraday_hose",
  SET: "ohlcv_intraday_set", KLSE: "ohlcv_intraday_klse",
  IDX: "ohlcv_intraday_idx", SSE: "ohlcv_intraday_sse",
  SZSE: "ohlcv_intraday_szse", LSE: "ohlcv_intraday_lse",
};

// Market timezone for converting UTC → local timestamps
const MARKET_TZ: Record<string, string> = {
  US: "America/New_York", ASX: "Australia/Sydney",
  HKEX: "Asia/Hong_Kong", HOSE: "Asia/Ho_Chi_Minh",
  SET: "Asia/Bangkok", KLSE: "Asia/Kuala_Lumpur",
  IDX: "Asia/Jakarta", SSE: "Asia/Shanghai",
  SZSE: "Asia/Shanghai", LSE: "Europe/London",
};

// In-memory lock to prevent concurrent fetches for the same ticker
const fetchingSet = new Set<string>();

/**
 * Fetch intraday bars from Yahoo Finance for a single ticker,
 * cache into the per-market intraday table, and return the bars.
 */
export async function fetchAndCacheIntraday(
  ticker: string,
  exchange: string
): Promise<IntradayBar[]> {
  const key = `${exchange}:${ticker}`;

  // Prevent duplicate concurrent fetches
  if (fetchingSet.has(key)) {
    // Another request is already fetching — wait briefly and read from DB
    await new Promise((r) => setTimeout(r, 2000));
    return readFromDB(ticker, exchange);
  }

  fetchingSet.add(key);
  try {
    const suffix = YF_SUFFIX[exchange] ?? "";
    const yfSymbol = `${ticker}${suffix}`;
    const tz = MARKET_TZ[exchange] ?? "UTC";

    // Fetch from Yahoo Finance v8 chart API (1d of 5m bars)
    const now = Math.floor(Date.now() / 1000);
    const from = now - 2 * 24 * 60 * 60; // 2 days to cover weekends
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSymbol)}` +
      `?period1=${from}&period2=${now}&interval=5m&includePrePost=false`;

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`[intraday-on-demand] Yahoo ${res.status} for ${yfSymbol}`);
      return [];
    }

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return [];

    const timestamps: number[] = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0] ?? {};
    const opens: number[] = quote.open ?? [];
    const highs: number[] = quote.high ?? [];
    const lows: number[] = quote.low ?? [];
    const closes: number[] = quote.close ?? [];
    const volumes: number[] = quote.volume ?? [];

    if (timestamps.length === 0) return [];

    // Convert to local market time and build rows
    const bars: IntradayBar[] = [];
    const table = INTRADAY_TABLE[exchange];
    if (!table) return [];

    const pool = getPool();
    const insertValues: string[] = [];
    const insertParams: (string | number)[] = [];
    let paramIdx = 1;

    for (let i = 0; i < timestamps.length; i++) {
      const c = closes[i];
      if (c == null || isNaN(c) || c === 0) continue;

      // Convert UTC timestamp → local market time string
      const utcDate = new Date(timestamps[i] * 1000);
      const localStr = utcDate.toLocaleString("sv-SE", { timeZone: tz }).replace("T", " ");

      const o = opens[i] ?? c;
      const h = highs[i] ?? c;
      const l = lows[i] ?? c;
      const v = volumes[i] ?? 0;

      bars.push({
        ts: localStr,
        open: Math.round(o * 100) / 100,
        high: Math.round(h * 100) / 100,
        low: Math.round(l * 100) / 100,
        close: Math.round(c * 100) / 100,
        volume: Math.round(v),
      });

      insertValues.push(
        `($${paramIdx}, $${paramIdx + 1}::timestamp, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5}, $${paramIdx + 6}, $${paramIdx + 7}, $${paramIdx + 8})`
      );
      insertParams.push(
        ticker, localStr,
        Math.round(o * 100) / 100, Math.round(h * 100) / 100,
        Math.round(l * 100) / 100, Math.round(c * 100) / 100,
        Math.round(v), exchange, "on_demand"
      );
      paramIdx += 9;
    }

    // Bulk upsert into per-market intraday table
    if (insertValues.length > 0) {
      const sql = `
        INSERT INTO datapai.${table} (ticker, ts, open, high, low, close, volume, exchange, source)
        VALUES ${insertValues.join(", ")}
        ON CONFLICT (ticker, ts) DO UPDATE SET
          close = EXCLUDED.close, high = EXCLUDED.high, low = EXCLUDED.low,
          open = EXCLUDED.open, volume = EXCLUDED.volume, source = EXCLUDED.source
      `;
      await pool.query(sql, insertParams);
    }

    // Fire-and-forget: also fetch quote info (sector, PE, market cap, etc.)
    // Non-blocking — intraday bars are returned immediately
    fetchAndCacheQuoteInfo(ticker, exchange, yfSymbol).catch(() => {});

    return bars;
  } catch (err) {
    console.warn(`[intraday-on-demand] Error fetching ${ticker}:`, err);
    return [];
  } finally {
    fetchingSet.delete(key);
  }
}

/**
 * Fetch intraday bars via Python backend API (used for China A-shares / AKShare).
 * The backend fetches from AKShare and caches into DB automatically.
 */
async function fetchViaBackendApi(ticker: string, exchange: string): Promise<IntradayBar[]> {
  const backendUrl = process.env.AGENT_BACKEND_BASE_URL || "http://localhost:8000";
  try {
    const res = await fetch(
      `${backendUrl}/agent/intraday-bars?ticker=${encodeURIComponent(ticker)}&exchange=${encodeURIComponent(exchange)}`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.ok || !json.data) return [];

    return (json.data as { ts: string; open: number; high: number; low: number; close: number; volume: number }[]).map((b) => ({
      ts: b.ts,
      open: Math.round(b.open * 100) / 100,
      high: Math.round(b.high * 100) / 100,
      low: Math.round(b.low * 100) / 100,
      close: Math.round(b.close * 100) / 100,
      volume: Math.round(b.volume),
    }));
  } catch (err) {
    console.warn(`[intraday-backend] Error for ${ticker}/${exchange}:`, err);
    return [];
  }
}


/** Simple read from the intraday view (used when another request is already fetching). */
async function readFromDB(ticker: string, exchange: string): Promise<IntradayBar[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT ts::text, open, high, low, close, volume
     FROM datapai.ohlcv_intraday
     WHERE ticker = $1 AND exchange = $2
     ORDER BY ts ASC`,
    [ticker, exchange]
  );
  return rows.map((r: { ts: string; open: number; high: number; low: number; close: number; volume: number }) => ({
    ts: r.ts,
    open: Math.round(r.open * 100) / 100,
    high: Math.round(r.high * 100) / 100,
    low: Math.round(r.low * 100) / 100,
    close: Math.round(r.close * 100) / 100,
    volume: Math.round(r.volume),
  }));
}


/**
 * Fetch quote summary from Yahoo and cache into stock_fundamentals + stock_directory.
 * Runs in the background — does not block the intraday response.
 */
async function fetchAndCacheQuoteInfo(ticker: string, exchange: string, yfSymbol: string): Promise<void> {
  try {
    const url =
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yfSymbol)}` +
      `?modules=summaryDetail,defaultKeyStatistics,financialData,assetProfile`;

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return;
    const data = await res.json();
    const result = data?.quoteSummary?.result?.[0];
    if (!result) return;

    const sd = result.summaryDetail ?? {};
    const ks = result.defaultKeyStatistics ?? {};
    const fd = result.financialData ?? {};
    const ap = result.assetProfile ?? {};

    const pool = getPool();

    // Helper to extract raw value from Yahoo's {raw: number, fmt: string} format
    const raw = (obj: Record<string, unknown> | undefined, key: string): number | null => {
      if (!obj) return null;
      const v = obj[key];
      if (v && typeof v === "object" && "raw" in (v as Record<string, unknown>)) return (v as { raw: number }).raw;
      if (typeof v === "number") return v;
      return null;
    };

    const rawStr = (obj: Record<string, unknown> | undefined, key: string): string | null => {
      if (!obj) return null;
      const v = obj[key];
      if (typeof v === "string") return v;
      if (v && typeof v === "object" && "fmt" in (v as Record<string, unknown>)) return (v as { fmt: string }).fmt;
      return null;
    };

    // Upsert into stock_fundamentals
    await pool.query(`
      INSERT INTO datapai.stock_fundamentals (
        ticker, exchange, market_cap, pe_ttm, pe_forward, pb_ratio, ps_ratio, peg_ratio,
        dividend_rate, dividend_yield, beta,
        fifty_two_week_high, fifty_two_week_low,
        profit_margin, operating_margin, return_on_equity, return_on_assets,
        revenue_ttm, net_income_ttm, ebitda,
        earnings_growth, revenue_growth,
        total_cash, total_debt, debt_to_equity, current_ratio, book_value,
        sector, industry, currency, source, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27,
        $28, $29, $30, $31, NOW()
      )
      ON CONFLICT (ticker, exchange) DO UPDATE SET
        market_cap = COALESCE(EXCLUDED.market_cap, datapai.stock_fundamentals.market_cap),
        pe_ttm = COALESCE(EXCLUDED.pe_ttm, datapai.stock_fundamentals.pe_ttm),
        pe_forward = COALESCE(EXCLUDED.pe_forward, datapai.stock_fundamentals.pe_forward),
        pb_ratio = COALESCE(EXCLUDED.pb_ratio, datapai.stock_fundamentals.pb_ratio),
        ps_ratio = COALESCE(EXCLUDED.ps_ratio, datapai.stock_fundamentals.ps_ratio),
        peg_ratio = COALESCE(EXCLUDED.peg_ratio, datapai.stock_fundamentals.peg_ratio),
        dividend_rate = COALESCE(EXCLUDED.dividend_rate, datapai.stock_fundamentals.dividend_rate),
        dividend_yield = COALESCE(EXCLUDED.dividend_yield, datapai.stock_fundamentals.dividend_yield),
        beta = COALESCE(EXCLUDED.beta, datapai.stock_fundamentals.beta),
        fifty_two_week_high = COALESCE(EXCLUDED.fifty_two_week_high, datapai.stock_fundamentals.fifty_two_week_high),
        fifty_two_week_low = COALESCE(EXCLUDED.fifty_two_week_low, datapai.stock_fundamentals.fifty_two_week_low),
        profit_margin = COALESCE(EXCLUDED.profit_margin, datapai.stock_fundamentals.profit_margin),
        operating_margin = COALESCE(EXCLUDED.operating_margin, datapai.stock_fundamentals.operating_margin),
        return_on_equity = COALESCE(EXCLUDED.return_on_equity, datapai.stock_fundamentals.return_on_equity),
        return_on_assets = COALESCE(EXCLUDED.return_on_assets, datapai.stock_fundamentals.return_on_assets),
        revenue_ttm = COALESCE(EXCLUDED.revenue_ttm, datapai.stock_fundamentals.revenue_ttm),
        net_income_ttm = COALESCE(EXCLUDED.net_income_ttm, datapai.stock_fundamentals.net_income_ttm),
        ebitda = COALESCE(EXCLUDED.ebitda, datapai.stock_fundamentals.ebitda),
        earnings_growth = COALESCE(EXCLUDED.earnings_growth, datapai.stock_fundamentals.earnings_growth),
        revenue_growth = COALESCE(EXCLUDED.revenue_growth, datapai.stock_fundamentals.revenue_growth),
        total_cash = COALESCE(EXCLUDED.total_cash, datapai.stock_fundamentals.total_cash),
        total_debt = COALESCE(EXCLUDED.total_debt, datapai.stock_fundamentals.total_debt),
        debt_to_equity = COALESCE(EXCLUDED.debt_to_equity, datapai.stock_fundamentals.debt_to_equity),
        current_ratio = COALESCE(EXCLUDED.current_ratio, datapai.stock_fundamentals.current_ratio),
        book_value = COALESCE(EXCLUDED.book_value, datapai.stock_fundamentals.book_value),
        sector = COALESCE(EXCLUDED.sector, datapai.stock_fundamentals.sector),
        industry = COALESCE(EXCLUDED.industry, datapai.stock_fundamentals.industry),
        currency = COALESCE(EXCLUDED.currency, datapai.stock_fundamentals.currency),
        source = EXCLUDED.source,
        updated_at = NOW()
    `, [
      ticker, exchange,
      raw(sd, "marketCap"), raw(sd, "trailingPE"), raw(sd, "forwardPE"),
      raw(ks, "priceToBook"), raw(ks, "priceToSalesTrailing12Months"), raw(ks, "pegRatio"),
      raw(sd, "dividendRate"), raw(sd, "dividendYield"), raw(sd, "beta"),
      raw(sd, "fiftyTwoWeekHigh"), raw(sd, "fiftyTwoWeekLow"),
      raw(fd, "profitMargins"), raw(fd, "operatingMargins"),
      raw(fd, "returnOnEquity"), raw(fd, "returnOnAssets"),
      raw(fd, "totalRevenue"), raw(fd, "netIncomeToCommon"), raw(fd, "ebitda"),
      raw(fd, "earningsGrowth"), raw(fd, "revenueGrowth"),
      raw(fd, "totalCash"), raw(fd, "totalDebt"),
      raw(fd, "debtToEquity"), raw(fd, "currentRatio"), raw(ks, "bookValue"),
      ap.sector ?? null, ap.industry ?? null,
      sd.currency ?? null, "on_demand",
    ]);

    // Also upsert stock_directory (company name + sector) for search/display
    const name = ap.longName ?? ap.shortName ?? null;
    if (name) {
      await pool.query(`
        INSERT INTO datapai.stock_directory (symbol, name, exchange, sector, lang)
        VALUES ($1, $2, $3, $4, 'en')
        ON CONFLICT (symbol, exchange, lang) DO UPDATE SET
          name = COALESCE(EXCLUDED.name, datapai.stock_directory.name),
          sector = COALESCE(EXCLUDED.sector, datapai.stock_directory.sector)
      `, [ticker, name, exchange, ap.sector ?? null]);
    }

    console.log(`[quote-on-demand] Cached fundamentals for ${ticker} (${exchange})`);
  } catch (err) {
    console.warn(`[quote-on-demand] Error fetching quote for ${ticker}:`, err);
  }
}
