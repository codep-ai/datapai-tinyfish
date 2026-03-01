/**
 * lib/score.ts  (V2)
 * Explainable word-frequency scoring on cleaned text.
 * Extended word lists, evidence quote extraction, and category tagging.
 */

// ─── Word lists (from spec) ────────────────────────────────────────────────

const COMMITMENT_WORDS = new Set([
  "will", "expect", "target", "guidance", "committed", "confident",
  "forecast", "plan", "planned", "planning", "reaffirm", "maintain",
  "deliver", "achieve", "outlook",
]);

const HEDGING_WORDS = new Set([
  "may", "might", "could", "aim", "seek", "approximately",
  "potential", "potentially", "subject", "depends", "depending",
  "unless", "although", "however", "cautious", "cautiously",
]);

const RISK_WORDS = new Set([
  "risk", "uncertain", "uncertainty", "liquidity", "headwind", "material",
  "challenge", "volatility", "adverse", "warn", "warning",
  "deteriorate", "deteriorating", "pressure", "pressures", "slowdown",
  "impairment", "default", "covenant", "restructur",
]);

// ─── Types ────────────────────────────────────────────────────────────────

export interface ScoreResult {
  commitment_delta: number;
  hedging_delta: number;
  risk_delta: number;
  alert_score: number;
  categories: string[];
  evidence_quotes: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────

interface Freqs {
  commitment: number;
  hedging: number;
  risk: number;
  totalWords: number;
}

function computeFreqs(text: string): Freqs {
  const words = text.toLowerCase().split(/\W+/).filter((w) => w.length >= 2);
  let commitment = 0;
  let hedging = 0;
  let risk = 0;

  for (const w of words) {
    if (COMMITMENT_WORDS.has(w)) commitment++;
    if (HEDGING_WORDS.has(w)) hedging++;
    for (const rw of RISK_WORDS) {
      if (w.startsWith(rw)) { risk++; break; }
    }
  }

  return { commitment, hedging, risk, totalWords: words.length || 1 };
}

function per1000(count: number, total: number): number {
  return (count / total) * 1000;
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Extract 2–4 added lines from the diff that contain signal words.
 * Used as "evidence quotes" in alerts and LLM prompts.
 */
export function extractEvidenceQuotes(
  addedLines: string[],
  maxQuotes = 4
): string[] {
  const allSignalWords = [
    ...COMMITMENT_WORDS,
    ...HEDGING_WORDS,
    ...RISK_WORDS,
  ];

  const scored = addedLines.map((line) => {
    const lower = line.toLowerCase();
    const hits = allSignalWords.filter((w) => lower.includes(w)).length;
    return { line, hits };
  });

  return scored
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, maxQuotes)
    .map((s) => s.line.slice(0, 200));
}

/**
 * Categorise the change based on delta directions.
 */
function detectCategories(
  commitmentDelta: number,
  hedgingDelta: number,
  riskDelta: number
): string[] {
  const cats: string[] = [];
  if (commitmentDelta < -0.3 || hedgingDelta > 0.3)
    cats.push("guidance_softening");
  if (riskDelta > 0.3)
    cats.push("risk_increase");
  if (commitmentDelta > 0.3 && riskDelta <= 0)
    cats.push("positive_signal");
  if (hedgingDelta > 0.5 && riskDelta > 0.5)
    cats.push("caution_elevated");
  return cats;
}

// ─── Main export ──────────────────────────────────────────────────────────

/**
 * Compute score deltas between old and new cleaned text.
 * All deltas are per-1000-words frequencies (new minus old).
 * alert_score = (hedging_delta + risk_delta) - commitment_delta
 */
export function computeScoreDeltas(
  oldText: string,
  newText: string,
  addedLines: string[] = []
): ScoreResult {
  const oldF = computeFreqs(oldText);
  const newF = computeFreqs(newText);

  const commitment_delta = r2(
    per1000(newF.commitment, newF.totalWords) -
    per1000(oldF.commitment, oldF.totalWords)
  );
  const hedging_delta = r2(
    per1000(newF.hedging, newF.totalWords) -
    per1000(oldF.hedging, oldF.totalWords)
  );
  const risk_delta = r2(
    per1000(newF.risk, newF.totalWords) -
    per1000(oldF.risk, oldF.totalWords)
  );
  const alert_score = r2(hedging_delta + risk_delta - commitment_delta);

  const categories = detectCategories(commitment_delta, hedging_delta, risk_delta);
  const evidence_quotes = extractEvidenceQuotes(addedLines);

  return {
    commitment_delta,
    hedging_delta,
    risk_delta,
    alert_score,
    categories,
    evidence_quotes,
  };
}
