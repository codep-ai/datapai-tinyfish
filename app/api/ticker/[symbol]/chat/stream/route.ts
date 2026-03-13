/**
 * POST /api/ticker/[symbol]/chat/stream
 *
 * Streaming proxy → Python /agent/stock-chat/stream
 * Returns SSE (text/event-stream) so the browser gets words as they arrive.
 *
 * SSE event shapes from Python:
 *   {"type":"session",  "session_id":"...", "ticker":"..."}
 *   {"type":"chunk",    "text":"..."}
 *   {"type":"done",     "model":"..."}
 *   {"type":"error",    "message":"..."}
 */

import { UNIVERSE_ALL } from "@/lib/universe";
import { getAuthUser } from "@/lib/auth";

export const dynamic    = "force-dynamic";
export const maxDuration = 60;

const AGENT_BASE = (process.env.AGENT_BACKEND_BASE_URL ?? "").replace(/\/$/, "");

export async function POST(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: rawSymbol } = await params;
  const symbol = rawSymbol.toUpperCase();

  if (!AGENT_BASE) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", message: "Agent backend not configured" })}\n\n`,
      { status: 503, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  let body: {
    message?: string;
    session_id?: string;
    new_session?: boolean;
    lang?: string;
    ta_signal_md?: string;
    snapshot_text?: string;
  } = {};
  try { body = await req.json(); } catch { /* ok */ }

  const message = body.message?.trim();
  if (!message) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", message: "message is required" })}\n\n`,
      { status: 400, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  const tickerInfo = UNIVERSE_ALL.find((t) => t.symbol === symbol);
  const exchange   = tickerInfo?.exchange ?? "US";

  let userId = 0;
  try {
    const user = await getAuthUser();
    if (user?.userId) userId = parseInt(user.userId, 10) || 0;
  } catch { /* anonymous */ }

  try {
    const upstream = await fetch(`${AGENT_BASE}/agent/stock-chat/stream`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        ticker:        symbol,
        exchange,
        message,
        user_id:       userId,
        session_id:    body.session_id   ?? null,
        new_session:   body.new_session  ?? false,
        lang:          body.lang         ?? "en",
        ta_signal_md:  body.ta_signal_md  ?? null,
        snapshot_text: body.snapshot_text ?? null,
      }),
      signal: AbortSignal.timeout(55_000),
    });

    if (!upstream.ok || !upstream.body) {
      return new Response(
        `data: ${JSON.stringify({ type: "error", message: `Agent returned ${upstream.status}` })}\n\n`,
        { status: 502, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    // Pipe the SSE stream directly to the client
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
