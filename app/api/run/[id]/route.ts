import { NextResponse } from "next/server";
import { getRun, getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const run = getRun(id);
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch per-ticker results for this run
  const snapshots = getDb()
    .prepare(
      `SELECT s.ticker, s.url, s.fetched_at, s.word_count, s.quality_flags_json,
              a.alert_score, a.confidence, a.categories_json, a.llm_summary_paid,
              d.changed_pct, d.added_lines, d.removed_lines
       FROM snapshots s
       LEFT JOIN diffs d ON d.snapshot_new_id = s.id
       LEFT JOIN analyses a ON a.snapshot_new_id = s.id
       WHERE s.run_id = ?
       ORDER BY s.fetched_at ASC`
    )
    .all(id);

  return NextResponse.json({ run, snapshots });
}
