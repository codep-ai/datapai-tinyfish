import { NextResponse } from "next/server";
import { getRecentRuns } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const runs = getRecentRuns(20);
  return NextResponse.json({ runs });
}
