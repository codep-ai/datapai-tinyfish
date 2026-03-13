/**
 * DELETE /api/watchlist/[symbol]  — remove a ticker from the authenticated user's watchlist
 */

import { NextResponse } from "next/server";
import { removeFromWatchlist } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { symbol } = await params;
  await removeFromWatchlist(user.userId, symbol.toUpperCase());
  return NextResponse.json({ success: true });
}
