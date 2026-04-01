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

  // Detect ticker in message → fetch live price from Yahoo → inject into context
  let verifiedPrice = "";
  try {
    const match = message.toUpperCase().match(/\b([A-Z0-9]{1,6})(?:\.(ASX|SI|TW|T|HK|VN|BK|KL|JK|L|SS|SZ))?\b/);
    if (match && match[1].length >= 2) {
      const ticker = match[1];
      const exSuffix = match[2] || "";
      const sfx: Record<string, string> = { ASX:".AX", SI:".SI", TW:".TW", T:".T", HK:".HK", VN:".VN", BK:".BK", KL:".KL", JK:".JK", L:".L", SS:".SS", SZ:".SZ" };
      const yfSym = `${ticker}${exSuffix ? (sfx[exSuffix] || "") : ""}`;
      const yRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yfSym}?range=2d&interval=1d`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(3000),
      });
      if (yRes.ok) {
        const yd = await yRes.json();
        const meta = yd?.chart?.result?.[0]?.meta;
        if (meta?.regularMarketPrice) {
          const p = meta.regularMarketPrice;
          const pc = meta.previousClose ?? meta.chartPreviousClose ?? p;
          const chg = p - pc;
          const pct = pc ? (chg / pc * 100) : 0;
          const cur = meta.currency ?? "USD";
          const exn = meta.exchangeName ?? "";
          const state = meta.marketState === "REGULAR" ? "Live" : "Close";
          verifiedPrice = `[VERIFIED PRICE from Yahoo Finance — use this exact data, do not use Google Search for price]\n${ticker}: ${cur} ${p.toFixed(2)} ${chg >= 0 ? "+" : ""}${chg.toFixed(2)} (${chg >= 0 ? "+" : ""}${pct.toFixed(2)}%) · ${exn} · ${state}\n`;
        }
      }
    }
  } catch { /* non-fatal */ }

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
