/**
 * POST /api/payment/webhook
 *
 * Stripe webhook handler. Verifies the signature using STRIPE_WEBHOOK_SECRET,
 * then updates the user's plan/status in the database.
 *
 * Register this URL in Stripe dashboard → Webhooks:
 *   https://stock.datap.ai/api/payment/webhook
 *
 * Events handled:
 *   checkout.session.completed    — activate subscription + plan
 *   customer.subscription.updated — plan change / renewal
 *   customer.subscription.deleted — cancellation
 *   invoice.payment_failed        — mark past_due
 *   invoice.paid                  — send invoice email (Stripe does this automatically)
 */

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getUserByStripeCustomerId, updateUserPlan } from "@/lib/db";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

// Stripe requires the raw body for signature verification — do NOT parse as JSON first
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig     = req.headers.get("stripe-signature") ?? "";
  const secret  = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  async function handleUpdatePlan(
    customerId: string,
    plan: string,
    status: string,
    expiresAt: string | null
  ) {
    const user = await getUserByStripeCustomerId(customerId);
    if (!user) {
      console.warn(`[stripe-webhook] No user found for customer ${customerId}`);
      return;
    }
    await updateUserPlan(user.id, plan, status, expiresAt);
    console.log(`[stripe-webhook] Updated user ${user.id}: plan=${plan} status=${status}`);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription") {
        const plan   = session.metadata?.plan ?? "individual";
        const status = session.subscription ? "active" : "trialing";
        await handleUpdatePlan(session.customer as string, plan, status, null);
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub    = event.data.object as Stripe.Subscription;
      const plan   = sub.metadata?.plan ?? "individual";
      const status = sub.status === "trialing" ? "trialing"
                   : sub.status === "active"   ? "active"
                   : sub.status === "past_due"  ? "past_due"
                   : "canceled";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const expiresAt = new Date(((sub as any).current_period_end ?? 0) * 1000).toISOString();
      await handleUpdatePlan(sub.customer as string, plan, status, expiresAt);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await handleUpdatePlan(sub.customer as string, "watch", "canceled", null);
      break;
    }

    case "invoice.payment_failed": {
      const invoice    = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        const user = await getUserByStripeCustomerId(customerId);
        if (user) {
          await updateUserPlan(user.id, (user as unknown as Record<string, string>).plan ?? "individual", "past_due", null);
        }
      }
      break;
    }

    // invoice.paid — Stripe automatically sends PDF invoices to the customer's email
    // No additional action needed here.

    default:
      // Ignore other events
      break;
  }

  return NextResponse.json({ received: true });
}
