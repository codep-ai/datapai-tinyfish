/**
 * POST /api/auth/mfa/disable
 * Disables MFA for the authenticated user (requires valid TOTP code as confirmation).
 * Body: { code: "123456" }
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from "otplib";
import { q, execMfa } from "@/lib/db-mfa";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { code?: string };
  const code = (body.code ?? "").trim();

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter the 6-digit code to confirm" }, { status: 400 });
  }

  const rows = await q(
    `SELECT secret FROM datapai.mfa_secrets WHERE user_id=$1 AND enabled=TRUE`, [user.userId]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: "MFA is not enabled" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totp = new (TOTP as any)({
    plugins: { crypto: new NobleCryptoPlugin(), base32: new ScureBase32Plugin() },
    secret: rows[0].secret as string,
  });
  const valid = await totp.verify({ token: code });
  if (!valid) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  await execMfa(
    `UPDATE datapai.mfa_secrets SET enabled=FALSE, enabled_at=NULL WHERE user_id=$1`,
    [user.userId]
  );

  return NextResponse.json({ ok: true });
}
