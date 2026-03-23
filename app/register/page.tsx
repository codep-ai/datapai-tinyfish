"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ── Password strength ─────────────────────────────────────────────────────────

interface PasswordRule { label: string; test: (p: string) => boolean }

const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 10 characters",          test: (p) => p.length >= 10 },
  { label: "Uppercase letter (A–Z)",           test: (p) => /[A-Z]/.test(p) },
  { label: "Lowercase letter (a–z)",           test: (p) => /[a-z]/.test(p) },
  { label: "Number (0–9)",                     test: (p) => /[0-9]/.test(p) },
  { label: "Special character (!@#$%^&*…)",   test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function passwordStrength(p: string): 0 | 1 | 2 | 3 {
  const passed = PASSWORD_RULES.filter((r) => r.test(p)).length;
  if (passed <= 1) return 0;
  if (passed <= 2) return 1;
  if (passed <= 3) return 2;
  return 3;
}

const STRENGTH_LABELS = ["Too weak", "Weak", "Fair", "Strong"];
const STRENGTH_COLORS = ["#e74c3c", "#fd8412", "#f1c40f", "#2e8b57"];

function StrengthMeter({ password }: { password: string }) {
  const score = passwordStrength(password);
  const allPassed = PASSWORD_RULES.every((r) => r.test(password));
  return (
    <div className="space-y-2 mt-1">
      {/* Bar */}
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors"
            style={{ background: i <= score && password.length > 0 ? STRENGTH_COLORS[score] : "#e5e7eb" }}
          />
        ))}
      </div>
      {password.length > 0 && (
        <p className="text-xs font-medium" style={{ color: STRENGTH_COLORS[score] }}>
          {STRENGTH_LABELS[score]}
        </p>
      )}
      {/* Rules checklist */}
      {password.length > 0 && !allPassed && (
        <ul className="space-y-1">
          {PASSWORD_RULES.map((r) => {
            const ok = r.test(password);
            return (
              <li key={r.label} className={`text-xs flex items-center gap-1.5 ${ok ? "text-emerald-600" : "text-red-400"}`}>
                <span>{ok ? "✓" : "✗"}</span>
                {r.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  const passwordValid = useMemo(
    () => PASSWORD_RULES.every((r) => r.test(password)),
    [password]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!passwordValid) {
      setError("Please meet all password requirements");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Registration failed");
      } else {
        router.push("/profile/onboarding");
        router.refresh();
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⭐</div>
          <h1 className="text-3xl font-bold text-[#252525]">Create account</h1>
          <p className="text-gray-500 mt-2">Set up your investor profile in 60 seconds</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="••••••••••"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
            />
            <StrengthMeter password={password} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700" htmlFor="confirm">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="••••••••••"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
            />
            {confirm.length > 0 && (
              <p className={`text-xs font-medium ${confirm === password ? "text-emerald-600" : "text-red-500"}`}>
                {confirm === password ? "✓ Passwords match" : "✗ Passwords do not match"}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !passwordValid}
            className="w-full py-3 rounded-xl font-bold text-white text-base transition-all hover:brightness-110 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "#6366f1" }}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>

          <div className="text-center pt-2 text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold" style={{ color: "#2e8b57" }}>
              Sign in
            </Link>
          </div>
          <div className="text-center text-sm text-gray-500">
            <Link href="/forgot-password" className="hover:underline" style={{ color: "#6366f1" }}>
              Forgot your password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
