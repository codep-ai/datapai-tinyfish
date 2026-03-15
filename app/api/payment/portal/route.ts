/**
 * POST /api/payment/portal
 *
 * Creates a Stripe Customer Portal session so the user can:
 *   - Update their card
 *   - Cancel subscription
 *   - Download invoices
 *   - Change plan
 *
 * Enable the portal in Stripe dashboard → Customer Portal → Settings.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getUserById } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://stock.datap.ai";

export async function POST(req: NextRequest) {
  void req; // no body needed
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dbUser = await getUserById(user.userId);
  const customerId = dbUser?.stripe_customer_id as string | undefined;

  if (!customerId) {
    return NextResponse.json(
      { error: "No active subscription found" },
      { status: 404 }
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer:   customerId,
    return_url: `${APP_URL}/profile`,
  });

  return NextResponse.json({ url: session.url });
}
