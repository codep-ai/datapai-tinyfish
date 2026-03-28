import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserByEmail, createUser, createSession, getUserCount, assignEarlySupporterBadge } from "@/lib/db";
import {
  hashPassword,
  generateSessionToken,
  sessionExpiresAt,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

const EARLY_SUPPORTER_LIMIT = 1000;

/**
 * Fire-and-forget welcome email via the backend script.
 * Runs in a background fetch so registration is never blocked.
 */
async function triggerWelcomeEmail(email: string, badgeNumber: number, lang: string = "en") {
  try {
    const backendUrl = process.env.DATAPAI_BACKEND_URL ?? "http://localhost:8000";
    await fetch(`${backendUrl}/api/send-welcome-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, badge_number: badgeNumber, lang }),
    }).catch(() => {
      // Silently fail — email is non-critical
    });
  } catch {
    // Silently fail — email is non-critical
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    email?: string;
    password?: string;
    lang?: string;
  };

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const lang = body.lang ?? "en";

  // Validate
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }
  if (!/[A-Z]/.test(password)) {
    return NextResponse.json({ error: "Password must contain at least one uppercase letter" }, { status: 400 });
  }
  if (!/[a-z]/.test(password)) {
    return NextResponse.json({ error: "Password must contain at least one lowercase letter" }, { status: 400 });
  }
  if (!/[0-9]/.test(password)) {
    return NextResponse.json({ error: "Password must contain at least one number" }, { status: 400 });
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return NextResponse.json({ error: "Password must contain at least one special character" }, { status: 400 });
  }

  // Check duplicate
  const existing = await getUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  // Create user
  const userId = crypto.randomUUID();
  const passwordHash = hashPassword(password);
  await createUser(userId, email, passwordHash);

  // Assign Early Supporter badge if within limit
  let badgeNumber: number | null = null;
  try {
    const totalUsers = await getUserCount();
    if (totalUsers <= EARLY_SUPPORTER_LIMIT) {
      badgeNumber = totalUsers;
      await assignEarlySupporterBadge(userId, badgeNumber);
      // Trigger welcome email in background (non-blocking)
      triggerWelcomeEmail(email, badgeNumber, lang);
    }
  } catch (e) {
    // Badge assignment is non-critical — don't fail registration
    console.error("Badge assignment error:", e);
  }

  // Create session
  const token = generateSessionToken();
  await createSession(token, userId, sessionExpiresAt());

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions());

  return NextResponse.json({ success: true, email, badge_number: badgeNumber }, { status: 201 });
}
