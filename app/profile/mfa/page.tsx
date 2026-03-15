"use client";

import { useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";

type Step = "idle" | "setup" | "verify" | "done";

export default function MfaPage() {
  const [step,       setStep]       = useState<Step>("idle");
  const [secret,     setSecret]     = useState("");
  const [qrDataUrl,  setQrDataUrl]  = useState("");
  const [code,       setCode]       = useState("");
  const [disableCode,setDisableCode]= useState("");
  const [error,      setError]      = useState("");
  const [loading,    setLoading]    = useState(false);

  async function startSetup() {
    setError("");
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/mfa/setup", { method: "POST" });
      const data = await res.json() as { secret?: string; otpauthUrl?: string; error?: string };
      if (!res.ok) { setError(data.error ?? "Setup failed"); return; }

      setSecret(data.secret!);
      const dataUrl = await QRCode.toDataURL(data.otpauthUrl!, { width: 220, margin: 2 });
      setQrDataUrl(dataUrl);
      setStep("setup");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setError("");
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, context: "setup" }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { setError(data.error ?? "Verification failed"); return; }
      setStep("done");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function disableMfa() {
    setError("");
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/mfa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disableCode }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setStep("idle");
      setDisableCode("");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-[#252525] mb-2">Two-factor authentication</h1>
      <p className="text-gray-500 text-sm mb-8">
        Protect your account with an authenticator app (Google Authenticator, Authy, 1Password, etc.).
        No SMS — works offline, no AWS needed.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm font-medium mb-6">
          {error}
        </div>
      )}

      {step === "idle" && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔐</span>
            <div>
              <p className="font-semibold text-gray-800">Authenticator app (TOTP)</p>
              <p className="text-xs text-gray-400">Most secure · Free · Works offline</p>
            </div>
          </div>
          <button
            onClick={startSetup}
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:brightness-110 disabled:opacity-60"
            style={{ background: "#2e8b57" }}
          >
            {loading ? "Generating…" : "Enable two-factor authentication"}
          </button>
        </div>
      )}

      {step === "setup" && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 space-y-6">
          <div>
            <p className="font-semibold text-gray-800 mb-1">Step 1 — Scan QR code</p>
            <p className="text-sm text-gray-500 mb-4">
              Open your authenticator app and scan this QR code.
            </p>
            {qrDataUrl && (
              <div className="flex justify-center">
                <Image src={qrDataUrl} alt="MFA QR code" width={220} height={220} className="rounded-xl border border-gray-100" />
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Can&apos;t scan? Enter this code manually:</p>
            <code className="text-xs font-mono bg-gray-100 rounded px-3 py-2 block break-all">{secret}</code>
          </div>
          <div>
            <p className="font-semibold text-gray-800 mb-2">Step 2 — Enter the 6-digit code</p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-center text-xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2"
            />
          </div>
          <button
            onClick={verifyCode}
            disabled={loading || code.length !== 6}
            className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
            style={{ background: "#2e8b57" }}
          >
            {loading ? "Verifying…" : "Verify and enable"}
          </button>
        </div>
      )}

      {step === "done" && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="text-5xl">✅</div>
            <p className="font-bold text-gray-800">Two-factor authentication enabled</p>
            <p className="text-sm text-gray-500">
              Your account is now protected. You&apos;ll need your authenticator app to sign in.
            </p>
          </div>
          <div className="border-t border-gray-100 pt-5">
            <p className="text-sm font-semibold text-gray-700 mb-2">Disable MFA</p>
            <p className="text-xs text-gray-400 mb-3">Enter a code from your authenticator app to confirm.</p>
            <div className="flex gap-2">
              <input
                type="text" inputMode="numeric" maxLength={6}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-center font-mono tracking-widest focus:outline-none focus:ring-2"
              />
              <button
                onClick={disableMfa}
                disabled={loading || disableCode.length !== 6}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-40"
              >
                {loading ? "…" : "Disable"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
