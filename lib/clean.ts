/**
 * lib/clean.ts
 * Clean extracted text to reduce noise before hashing and scoring.
 * Removes nav/footer patterns, pure dates, cookie banners, pagination.
 */

const NOISE_LINE_PATTERNS: RegExp[] = [
  // Navigation / UI chrome
  /^(home|about|contact|privacy|terms|careers|sitemap|search|menu|navigation|skip to)$/i,
  /^(footer|header|copyright|all rights reserved)/i,
  /^©\s*\d{4}/,
  // Cookie banners
  /^(accept cookies?|we use cookies|cookie policy|cookie settings|by continuing)/i,
  // Pagination
  /^(page \d+ of \d+|showing \d+[-–]\d+ of \d+|results? \d+)/i,
  /^(previous|next|load more|back to top|read more|see more|view all)$/i,
  // Pure date lines  (e.g. "Jan 14, 2025" or "03/14/2025")
  /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2},?\s+\d{4}$/i,
  /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}$/i,
  /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/,
  /^\d{4}-\d{2}-\d{2}$/,
  // "Last updated" noise
  /^(last updated|last modified|published|posted):?\s/i,
  // Subscribe / login CTAs
  /^(subscribe|sign up|log in|sign in|register|create account)/i,
  // Social share
  /^(share|tweet|follow us|like us|linkedin|facebook|twitter|instagram)/i,
  // Empty or symbol-only lines
  /^[|•·\-–—*]+$/,
];

/** Remove lines matching known noise patterns and too-short fragments */
export function cleanText(raw: string): string {
  const lines = raw
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const kept: string[] = [];

  for (const line of lines) {
    // Skip noise patterns
    let isNoise = false;
    for (const pattern of NOISE_LINE_PATTERNS) {
      if (pattern.test(line)) {
        isNoise = true;
        break;
      }
    }
    if (isNoise) continue;

    // Skip very short lines (< 4 words) — likely nav labels
    const wordCount = line.split(/\s+/).filter((w) => w.length > 0).length;
    if (wordCount < 4) continue;

    kept.push(line);
  }

  // Normalize internal whitespace
  return kept
    .join("\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Count meaningful words (alphabetic, length >= 2) */
export function wordCount(text: string): number {
  return text
    .split(/\s+/)
    .filter((w) => /^[a-zA-Z]{2,}/.test(w)).length;
}
