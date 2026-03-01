import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "radar.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker      TEXT NOT NULL,
      url         TEXT NOT NULL,
      fetched_at  TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      text        TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_snapshots_ticker_fetched
      ON snapshots(ticker, fetched_at DESC);

    CREATE TABLE IF NOT EXISTS alerts (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker            TEXT NOT NULL,
      computed_at       TEXT NOT NULL,
      percent_changed   REAL NOT NULL,
      added_lines       INTEGER NOT NULL,
      removed_lines     INTEGER NOT NULL,
      snippet           TEXT NOT NULL,
      commitment_delta  REAL NOT NULL,
      hedging_delta     REAL NOT NULL,
      risk_delta        REAL NOT NULL,
      alert_score       REAL NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_alerts_ticker_computed
      ON alerts(ticker, computed_at DESC);
  `);
}

export interface Snapshot {
  id: number;
  ticker: string;
  url: string;
  fetched_at: string;
  content_hash: string;
  text: string;
}

export interface Alert {
  id: number;
  ticker: string;
  computed_at: string;
  percent_changed: number;
  added_lines: number;
  removed_lines: number;
  snippet: string;
  commitment_delta: number;
  hedging_delta: number;
  risk_delta: number;
  alert_score: number;
}

export function getLatestSnapshot(ticker: string): Snapshot | undefined {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM snapshots WHERE ticker = ? ORDER BY fetched_at DESC LIMIT 1"
    )
    .get(ticker) as Snapshot | undefined;
}

export function getPreviousSnapshot(
  ticker: string,
  beforeId: number
): Snapshot | undefined {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM snapshots WHERE ticker = ? AND id < ? ORDER BY fetched_at DESC LIMIT 1"
    )
    .get(ticker, beforeId) as Snapshot | undefined;
}

export function insertSnapshot(s: Omit<Snapshot, "id">): number {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO snapshots (ticker, url, fetched_at, content_hash, text)
       VALUES (@ticker, @url, @fetched_at, @content_hash, @text)`
    )
    .run(s);
  return result.lastInsertRowid as number;
}

export function insertAlert(a: Omit<Alert, "id">): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO alerts
       (ticker, computed_at, percent_changed, added_lines, removed_lines,
        snippet, commitment_delta, hedging_delta, risk_delta, alert_score)
     VALUES
       (@ticker, @computed_at, @percent_changed, @added_lines, @removed_lines,
        @snippet, @commitment_delta, @hedging_delta, @risk_delta, @alert_score)`
  ).run(a);
}

export function getLatestAlerts(limit = 50): Alert[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT a.*
       FROM alerts a
       INNER JOIN (
         SELECT ticker, MAX(computed_at) AS max_at
         FROM alerts GROUP BY ticker
       ) latest ON a.ticker = latest.ticker AND a.computed_at = latest.max_at
       ORDER BY a.alert_score DESC
       LIMIT ?`
    )
    .all(limit) as Alert[];
}

export function getTickerAlerts(ticker: string, limit = 10): Alert[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM alerts WHERE ticker = ? ORDER BY computed_at DESC LIMIT ?"
    )
    .all(ticker, limit) as Alert[];
}

export function getTickerSnapshots(ticker: string, limit = 2): Snapshot[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM snapshots WHERE ticker = ? ORDER BY fetched_at DESC LIMIT ?"
    )
    .all(ticker, limit) as Snapshot[];
}

/** Returns a map of ticker → latest Alert for all tickers that have at least one alert. */
export function getAlertSummaryMap(): Record<string, Alert> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT a.*
       FROM alerts a
       INNER JOIN (
         SELECT ticker, MAX(computed_at) AS max_at
         FROM alerts GROUP BY ticker
       ) latest ON a.ticker = latest.ticker AND a.computed_at = latest.max_at`
    )
    .all() as Alert[];
  return Object.fromEntries(rows.map((r) => [r.ticker, r]));
}
