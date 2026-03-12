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
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = getSession(token);
  if (!session) return null;

  // Belt-and-suspenders expiry check (DB query already filters, but be safe)
  if (new Date(session.expires_at) < new Date()) {
    deleteSession(token);
    return null;
  }

  return { userId: session.user_id, email: session.email };
}
