/**
 * POST /api/auth/forgot-password
 *
 * Accepts an email address, looks up the user, generates a one-time reset
 * token (SHA-256 hashed before storage), and emails a reset link.
 *
 * Always returns 200 OK regardless of whether the email exists — this
 * prevents email enumeration attacks.
 *
 * Email sending: set RESEND_API_KEY env var to enable Resend.
 * Without it, the link is logged to console (dev mode).
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, createPasswordResetToken } from "@/lib/db";

export const dynamic = "force-dynamic";

const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? "https://stock.datap.ai";
const FROM_EMAIL = process.env.EMAIL_FROM ?? "noreply@datap.ai";

async function sendResetEmail(toEmail: string, resetUrl: string): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;

  if (!resendKey) {
    // Dev fallback — log to console
    console.log(`[forgot-password] Reset link for ${toEmail}: ${resetUrl}`);
    return;
  }

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#252525">Reset your DataP.ai password</h2>
      <p>We received a request to reset your password. Click the button below to set a new password.
         This link expires in <strong>1 hour</strong>.</p>
      <p style="margin:28px 0">
        <a href="${resetUrl}"
           style="background:#2e8b57;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
          Reset password
        </a>
      </p>
      <p style="color:#888;font-size:13px">
        If you didn&rsquo;t request this, you can safely ignore this email.
        Your password won&rsquo;t change.
      </p>
      <p style="color:#bbb;font-size:12px">
        Or copy this link: ${resetUrl}
      </p>
    </div>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `DataP.ai <${FROM_EMAIL}>`,
      to:   [toEmail],
      subject: "Reset your DataP.ai password",
      html,
    }),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { email?: string };
  const email = (body.email ?? "").trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  // Look up user — but always return 200 to prevent email enumeration
  const user = await getUserByEmail(email);

  if (user) {
    // Generate a 256-bit raw token, hash it for storage
    const rawToken  = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    await createPasswordResetToken(user.id, tokenHash);

    const resetUrl = `${APP_URL}/reset-password?token=${rawToken}`;
    await sendResetEmail(email, resetUrl);
  }

  // Always respond the same way
  return NextResponse.json({ ok: true });
}
