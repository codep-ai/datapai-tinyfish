/**
 * lib/agent.ts  (V3.1 — v1.5 Alignment)
 *
 * Client for the datapai-streamlit AG2 agent backend.
 * All calls fail gracefully — if the backend is unreachable the pipeline
 * continues with local scoring and the paid-LLM fallback.
 *
 * Env: AGENT_BACKEND_BASE_URL=http://localhost:8000
 *
 * v1.5 additions:
 *   - ChangeType: CONTENT_CHANGE | ARCHIVE_CHANGE | LAYOUT_CHANGE
 *   - AgentPipelineResult: full /agent/run-financial-signal-pipeline output
 *   - InvestigationResult: /agent/investigate-signal output
 *   - runFullPipeline(): replaces 3 separate calls with one pipeline call
 *   - investigateSignal(): calls /agent/investigate-signal
 *   - classifyChangeType(): calls /agent/classify-change-type
 */

const AGENT_BASE = (process.env.AGENT_BACKEND_BASE_URL ?? "").replace(/\/$/, "");
const TIMEOUT_MS = 60_000; // full pipeline = 5 LLM calls, needs ~30-60s

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

/** v1.5 — Signal Quality Filter change classification */
export type ChangeType =
  | "CONTENT_CHANGE"
  | "ARCHIVE_CHANGE"
  | "LAYOUT_CHANGE";

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

/** v1.5 — Investigation Agent result */
export interface InvestigationResult {
  investigation_results: Array<{
    url: string;
    snippet: string;
    source: string;
    keywords: string[];
    corroborates: boolean;
  }>;
  sources_checked: string[];
  investigation_summary: string;
  corroborating_count: number;
  contradicting_count: number;
  found_evidence: boolean;
}

/** v1.5 — Full pipeline result from /agent/run-financial-signal-pipeline */
export interface AgentPipelineResult {
  // Signal
  signal_type: AgentSignalType | "NO_SIGNAL" | null;
  severity: AgentSeverity | "NONE" | null;
  confidence: number | null;
  financial_relevance: string | null;
  financial_relevance_score: number | null;
  evidence_quotes: string[];
  quality_flags: string[];
  // v1.5: Change type
  change_type: ChangeType | null;
  change_quality_score: number | null;
  // Validation
  validation_status: ValidationStatus | null;
  validation_summary: string;
  validation_evidence: string[];
  // v1.5: Investigation
  investigation_summary: string;
  investigation_sources: string[];
  corroborating_count: number;
  // Narrative
  what_changed: string;
  why_it_matters: string;
  summary: string;
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

/**
 * v1.5 — Run the full financial signal pipeline in one call.
 * Replaces the previous 3-step detect→validate→summarise pattern.
 * Returns null on any error (backend down, timeout, etc.).
 */
export async function runFullPipeline(
  ticker: string,
  companyName: string,
  sourceUrl: string,
  oldText: string,
  newText: string,
  changedSnippet: string
): Promise<AgentPipelineResult | null> {
  try {
    const data = (await agentPost("/agent/run-financial-signal-pipeline", {
      ticker,
      company_name: companyName,
      source_url: sourceUrl,
      old_text: oldText.slice(0, 8_000),
      new_text: newText.slice(0, 8_000),
      changed_snippet: changedSnippet,
    })) as Record<string, unknown>;
    return {
      signal_type: (data.signal_type as AgentPipelineResult["signal_type"]) ?? null,
      severity: (data.severity as AgentPipelineResult["severity"]) ?? null,
      confidence: typeof data.confidence === "number" ? data.confidence : null,
      financial_relevance: (data.financial_relevance as string) ?? null,
      financial_relevance_score: typeof data.financial_relevance_score === "number" ? data.financial_relevance_score : null,
      evidence_quotes: Array.isArray(data.evidence_quotes) ? (data.evidence_quotes as string[]) : [],
      quality_flags: Array.isArray(data.quality_flags) ? (data.quality_flags as string[]) : [],
      change_type: (data.change_type as ChangeType) ?? null,
      change_quality_score: typeof data.change_quality_score === "number" ? data.change_quality_score : null,
      validation_status: (data.validation_status as ValidationStatus) ?? null,
      validation_summary: (data.validation_summary as string) ?? "",
      validation_evidence: Array.isArray(data.validation_evidence) ? (data.validation_evidence as string[]) : [],
      investigation_summary: (data.investigation_summary as string) ?? "",
      investigation_sources: Array.isArray(data.investigation_sources) ? (data.investigation_sources as string[]) : [],
      corroborating_count: typeof data.corroborating_count === "number" ? data.corroborating_count : 0,
      what_changed: (data.what_changed as string) ?? "",
      why_it_matters: (data.why_it_matters as string) ?? "",
      summary: (data.summary as string) ?? "",
    };
  } catch (err) {
    console.warn("[agent] runFullPipeline failed:", String(err).slice(0, 120));
    return null;
  }
}

/**
 * v1.5 — Investigate a signal against public sources.
 * Returns null on any error.
 */
export async function investigateSignal(
  ticker: string,
  companyName: string,
  signalType: string,
  sourceUrl: string,
  changedSnippet: string
): Promise<InvestigationResult | null> {
  try {
    const data = (await agentPost("/agent/investigate-signal", {
      ticker,
      company_name: companyName,
      signal_type: signalType,
      source_url: sourceUrl,
      changed_snippet: changedSnippet,
    })) as Record<string, unknown>;
    return {
      investigation_results: Array.isArray(data.investigation_results)
        ? (data.investigation_results as InvestigationResult["investigation_results"])
        : [],
      sources_checked: Array.isArray(data.sources_checked) ? (data.sources_checked as string[]) : [],
      investigation_summary: (data.investigation_summary as string) ?? "",
      corroborating_count: typeof data.corroborating_count === "number" ? data.corroborating_count : 0,
      contradicting_count: typeof data.contradicting_count === "number" ? data.contradicting_count : 0,
      found_evidence: Boolean(data.found_evidence),
    };
  } catch (err) {
    console.warn("[agent] investigateSignal failed:", String(err).slice(0, 120));
    return null;
  }
}

/**
 * v1.5 — Classify whether the text change is content/archive/layout noise.
 * Returns null on any error.
 */
export async function classifyChangeType(
  oldText: string,
  newText: string,
  changedSnippet: string
): Promise<{ change_type: ChangeType; quality_score: number; quality_flags: string[]; confidence_multiplier: number } | null> {
  try {
    const data = (await agentPost("/agent/classify-change-type", {
      old_text: oldText.slice(0, 8_000),
      new_text: newText.slice(0, 8_000),
      changed_snippet: changedSnippet,
    })) as Record<string, unknown>;
    return {
      change_type: (data.change_type as ChangeType) ?? "CONTENT_CHANGE",
      quality_score: typeof data.quality_score === "number" ? data.quality_score : 1.0,
      quality_flags: Array.isArray(data.quality_flags) ? (data.quality_flags as string[]) : [],
      confidence_multiplier: typeof data.confidence_multiplier === "number" ? data.confidence_multiplier : 1.0,
    };
  } catch (err) {
    console.warn("[agent] classifyChangeType failed:", String(err).slice(0, 120));
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

/** v1.5 — Human-readable label for change type. */
export function changeTypeLabel(changeType: string | null): string {
  const labels: Record<string, string> = {
    CONTENT_CHANGE: "Content Change",
    ARCHIVE_CHANGE: "Archive Change",
    LAYOUT_CHANGE: "Layout Change",
  };
  return changeType ? (labels[changeType] ?? changeType.replace(/_/g, " ")) : "Unknown";
}
