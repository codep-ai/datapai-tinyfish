import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserByEmail, createSession } from "@/lib/db";
import {
  verifyPassword,
  generateSessionToken,
  sessionExpiresAt,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    email?: string;
    password?: string;
  };

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  // Look up user — use the same error message for not-found and wrong-password
  // to avoid leaking account existence.
  const user = getUserByEmail(email);
  const passwordOk = user ? verifyPassword(password, user.password_hash) : false;

  if (!user || !passwordOk) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Create session
  const token = generateSessionToken();
  createSession(token, user.id, sessionExpiresAt());

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions());

  return NextResponse.json({ success: true, email: user.email });
}
