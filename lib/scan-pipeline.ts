/**
 * lib/scan-pipeline.ts
 * Shared scan logic used by both:
 *   - /api/run          (full universe batch scan)
 *   - /api/ticker/[symbol]/scan  (single-ticker on-demand scan)
 */

import crypto from "crypto";
import { fetchPageText } from "./tinyfish";
import { cleanText } from "./clean";
import { checkQuality, passesQualityGate } from "./quality";
import { diffTexts } from "./diff";
import { computeScoreDeltas } from "./score";
import { generatePaidSummary, getPrivateLLMNote, PRIVATE_LLM_ENABLED } from "./llm";
import { runFullPipeline } from "./agent";
import {
  insertSnapshot,
  getPreviousSnapshot,
  insertDiff,
  insertAnalysis,
  insertScanEvent,
} from "./db";
import type { TickerInfo } from "./universe";

export const AGENT_ENABLED = !!process.env.AGENT_BACKEND_BASE_URL;

// ─── Signal type classification ──────────────────────────────────────────────

export function classifySignal(
  addedLineTexts: string[],
  changedPct: number,
  riskDelta: number
): "CONTENT_CHANGE" | "ARCHIVE_CHANGE" | "LAYOUT_CHANGE" {
  const archiveKeywords = ["date:", "headline:", "press_release:", "posted:", "published:"];
  const archiveMatches = addedLineTexts.filter((line) => {
    const lower = line.toLowerCase();
    return archiveKeywords.some((kw) => lower.includes(kw));
  });
  if (
    archiveMatches.length >= 2 ||
    archiveMatches.length / Math.max(addedLineTexts.length, 1) > 0.4
  ) {
    return "ARCHIVE_CHANGE";
  }
  if (changedPct > 80 && riskDelta === 0) {
    return "LAYOUT_CHANGE";
  }
  return "CONTENT_CHANGE";
}

// ─── Step logger ─────────────────────────────────────────────────────────────

export async function logStep(
  runId: string,
  ticker: string,
  step: string,
  status: "start" | "done" | "error",
  message?: string
): Promise<void> {
  try {
    await insertScanEvent({
      id: crypto.randomUUID(),
      run_id: runId,
      ticker,
      step,
      status,
      message: message ?? null,
      created_at: new Date().toISOString(),
    });
  } catch { /* best-effort */ }
}

// ─── URL resolver for on-demand scans ────────────────────────────────────────

/** Returns a sensible URL to fetch for a ticker we may not have in UNIVERSE_ALL. */
export function resolveTickerUrl(symbol: string, exchange: string): string {
  if (exchange === "ASX") {
    return `https://asx.api.markitdigital.com/asx-research/1.0/companies/${symbol}/announcements?count=20`;
  }
  if (exchange === "NASDAQ") {
    return `https://www.nasdaq.com/market-activity/stocks/${symbol.toLowerCase()}/news-headlines`;
  }
  // NYSE, AMEX, fallback
  return `https://finance.yahoo.com/quote/${symbol}/`;
}

// ─── Core single-ticker scan ─────────────────────────────────────────────────

export interface ScanTickerResult {
  changed: boolean;
  alerted: boolean;
  failed: boolean;
  errorMessage?: string;
}

export async function scanTicker(
  t: TickerInfo,
  runId: string,
  options: { force?: boolean } = {}
): Promise<ScanTickerResult> {
  const forceAgents = options.force ?? false;
  try {
    // ── Step 1: Fetch ───────────────────────────────────────────────────────
    await logStep(runId, t.symbol, "Fetching page", "start");
    const { text, title, finalUrl, tinyfishRunRef, structured_source } = await fetchPageText(t.url);
    await logStep(runId, t.symbol, "Fetching page", "done");
    const now = new Date().toISOString();

    // ── Step 2: Extract / clean ─────────────────────────────────────────────
    await logStep(runId, t.symbol, "Extracting content", "start");
    const cleaned = cleanText(text);
    await logStep(runId, t.symbol, "Extracting content", "done");

    // ── Step 3: Quality check ───────────────────────────────────────────────
    await logStep(runId, t.symbol, "Cleaning text", "start");
    const quality = checkQuality(cleaned);
    const snapId = crypto.randomUUID();
    await logStep(runId, t.symbol, "Cleaning text", "done");

    await insertSnapshot({
      id: snapId,
      run_id: runId,
      ticker: t.symbol,
      url: t.url,
      fetched_at: now,
      final_url: finalUrl ?? null,
      title: title ?? null,
      text,
      cleaned_text: cleaned,
      content_hash: crypto.createHash("sha256").update(cleaned).digest("hex"),
      word_count: quality.word_count,
      extractor: "tinyfish",
      quality_flags_json: JSON.stringify(quality.flags),
    });

    const prev = await getPreviousSnapshot(t.symbol, snapId);
    if (!prev) {
      // First snapshot — no diff possible yet, but scan was successful
      await logStep(runId, t.symbol, "Processing", "done", "First snapshot saved — no prior baseline to diff");
      return { changed: false, alerted: false, failed: false };
    }

    // ── Step 4: Diff ────────────────────────────────────────────────────────
    await logStep(runId, t.symbol, "Computing diff", "start");
    const diff = diffTexts(prev.cleaned_text, cleaned);
    const diffId = crypto.randomUUID();
    await insertDiff({
      id: diffId,
      snapshot_new_id: snapId,
      snapshot_old_id: prev.id,
      similarity: diff.similarity,
      changed_pct: diff.changed_pct,
      added_lines: diff.added_lines,
      removed_lines: diff.removed_lines,
      snippet: diff.snippet,
    });
    await logStep(runId, t.symbol, "Computing diff", "done", `${diff.changed_pct.toFixed(1)}% changed`);

    if (!forceAgents && diff.changed_pct < 1 && diff.added_lines === 0) {
      await logStep(runId, t.symbol, "Processing", "done", "No meaningful change detected");
      return { changed: false, alerted: false, failed: false };
    }

    // ── Step 5: Local scoring ───────────────────────────────────────────────
    const scores = computeScoreDeltas(prev.cleaned_text, cleaned, diff.added_line_texts);
    const signalType = classifySignal(diff.added_line_texts, diff.changed_pct, scores.risk_delta);

    // ── Step 6: AG2 Full pipeline (optional, v1.5) ──────────────────────────
    let agentSignalType: string | null = null;
    let agentSeverity: string | null = null;
    let agentConfidence: number | null = null;
    let agentFinancialRelevance: string | null = null;
    let agentEvidenceJson: string | null = null;
    let validationStatus: string | null = null;
    let validationSummary: string | null = null;
    let validationEvidenceJson: string | null = null;
    let agentWhatChanged: string | null = null;
    let agentWhyMatters: string | null = null;
    let changeType: string = "CONTENT_CHANGE";
    let changeQualityScore: number | null = null;
    let financialRelevanceScore: number | null = null;
    let investigationSummary: string | null = null;
    let investigationSources: string | null = null;
    let corroboratingCount = 0;

    // Structured API sources (e.g. ASX JSON) are always clean — skip word-count gate
    const qualityOkForAgent = structured_source ? quality.confidence >= 0.2 : passesQualityGate(quality);

    if (AGENT_ENABLED && qualityOkForAgent) {
      await logStep(runId, t.symbol, "Running full pipeline", "start");
      const pipelineResult = await runFullPipeline(
        t.symbol,
        t.name,
        t.url,
        prev.cleaned_text,
        cleaned,
        diff.snippet
      );
      if (pipelineResult) {
        agentSignalType = pipelineResult.signal_type;
        agentSeverity = pipelineResult.severity;
        agentConfidence = pipelineResult.confidence;
        agentFinancialRelevance = pipelineResult.financial_relevance;
        agentEvidenceJson = JSON.stringify(pipelineResult.evidence_quotes);
        validationStatus = pipelineResult.validation_status;
        validationSummary = pipelineResult.validation_summary;
        validationEvidenceJson = JSON.stringify(pipelineResult.validation_evidence);
        agentWhatChanged = pipelineResult.what_changed;
        agentWhyMatters = pipelineResult.why_it_matters;
        changeType = pipelineResult.change_type ?? "CONTENT_CHANGE";
        changeQualityScore = pipelineResult.change_quality_score ?? null;
        financialRelevanceScore = pipelineResult.financial_relevance_score ?? null;
        investigationSummary = pipelineResult.investigation_summary || null;
        investigationSources = pipelineResult.investigation_sources?.length
          ? JSON.stringify(pipelineResult.investigation_sources)
          : null;
        corroboratingCount = pipelineResult.corroborating_count ?? 0;
        await logStep(runId, t.symbol, "Running full pipeline", "done", agentSignalType ?? "no signal");
      } else {
        await logStep(runId, t.symbol, "Running full pipeline", "error", "backend unavailable");
      }
    }

    // ── Step 7: Paid-LLM fallback ───────────────────────────────────────────
    await logStep(runId, t.symbol, "Running AI analysis", "start");
    let llmSummaryPaid: string | null = null;
    if ((structured_source || passesQualityGate(quality)) && scores.evidence_quotes.length > 0) {
      llmSummaryPaid = await generatePaidSummary(t.symbol, diff.snippet, scores.evidence_quotes);
    }
    const llmSummaryPrivate = PRIVATE_LLM_ENABLED
      ? getPrivateLLMNote(
          scores.commitment_delta,
          scores.hedging_delta,
          scores.risk_delta,
          scores.categories
        )
      : null;
    await logStep(runId, t.symbol, "Running AI analysis", "done");

    const analysisId = crypto.randomUUID();
    await insertAnalysis({
      id: analysisId,
      snapshot_new_id: snapId,
      diff_id: diffId,
      commitment_delta: scores.commitment_delta,
      hedging_delta: scores.hedging_delta,
      risk_delta: scores.risk_delta,
      alert_score: scores.alert_score,
      confidence: quality.confidence,
      categories_json: JSON.stringify(scores.categories),
      llm_summary_paid: llmSummaryPaid,
      llm_summary_private: llmSummaryPrivate,
      reasoning_evidence_json: JSON.stringify(scores.evidence_quotes),
      signal_type: signalType,
      agent_signal_type: agentSignalType,
      agent_severity: agentSeverity,
      agent_confidence: agentConfidence,
      agent_financial_relevance: agentFinancialRelevance,
      agent_evidence_json: agentEvidenceJson,
      validation_status: validationStatus,
      validation_summary: validationSummary,
      validation_evidence_json: validationEvidenceJson,
      agent_what_changed: agentWhatChanged,
      agent_why_matters: agentWhyMatters,
      change_type: changeType,
      change_quality_score: changeQualityScore,
      financial_relevance_score: financialRelevanceScore,
      investigation_summary: investigationSummary,
      investigation_sources: investigationSources,
      corroborating_count: corroboratingCount,
    });

    return { changed: true, alerted: true, failed: false };
  } catch (err) {
    const msg = String(err).slice(0, 120);
    await logStep(runId, t.symbol, "Processing", "error", msg);
    return { changed: false, alerted: false, failed: true, errorMessage: msg };
  }
}
