/**
 * POST /api/auth/mfa/verify
 *
 * Verifies the 6-digit TOTP code entered by the user.
 *
 * If context=setup (first time enabling):
 *   Marks mfa_secrets.enabled=true.
 *
 * If context=login (verifying during sign-in):
 *   Verifies code only; session is already created by login route.
 *   (Login route should check mfa_enabled and redirect to MFA challenge.)
 *
 * Body: { code: "123456", context: "setup" | "login" }
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from "otplib";
import { q, execMfa } from "@/lib/db-mfa";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { code?: string; context?: string };
  const code    = (body.code ?? "").trim();
  const context = body.context === "login" ? "login" : "setup";

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter the 6-digit code from your authenticator app" }, { status: 400 });
  }

  const rows = await q(
    `SELECT secret, enabled FROM datapai.mfa_secrets WHERE user_id=$1`, [user.userId]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: "MFA not set up — please start setup first" }, { status: 404 });
  }

  const { secret, enabled } = rows[0] as { secret: string; enabled: boolean };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totp = new (TOTP as any)({
    plugins: { crypto: new NobleCryptoPlugin(), base32: new ScureBase32Plugin() },
    secret,
  });
  const valid = await totp.verify({ token: code });
  if (!valid) {
    return NextResponse.json({ error: "Invalid code — try again" }, { status: 400 });
  }

  if (context === "setup" && !enabled) {
    await execMfa(
      `UPDATE datapai.mfa_secrets SET enabled=TRUE, enabled_at=NOW() WHERE user_id=$1`,
      [user.userId]
    );
  }

  return NextResponse.json({ ok: true });
}
