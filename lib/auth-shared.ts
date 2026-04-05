/**
 * auth-shared.ts — JWT verification library for DATAP.AI domains
 *
 * Copy this file into every domain frontend (stock-fe, health-fe, trade-fe, platform-fe).
 * Verifies JWTs issued by auth.datap.ai. NO database access required — stateless.
 *
 * Usage (server component or middleware):
 *   import { getAuthUser } from "@/lib/auth-shared";
 *   const user = await getAuthUser();
 *   if (!user) redirect("https://auth.datap.ai/login?return=...");
 *
 * Env vars required:
 *   JWT_SECRET - same secret as auth-be (shared across all domains)
 */

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

export interface AuthUser {
  id: number;
  uuid: string;
  email: string;
  locale: string;
  expires_at: Date;
}

const COOKIE_NAME = "datapai_auth";
const JWT_ALG = "HS256";

/**
 * Verify JWT signature + expiration. Returns payload or null.
 * Pure verification — does NOT check session revocation.
 * For that, call auth.datap.ai/api/auth/verify.
 */
export function verifyJwtLocal(token: string, secret: string): AuthUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify HS256 signature
    const data = `${headerB64}.${payloadB64}`;
    const expectedSig = createHmac("sha256", secret)
      .update(data)
      .digest("base64")
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    const expectedBuf = Buffer.from(expectedSig);
    const actualBuf = Buffer.from(signatureB64);
    if (expectedBuf.length !== actualBuf.length) return null;
    if (!timingSafeEqual(expectedBuf, actualBuf)) return null;

    // Decode payload
    const payloadJson = Buffer.from(
      payloadB64.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf-8");
    const payload = JSON.parse(payloadJson) as {
      sub: string;
      uuid: string;
      email: string;
      locale: string;
      iat: number;
      exp: number;
      jti: string;
    };

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;

    return {
      id: parseInt(payload.sub, 10),
      uuid: payload.uuid,
      email: payload.email,
      locale: payload.locale || "en",
      expires_at: new Date(payload.exp * 1000),
    };
  } catch {
    return null;
  }
}

/**
 * Get current user from JWT cookie (server-side, for Server Components).
 * Returns null if not logged in or token invalid/expired.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET env var not set");
    return null;
  }

  return verifyJwtLocal(token, secret);
}

/**
 * Verify JWT via auth service (checks session revocation too).
 * Use this when you need guaranteed freshness (e.g. right after logout).
 */
export async function verifyWithAuthService(): Promise<AuthUser | null> {
  const authBase = process.env.NEXT_PUBLIC_AUTH_URL ?? "https://auth.datap.ai";
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const cookieHeader = allCookies.map(c => `${c.name}=${c.value}`).join("; ");

  try {
    const res = await fetch(`${authBase}/api/auth/verify`, {
      method: "GET",
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    });
    const data = await res.json();
    if (!data.ok || !data.user) return null;
    return {
      id: data.user.id,
      uuid: data.user.uuid,
      email: data.user.email,
      locale: data.user.locale || "en",
      expires_at: new Date(data.expires_at),
    };
  } catch {
    return null;
  }
}

/**
 * Build login redirect URL with return parameter.
 */
export function loginUrl(returnTo?: string): string {
  const authBase = process.env.NEXT_PUBLIC_AUTH_URL ?? "https://auth.datap.ai";
  if (returnTo) {
    return `${authBase}/login?return=${encodeURIComponent(returnTo)}`;
  }
  return `${authBase}/login`;
}

/**
 * Build register redirect URL with return parameter.
 */
export function registerUrl(returnTo?: string): string {
  const authBase = process.env.NEXT_PUBLIC_AUTH_URL ?? "https://auth.datap.ai";
  if (returnTo) {
    return `${authBase}/register?return=${encodeURIComponent(returnTo)}`;
  }
  return `${authBase}/register`;
}

/**
 * Client-side logout helper. Clears cookie via auth service API.
 */
export async function clientLogout(redirectTo = "https://auth.datap.ai"): Promise<void> {
  const authBase = process.env.NEXT_PUBLIC_AUTH_URL ?? "https://auth.datap.ai";
  try {
    await fetch(`${authBase}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {}
  window.location.href = redirectTo;
}
