"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PLANS = [
  {
    id: "individual",
    name: "Individual",
    monthly: 49,
    annual: 399,
    tagline: "For the self-directed investor",
    highlight: true,
  },
  {
    id: "professional",
    name: "Professional",
    monthly: 299,
    annual: 2499,
    tagline: "For active traders & advisors",
    highlight: false,
  },
  {
    id: "business",
    name: "Business",
    monthly: 999,
    annual: 8999,
    tagline: "For funds & research teams",
    highlight: false,
  },
];

export default function PaymentPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError]     = useState("");
  const router = useRouter();

  async function handleCheckout(planId: string) {
    setError("");
    setLoading(planId);
    try {
      const res = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billing }),
      });
      if (res.status === 401) {
        router.push("/login?redirect=/payment");
        return;
      }
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start checkout");
      } else {
        window.location.href = data.url;
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(null);
    }
  }

  async function handlePortal() {
    setError("");
    setLoading("portal");
    try {
      const res  = await fetch("/api/payment/portal", { method: "POST" });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not open billing portal");
      } else {
        window.location.href = data.url;
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#fcfcfd]">
      {/* Hero */}
      <div
        className="w-full text-white px-6 py-12"
        style={{ background: "linear-gradient(45deg, seagreen, darkseagreen)" }}
      >
        <div className="max-w-4xl mx-auto space-y-3">
          <p className="text-white/60 text-sm">
            <Link href="/pricing" className="hover:text-white">Pricing</Link> › Upgrade
          </p>
          <h1 className="text-3xl font-bold">Choose your plan</h1>
          <p className="text-white/80">Secure checkout powered by Stripe. Cancel any time.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Billing toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              billing === "monthly" ? "text-white shadow-sm" : "text-gray-500 bg-gray-100"
            }`}
            style={billing === "monthly" ? { background: "#2e8b57" } : {}}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              billing === "annual" ? "text-white shadow-sm" : "text-gray-500 bg-gray-100"
            }`}
            style={billing === "annual" ? { background: "#2e8b57" } : {}}
          >
            Annual <span className="text-xs ml-1 opacity-80">save ~30%</span>
          </button>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const price = billing === "annual" ? plan.annual : plan.monthly;
            const perMonth = billing === "annual"
              ? `~$${Math.round(plan.annual / 12)}/mo`
              : null;
            return (
              <div
                key={plan.id}
                className="bg-white rounded-2xl shadow-sm flex flex-col"
                style={{ border: plan.highlight ? "2px solid #2e8b57" : "1px solid #e5e7eb" }}
              >
                <div className="p-6 flex-1 space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#252525]">{plan.name}</h2>
                    <p className="text-sm text-gray-400 mt-0.5">{plan.tagline}</p>
                  </div>
                  <div>
                    <span className="text-4xl font-bold text-[#252525]">
                      ${price}
                    </span>
                    <span className="text-gray-400 text-sm ml-1">
                      {billing === "annual" ? "/yr" : "/mo"}
                    </span>
                    {perMonth && (
                      <p className="text-xs text-gray-400 mt-0.5">{perMonth} billed annually</p>
                    )}
                  </div>
                </div>
                <div className="p-6 pt-0">
                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={loading === plan.id}
                    className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:brightness-110 disabled:opacity-60"
                    style={{ background: plan.highlight ? "#2e8b57" : "#1a1a2e" }}
                  >
                    {loading === plan.id
                      ? "Redirecting to Stripe…"
                      : plan.id === "individual" || plan.id === "professional"
                        ? "Start 14-day free trial"
                        : "Subscribe now"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Security badges */}
        <div className="flex flex-wrap gap-4 items-center text-xs text-gray-400">
          <span>🔒 256-bit TLS encryption</span>
          <span>💳 PCI DSS compliant via Stripe</span>
          <span>🚫 We never store your card details</span>
          <span>📄 Automatic invoices by email</span>
        </div>

        {/* Existing subscriber */}
        <div className="border-t border-gray-100 pt-6 text-sm text-gray-500">
          Already subscribed?{" "}
          <button
            onClick={handlePortal}
            disabled={loading === "portal"}
            className="font-semibold hover:underline"
            style={{ color: "#2e8b57" }}
          >
            {loading === "portal" ? "Opening…" : "Manage your subscription →"}
          </button>
        </div>
      </div>
    </div>
  );
}
