import { NextResponse } from "next/server";
import crypto from "crypto";
import { UNIVERSE } from "@/lib/universe";
import { fetchPageText } from "@/lib/tinyfish";
import {
  insertSnapshot,
  insertAlert,
  getLatestSnapshot,
  getPreviousSnapshot,
} from "@/lib/db";
import { diffTexts } from "@/lib/diff";
import { computeScoreDeltas } from "@/lib/score";

export async function POST() {
  const results: { ticker: string; status: string; error?: string }[] = [];

  for (const ticker of UNIVERSE) {
    try {
      const { text } = await fetchPageText(ticker.url);
      const hash = crypto.createHash("sha256").update(text).digest("hex");
      const now = new Date().toISOString();

      const insertedId = insertSnapshot({
        ticker: ticker.symbol,
        url: ticker.url,
        fetched_at: now,
        content_hash: hash,
        text,
      });

      const latest = getLatestSnapshot(ticker.symbol);
      const prev = latest ? getPreviousSnapshot(ticker.symbol, insertedId) : undefined;

      if (prev) {
        const diff = diffTexts(prev.text, text);
        const scores = computeScoreDeltas(prev.text, text);

        insertAlert({
          ticker: ticker.symbol,
          computed_at: now,
          percent_changed: diff.percentChanged,
          added_lines: diff.addedLines,
          removed_lines: diff.removedLines,
          snippet: diff.snippet,
          ...scores,
        });
      }

      results.push({ ticker: ticker.symbol, status: "ok" });
    } catch (err) {
      results.push({
        ticker: ticker.symbol,
        status: "error",
        error: String(err),
      });
    }
  }

  return NextResponse.json({ ok: true, results });
}
