/**
 * POST /api/ticker/[symbol]/scan
 *
 * On-demand single-ticker scan — runs the full TinyFish → DataP.ai agent
 * pipeline for any stock symbol, including ones not in UNIVERSE_ALL.
 *
 * Body (optional JSON): { url?: string }
 *   - If url is provided, it's used directly.
 *   - Otherwise the URL is resolved from UNIVERSE_ALL → stock_directory → default pattern.
 *
 * Returns: { runId, symbol, resolvedUrl, agentEnabled }
 * Client polls GET /api/run/:runId for progress and completion.
 */

import crypto from "crypto";
import { NextResponse } from "next/server";
import { UNIVERSE_ALL } from "@/lib/universe";
import { scanTicker, resolveTickerUrl, AGENT_ENABLED } from "@/lib/scan-pipeline";
import { insertRun, startRun, finishRun, failRun, lookupStock, getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// ─── Background single-ticker scan ────────────────────────────────────────────

async function runSingleTickerAsync(
  symbol: string,
  name: string,
  url: string,
  exchange: string,
  runId: string
) {
  try {
    startRun(runId);

    const ticker = { symbol, name, url, exchange: exchange as "NASDAQ" | "NYSE" | "ASX" };
    const result = await scanTicker(ticker, runId);

    try {
      getDb()
        .prepare("UPDATE runs SET completed_count=1, scanned_count=1 WHERE id=?")
        .run(runId);
    } catch {}

    finishRun(runId, new Date().toISOString(), {
      scanned: 1,
      changed: result.changed ? 1 : 0,
      alerts: result.alerted ? 1 : 0,
      failed: result.failed ? 1 : 0,
    });
  } catch (err) {
    failRun(runId, new Date().toISOString(), String(err).slice(0, 200));
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: rawSymbol } = await params;
  const symbol = rawSymbol.toUpperCase();

  // Parse optional body (may be empty)
  let bodyUrl: string | undefined;
  try {
    const body = await req.json();
    bodyUrl = typeof body?.url === "string" ? body.url.trim() : undefined;
  } catch {}

  // ── 1. Resolve ticker info ─────────────────────────────────────────────────
  const known = UNIVERSE_ALL.find((t) => t.symbol === symbol);
  let name = known?.name ?? "";
  let exchange = known?.exchange ?? "NASDAQ";
  let resolvedUrl = bodyUrl ?? known?.url ?? "";

  // Fall back to stock directory for name + exchange
  if (!known) {
    const dir = lookupStock(symbol);
    if (dir) {
      name = dir.name;
      exchange = dir.exchange;
    }
  }

  // Derive URL if still missing
  if (!resolvedUrl) {
    resolvedUrl = resolveTickerUrl(symbol, exchange);
  }

  // Use symbol as name if nothing else available
  if (!name) name = symbol;

  // ── 2. Create run record ───────────────────────────────────────────────────
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  insertRun(runId, startedAt, 1);

  // ── 3. Fire-and-forget ─────────────────────────────────────────────────────
  runSingleTickerAsync(symbol, name, resolvedUrl, exchange, runId).catch((err) => {
    console.error(`[scan:${symbol}] background scan error:`, err);
  });

  return NextResponse.json({ runId, symbol, resolvedUrl, name, exchange, agentEnabled: AGENT_ENABLED });
}
