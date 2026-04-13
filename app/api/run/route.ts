/**
 * POST /api/run  (V3.1 — AI Agentic Pipeline / v1.5)
 * Non-blocking: creates run immediately, returns {runId}.
 * Scan runs asynchronously in background — no permission loops.
 * Client polls GET /api/run/:id for status.
 *
 * Pipeline stages:
 *   1. TinyFish fetch
 *   2. Extract + clean text
 *   3. Quality check
 *   4. Diff against previous snapshot
 *   5. Local word-list scoring (commitment / hedging / risk)
 *   6. AG2 Full pipeline (if AGENT_BACKEND_BASE_URL configured):
 *      classify change type → signal agents → investigate → validate → explain
 *   7. Paid-LLM fallback summary (if no agent explanation)
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { scanTicker, AGENT_ENABLED, resolveTickerUrl } from "@/lib/scan-pipeline";
import { insertRun, startRun, finishRun, failRun, getWatchlist, getAllWatchlistTickers, getActiveStocks, lookupStock } from "@/lib/db";
import type { ActiveStock } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { UNIVERSE, ASX_UNIVERSE } from "@/lib/universe";

export const maxDuration = 300;

// ─── Background scan ─────────────────────────────────────────────────────────

interface ScanTicker { symbol: string; name: string; url: string; exchange: string; }

async function runScanAsync(runId: string, universe: ScanTicker[]): Promise<void> {
  try {
    await startRun(runId);

    const CONCURRENCY = 2; // TinyFish account limit: 2 concurrent requests
    const queue = [...universe];
    let scanned = 0, changed = 0, alerted = 0, failed = 0;

    async function worker() {
      while (queue.length > 0) {
        const ticker = queue.shift();
        if (!ticker) break;
        const result = await scanTicker(ticker as Parameters<typeof scanTicker>[0], runId);
        scanned++;
        if (result.changed) changed++;
        if (result.alerted) alerted++;
        if (result.failed) failed++;
      }
    }

    const workers = Array.from(
      { length: Math.min(CONCURRENCY, universe.length) },
      worker
    );
    await Promise.all(workers);

    await finishRun(runId, new Date().toISOString(), {
      scanned,
      changed,
      alerts: alerted,
      failed,
    });
  } catch (err) {
    await failRun(runId, new Date().toISOString(), String(err).slice(0, 200));
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const exchange = req.nextUrl.searchParams.get("exchange") ?? null;

  let universe: ScanTicker[];

  // Use the hardcoded IR-monitored universe (20 US + 18 ASX = 38 stocks).
  // NOT getActiveStocks() which pulls 500+ per exchange from ticker_universe
  // and was burning ~1,000 TinyFish scans/day. Budget cap: 2,000 scans/month.
  const irUniverse = exchange === "ASX" ? ASX_UNIVERSE
    : exchange === "US" ? UNIVERSE
    : [...UNIVERSE, ...ASX_UNIVERSE];
  const baseUniverse: ScanTicker[] = irUniverse.map((t) => ({
    symbol: t.symbol,
    name: t.name,
    url: t.url,
    exchange: t.exchange ?? "NASDAQ",
  }));

  // Always merge watchlist stocks into the scan — no separate mode needed.
  // This ensures watchlist stocks get scanned alongside the base universe.
  const allWatchlistItems = await getAllWatchlistTickers();
  const watchlistForExchange = allWatchlistItems
    .filter((item) => {
      if (!exchange) return true;
      const itemExch = item.exchange === "NASDAQ" || item.exchange === "NYSE" ? "US" : item.exchange;
      return itemExch === exchange;
    })
    .map((item) => {
      const exch = item.exchange ?? "US";
      return {
        symbol: item.symbol,
        name: item.name ?? item.symbol,
        url: resolveTickerUrl(item.symbol, exch),
        exchange: exch,
      };
    });

  // Merge and deduplicate by symbol
  const seen = new Set(baseUniverse.map((t) => t.symbol));
  const extra = watchlistForExchange.filter((t) => !seen.has(t.symbol));
  universe = [...baseUniverse, ...extra];

  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  await insertRun(runId, startedAt, universe.length);

  runScanAsync(runId, universe).catch((err) => {
    console.error("[run] background scan error:", err);
  });

  return NextResponse.json({ runId, agentEnabled: AGENT_ENABLED });
}
