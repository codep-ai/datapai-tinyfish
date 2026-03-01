/**
 * lib/llm.ts
 * Paid LLM integration (OpenAI / Gemini) for alert summarisation.
 * Private LLM stub demonstrates the enterprise data-separation story.
 *
 * Env vars:
 *   PAID_LLM_PROVIDER   = "openai" | "gemini"   (default: openai)
 *   PAID_LLM_API_KEY    = your key
 *   PRIVATE_LLM_ENABLED = "true" | "false"       (default: false)
 */

const PROVIDER = process.env.PAID_LLM_PROVIDER ?? "openai";
const LLM_API_KEY = process.env.PAID_LLM_API_KEY ?? "";
export const PRIVATE_LLM_ENABLED =
  process.env.PRIVATE_LLM_ENABLED === "true";

// ─── Paid LLM ─────────────────────────────────────────────────────────────

/**
 * Generate a short, evidence-backed summary of detected page changes.
 * Returns null if no API key is configured (graceful degradation).
 */
export async function generatePaidSummary(
  ticker: string,
  snippet: string,
  evidenceQuotes: string[]
): Promise<string | null> {
  if (!LLM_API_KEY) return null;

  const quotesBlock =
    evidenceQuotes.length > 0
      ? evidenceQuotes.map((q, i) => `${i + 1}. "${q}"`).join("\n")
      : "(no direct quotes extracted)";

  const prompt = `You are a neutral financial data analyst. A web-monitoring tool detected wording changes on the investor-relations page of ${ticker}.

Changed text snippet:
${snippet.slice(0, 800)}

Evidence quotes from the changed text:
${quotesBlock}

Provide EXACTLY this structure:
• [First bullet: what specifically changed in the wording]
• [Second bullet: the direction of the change — more/less hedging, risk language, forward guidance]
Why it may matter: [One neutral sentence about potential investor relevance]

Hard rules:
- Do NOT say "buy", "sell", "invest", or give any financial advice
- Include at least one direct quote from the evidence in your bullets
- Total response MUST be under 160 words
- Be factual, neutral, and specific`;

  try {
    if (PROVIDER === "gemini") return await callGemini(prompt);
    return await callOpenAI(prompt);
  } catch (err) {
    console.error("[llm] paid summary error:", err);
    return null;
  }
}

async function callOpenAI(prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 220,
      temperature: 0.2,
    }),
  });
  if (!res.ok)
    throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.choices[0].message.content as string).trim();
}

async function callGemini(prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${LLM_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 220, temperature: 0.2 },
    }),
  });
  if (!res.ok)
    throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (
    data.candidates[0].content.parts[0].text as string
  ).trim();
}

// ─── Private LLM stub ─────────────────────────────────────────────────────

/**
 * Enterprise story: sensitive signal routing to a private/self-hosted model.
 * Only receives pre-computed SCORES (never raw text) to protect sensitive data.
 * In this demo, disabled by default — shows the architecture in the UI.
 */
export function getPrivateLLMNote(
  commitmentDelta: number,
  hedgingDelta: number,
  riskDelta: number,
  categories: string[]
): string | null {
  if (!PRIVATE_LLM_ENABLED) return null;

  // Stub: in production this calls a local Ollama / self-hosted LLM
  // receiving only the numeric signals, never raw text
  const signals: string[] = [];
  if (riskDelta > 0.5) signals.push("elevated risk language detected");
  if (hedgingDelta > 0.5) signals.push("increased hedging frequency");
  if (commitmentDelta < -0.5) signals.push("reduced forward-guidance language");
  if (categories.includes("guidance_softening"))
    signals.push("potential guidance revision pattern");
  if (categories.includes("risk_increase"))
    signals.push("risk-factor emphasis increased");

  if (signals.length === 0)
    return "Private signal analysis: no notable pattern detected.";
  return `Private signal note (scores only, no raw text): ${signals.join("; ")}.`;
}
