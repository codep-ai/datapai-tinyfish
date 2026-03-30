/**
 * POST /api/import-screenshot
 * Accepts a broker screenshot, forwards to Python backend for Gemini Vision extraction.
 * Returns extracted stock holdings for user to review before adding to watchlist/portfolio.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

const AGENT_BASE = (process.env.AGENT_BACKEND_BASE_URL ?? "").replace(/\/$/, "");
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  // Auth required
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!AGENT_BASE) {
    return NextResponse.json({ ok: false, error: "AGENT_BACKEND_BASE_URL not configured" }, { status: 503 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ ok: false, error: "File too large. Max 10MB." }, { status: 400 });
    }

    // Forward to Python backend
    const backendForm = new FormData();
    backendForm.append("file", file);

    const res = await fetch(`${AGENT_BASE}/agent/extract-screenshot`, {
      method: "POST",
      body: backendForm,
      signal: AbortSignal.timeout(90_000), // 90s timeout for Vision API
    });

    const json = await res.json();
    if (!res.ok || !json.ok) {
      return NextResponse.json(
        { ok: false, error: json.error ?? "Extraction failed" },
        { status: res.status }
      );
    }

    return NextResponse.json({
      ok: true,
      holdings: json.data?.holdings ?? [],
    });
  } catch (err) {
    console.error("[import-screenshot] error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
