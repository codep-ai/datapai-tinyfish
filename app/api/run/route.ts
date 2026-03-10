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
import { NextResponse } from "next/server";
import { UNIVERSE_ALL } from "@/lib/universe";
import { scanTicker, AGENT_ENABLED } from "@/lib/scan-pipeline";
import { insertRun, startRun, finishRun, failRun, getDb } from "@/lib/db";

export const maxDuration = 300;

// ─── Background scan ─────────────────────────────────────────────────────────

async function runScanAsync(runId: string) {
  try {
    startRun(runId);

    const CONCURRENCY = 3;
    const queue = [...UNIVERSE_ALL];
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
        try {
          getDb()
            .prepare("UPDATE runs SET completed_count=?, scanned_count=? WHERE id=?")
            .run(scanned, scanned, runId);
        } catch {}
      }
    }

    const workers = Array.from(
      { length: Math.min(CONCURRENCY, UNIVERSE_ALL.length) },
      worker
    );
    await Promise.all(workers);

    finishRun(runId, new Date().toISOString(), {
      scanned,
      changed,
      alerts: alerted,
      failed,
    });
  } catch (err) {
    failRun(runId, new Date().toISOString(), String(err).slice(0, 200));
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST() {
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  insertRun(runId, startedAt, UNIVERSE_ALL.length);

  runScanAsync(runId).catch((err) => {
    console.error("[run] background scan error:", err);
  });

  return NextResponse.json({ runId, agentEnabled: AGENT_ENABLED });
}
