/**
 * lib/auth.ts
 * Authentication utilities — PBKDF2 password hashing, session token generation,
 * and the canonical getAuthUser() resolver used by all routes and server components.
 *
 * No external packages — pure Node.js crypto.
 */

import crypto from "crypto";
import { cookies } from "next/headers";
import { getSession, deleteSession } from "./db";

// ─── SSO JWT cookie (auth.datap.ai) ──────────────────────────────────────────
const SSO_COOKIE = "datapai_auth";
const JWT_SECRET = process.env.JWT_SECRET || "";

// ─── Cookie config ────────────────────────────────────────────────────────────

export const SESSION_COOKIE = "session_token";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

// ─── Password hashing (PBKDF2 + SHA-512) ─────────────────────────────────────

/**
 * Returns a "salt:hash" string.
 * 100 000 iterations of PBKDF2-SHA512 — equivalent protection to bcrypt cost 12.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 100_000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a plain-text password against a stored "salt:hash" string.
 * Uses timingSafeEqual to prevent timing side-channel attacks.
 */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const candidate = crypto
      .pbkdf2Sync(password, salt, 100_000, 64, "sha512")
      .toString("hex");
    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(candidate, "hex")
    );
  } catch {
    return false;
  }
}

// ─── Session token ────────────────────────────────────────────────────────────

/** 256-bit cryptographically random token (64-char hex). */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Returns an ISO string 30 days from now. */
export function sessionExpiresAt(): string {
  return new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
}

// ─── Auth user resolver ───────────────────────────────────────────────────────

export interface AuthUser {
  userId: string;
  email: string;
}

/**
 * Resolves the currently authenticated user from the session cookie.
 * Returns null if the cookie is absent, the session is not found, or expired.
 *
 * Call from:
 *  - Server components: await getAuthUser()
 *  - Route Handlers: await getAuthUser()
 *
 * Do NOT call from client components — use GET /api/auth/me instead.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();

  // 1) Prefer new SSO JWT cookie from auth.datap.ai
  const jwt = cookieStore.get(SSO_COOKIE)?.value;
  if (jwt && JWT_SECRET) {
    const payload = verifyJwtHs256(jwt, JWT_SECRET);
    if (payload) return { userId: String(payload.sub), email: payload.email };
  }

  // 2) Legacy session cookie (local stock-fe sessions) — kept as fallback
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await getSession(token);
  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) {
    await deleteSession(token);
    return null;
  }
  return { userId: session.user_id, email: session.email };
}

// ─── Local JWT HS256 verification (no external deps) ─────────────────────────
function verifyJwtHs256(token: string, secret: string):
  { sub: string; email: string; uuid: string; locale: string; exp: number } | null {
  try {
    const [headerB64, payloadB64, sigB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !sigB64) return null;
    const data = `${headerB64}.${payloadB64}`;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(data)
      .digest("base64")
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const a = Buffer.from(expected);
    const b = Buffer.from(sigB64);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(
      Buffer.from(payloadB64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8")
    );
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
