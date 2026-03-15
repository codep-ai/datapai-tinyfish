/**
 * POST /api/payment/checkout
 *
 * Creates a Stripe Checkout session for a plan subscription.
 * The user must be logged in. We create/reuse a Stripe customer
 * tied to their DataP.ai user ID, then redirect to Stripe's hosted
 * checkout page — we never touch raw card numbers.
 *
 * Body: { planId: "individual" | "professional" | "business", billing: "monthly" | "annual" }
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getUserById, updateUserStripeCustomer } from "@/lib/db";
import { stripe, PLANS } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://stock.datap.ai";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    planId?: string;
    billing?: string;
  };

  const planId  = body.planId ?? "";
  const billing = body.billing === "annual" ? "annual" : "monthly";
  const plan    = PLANS[planId];

  if (!plan) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const priceId = billing === "annual" ? plan.stripePriceAnnual : plan.stripePriceMonthly;
  if (!priceId) {
    return NextResponse.json(
      { error: "Stripe price not configured for this plan — contact support" },
      { status: 503 }
    );
  }

  // Get or create Stripe customer
  const dbUser = await getUserById(user.userId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let customerId = (dbUser as any)?.stripe_customer_id as string | undefined;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email:    user.email,
      metadata: { datapai_user_id: user.userId },
    });
    customerId = customer.id;
    await updateUserStripeCustomer(user.userId, customerId);
  }

  const session = await stripe.checkout.sessions.create({
    customer:             customerId,
    mode:                 "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: plan.trialDays > 0 ? plan.trialDays : undefined,
      metadata: { datapai_user_id: user.userId, plan: planId },
    },
    success_url: `${APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${APP_URL}/pricing`,
    metadata: { datapai_user_id: user.userId, plan: planId },
  });

  return NextResponse.json({ url: session.url });
}
