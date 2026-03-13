/**
 * POST /api/stocks/seed
 * Seeds the stock_directory table from:
 *   - ASX: https://www.asx.com.au/asx/research/ASXListedCompanies.csv
 *   - NASDAQ/NYSE: https://api.nasdaq.com/api/screener/stocks?exchange=NASDAQ&download=true
 *
 * Returns { asxCount, nasdaqCount, nyseCount, total }
 * Idempotent — uses INSERT OR REPLACE.
 */

import { NextResponse } from "next/server";
import { upsertStockDirectory, countStockDirectory, type StockDirectoryEntry } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// ── ASX CSV parser ─────────────────────────────────────────────────────────

async function fetchAsxStocks(): Promise<StockDirectoryEntry[]> {
  const url = "https://www.asx.com.au/asx/research/ASXListedCompanies.csv";
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; DataPAI/1.0)" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`ASX CSV fetch failed: ${res.status}`);
  const text = await res.text();

  const lines = text.split("\n");
  const entries: StockDirectoryEntry[] = [];

  // ASX CSV format: "Company name","ASX code","GICS industry group",...
  // Header rows at top — skip until we see a line starting with a quoted company name
  let dataStarted = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Skip header rows (they don't contain a 3-letter ASX code in col 2)
    if (!dataStarted) {
      if (trimmed.startsWith('"') && trimmed.split(",").length >= 2) {
        const cols = parseCSVLine(trimmed);
        if (cols[1] && /^[A-Z0-9]{1,6}$/.test(cols[1].trim())) {
          dataStarted = true;
        } else {
          continue;
        }
      } else {
        continue;
      }
    }

    const cols = parseCSVLine(trimmed);
    if (cols.length < 2) continue;
    const name = cols[0].trim();
    const symbol = cols[1].trim().toUpperCase();
    const sector = cols[2]?.trim() || null;

    if (!symbol || !/^[A-Z0-9]{1,6}$/.test(symbol)) continue;
    if (!name) continue;

    entries.push({ symbol, name, exchange: "ASX", sector });
  }

  return entries;
}

// Simple CSV line parser that handles quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ── NASDAQ screener API fetcher ─────────────────────────────────────────────

/**
 * Fetches stocks from the NASDAQ screener API with pagination.
 * Supports NASDAQ, NYSE, AMEX exchanges.
 * Response: { data: { table: { rows: [{symbol, name, ...}] } } }
 */
async function fetchNasdaqScreenerStocks(exchange: "NASDAQ" | "NYSE" | "AMEX"): Promise<StockDirectoryEntry[]> {
  const pageSize = 500;
  const all: StockDirectoryEntry[] = [];
  let offset = 0;

  while (true) {
    const url = `https://api.nasdaq.com/api/screener/stocks?exchange=${exchange}&offset=${offset}&limit=${pageSize}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`NASDAQ screener [${exchange}] failed: ${res.status}`);

    const json = await res.json() as {
      data?: { table?: { rows?: { symbol: string; name: string }[] }; totalrecords?: number };
    };
    const rows = json?.data?.table?.rows ?? [];
    if (rows.length === 0) break;

    for (const r of rows) {
      if (!r.symbol || !r.name) continue;
      all.push({ symbol: r.symbol.trim().toUpperCase(), name: r.name.trim(), exchange, sector: null });
    }

    const total = json?.data?.totalrecords ?? 0;
    offset += pageSize;
    if (offset >= total || rows.length < pageSize) break;
  }

  return all;
}

// ── Handler ──────────────────────────────────────────────────────────────────

export async function POST() {
  const results = { asxCount: 0, nasdaqCount: 0, nyseCount: 0, amexCount: 0, total: 0, errors: [] as string[] };

  // ASX
  try {
    const asx = await fetchAsxStocks();
    await upsertStockDirectory(asx);
    results.asxCount = asx.length;
  } catch (e) {
    results.errors.push(`ASX: ${String(e).slice(0, 100)}`);
  }

  // NASDAQ
  try {
    const nasdaq = await fetchNasdaqScreenerStocks("NASDAQ");
    await upsertStockDirectory(nasdaq);
    results.nasdaqCount = nasdaq.length;
  } catch (e) {
    results.errors.push(`NASDAQ: ${String(e).slice(0, 100)}`);
  }

  // NYSE
  try {
    const nyse = await fetchNasdaqScreenerStocks("NYSE");
    await upsertStockDirectory(nyse);
    results.nyseCount = nyse.length;
  } catch (e) {
    results.errors.push(`NYSE: ${String(e).slice(0, 100)}`);
  }

  // AMEX
  try {
    const amex = await fetchNasdaqScreenerStocks("AMEX");
    await upsertStockDirectory(amex);
    results.amexCount = amex.length;
  } catch (e) {
    results.errors.push(`AMEX: ${String(e).slice(0, 100)}`);
  }

  results.total = await countStockDirectory();

  return NextResponse.json(results);
}

export async function GET() {
  const [total, asx, nasdaq, nyse, amex] = await Promise.all([
    countStockDirectory(),
    countStockDirectory("ASX"),
    countStockDirectory("NASDAQ"),
    countStockDirectory("NYSE"),
    countStockDirectory("AMEX"),
  ]);
  return NextResponse.json({ total, asx, nasdaq, nyse, amex, seeded: total > 0 });
}
