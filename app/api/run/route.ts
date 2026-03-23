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
import { UNIVERSE, ASX_UNIVERSE, UNIVERSE_ALL } from "@/lib/universe";
import type { TickerInfo } from "@/lib/universe";
import { scanTicker, AGENT_ENABLED, resolveTickerUrl } from "@/lib/scan-pipeline";
import { insertRun, startRun, finishRun, failRun, getWatchlist, getAllWatchlistTickers } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const maxDuration = 300;

// ─── Background scan ─────────────────────────────────────────────────────────

async function runScanAsync(runId: string, universe: typeof UNIVERSE_ALL) {
  try {
    await startRun(runId);

    const CONCURRENCY = 2; // TinyFish account limit: 2 concurrent requests
    const queue = [...universe];
    let scanned = 0, changed = 0, alerted = 0, failed = 0;

    async function worker() {
      while (queue.length > 0) {
        const ticker = queue.shift();
        if (!ticker) break;
        const result = await scanTicker(ticker, runId);
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

  let universe: TickerInfo[];

  // Start with the hardcoded universe for the exchange
  const baseUniverse =
    exchange === "ASX" ? ASX_UNIVERSE
    : exchange === "US"  ? UNIVERSE
    : UNIVERSE_ALL;

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
      const known = UNIVERSE_ALL.find((t) => t.symbol === item.symbol);
      if (known) return known;
      const exch = item.exchange ?? "US";
      return {
        symbol: item.symbol,
        name: item.name ?? item.symbol,
        url: resolveTickerUrl(item.symbol, exch),
        exchange: exch as TickerInfo["exchange"],
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
