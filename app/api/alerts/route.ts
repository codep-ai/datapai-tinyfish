import { NextResponse } from "next/server";
import { getLatestAlerts } from "@/lib/db";

export async function GET() {
  const alerts = getLatestAlerts(50);
  return NextResponse.json({ alerts });
}
