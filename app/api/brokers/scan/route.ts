/**
 * POST /api/brokers/scan
 * ──────────────────────────────────────────────────────────────────────────────
 * Triggers a TinyFish scan of all broker fee pages (or a subset by market).
 * Non-blocking: returns immediately with a runId.
 * Polls GET /api/brokers/scan/[runId] for status (not yet implemented — check DB).
 *
 * Query params:
 *   ?market=AU   → scan AU brokers only
 *   ?market=US   → scan US brokers only
 *   (none)       → scan all brokers
 *   ?id=commsec  → scan a single broker by id (for manual re-check)
 *
 * Requires: PAID_LLM_API_KEY env var for fee extraction.
 * TinyFish concurrency: 2 parallel requests (account limit).
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { ALL_BROKERS, type Broker } from "@/lib/brokers";
import { scanBroker, type BrokerScanResult } from "@/lib/broker-scanner";

export const maxDuration = 300;

const CONCURRENCY = 2;

async function runBrokerScansAsync(
  runId: string,
  brokers: Broker[]
): Promise<void> {
  const queue = [...brokers];
  const results: BrokerScanResult[] = [];
  let done = 0;

  async function worker() {
    while (queue.length > 0) {
      const broker = queue.shift();
      if (!broker) break;
      const result = await scanBroker(broker);
      results.push(result);
      done++;
      console.log(
        `[broker-scan] [${runId}] ${done}/${brokers.length} — ${broker.id} ` +
        `${result.unchanged ? "(unchanged)" : result.error ? `ERROR: ${result.error}` : `${result.discrepancies.length} discrepancies`}`
      );
    }
  }

  const workers = Array.from(
    { length: Math.min(CONCURRENCY, brokers.length) },
    worker
  );
  await Promise.all(workers);

  const withDiscrepancies = results.filter(r => r.discrepancies.length > 0);
  const errors = results.filter(r => r.error);
  const unchanged = results.filter(r => r.unchanged);

  console.log(
    `[broker-scan] [${runId}] DONE — ` +
    `scanned=${results.length}, unchanged=${unchanged.length}, ` +
    `errors=${errors.length}, with_discrepancies=${withDiscrepancies.length}`
  );

  if (withDiscrepancies.length > 0) {
    console.warn(
      "[broker-scan] Discrepancies found — review lib/brokers.ts:\n",
      JSON.stringify(
        withDiscrepancies.map(r => ({
          broker: r.brokerId,
          discrepancies: r.discrepancies,
        })),
        null,
        2
      )
    );
  }
}

export async function POST(req: NextRequest) {
  const market = req.nextUrl.searchParams.get("market")?.toUpperCase() ?? null;
  const singleId = req.nextUrl.searchParams.get("id") ?? null;

  let brokers: Broker[];
  if (singleId) {
    const found = ALL_BROKERS.find(b => b.id === singleId);
    if (!found) {
      return NextResponse.json(
        { error: `Broker id '${singleId}' not found` },
        { status: 404 }
      );
    }
    brokers = [found];
  } else if (market === "AU" || market === "US") {
    brokers = ALL_BROKERS.filter(b => b.market === market);
  } else {
    brokers = ALL_BROKERS;
  }

  const runId = crypto.randomUUID();

  // Fire-and-forget background scan
  runBrokerScansAsync(runId, brokers).catch(err =>
    console.error("[broker-scan] background error:", err)
  );

  return NextResponse.json({
    runId,
    queued: brokers.length,
    brokers: brokers.map(b => b.id),
    message: `Scanning ${brokers.length} broker fee page(s) in background. Check server logs or datapai.broker_snapshots for results.`,
  });
}
