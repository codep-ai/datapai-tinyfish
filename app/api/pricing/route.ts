/**
 * GET /api/pricing?lang=vi
 *
 * Returns regional pricing tiers from DB. Used by client components (payment page).
 * Falls back to 'en' (AUD) if no region-specific pricing exists.
 */

import { NextResponse } from "next/server";
import { getPricingTiers } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get("lang") ?? "en";

  const tiers = await getPricingTiers(lang);

  return NextResponse.json({ tiers }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
  });
}
