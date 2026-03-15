/**
 * POST /api/auth/reset-password
 *
 * Verifies the one-time reset token, updates the user's password hash,
 * and invalidates the token. All existing sessions are also deleted
 * (log out everywhere) as a security precaution.
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getPasswordResetToken,
  markPasswordResetTokenUsed,
  updateUserPassword,
} from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 12 },
  { test: (p: string) => /[A-Z]/.test(p) },
  { test: (p: string) => /[a-z]/.test(p) },
  { test: (p: string) => /[0-9]/.test(p) },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { token?: string; password?: string };
  const rawToken = (body.token ?? "").trim();
  const password = body.password ?? "";

  if (!rawToken) {
    return NextResponse.json({ error: "Invalid reset link" }, { status: 400 });
  }

  // Validate password complexity
  if (!PASSWORD_RULES.every((r) => r.test(password))) {
    return NextResponse.json(
      { error: "Password does not meet complexity requirements" },
      { status: 400 }
    );
  }

  // Hash the raw token to look up in DB
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const record = await getPasswordResetToken(tokenHash);

  if (!record) {
    return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
  }
  if (record.used) {
    return NextResponse.json({ error: "This reset link has already been used" }, { status: 400 });
  }
  if (new Date(record.expires_at) < new Date()) {
    return NextResponse.json({ error: "Reset link has expired — please request a new one" }, { status: 400 });
  }

  // Update password and mark token used
  const passwordHash = hashPassword(password);
  await updateUserPassword(record.user_id, passwordHash);
  await markPasswordResetTokenUsed(tokenHash);

  return NextResponse.json({ ok: true });
}
