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
import { insertRun, startRun, finishRun, failRun, getWatchlist } from "@/lib/db";
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
  const useWatchlist = req.nextUrl.searchParams.get("watchlist") === "true";

  let universe: TickerInfo[];

  if (useWatchlist) {
    // Watchlist scan requires auth — universe is user-specific
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Login required to scan your watchlist" },
        { status: 401 }
      );
    }
    const watchlistItems = await getWatchlist(user.userId);
    universe = watchlistItems.map((item) => {
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
  } else {
    universe =
      exchange === "ASX" ? ASX_UNIVERSE
      : exchange === "US"  ? UNIVERSE
      : UNIVERSE_ALL;
  }

  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  await insertRun(runId, startedAt, universe.length);

  runScanAsync(runId, universe).catch((err) => {
    console.error("[run] background scan error:", err);
  });

  return NextResponse.json({ runId, agentEnabled: AGENT_ENABLED });
}
