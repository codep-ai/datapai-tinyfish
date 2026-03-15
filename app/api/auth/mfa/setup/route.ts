/**
 * POST /api/auth/mfa/setup
 *
 * Generates a TOTP secret for the authenticated user and returns:
 *   - otpauth:// URI  (for QR code display)
 *   - base32 secret   (manual entry fallback)
 *
 * The secret is stored in DB with enabled=false until the user verifies
 * a valid code via POST /api/auth/mfa/verify.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { TOTP, generateSecret, NobleCryptoPlugin, ScureBase32Plugin } from "otplib";
import { q, execMfa } from "@/lib/db-mfa";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  void req;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check if already enabled
  const existing = await q(
    `SELECT enabled FROM datapai.mfa_secrets WHERE user_id=$1`, [user.userId]
  );
  if (existing.length > 0 && existing[0].enabled) {
    return NextResponse.json({ error: "MFA is already enabled" }, { status: 409 });
  }

  // Generate new secret
  const secret = generateSecret();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totp = new (TOTP as any)({
    plugins: { crypto: new NobleCryptoPlugin(), base32: new ScureBase32Plugin() },
    secret,
  });
  const otpauthUrl = totp.toURI(user.email, "DataP.ai");

  // Upsert into DB (not yet enabled)
  await execMfa(
    `INSERT INTO datapai.mfa_secrets (user_id, secret, enabled)
     VALUES ($1, $2, FALSE)
     ON CONFLICT (user_id) DO UPDATE SET secret=$2, enabled=FALSE, enabled_at=NULL`,
    [user.userId, secret]
  );

  return NextResponse.json({ secret, otpauthUrl });
}
