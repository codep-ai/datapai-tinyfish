import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserByEmail, createUser, createSession } from "@/lib/db";
import {
  hashPassword,
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

  // Validate
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (password.length < 12) {
    return NextResponse.json({ error: "Password must be at least 12 characters" }, { status: 400 });
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

  // Create session
  const token = generateSessionToken();
  await createSession(token, userId, sessionExpiresAt());

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions());

  return NextResponse.json({ success: true, email }, { status: 201 });
}
