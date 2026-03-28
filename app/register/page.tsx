"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ── i18n helper ─────────────────────────────────────────────────────────────

function t(labels: Record<string, string>, key: string, fallback?: string): string {
  return labels[key] || fallback || key;
}

// ── Password strength ─────────────────────────────────────────────────────────

function makeRules(labels: Record<string, string>) {
  return [
    { key: "pwd_min_length",  label: t(labels, "pwd_min_length", "At least 8 characters"),        test: (p: string) => p.length >= 8 },
    { key: "pwd_uppercase",   label: t(labels, "pwd_uppercase", "Uppercase letter (A–Z)"),         test: (p: string) => /[A-Z]/.test(p) },
    { key: "pwd_lowercase",   label: t(labels, "pwd_lowercase", "Lowercase letter (a–z)"),         test: (p: string) => /[a-z]/.test(p) },
    { key: "pwd_number",      label: t(labels, "pwd_number", "Number (0–9)"),                      test: (p: string) => /[0-9]/.test(p) },
    { key: "pwd_special",     label: t(labels, "pwd_special", "Special character (!@#$%^&*…)"),    test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ];
}

function passwordStrength(p: string, rules: ReturnType<typeof makeRules>): 0 | 1 | 2 | 3 {
  const passed = rules.filter((r) => r.test(p)).length;
  if (passed <= 1) return 0;
  if (passed <= 2) return 1;
  if (passed <= 3) return 2;
  return 3;
}

const STRENGTH_COLORS = ["#e74c3c", "#fd8412", "#f1c40f", "#2e8b57"];

function StrengthMeter({ password, labels, rules }: { password: string; labels: Record<string, string>; rules: ReturnType<typeof makeRules> }) {
  const score = passwordStrength(password, rules);
  const allPassed = rules.every((r) => r.test(password));
  const strengthLabels = [
    t(labels, "pwd_strength_weak", "Too weak"),
    t(labels, "pwd_strength_weak", "Weak"),
    t(labels, "pwd_strength_fair", "Fair"),
    t(labels, "pwd_strength_strong", "Strong"),
  ];
  return (
    <div className="space-y-2 mt-1">
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
          {strengthLabels[score]}
        </p>
      )}
      {password.length > 0 && !allPassed && (
        <ul className="space-y-1">
          {rules.map((r) => {
            const ok = r.test(password);
            return (
              <li key={r.key} className={`text-xs flex items-center gap-1.5 ${ok ? "text-emerald-600" : "text-red-400"}`}>
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
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [labels, setLabels]     = useState<Record<string, string>>({});
  const router = useRouter();

  // Fetch i18n labels on mount
  useEffect(() => {
    fetch("/api/i18n")
      .then(r => r.json())
      .then(data => setLabels(data.labels || {}))
      .catch(() => {});
  }, []);

  const rules = useMemo(() => makeRules(labels), [labels]);

  const passwordValid = useMemo(
    () => rules.every((r) => r.test(password)),
    [password, rules]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!agreedTerms) {
      setError(t(labels, "reg_error_terms", "You must agree to the Terms of Service and Privacy Policy to create an account"));
      return;
    }
    if (!passwordValid) {
      setError(t(labels, "reg_error_pwd", "Please meet all password requirements"));
      return;
    }
    if (password !== confirm) {
      setError(t(labels, "reg_error_mismatch", "Passwords do not match"));
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
        setError(data.error ?? t(labels, "reg_error_failed", "Registration failed"));
      } else {
        router.push("/profile/onboarding");
        router.refresh();
      }
    } catch {
      setError(t(labels, "reg_error_network", "Network error — please try again"));
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
          <h1 className="text-3xl font-bold text-[#252525]">{t(labels, "reg_title", "Create account")}</h1>
          <p className="text-gray-500 mt-2">{t(labels, "reg_subtitle", "Set up your investor profile in 60 seconds")}</p>
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
              {t(labels, "reg_email", "Email address")}
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
              {t(labels, "reg_password", "Password")}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
            />
            <StrengthMeter password={password} labels={labels} rules={rules} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700" htmlFor="confirm">
              {t(labels, "reg_confirm", "Confirm password")}
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
            />
            {confirm.length > 0 && (
              <p className={`text-xs font-medium ${confirm === password ? "text-emerald-600" : "text-red-500"}`}>
                {confirm === password
                  ? `✓ ${t(labels, "reg_pwd_match", "Passwords match")}`
                  : `✗ ${t(labels, "reg_pwd_mismatch", "Passwords do not match")}`}
              </p>
            )}
          </div>

          {/* Terms & conditions agreement */}
          <div className="flex items-start gap-3 py-2">
            <input
              id="terms"
              type="checkbox"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="terms" className="text-xs text-gray-500 leading-relaxed cursor-pointer">
              {t(labels, "reg_agree_prefix", "I have read and agree to the")}{" "}
              <a href="/terms" target="_blank" className="text-indigo-600 hover:underline font-medium">{t(labels, "reg_terms_link", "Terms of Service")}</a>
              {" "}{t(labels, "reg_agree_and", "and")}{" "}
              <a href="/privacy" target="_blank" className="text-indigo-600 hover:underline font-medium">{t(labels, "reg_privacy_link", "Privacy Policy")}</a>.
              {" "}{t(labels, "reg_disclaimer", "I understand that DataP.ai provides AI-generated market intelligence for informational and educational purposes only, and does not constitute financial advice.")}
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !passwordValid || !agreedTerms}
            className="w-full py-3 rounded-xl font-bold text-white text-base transition-all hover:brightness-110 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "#6366f1" }}
          >
            {loading ? t(labels, "reg_creating", "Creating account…") : t(labels, "reg_submit", "Create account")}
          </button>

          <div className="text-center pt-2 text-sm text-gray-500">
            {t(labels, "reg_have_account", "Already have an account?")}{" "}
            <Link href="/login" className="font-semibold" style={{ color: "#2e8b57" }}>
              {t(labels, "reg_login_link", "Sign in")}
            </Link>
          </div>
          <div className="text-center text-sm text-gray-500">
            <Link href="/forgot-password" className="hover:underline" style={{ color: "#6366f1" }}>
              {t(labels, "reg_forgot_pwd", "Forgot your password?")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
