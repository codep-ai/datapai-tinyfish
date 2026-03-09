import { NextResponse } from "next/server";
import path from "path";
import { checkAgentHealth } from "@/lib/agent";

export const dynamic = "force-dynamic";

export async function GET() {
  const agentBackendUrl = process.env.AGENT_BACKEND_BASE_URL ?? null;
  const agentBackendReachable = agentBackendUrl ? await checkAgentHealth() : false;

  return NextResponse.json({
    hasTinyfishKey: !!process.env.TINYFISH_API_KEY,
    hasPaidLLMKey: !!process.env.PAID_LLM_API_KEY,
    dbPath: process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "radar_v2.db"),
    version: "v3",
    paidLlmProvider: process.env.PAID_LLM_PROVIDER ?? "openai",
    privateLlmEnabled: process.env.PRIVATE_LLM_ENABLED === "true",
    agentBackendUrl,
    agentBackendReachable,
  });
}
