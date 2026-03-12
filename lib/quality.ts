/**
 * lib/quality.ts
 * Quality gates and confidence scoring for extracted snapshots.
 * Flags noisy / low-value pages so they don't pollute alerts.
 */

import { wordCount } from "./clean";

export interface QualityFlags {
  too_short: boolean;      // disabled — always false (word-count gate removed)
  looks_dynamic: boolean;  // mostly short list lines → template churn
  date_noise: boolean;     // > 30% of lines are pure dates
}

export interface QualityResult {
  flags: QualityFlags;
  confidence: number; // 0..1
  word_count: number;
}

const DATE_ONLY = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}[\/\-]\d{1,2})/i;

export function checkQuality(cleanedText: string): QualityResult {
  const wc = wordCount(cleanedText);
  const lines = cleanedText
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // too_short disabled — the word-count gate was blocking 70% of real scans.
  // Confidence + diff % are sufficient quality signals without a word count hard floor.
  const too_short = false;

  // Flag: date noise — > 30% lines look like pure dates
  const dateLines = lines.filter((l) => DATE_ONLY.test(l));
  const date_noise =
    lines.length > 5 && dateLines.length / lines.length > 0.3;

  // Flag: looks dynamic — > 50% of lines are short (< 6 words), typical of press-release list pages
  const shortLines = lines.filter(
    (l) => l.split(/\s+/).filter((w) => w.length > 0).length < 6
  );
  const looks_dynamic =
    lines.length > 10 && shortLines.length / lines.length > 0.5;

  // Confidence: start at 1.0, discount remaining flags
  // (too_short is disabled; looks_dynamic and date_noise still penalise noisy pages)
  let confidence = 1.0;
  if (looks_dynamic) confidence -= 0.25;
  if (date_noise) confidence -= 0.25;
  confidence = Math.max(0, Math.round(confidence * 100) / 100);

  return {
    flags: { too_short, looks_dynamic, date_noise },
    confidence,
    word_count: wc,
  };
}

/** Returns true if this snapshot is good enough to diff + alert on */
export function passesQualityGate(result: QualityResult): boolean {
  return !result.flags.too_short && result.confidence >= 0.4;
}
