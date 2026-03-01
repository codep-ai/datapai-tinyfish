/**
 * lib/diff.ts  (V2)
 * Text diff with bounded changed_pct (0..100) and similarity score (0..1).
 */

export interface DiffResult {
  similarity: number;           // 0..1 (1 = identical)
  changed_pct: number;          // 0..100 bounded (spec: must not exceed 100)
  added_lines: number;
  removed_lines: number;
  snippet: string;
  added_line_texts: string[];   // for evidence quote extraction
  removed_line_texts: string[]; // for snippet context
}

function splitLines(text: string): string[] {
  return text
    .split(/[\n.]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 15); // stricter minimum vs V1 to reduce noise
}

export function diffTexts(oldText: string, newText: string): DiffResult {
  const oldLines = new Set(splitLines(oldText));
  const newLines = new Set(splitLines(newText));

  const added: string[] = [];
  const removed: string[] = [];

  for (const line of newLines) {
    if (!oldLines.has(line)) added.push(line);
  }
  for (const line of oldLines) {
    if (!newLines.has(line)) removed.push(line);
  }

  const totalLines = Math.max(oldLines.size, newLines.size, 1);
  const changedLines = added.length + removed.length;

  // Bounded 0..100 — spec: "Do not exceed 100% in percent-change metrics"
  const changed_pct = Math.min(
    100,
    Math.round((changedLines / totalLines) * 100 * 10) / 10
  );

  // Jaccard-based similarity: intersection / union
  const intersection = [...newLines].filter((l) => oldLines.has(l)).length;
  const union = new Set([...oldLines, ...newLines]).size;
  const similarity =
    union === 0 ? 1 : Math.round((intersection / union) * 1000) / 1000;

  // Readable snippet
  const snippetParts: string[] = [];
  if (added.length > 0) snippetParts.push(`+ ${added[0].slice(0, 140)}`);
  if (removed.length > 0) snippetParts.push(`- ${removed[0].slice(0, 140)}`);
  const snippet = snippetParts.join("\n") || "No significant changes detected.";

  return {
    similarity,
    changed_pct,
    added_lines: added.length,
    removed_lines: removed.length,
    snippet,
    added_line_texts: added,
    removed_line_texts: removed,
  };
}
