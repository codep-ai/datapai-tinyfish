/**
 * POST /api/run  (V2)
 * Full V2 pipeline: clean → quality gate → diff → score → LLM summary.
 * Streams SSE progress events back to the client for the live scan UI.
 *
 * SSE event types emitted:
 *   {type:"start",  runId, total}
 *   {type:"ticker", ticker, status:"scanning"}
 *   {type:"ticker", ticker, status:"ok"|"changed"|"failed", changed?, score?, error?}
 *   {type:"complete", runId, succeeded, failed, changed, alerts}
 */

import crypto from "crypto";
import { UNIVERSE, type TickerInfo } from "@/lib/universe";
import { fetchPageText } from "@/lib/tinyfish";
import { cleanText } from "@/lib/clean";
import { checkQuality, passesQualityGate } from "@/lib/quality";
import { diffTexts } from "@/lib/diff";
import { computeScoreDeltas } from "@/lib/score";
import { generatePaidSummary, getPrivateLLMNote, PRIVATE_LLM_ENABLED } from "@/lib/llm";
import {
  insertRun,
  finishRun,
  insertSnapshot,
  getPreviousSnapshot,
  insertDiff,
  insertAnalysis,
} from "@/lib/db";

export const maxDuration = 300;

// ─── Ticker processor ─────────────────────────────────────────────────────

type TickerEvent =
  | { type: "ticker"; ticker: string; status: "scanning" }
  | {
      type: "ticker";
      ticker: string;
      status: "ok" | "changed" | "failed";
      changed?: boolean;
      score?: number;
      confidence?: number;
      error?: string;
    };

async function processTicker(
  t: TickerInfo,
  runId: string,
  emit: (e: TickerEvent) => void
): Promise<{ changed: boolean; alerted: boolean; failed: boolean }> {
  emit({ type: "ticker", ticker: t.symbol, status: "scanning" });

  try {
    const { text, title, finalUrl, tinyfishRunRef } = await fetchPageText(t.url);
    const now = new Date().toISOString();

    // Clean & quality-check
    const cleaned = cleanText(text);
    const quality = checkQuality(cleaned);
    const snapId = crypto.randomUUID();

    insertSnapshot({
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

    // Store tinyfish run ref in run record if first ticker
    if (tinyfishRunRef) {
      // best-effort — ignore failure
      try {
        const { getDb } = await import("@/lib/db");
        getDb()
          .prepare("UPDATE runs SET tinyfish_run_ref=? WHERE id=? AND tinyfish_run_ref IS NULL")
          .run(tinyfishRunRef, runId);
      } catch {}
    }

    const prev = getPreviousSnapshot(t.symbol, snapId);
    if (!prev) {
      emit({ type: "ticker", ticker: t.symbol, status: "ok", changed: false });
      return { changed: false, alerted: false, failed: false };
    }

    // Diff on cleaned text
    const diff = diffTexts(prev.cleaned_text, cleaned);
    const diffId = crypto.randomUUID();
    insertDiff({
      id: diffId,
      snapshot_new_id: snapId,
      snapshot_old_id: prev.id,
      similarity: diff.similarity,
      changed_pct: diff.changed_pct,
      added_lines: diff.added_lines,
      removed_lines: diff.removed_lines,
      snippet: diff.snippet,
    });

    // No meaningful change
    if (diff.changed_pct < 1 && diff.added_lines === 0) {
      emit({ type: "ticker", ticker: t.symbol, status: "ok", changed: false });
      return { changed: false, alerted: false, failed: false };
    }

    // Score on cleaned text + evidence quotes from added lines
    const scores = computeScoreDeltas(
      prev.cleaned_text,
      cleaned,
      diff.added_line_texts
    );

    // Quality gate: only call paid LLM if quality passes
    let llmSummaryPaid: string | null = null;
    if (passesQualityGate(quality) && scores.evidence_quotes.length > 0) {
      llmSummaryPaid = await generatePaidSummary(
        t.symbol,
        diff.snippet,
        scores.evidence_quotes
      );
    }

    const llmSummaryPrivate = PRIVATE_LLM_ENABLED
      ? getPrivateLLMNote(
          scores.commitment_delta,
          scores.hedging_delta,
          scores.risk_delta,
          scores.categories
        )
      : null;

    const analysisId = crypto.randomUUID();
    insertAnalysis({
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
    });

    emit({
      type: "ticker",
      ticker: t.symbol,
      status: "changed",
      changed: true,
      score: scores.alert_score,
      confidence: quality.confidence,
    });
    return { changed: true, alerted: true, failed: false };
  } catch (err) {
    emit({
      type: "ticker",
      ticker: t.symbol,
      status: "failed",
      error: String(err).slice(0, 120),
    });
    return { changed: false, alerted: false, failed: true };
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────

export async function POST() {
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  insertRun(runId, startedAt);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)
        );
      };

      send({ type: "start", runId, total: UNIVERSE.length });

      // Emit ticker events as they complete (concurrency 3 to respect TinyFish limits)
      const CONCURRENCY = 3;
      const queue = [...UNIVERSE];
      let scanned = 0, changed = 0, alerted = 0, failed = 0;

      async function worker() {
        while (queue.length > 0) {
          const ticker = queue.shift();
          if (!ticker) break;
          const result = await processTicker(ticker, runId, send);
          scanned++;
          if (result.changed) changed++;
          if (result.alerted) alerted++;
          if (result.failed) failed++;
        }
      }

      const workers = Array.from(
        { length: Math.min(CONCURRENCY, UNIVERSE.length) },
        worker
      );
      await Promise.all(workers);

      finishRun(runId, new Date().toISOString(), {
        scanned,
        changed,
        alerts: alerted,
        failed,
      });

      send({
        type: "complete",
        runId,
        succeeded: scanned - failed,
        failed,
        changed,
        alerts: alerted,
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable nginx buffering for SSE
    },
  });
}
