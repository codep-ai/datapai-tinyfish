/**
 * POST /api/copilot/stream
 *
 * Global AI copilot streaming endpoint — not scoped to a single ticker.
 * Accepts page_context so the AI knows what the user is looking at.
 *
 * Proxies to Python /agent/stock-chat/stream (same backend, but with richer context).
 */

import { getAuthUser } from "@/lib/auth";

export const dynamic     = "force-dynamic";
export const maxDuration = 60;

const AGENT_BASE = (process.env.AGENT_BACKEND_BASE_URL ?? "").replace(/\/$/, "");

export async function POST(req: Request) {
  if (!AGENT_BASE) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", message: "Agent backend not configured" })}\n\n`,
      { status: 503, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  let body: {
    message?:      string;
    session_id?:   string | null;
    new_session?:  boolean;
    lang?:         string;
    page_context?: string | null;
    ticker?:       string | null;
    exchange?:     string | null;
  } = {};
  try { body = await req.json(); } catch { /* ok */ }

  const message = body.message?.trim();
  if (!message) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", message: "message is required" })}\n\n`,
      { status: 400, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  let userId = 0;
  try {
    const user = await getAuthUser();
    if (user?.userId) userId = parseInt(user.userId, 10) || 0;
  } catch { /* anonymous */ }

  // Detect ticker in user message and inject verified price from our DB
  // This prevents Gemini from guessing wrong prices
  let verifiedPrice = "";
  try {
    const tickerMatch = message.match(/\b([A-Z]{1,5})(?:\.(ASX|SI|TW|T|HK|VN|BK|KL|JK|L|SS|SZ))?\b/);
    if (tickerMatch) {
      const detectedTicker = tickerMatch[1];
      const detectedExchange = body.exchange || body.ticker?.split(".")?.[1] || "US";
      const { getPool } = await import("@/lib/db");
      const pool = getPool();
      const { rows } = await pool.query(
        `SELECT close, trade_date FROM datapai.prices
         WHERE ticker = $1 AND exchange = $2
         ORDER BY trade_date DESC LIMIT 1`,
        [detectedTicker, detectedExchange]
      );
      if (rows.length > 0) {
        const p = rows[0];
        verifiedPrice = `\n[VERIFIED PRICE from DataP.ai DB — use this, not Google Search]\n${detectedTicker}: $${Number(p.close).toFixed(2)} as of ${p.trade_date}\n`;
      }
    }
  } catch { /* non-fatal */ }

  // Page context + verified price
  const systemContext = [
    verifiedPrice,
    body.page_context ? `[Page the user is currently viewing]\n${body.page_context}` : "",
  ].filter(Boolean).join("\n") || null;

  try {
    const upstream = await fetch(`${AGENT_BASE}/agent/stock-chat/stream`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        // If user is on a specific ticker page, send that ticker
        ticker:        body.ticker   ?? "COPILOT",
        exchange:      body.exchange ?? "US",
        message,
        user_id:       userId,
        session_id:    body.session_id  ?? null,
        new_session:   body.new_session ?? false,
        lang:          body.lang        ?? "en",
        // Pass page context as snapshot_text so the LLM has grounding
        snapshot_text: systemContext,
        ta_signal_md:  null,
      }),
      signal: AbortSignal.timeout(55_000),
    });

    if (!upstream.ok || !upstream.body) {
      return new Response(
        `data: ${JSON.stringify({ type: "error", message: `Agent returned ${upstream.status}` })}\n\n`,
        { status: 502, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type":      "text/event-stream",
        "Cache-Control":     "no-cache",
        "Connection":        "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", message: String(err) })}\n\n`,
      { status: 500, headers: { "Content-Type": "text/event-stream" } }
    );
  }
}
