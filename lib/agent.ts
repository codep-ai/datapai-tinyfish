/**
 * lib/agent.ts  (V3 — AI Agentic Pipeline)
 *
 * Client for the datapai-streamlit AG2 agent backend.
 * All calls fail gracefully — if the backend is unreachable the pipeline
 * continues with local scoring and the paid-LLM fallback.
 *
 * Env: AGENT_BACKEND_BASE_URL=http://localhost:8000
 */

const AGENT_BASE = (process.env.AGENT_BACKEND_BASE_URL ?? "").replace(/\/$/, "");
const TIMEOUT_MS = 10_000;

// ─── Response types ────────────────────────────────────────────────────────

export type AgentSignalType =
  | "GUIDANCE_WITHDRAWAL"
  | "RISK_DISCLOSURE_EXPANSION"
  | "TONE_SOFTENING";

export type AgentSeverity = "HIGH" | "MEDIUM" | "LOW";

export type ValidationStatus =
  | "CONFIRMED"
  | "PARTIALLY_CONFIRMED"
  | "NOT_CONFIRMED_YET"
  | "SOURCE_UNAVAILABLE";

export interface AgentSignalResult {
  signal_type: AgentSignalType | null;
  severity: AgentSeverity | null;
  confidence: number | null;
  financial_relevance: string | null;
  evidence_quotes: string[];
}

export interface AgentValidationResult {
  validation_status: ValidationStatus;
  validation_summary: string;
  validation_evidence: string[];
}

export interface AgentSummaryResult {
  what_changed: string;
  why_it_matters: string;
  evidence: string[];
}

// ─── Internal fetch helper ─────────────────────────────────────────────────

async function agentPost(path: string, body: object): Promise<unknown> {
  if (!AGENT_BASE) throw new Error("AGENT_BACKEND_BASE_URL not configured");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${AGENT_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Agent HTTP ${res.status} on ${path}`);
    const json = (await res.json()) as { ok: boolean; data: unknown; error: unknown };
    if (!json.ok) throw new Error(`Agent error: ${JSON.stringify(json.error)}`);
    return json.data;
  } finally {
    clearTimeout(timer);
  }
}

async function agentGet(path: string): Promise<unknown> {
  if (!AGENT_BASE) throw new Error("AGENT_BACKEND_BASE_URL not configured");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${AGENT_BASE}${path}`, {
      method: "GET",
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Agent HTTP ${res.status} on ${path}`);
    const json = (await res.json()) as { ok: boolean; data: unknown; error: unknown };
    if (!json.ok) throw new Error(`Agent error: ${JSON.stringify(json.error)}`);
    return json.data;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

/** Returns true if the agent backend is reachable and healthy. */
export async function checkAgentHealth(): Promise<boolean> {
  if (!AGENT_BASE) return false;
  try {
    await agentGet("/agent/health");
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect a financial signal from a text diff.
 * Returns null on any error (backend down, timeout, etc.).
 */
export async function detectFinancialSignal(
  ticker: string,
  companyName: string,
  sourceUrl: string,
  oldText: string,
  newText: string,
  changedSnippet: string
): Promise<AgentSignalResult | null> {
  try {
    const data = (await agentPost("/agent/detect-financial-signal", {
      ticker,
      company_name: companyName,
      source_url: sourceUrl,
      // Truncate to avoid very large payloads
      old_text: oldText.slice(0, 8_000),
      new_text: newText.slice(0, 8_000),
      changed_snippet: changedSnippet,
    })) as {
      signal_type?: string;
      severity?: string;
      confidence?: number;
      financial_relevance?: string;
      evidence_quotes?: string[];
    };
    return {
      signal_type: (data.signal_type as AgentSignalType) ?? null,
      severity: (data.severity as AgentSeverity) ?? null,
      confidence: typeof data.confidence === "number" ? data.confidence : null,
      financial_relevance: data.financial_relevance ?? null,
      evidence_quotes: Array.isArray(data.evidence_quotes) ? data.evidence_quotes : [],
    };
  } catch (err) {
    console.warn("[agent] detectFinancialSignal failed:", String(err).slice(0, 120));
    return null;
  }
}

/**
 * Cross-validate a detected signal against public filings and press releases.
 * Returns null on any error.
 */
export async function crossValidateSignal(
  ticker: string,
  companyName: string,
  signalType: string
): Promise<AgentValidationResult | null> {
  try {
    const data = (await agentPost("/agent/cross-validate-signal", {
      ticker,
      company_name: companyName,
      signal_type: signalType,
    })) as {
      validation_status?: string;
      validation_summary?: string;
      validation_evidence?: string[];
    };
    return {
      validation_status: (data.validation_status as ValidationStatus) ?? "SOURCE_UNAVAILABLE",
      validation_summary: data.validation_summary ?? "",
      validation_evidence: Array.isArray(data.validation_evidence) ? data.validation_evidence : [],
    };
  } catch (err) {
    console.warn("[agent] crossValidateSignal failed:", String(err).slice(0, 120));
    return null;
  }
}

/**
 * Generate an investor-friendly explanation of the detected signal.
 * Returns null on any error.
 */
export async function generateAgentSummary(
  ticker: string,
  diffSnippet: string,
  evidenceQuotes: string[],
  signalType: string,
  validationStatus: string
): Promise<AgentSummaryResult | null> {
  try {
    const data = (await agentPost("/agent/generate-signal-summary", {
      ticker,
      diff_snippet: diffSnippet,
      evidence_quotes: evidenceQuotes,
      signal_type: signalType,
      validation_status: validationStatus,
    })) as {
      what_changed?: string;
      why_it_matters?: string;
      evidence?: string[];
    };
    return {
      what_changed: data.what_changed ?? "",
      why_it_matters: data.why_it_matters ?? "",
      evidence: Array.isArray(data.evidence) ? data.evidence : [],
    };
  } catch (err) {
    console.warn("[agent] generateAgentSummary failed:", String(err).slice(0, 120));
    return null;
  }
}

/** Human-readable label for agent signal types. */
export function agentSignalLabel(signalType: string | null): string {
  const labels: Record<string, string> = {
    GUIDANCE_WITHDRAWAL: "Forward Guidance Withdrawal",
    RISK_DISCLOSURE_EXPANSION: "Risk Disclosure Expansion",
    TONE_SOFTENING: "Tone Softening",
  };
  return signalType ? (labels[signalType] ?? signalType.replace(/_/g, " ")) : "No signal";
}

/** Human-readable label for validation status. */
export function validationLabel(status: string | null): string {
  const labels: Record<string, string> = {
    CONFIRMED: "Confirmed",
    PARTIALLY_CONFIRMED: "Partially Confirmed",
    NOT_CONFIRMED_YET: "Not Confirmed Yet",
    SOURCE_UNAVAILABLE: "Source Unavailable",
  };
  return status ? (labels[status] ?? status.replace(/_/g, " ")) : "Unknown";
}
