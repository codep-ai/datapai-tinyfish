/**
 * POST /api/ticker/[symbol]/chat
 *
 * Proxies to Python /agent/stock-chat.
 * Passes: ticker, exchange, message, conversation history,
 *         user_id, lang, ta_signal_md (if cached), snapshot_text,
 *         profile_context (investor profile block for LLM system prompt).
 *
 * This is the gateway between the Next.js chat UI and the
 * datapai-streamlit stock_chat module.
 */

import { NextResponse } from "next/server";
import { lookupStock } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { getInvestorProfileOrDefault, buildProfileContext } from "@/lib/investorProfile";

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
    return NextResponse.json(
      { ok: false, error: "Agent backend not configured" },
      { status: 503 }
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
    return NextResponse.json({ ok: false, error: "message is required" }, { status: 400 });
  }

  // Resolve exchange for this ticker from DB
  let exchange = "";
  try { const d = await lookupStock(symbol); exchange = d?.exchange ?? "US"; } catch { exchange = "US"; }

  // Get authenticated user — load investor profile for personalised AI responses
  let userId      = 0;          // legacy int for Python session history key
  let userUuid    = "";          // TEXT UUID for new profile table
  let profileCtx  = "";          // multi-line investor profile block
  let effectiveLang = body.lang ?? "en";

  try {
    const user = await getAuthUser();
    if (user?.userId) {
      userUuid = user.userId;
      userId   = parseInt(user.userId, 10) || 0;   // best-effort for legacy key
      const profile = await getInvestorProfileOrDefault(user.userId);
      profileCtx    = buildProfileContext(profile);
      // Honour profile language unless the client explicitly overrides
      if (!body.lang && profile.preferred_lang) {
        effectiveLang = profile.preferred_lang;
      }
    }
  } catch { /* anonymous — profile context stays empty */ }

  try {
    const res = await fetch(`${AGENT_BASE}/agent/stock-chat`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        ticker:          symbol,
        exchange,
        message,
        user_id:         userId,
        session_id:      body.session_id ?? null,
        new_session:     body.new_session ?? false,
        lang:            effectiveLang,
        ta_signal_md:    body.ta_signal_md ?? null,
        snapshot_text:   body.snapshot_text ?? null,
        profile_context: profileCtx || null,
      }),
      signal: AbortSignal.timeout(55_000),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: data?.detail ?? `Agent returned ${res.status}` },
        { status: 502 }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
