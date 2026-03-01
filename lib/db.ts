/**
 * lib/db.ts  (V2)
 * Full V2 schema: companies / runs / snapshots / diffs / analyses / prices
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { UNIVERSE } from "./universe";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH =
  process.env.DATABASE_PATH ?? path.join(DATA_DIR, "radar_v2.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initSchema(_db);
    seedCompanies(_db);
  }
  return _db;
}

// ─── Schema ───────────────────────────────────────────────────────────────

function initSchema(db: Database.Database) {
  db.exec(`
    -- Universe of monitored companies
    CREATE TABLE IF NOT EXISTS companies (
      ticker          TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      website_root    TEXT,
      page_urls_json  TEXT NOT NULL  -- JSON array of URLs to monitor
    );

    -- One record per pipeline run
    CREATE TABLE IF NOT EXISTS runs (
      id              TEXT PRIMARY KEY,
      started_at      TEXT NOT NULL,
      finished_at     TEXT,
      status          TEXT NOT NULL DEFAULT 'RUNNING',  -- RUNNING/SUCCESS/FAILED
      tinyfish_run_ref TEXT,
      notes           TEXT,
      scanned_count   INTEGER DEFAULT 0,
      changed_count   INTEGER DEFAULT 0,
      alerts_created  INTEGER DEFAULT 0,
      failed_count    INTEGER DEFAULT 0
    );

    -- Raw + cleaned page snapshot per ticker per run
    CREATE TABLE IF NOT EXISTS snapshots (
      id                  TEXT PRIMARY KEY,
      run_id              TEXT REFERENCES runs(id),
      ticker              TEXT REFERENCES companies(ticker),
      url                 TEXT NOT NULL,
      fetched_at          TEXT NOT NULL,
      final_url           TEXT,
      title               TEXT,
      text                TEXT NOT NULL,
      cleaned_text        TEXT NOT NULL,
      content_hash        TEXT NOT NULL,
      word_count          INTEGER DEFAULT 0,
      extractor           TEXT DEFAULT 'tinyfish',
      quality_flags_json  TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_snap_ticker_fetched
      ON snapshots(ticker, fetched_at DESC);

    -- Diff between two consecutive snapshots
    CREATE TABLE IF NOT EXISTS diffs (
      id               TEXT PRIMARY KEY,
      snapshot_new_id  TEXT REFERENCES snapshots(id),
      snapshot_old_id  TEXT REFERENCES snapshots(id),
      similarity       REAL,
      changed_pct      REAL,
      added_lines      INTEGER,
      removed_lines    INTEGER,
      snippet          TEXT
    );

    -- AI analysis per diff
    CREATE TABLE IF NOT EXISTS analyses (
      id                      TEXT PRIMARY KEY,
      snapshot_new_id         TEXT REFERENCES snapshots(id),
      diff_id                 TEXT REFERENCES diffs(id),
      commitment_delta        REAL,
      hedging_delta           REAL,
      risk_delta              REAL,
      alert_score             REAL,
      confidence              REAL,
      categories_json         TEXT,
      llm_summary_paid        TEXT,
      llm_summary_private     TEXT,
      reasoning_evidence_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_analyses_snap
      ON analyses(snapshot_new_id);

    -- Optional: price cache
    CREATE TABLE IF NOT EXISTS prices (
      ticker  TEXT NOT NULL,
      date    TEXT NOT NULL,
      close   REAL,
      volume  REAL,
      PRIMARY KEY (ticker, date)
    );
  `);
}

/** Upsert companies from UNIVERSE on every startup */
function seedCompanies(db: Database.Database) {
  const upsert = db.prepare(`
    INSERT OR IGNORE INTO companies (ticker, name, website_root, page_urls_json)
    VALUES (@ticker, @name, @website_root, @page_urls_json)
  `);
  const seedAll = db.transaction(() => {
    for (const t of UNIVERSE) {
      upsert.run({
        ticker: t.symbol,
        name: t.name,
        website_root: new URL(t.url).origin,
        page_urls_json: JSON.stringify([t.url]),
      });
    }
  });
  seedAll();
}

// ─── Types ────────────────────────────────────────────────────────────────

export interface Run {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  tinyfish_run_ref: string | null;
  notes: string | null;
  scanned_count: number;
  changed_count: number;
  alerts_created: number;
  failed_count: number;
}

export interface Snapshot {
  id: string;
  run_id: string;
  ticker: string;
  url: string;
  fetched_at: string;
  final_url: string | null;
  title: string | null;
  text: string;
  cleaned_text: string;
  content_hash: string;
  word_count: number;
  extractor: string;
  quality_flags_json: string | null;
}

export interface Diff {
  id: string;
  snapshot_new_id: string;
  snapshot_old_id: string;
  similarity: number;
  changed_pct: number;
  added_lines: number;
  removed_lines: number;
  snippet: string;
}

export interface Analysis {
  id: string;
  snapshot_new_id: string;
  diff_id: string;
  commitment_delta: number;
  hedging_delta: number;
  risk_delta: number;
  alert_score: number;
  confidence: number;
  categories_json: string | null;
  llm_summary_paid: string | null;
  llm_summary_private: string | null;
  reasoning_evidence_json: string | null;
}

// ─── Run helpers ──────────────────────────────────────────────────────────

export function insertRun(id: string, startedAt: string): void {
  getDb()
    .prepare(
      `INSERT INTO runs (id, started_at, status) VALUES (?, ?, 'RUNNING')`
    )
    .run(id, startedAt);
}

export function finishRun(
  id: string,
  finishedAt: string,
  counts: {
    scanned: number;
    changed: number;
    alerts: number;
    failed: number;
  }
): void {
  getDb()
    .prepare(
      `UPDATE runs SET finished_at=?, status='SUCCESS',
       scanned_count=?, changed_count=?, alerts_created=?, failed_count=?
       WHERE id=?`
    )
    .run(
      finishedAt,
      counts.scanned,
      counts.changed,
      counts.alerts,
      counts.failed,
      id
    );
}

export function failRun(id: string, finishedAt: string, notes: string): void {
  getDb()
    .prepare(
      `UPDATE runs SET finished_at=?, status='FAILED', notes=? WHERE id=?`
    )
    .run(finishedAt, notes, id);
}

export function getRun(id: string): Run | undefined {
  return getDb()
    .prepare("SELECT * FROM runs WHERE id = ?")
    .get(id) as Run | undefined;
}

export function getRecentRuns(limit = 20): Run[] {
  return getDb()
    .prepare("SELECT * FROM runs ORDER BY started_at DESC LIMIT ?")
    .all(limit) as Run[];
}

// ─── Snapshot helpers ─────────────────────────────────────────────────────

export function insertSnapshot(s: Omit<Snapshot, never>): void {
  getDb()
    .prepare(
      `INSERT INTO snapshots
         (id, run_id, ticker, url, fetched_at, final_url, title,
          text, cleaned_text, content_hash, word_count, extractor, quality_flags_json)
       VALUES
         (@id, @run_id, @ticker, @url, @fetched_at, @final_url, @title,
          @text, @cleaned_text, @content_hash, @word_count, @extractor, @quality_flags_json)`
    )
    .run(s);
}

export function getPreviousSnapshot(
  ticker: string,
  excludeId: string
): Snapshot | undefined {
  return getDb()
    .prepare(
      `SELECT * FROM snapshots
       WHERE ticker = ? AND id != ?
       ORDER BY fetched_at DESC LIMIT 1`
    )
    .get(ticker, excludeId) as Snapshot | undefined;
}

export function getTickerSnapshots(ticker: string, limit = 5): Snapshot[] {
  return getDb()
    .prepare(
      "SELECT * FROM snapshots WHERE ticker = ? ORDER BY fetched_at DESC LIMIT ?"
    )
    .all(ticker, limit) as Snapshot[];
}

// ─── Diff helpers ─────────────────────────────────────────────────────────

export function insertDiff(d: Diff): void {
  getDb()
    .prepare(
      `INSERT INTO diffs
         (id, snapshot_new_id, snapshot_old_id, similarity, changed_pct,
          added_lines, removed_lines, snippet)
       VALUES
         (@id, @snapshot_new_id, @snapshot_old_id, @similarity, @changed_pct,
          @added_lines, @removed_lines, @snippet)`
    )
    .run(d);
}

export function getTickerDiffs(ticker: string, limit = 5): (Diff & { fetched_at: string })[] {
  return getDb()
    .prepare(
      `SELECT d.*, s.fetched_at FROM diffs d
       JOIN snapshots s ON d.snapshot_new_id = s.id
       WHERE s.ticker = ?
       ORDER BY s.fetched_at DESC LIMIT ?`
    )
    .all(ticker, limit) as (Diff & { fetched_at: string })[];
}

// ─── Analysis helpers ─────────────────────────────────────────────────────

export function insertAnalysis(a: Analysis): void {
  getDb()
    .prepare(
      `INSERT INTO analyses
         (id, snapshot_new_id, diff_id, commitment_delta, hedging_delta,
          risk_delta, alert_score, confidence, categories_json,
          llm_summary_paid, llm_summary_private, reasoning_evidence_json)
       VALUES
         (@id, @snapshot_new_id, @diff_id, @commitment_delta, @hedging_delta,
          @risk_delta, @alert_score, @confidence, @categories_json,
          @llm_summary_paid, @llm_summary_private, @reasoning_evidence_json)`
    )
    .run(a);
}

export function getLatestAnalyses(limit = 50): (Analysis & Pick<Snapshot, "ticker" | "fetched_at" | "url">)[] {
  return getDb()
    .prepare(
      `SELECT a.*, s.ticker, s.fetched_at, s.url
       FROM analyses a
       JOIN snapshots s ON a.snapshot_new_id = s.id
       ORDER BY a.alert_score DESC
       LIMIT ?`
    )
    .all(limit) as (Analysis & Pick<Snapshot, "ticker" | "fetched_at" | "url">)[];
}

export function getTickerAnalyses(ticker: string, limit = 5): (Analysis & Pick<Snapshot, "fetched_at" | "url">)[] {
  return getDb()
    .prepare(
      `SELECT a.*, s.fetched_at, s.url
       FROM analyses a
       JOIN snapshots s ON a.snapshot_new_id = s.id
       WHERE s.ticker = ?
       ORDER BY s.fetched_at DESC
       LIMIT ?`
    )
    .all(ticker, limit) as (Analysis & Pick<Snapshot, "fetched_at" | "url">)[];
}

/** Latest analysis per ticker — used for home page alert badges */
export function getAlertSummaryMap(): Record<
  string,
  Analysis & Pick<Snapshot, "fetched_at" | "url">
> {
  const rows = getDb()
    .prepare(
      `SELECT a.*, s.ticker, s.fetched_at, s.url
       FROM analyses a
       JOIN snapshots s ON a.snapshot_new_id = s.id
       INNER JOIN (
         SELECT s2.ticker, MAX(s2.fetched_at) AS max_at
         FROM analyses a2
         JOIN snapshots s2 ON a2.snapshot_new_id = s2.id
         GROUP BY s2.ticker
       ) latest ON s.ticker = latest.ticker AND s.fetched_at = latest.max_at`
    )
    .all() as (Analysis & { ticker: string; fetched_at: string; url: string })[];

  return Object.fromEntries(rows.map((r) => [r.ticker, r]));
}

// ─── Price helpers ────────────────────────────────────────────────────────

export function upsertPrice(
  ticker: string,
  date: string,
  close: number,
  volume: number
): void {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO prices (ticker, date, close, volume)
       VALUES (?, ?, ?, ?)`
    )
    .run(ticker, date, close, volume);
}

export function getCachedPrices(
  ticker: string,
  limit = 30
): { date: string; close: number; volume: number }[] {
  return getDb()
    .prepare(
      `SELECT date, close, volume FROM prices
       WHERE ticker = ?
       ORDER BY date DESC LIMIT ?`
    )
    .all(ticker, limit) as { date: string; close: number; volume: number }[];
}
