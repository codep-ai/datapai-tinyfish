"use client";

import { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// Re-use same password rules as register page
interface PasswordRule { label: string; test: (p: string) => boolean }
const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 12 characters",         test: (p) => p.length >= 12 },
  { label: "Uppercase letter (A–Z)",          test: (p) => /[A-Z]/.test(p) },
  { label: "Lowercase letter (a–z)",          test: (p) => /[a-z]/.test(p) },
  { label: "Number (0–9)",                    test: (p) => /[0-9]/.test(p) },
  { label: "Special character (!@#$%^&*…)",  test: (p) => /[^A-Za-z0-9]/.test(p) },
];
const STRENGTH_COLORS = ["#e74c3c", "#fd8412", "#f1c40f", "#2e8b57"];
const STRENGTH_LABELS = ["Too weak", "Weak", "Fair", "Strong"];
function strengthScore(p: string) {
  return Math.min(3, Math.max(0, PASSWORD_RULES.filter((r) => r.test(p)).length - 1)) as 0|1|2|3;
}

function ResetForm() {
  const params = useSearchParams();
  const token  = params.get("token") ?? "";
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [done,     setDone]     = useState(false);

  const passwordValid = useMemo(() => PASSWORD_RULES.every((r) => r.test(password)), [password]);
  const score = strengthScore(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!passwordValid) { setError("Please meet all password requirements"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (!token) { setError("Invalid reset link"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Reset failed — the link may have expired");
      } else {
        setDone(true);
        setTimeout(() => router.push("/login"), 3000);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center space-y-3">
        <p className="text-red-600 font-medium">Invalid or missing reset token.</p>
        <Link href="/forgot-password" className="text-sm font-semibold" style={{ color: "#6366f1" }}>
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center space-y-3">
        <div className="text-5xl">✅</div>
        <p className="font-semibold text-gray-800">Password updated!</p>
        <p className="text-sm text-gray-500">Redirecting to sign in…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm font-medium">
          {error}
        </div>
      )}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700" htmlFor="password">New password</label>
        <input
          id="password" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          required autoComplete="new-password" placeholder="••••••••••••"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
        />
        {password.length > 0 && (
          <div className="space-y-1 mt-1">
            <div className="flex gap-1">
              {[0,1,2,3].map((i) => (
                <div key={i} className="h-1.5 flex-1 rounded-full transition-colors"
                  style={{ background: i <= score ? STRENGTH_COLORS[score] : "#e5e7eb" }} />
              ))}
            </div>
            <p className="text-xs font-medium" style={{ color: STRENGTH_COLORS[score] }}>
              {STRENGTH_LABELS[score]}
            </p>
            {!passwordValid && (
              <ul className="space-y-1">
                {PASSWORD_RULES.map((r) => (
                  <li key={r.label} className={`text-xs flex items-center gap-1.5 ${r.test(password) ? "text-emerald-600" : "text-gray-400"}`}>
                    <span>{r.test(password) ? "✓" : "○"}</span>{r.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700" htmlFor="confirm">Confirm new password</label>
        <input
          id="confirm" type="password" value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required autoComplete="new-password" placeholder="••••••••••••"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
        />
        {confirm.length > 0 && (
          <p className={`text-xs font-medium ${confirm === password ? "text-emerald-600" : "text-red-500"}`}>
            {confirm === password ? "✓ Passwords match" : "✗ Passwords do not match"}
          </p>
        )}
      </div>
      <button
        type="submit" disabled={loading || !passwordValid}
        className="w-full py-3 rounded-xl font-bold text-white text-base transition-all hover:brightness-110 disabled:opacity-50"
        style={{ background: "#6366f1" }}
      >
        {loading ? "Updating…" : "Set new password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔐</div>
          <h1 className="text-3xl font-bold text-[#252525]">Set new password</h1>
          <p className="text-gray-500 mt-2">Choose a strong password for your account.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <Suspense fallback={<p className="text-center text-gray-400 text-sm">Loading…</p>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
