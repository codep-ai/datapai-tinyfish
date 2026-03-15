/**
 * lib/broker-scanner.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * TinyFish-powered broker fee page scanner.
 *
 * Flow per broker:
 *   1. Fetch fee page via TinyFish (real-browser, JS-rendered)
 *   2. Hash the text — skip if unchanged since last scan
 *   3. Send to LLM (Gemini / OpenAI) to extract structured fee data
 *   4. Compare extracted data against static config in lib/brokers.ts
 *   5. Persist snapshot + discrepancy report to datapai.broker_snapshots
 *
 * Env vars (inherits from lib/llm.ts):
 *   PAID_LLM_PROVIDER   = "openai" | "gemini"
 *   PAID_LLM_API_KEY    = your key
 */

import crypto from "crypto";
import { fetchPageText } from "./tinyfish";
import { cleanText } from "./clean";
import type { Broker } from "./brokers";
import { getPool } from "./db";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BrokerExtracted {
  commissionStocks?: string;
  commissionETFs?: string;
  commissionOptions?: string | null;
  accountMin?: string;
  hasCrypto?: boolean;
  hasFractionalShares?: boolean;
  hasIRA?: boolean;
  hasSolo401k?: boolean;
  chessSponsored?: boolean;
  hasSMSF?: boolean;
  rawNotes?: string;
}

export interface BrokerDiscrepancy {
  field: string;
  inConfig: string;
  onWebsite: string;
}

export interface BrokerScanResult {
  brokerId: string;
  market: string;
  feePageUrl: string;
  scannedAt: string;
  unchanged: boolean;          // true = page hash matches last scan → skipped LLM
  extracted: BrokerExtracted | null;
  discrepancies: BrokerDiscrepancy[];
  error?: string;
}

// ── LLM extraction ────────────────────────────────────────────────────────────

const PROVIDER = process.env.PAID_LLM_PROVIDER ?? "openai";
const LLM_API_KEY = process.env.PAID_LLM_API_KEY ?? "";

async function extractFeesFromPage(
  pageText: string,
  broker: Broker
): Promise<BrokerExtracted | null> {
  if (!LLM_API_KEY) return null;

  const truncated = pageText.slice(0, 4000);

  const prompt = `You are a financial data extraction bot. Extract trading fees from the broker pricing page below.

Broker: ${broker.name} (${broker.market} market)
Fee page URL: ${broker.feePageUrl}

Page content (truncated):
${truncated}

Return ONLY a JSON object with these fields (omit fields you cannot find):
{
  "commissionStocks": "<human-readable string, e.g. '$0' or 'AUD $9.50 flat'>",
  "commissionETFs": "<string or same as stocks>",
  "commissionOptions": "<string or null if not offered>",
  "accountMin": "<string, e.g. '$0' or 'AUD $500'>",
  "hasCrypto": <true|false>,
  "hasFractionalShares": <true|false>,
  "hasIRA": <true|false|null — null if not applicable>,
  "hasSolo401k": <true|false|null>,
  "chessSponsored": <true|false|null>,
  "hasSMSF": <true|false|null>,
  "rawNotes": "<any important fee conditions or caveats, ≤80 chars>"
}

Rules:
- Return ONLY the JSON — no explanation, no markdown, no code fences
- If a field is ambiguous or not found, omit it entirely
- For boolean fields: only include if you are confident
- "commissionStocks" must be an exact quote or a close paraphrase from the page`;

  try {
    let raw: string;
    if (PROVIDER === "gemini") {
      raw = await callGemini(prompt);
    } else {
      raw = await callOpenAI(prompt);
    }
    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleaned) as BrokerExtracted;
  } catch (err) {
    console.error(`[broker-scanner] LLM extraction failed for ${broker.id}:`, err);
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
      max_tokens: 400,
      temperature: 0.0,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
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
      generationConfig: { maxOutputTokens: 400, temperature: 0.0 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.candidates[0].content.parts[0].text as string).trim();
}

// ── Discrepancy comparison ────────────────────────────────────────────────────

function compareWithConfig(
  extracted: BrokerExtracted,
  config: Broker
): BrokerDiscrepancy[] {
  const diffs: BrokerDiscrepancy[] = [];

  const checkStr = (field: keyof BrokerExtracted, configVal: string | null | undefined) => {
    const extVal = extracted[field] as string | undefined;
    if (!extVal || !configVal) return;
    // Normalise: remove spaces, lowercase
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
    if (norm(extVal) !== norm(configVal)) {
      diffs.push({ field, inConfig: configVal, onWebsite: extVal });
    }
  };

  const checkBool = (field: keyof BrokerExtracted, configVal: boolean | null | undefined) => {
    const extVal = extracted[field] as boolean | undefined;
    if (extVal === undefined || configVal === null || configVal === undefined) return;
    if (extVal !== configVal) {
      diffs.push({
        field,
        inConfig: String(configVal),
        onWebsite: String(extVal),
      });
    }
  };

  checkStr("commissionStocks", config.commissionStocks);
  checkStr("commissionETFs", config.commissionETFs);
  checkStr("accountMin", config.accountMin);
  checkBool("hasCrypto", config.hasCrypto);
  checkBool("hasFractionalShares", config.hasFractionalShares);
  checkBool("hasIRA", config.hasIRA);
  checkBool("hasSolo401k", config.hasSolo401k);
  checkBool("chessSponsored", config.chessSponsored);
  checkBool("hasSMSF", config.hasSMSF);

  return diffs;
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function getPreviousHash(brokerId: string): Promise<string | null> {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT page_hash FROM datapai.broker_snapshots
       WHERE broker_id = $1
       ORDER BY scanned_at DESC LIMIT 1`,
      [brokerId]
    );
    return rows[0]?.page_hash ?? null;
  } catch {
    return null;
  }
}

async function persistSnapshot(
  broker: Broker,
  pageHash: string,
  pageText: string,
  extracted: BrokerExtracted | null,
  discrepancies: BrokerDiscrepancy[],
  scannedAt: string
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO datapai.broker_snapshots
       (broker_id, market, fee_page_url, page_hash, page_text_snippet,
        extracted_fees, discrepancies, scanned_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (broker_id, scanned_at) DO NOTHING`,
    [
      broker.id,
      broker.market,
      broker.feePageUrl,
      pageHash,
      pageText.slice(0, 2000),
      JSON.stringify(extracted ?? {}),
      JSON.stringify(discrepancies),
      scannedAt,
    ]
  );
}

// ── Main scan function ────────────────────────────────────────────────────────

export async function scanBroker(broker: Broker): Promise<BrokerScanResult> {
  const scannedAt = new Date().toISOString();
  const base: BrokerScanResult = {
    brokerId: broker.id,
    market: broker.market,
    feePageUrl: broker.feePageUrl,
    scannedAt,
    unchanged: false,
    extracted: null,
    discrepancies: [],
  };

  try {
    // 1. Fetch via TinyFish
    const { text: rawText } = await fetchPageText(broker.feePageUrl);
    const pageText = cleanText(rawText);

    // 2. Hash — skip LLM if unchanged
    const pageHash = crypto
      .createHash("sha256")
      .update(pageText)
      .digest("hex")
      .slice(0, 16);

    const prevHash = await getPreviousHash(broker.id);
    if (prevHash === pageHash) {
      return { ...base, unchanged: true };
    }

    // 3. Extract fees via LLM
    const extracted = await extractFeesFromPage(pageText, broker);

    // 4. Compare vs static config
    const discrepancies = extracted ? compareWithConfig(extracted, broker) : [];

    // 5. Persist
    await persistSnapshot(broker, pageHash, pageText, extracted, discrepancies, scannedAt);

    if (discrepancies.length > 0) {
      console.warn(
        `[broker-scanner] ${broker.id}: ${discrepancies.length} discrepancy(ies) detected`,
        discrepancies
      );
    }

    return { ...base, extracted, discrepancies };
  } catch (err) {
    const msg = String(err).slice(0, 200);
    console.error(`[broker-scanner] ${broker.id} error:`, msg);
    return { ...base, error: msg };
  }
}
