"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail]       = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        setSubmitted(true);
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
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔑</div>
          <h1 className="text-3xl font-bold text-[#252525]">Forgot password?</h1>
          <p className="text-gray-500 mt-2">
            Enter your email and we&apos;ll send a reset link.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">📬</div>
              <p className="text-gray-700 font-medium">Check your inbox</p>
              <p className="text-sm text-gray-500">
                If an account exists for <strong>{email}</strong>, you&apos;ll receive a
                reset link within a few minutes. Check your spam folder if it doesn&apos;t arrive.
              </p>
              <Link href="/login" className="block text-center text-sm font-semibold mt-4" style={{ color: "#2e8b57" }}>
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
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
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-white text-base transition-all hover:brightness-110 disabled:opacity-60"
                style={{ background: "#6366f1" }}
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
              <div className="text-center text-sm text-gray-500">
                <Link href="/login" className="font-semibold hover:underline" style={{ color: "#2e8b57" }}>
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
