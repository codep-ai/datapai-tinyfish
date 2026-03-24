/**
 * GET /api/i18n/labels?lang=zh&category=screener,enum
 *
 * Returns UI labels from `datapai.sys_lang_labels` for client components.
 * Falls back to English for any missing keys.
 *
 * Query params:
 *   lang     — target language (default "en")
 *   category — optional comma-separated filter (e.g. "screener,enum,common")
 */

import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get("lang") ?? "en";
  const category = searchParams.get("category") ?? "";

  const pool = getPool();

  const cats = category
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  // Build query with optional category IN clause
  let catClause = "";
  const params: string[] = [lang];
  if (cats.length) {
    const placeholders = cats.map((_, i) => `$${i + 2}`).join(", ");
    catClause = `AND category IN (${placeholders})`;
    params.push(...cats);
  }

  const { rows } = await pool.query(
    `SELECT label_key, text FROM datapai.sys_lang_labels WHERE lang = $1 ${catClause}`,
    params,
  );

  const labels: Record<string, string> = {};
  for (const r of rows) labels[r.label_key] = r.text;

  // Fill gaps with English fallback
  if (lang !== "en") {
    const enParams: string[] = ["en", ...cats];
    const { rows: enRows } = await pool.query(
      `SELECT label_key, text FROM datapai.sys_lang_labels WHERE lang = $1 ${catClause}`,
      enParams,
    );
    for (const r of enRows) {
      if (!(r.label_key in labels)) labels[r.label_key] = r.text;
    }
  }

  return NextResponse.json(labels, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
  });
}
