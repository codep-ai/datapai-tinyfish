const commitmentWords = ["will", "expect", "target", "guidance", "committed"];
const hedgingWords = ["may", "might", "could", "aim", "plan"];
const riskWords = ["risk", "uncertain", "liquidity", "headwind", "material"];

interface WordCounts {
  commitment: number;
  hedging: number;
  risk: number;
  totalWords: number;
}

function countWords(text: string): WordCounts {
  const words = text.toLowerCase().split(/\s+/);
  const totalWords = words.length;

  let commitment = 0;
  let hedging = 0;
  let risk = 0;

  for (const word of words) {
    const clean = word.replace(/[^a-z]/g, "");
    if (commitmentWords.includes(clean)) commitment++;
    if (hedgingWords.includes(clean)) hedging++;
    if (riskWords.includes(clean)) risk++;
  }

  return { commitment, hedging, risk, totalWords };
}

function normalizeFreq(count: number, totalWords: number): number {
  if (totalWords === 0) return 0;
  return (count / totalWords) * 1000;
}

export interface ScoreDeltas {
  commitment_delta: number;
  hedging_delta: number;
  risk_delta: number;
  alert_score: number;
}

export function computeScoreDeltas(
  oldText: string,
  newText: string
): ScoreDeltas {
  const oldCounts = countWords(oldText);
  const newCounts = countWords(newText);

  const oldCommitment = normalizeFreq(oldCounts.commitment, oldCounts.totalWords);
  const newCommitment = normalizeFreq(newCounts.commitment, newCounts.totalWords);

  const oldHedging = normalizeFreq(oldCounts.hedging, oldCounts.totalWords);
  const newHedging = normalizeFreq(newCounts.hedging, newCounts.totalWords);

  const oldRisk = normalizeFreq(oldCounts.risk, oldCounts.totalWords);
  const newRisk = normalizeFreq(newCounts.risk, newCounts.totalWords);

  const commitment_delta = round2(newCommitment - oldCommitment);
  const hedging_delta = round2(newHedging - oldHedging);
  const risk_delta = round2(newRisk - oldRisk);

  const alert_score = round2(hedging_delta + risk_delta - commitment_delta);

  return { commitment_delta, hedging_delta, risk_delta, alert_score };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
