export interface DiffResult {
  percentChanged: number;
  addedLines: number;
  removedLines: number;
  snippet: string;
}

function splitLines(text: string): string[] {
  return text
    .split(/[.\n]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 10);
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
  const percentChanged = Math.round((changedLines / totalLines) * 100 * 10) / 10;

  // Build a readable snippet from first added/removed lines
  const snippetParts: string[] = [];
  if (added.length > 0) {
    snippetParts.push(`+ ${added[0].slice(0, 120)}`);
  }
  if (removed.length > 0) {
    snippetParts.push(`- ${removed[0].slice(0, 120)}`);
  }
  const snippet = snippetParts.join("\n") || "No significant changes.";

  return {
    percentChanged,
    addedLines: added.length,
    removedLines: removed.length,
    snippet,
  };
}
