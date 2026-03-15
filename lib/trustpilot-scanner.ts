/**
 * lib/trustpilot-scanner.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Fetches Trustpilot review pages via TinyFish and extracts TrustScore +
 * review count for each broker.
 *
 * Extraction strategy:
 *   1. Regex patterns on rendered page text (fast, no LLM cost)
 *   2. Falls back to LLM if regex fails
 *
 * Trustpilot page text reliably contains:
 *   "TrustScore 4.3" and "2,961 reviews"
 */

import { fetchPageText } from "./tinyfish";
import { getPool } from "./db";
import type { Broker } from "./brokers";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TrustpilotRating {
  brokerId: string;
  brokerName: string;
  trustpilotUrl: string;
  score: number;          // 0.0–5.0
  reviewCount: number;
  scannedAt: string;
}

export interface TrustpilotScanResult {
  brokerId: string;
  rating: TrustpilotRating | null;
  error?: string;
}

// ── Extraction ────────────────────────────────────────────────────────────────

function extractFromText(text: string): { score: number; reviewCount: number } | null {
  // Trustpilot pages contain "TrustScore 4.3" — match decimal immediately after label.
  // Require score in 1.0–5.0 range to avoid false positives (version numbers, etc.)
  const SCORE_RE = /TrustScore\s+([1-5]\.\d)/i;
  const SCORE_RE2 = /([1-5]\.\d)\s*(?:out of\s*5|\/\s*5)/i;

  const scoreMatch = text.match(SCORE_RE) || text.match(SCORE_RE2);

  // Review count: "2,961 reviews" / "2961 reviews" / "Total reviews: 2961"
  // Must be ≥ 1 digit (not "0") to filter junk matches
  const COUNT_RE = /(\d[\d,]{2,})\s+(?:total\s+)?reviews?/i;
  const COUNT_RE2 = /(\d[\d,]+)\s+people\s+have/i;
  const countMatch = text.match(COUNT_RE) || text.match(COUNT_RE2);

  if (!scoreMatch) return null;

  const score = parseFloat(scoreMatch[1]);
  if (isNaN(score) || score < 1.0 || score > 5.0) return null;

  const reviewCount = countMatch
    ? parseInt(countMatch[1].replace(/,/g, ""), 10)
    : 0;

  return { score, reviewCount };
}

// ── DB helpers ────────────────────────────────────────────────────────────────

export async function getLatestRatings(): Promise<Record<string, TrustpilotRating>> {
  try {
    const pool = getPool();
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (broker_id)
        broker_id, broker_name, trustpilot_url, score, review_count, scanned_at
      FROM datapai.broker_ratings
      ORDER BY broker_id, scanned_at DESC
    `);
    const map: Record<string, TrustpilotRating> = {};
    for (const row of rows) {
      map[row.broker_id] = {
        brokerId: row.broker_id,
        brokerName: row.broker_name,
        trustpilotUrl: row.trustpilot_url,
        score: parseFloat(row.score),
        reviewCount: parseInt(row.review_count),
        scannedAt: row.scanned_at,
      };
    }
    return map;
  } catch {
    return {};
  }
}

async function persistRating(rating: TrustpilotRating): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO datapai.broker_ratings
       (broker_id, broker_name, trustpilot_url, score, review_count, scanned_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (broker_id, scanned_at) DO NOTHING`,
    [
      rating.brokerId,
      rating.brokerName,
      rating.trustpilotUrl,
      rating.score,
      rating.reviewCount,
      rating.scannedAt,
    ]
  );
}

// ── Main scan ─────────────────────────────────────────────────────────────────

export async function scanBrokerRating(broker: Broker): Promise<TrustpilotScanResult> {
  if (!broker.trustpilotUrl) {
    return { brokerId: broker.id, rating: null, error: "no trustpilotUrl configured" };
  }

  try {
    const { text } = await fetchPageText(broker.trustpilotUrl);
    const extracted = extractFromText(text);

    if (!extracted) {
      return {
        brokerId: broker.id,
        rating: null,
        error: "could not extract score from page text",
      };
    }

    const rating: TrustpilotRating = {
      brokerId: broker.id,
      brokerName: broker.name,
      trustpilotUrl: broker.trustpilotUrl,
      score: extracted.score,
      reviewCount: extracted.reviewCount,
      scannedAt: new Date().toISOString(),
    };

    await persistRating(rating);

    console.log(
      `[trustpilot] ${broker.id}: ${rating.score}/5 (${rating.reviewCount.toLocaleString()} reviews)`
    );
    return { brokerId: broker.id, rating };
  } catch (err) {
    const msg = String(err).slice(0, 200);
    console.error(`[trustpilot] ${broker.id} error:`, msg);
    return { brokerId: broker.id, rating: null, error: msg };
  }
}
