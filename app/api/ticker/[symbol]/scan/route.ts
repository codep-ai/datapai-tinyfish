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
import { insertRun, startRun, finishRun, failRun, lookupStock, getTickerSnapshots, logUserScan } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { checkScanLimit } from "@/lib/plan-limits";

// Internal base URL so AI cache pre-warming calls stay on localhost.
const INTERNAL_BASE = `http://localhost:${process.env.PORT ?? "3085"}`;

/**
 * Pre-warm the AI signal caches after a scan completes.
 * Fires fire-and-forget: failures are silently logged, never block the scan result.
 */
async function prewarmAiCaches(symbol: string, exchange: string): Promise<void> {
  const base = `${INTERNAL_BASE}/api/ticker/${symbol}`;
  const tasks: Promise<unknown>[] = [
    // TA signal: force-fresh since scan just updated IR data
    fetch(`${base}/ta-signal?fresh=1`, { method: "POST", signal: AbortSignal.timeout(120_000) }),
    // Chart analysis: fresh 3-panel chart
    fetch(`${base}/chart-analysis?fresh=1`, { method: "POST", signal: AbortSignal.timeout(120_000) }),
  ];

  // ASX Trading Signal: needs the latest IR snapshot text as context
  if (exchange === "ASX") {
    const snap = (await getTickerSnapshots(symbol, 1))[0];
    const announcementText = (snap?.cleaned_text ?? snap?.text ?? "").slice(0, 4000);
    tasks.push(
      fetch(`${base}/asx-trading-signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          announcement_text: announcementText,
          headline: `${symbol} — IR page updated`,
          doc_type: "IR Update",
          market_sensitive: false,
        }),
        signal: AbortSignal.timeout(180_000),
      })
    );
  }

  await Promise.allSettled(tasks).then((results) => {
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.warn(`[scan:${symbol}] AI cache pre-warm task ${i} failed (non-fatal):`, r.reason);
      }
    });
  });
}

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
    await startRun(runId);

    const ticker = { symbol, name, url, exchange: exchange as "NASDAQ" | "NYSE" | "ASX" };
    const result = await scanTicker(ticker, runId, { force: true });

    await finishRun(runId, new Date().toISOString(), {
      scanned: 1,
      changed: result.changed ? 1 : 0,
      alerts: result.alerted ? 1 : 0,
      failed: result.failed ? 1 : 0,
    });

    // ── Pre-warm AI caches so the /intel page is instant on first view ──────
    // Fire-and-forget: do not await, do not fail the scan if these fail.
    prewarmAiCaches(symbol, exchange).catch((err) => {
      console.warn(`[scan:${symbol}] AI cache pre-warm failed (non-fatal):`, err);
    });

  } catch (err) {
    await failRun(runId, new Date().toISOString(), String(err).slice(0, 200));
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: rawSymbol } = await params;
  const symbol = rawSymbol.toUpperCase();

  // ── 0. Auth + plan check ──────────────────────────────────────────────────
  // Internal server-side calls (cron, rescan scripts) bypass user auth by
  // supplying the X-Internal-Token header matching INTERNAL_API_SECRET env var.
  const internalSecret = process.env.INTERNAL_API_SECRET;
  const internalToken  = (req as Request & { headers: Headers }).headers.get("x-internal-token");
  const isInternal     = internalSecret && internalToken === internalSecret;

  if (!isInternal) {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { error: "Sign in to run on-demand scans", upgradeUrl: "/login" },
        { status: 401 }
      );
    }
    const scanCheck = await checkScanLimit(authUser.userId, symbol);
    if (!scanCheck.allowed) {
      return NextResponse.json(
        { error: scanCheck.message, upgradeUrl: "/pricing" },
        { status: 403 }
      );
    }
    // Log against user's daily quota
    logUserScan(authUser.userId, symbol).catch(() => {});
  }

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
    const dir = await lookupStock(symbol);
    if (dir) {
      name = dir.name;
      exchange = dir.exchange as typeof exchange;
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
  await insertRun(runId, startedAt, 1);

  // ── 3. Fire-and-forget ─────────────────────────────────────────────────────
  runSingleTickerAsync(symbol, name, resolvedUrl, exchange, runId).catch((err) => {
    console.error(`[scan:${symbol}] background scan error:`, err);
  });

  return NextResponse.json({ runId, symbol, resolvedUrl, name, exchange, agentEnabled: AGENT_ENABLED });
}
