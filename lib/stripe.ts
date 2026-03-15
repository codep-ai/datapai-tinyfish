/**
 * lib/stripe.ts
 * Stripe singleton + plan configuration.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY      — sk_live_... or sk_test_...
 *   STRIPE_WEBHOOK_SECRET  — whsec_... from Stripe dashboard
 *   NEXT_PUBLIC_APP_URL    — https://stock.datap.ai
 *
 * Price IDs must be created in your Stripe dashboard and set here.
 * Use test price IDs (price_test_...) in development.
 */

import Stripe from "stripe";

// Lazy singleton — only throws at request time, not at build time.
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set — configure it in your environment");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-02-25.clover" });
  }
  return _stripe;
}

/** @deprecated use getStripe() — kept for backwards compatibility */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// ── Plan configuration ────────────────────────────────────────────────────────
// Set these price IDs from your Stripe dashboard.

export interface PlanConfig {
  id:          string;
  name:        string;
  monthly:     number;   // AUD display price
  annual:      number;
  stripePriceMonthly: string | null;  // Stripe price ID
  stripePriceAnnual:  string | null;
  trialDays:   number;
}

export const PLANS: Record<string, PlanConfig> = {
  individual: {
    id:                 "individual",
    name:               "Individual",
    monthly:            49,
    annual:             399,
    stripePriceMonthly: process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY ?? null,
    stripePriceAnnual:  process.env.STRIPE_PRICE_INDIVIDUAL_ANNUAL  ?? null,
    trialDays:          14,
  },
  professional: {
    id:                 "professional",
    name:               "Professional",
    monthly:            299,
    annual:             2499,
    stripePriceMonthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY ?? null,
    stripePriceAnnual:  process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL  ?? null,
    trialDays:          14,
  },
  business: {
    id:                 "business",
    name:               "Business",
    monthly:            999,
    annual:             8999,
    stripePriceMonthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY ?? null,
    stripePriceAnnual:  process.env.STRIPE_PRICE_BUSINESS_ANNUAL  ?? null,
    trialDays:          0,
  },
};
