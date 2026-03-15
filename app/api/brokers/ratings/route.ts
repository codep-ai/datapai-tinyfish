/**
 * POST /api/brokers/ratings
 * Triggers TinyFish scans of Trustpilot pages for all brokers (or a subset).
 * Returns immediately — scan runs in background.
 *
 * Query params:
 *   ?market=AU|US   → scan only that market
 *   ?id=commsec     → scan a single broker
 *
 * GET /api/brokers/ratings
 * Returns latest cached Trustpilot scores from DB (for the page to consume).
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { ALL_BROKERS, type Broker } from "@/lib/brokers";
import { scanBrokerRating, getLatestRatings } from "@/lib/trustpilot-scanner";

export const maxDuration = 300;

const CONCURRENCY = 2;

async function runRatingScanAsync(runId: string, brokers: Broker[]) {
  const queue = [...brokers.filter(b => b.trustpilotUrl)];
  let done = 0;

  async function worker() {
    while (queue.length > 0) {
      const broker = queue.shift();
      if (!broker) break;
      const result = await scanBrokerRating(broker);
      done++;
      console.log(
        `[ratings-scan] [${runId}] ${done}/${queue.length + done} — ` +
        `${broker.id}: ${result.rating ? `${result.rating.score}/5 (${result.rating.reviewCount} reviews)` : `ERROR: ${result.error}`}`
      );
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker);
  await Promise.all(workers);
  console.log(`[ratings-scan] [${runId}] DONE`);
}

export async function POST(req: NextRequest) {
  const market = req.nextUrl.searchParams.get("market")?.toUpperCase() ?? null;
  const singleId = req.nextUrl.searchParams.get("id") ?? null;

  let brokers: Broker[];
  if (singleId) {
    const found = ALL_BROKERS.find(b => b.id === singleId);
    if (!found) {
      return NextResponse.json({ error: `Broker '${singleId}' not found` }, { status: 404 });
    }
    brokers = [found];
  } else if (market === "AU" || market === "US") {
    brokers = ALL_BROKERS.filter(b => b.market === market);
  } else {
    brokers = ALL_BROKERS;
  }

  const runId = crypto.randomUUID();
  runRatingScanAsync(runId, brokers).catch(err =>
    console.error("[ratings-scan] error:", err)
  );

  return NextResponse.json({
    runId,
    queued: brokers.filter(b => b.trustpilotUrl).length,
    message: `Scanning ${brokers.filter(b => b.trustpilotUrl).length} Trustpilot pages in background.`,
  });
}

export async function GET() {
  const ratings = await getLatestRatings();
  return NextResponse.json(ratings);
}
