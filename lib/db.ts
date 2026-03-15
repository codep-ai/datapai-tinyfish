/**
 * lib/db.ts  — PostgreSQL backend (datapai schema)
 *
 * Replaces better-sqlite3 with pg (node-postgres).
 * All functions are async — callers must await them.
 *
 * Connection: same env vars as Python backend (db.py)
 *   DATAPAI_PG_HOST      default 172.28.0.3  (EC2 docker)
 *   DATAPAI_PG_PORT      default 5432
 *   DATAPAI_PG_DB        default postgres
 *   DATAPAI_PG_USER      default postgres
 *   DATAPAI_PG_PASSWORD  default postgres
 *
 * Schema: datapai  (shared with Python agents)
 */

import { Pool, PoolClient } from "pg";
import { UNIVERSE_ALL } from "./universe";

// ─── Connection pool ───────────────────────────────────────────────────────

let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      host:     process.env.DATAPAI_PG_HOST     ?? "localhost",
      port:     parseInt(process.env.DATAPAI_PG_PORT ?? "5432"),
      database: process.env.DATAPAI_PG_DB       ?? "postgres",
      user:     process.env.DATAPAI_PG_USER     ?? "postgres",
      password: process.env.DATAPAI_PG_PASSWORD ?? "postgres",
      options:  "-c search_path=datapai,public",
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return _pool;
}

/** Thin query helper — returns rows as plain objects */
async function q<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const { rows } = await getPool().query(sql, params);
  return rows as T[];
}

/** Thin execute helper (INSERT / UPDATE / DELETE) */
async function exec(sql: string, params?: unknown[]): Promise<void> {
  await getPool().query(sql, params);
}

// Kept for callers that use getDb() — returns the pool (duck-typed)
export function getDb(): Pool { return getPool(); }

// ─── Seed companies on first use ──────────────────────────────────────────
// Lazy-seeded once per process via a flag (avoids running on every import)
let _seeded = false;
export async function seedCompaniesOnce(): Promise<void> {
  if (_seeded) return;
  _seeded = true;
  await seedCompanies();
}

async function seedCompanies(): Promise<void> {
  const client: PoolClient = await getPool().connect();
  try {
    await client.query("BEGIN");
    for (const t of UNIVERSE_ALL) {
      await client.query(
        `INSERT INTO datapai.companies (ticker, name, website_root, page_urls_json)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (ticker) DO NOTHING`,
        [t.symbol, t.name, new URL(t.url).origin, JSON.stringify([t.url])]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// ─── Types ────────────────────────────────────────────────────────────────

export interface Run {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  tinyfish_run_ref: string | null;
  notes: string | null;
  planned_count: number;
  completed_count: number;
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
  signal_type: string;
  agent_signal_type: string | null;
  agent_severity: string | null;
  agent_confidence: number | null;
  agent_financial_relevance: string | null;
  agent_evidence_json: string | null;
  validation_status: string | null;
  validation_summary: string | null;
  validation_evidence_json: string | null;
  agent_what_changed: string | null;
  agent_why_matters: string | null;
  change_type: string;
  change_quality_score: number | null;
  financial_relevance_score: number | null;
  investigation_summary: string | null;
  investigation_sources: string | null;
  corroborating_count: number;
}

export interface ScanEvent {
  id: string;
  run_id: string;
  ticker: string;
  step: string;
  status: string;
  message: string | null;
  created_at: string;
}

export interface StockDirectoryEntry {
  symbol: string;
  name: string;
  exchange: string;
  sector: string | null;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface SessionRow {
  token: string;
  user_id: string;
  email: string;
  expires_at: string;
  created_at: string;
}

export interface WatchlistItem {
  user_id: string;
  symbol: string;
  exchange: string;
  name: string | null;
  added_at: string;
}

export interface TaSignalRow {
  id:               string;
  ticker:           string;
  exchange:         string;
  signal_md:        string;
  current_price:    number | null;
  change_pct:       number | null;
  rsi:              number | null;
  rsi_label:        string | null;
  trend:            string | null;
  macd_label:       string | null;
  bb_label:         string | null;
  indicators_json:  string | null;
  generated_at:     string;
  expires_at:       string;
}

export interface ChartAnalysisRow {
  id:               string;
  ticker:           string;
  timeframe:        string;
  chart_b64:        string;
  analysis_md:      string;
  indicators_json:  string | null;
  generated_at:     string;
  expires_at:       string;
}

// ─── Run helpers ──────────────────────────────────────────────────────────

export async function insertRun(id: string, startedAt: string, plannedCount = 0): Promise<void> {
  await exec(
    `INSERT INTO datapai.runs (id, started_at, status, planned_count)
     VALUES ($1, $2, 'PENDING', $3)`,
    [id, startedAt, plannedCount]
  );
}

export async function startRun(id: string): Promise<void> {
  await exec(`UPDATE datapai.runs SET status='RUNNING' WHERE id=$1`, [id]);
}

export async function finishRun(
  id: string,
  finishedAt: string,
  counts: { scanned: number; changed: number; alerts: number; failed: number }
): Promise<void> {
  await exec(
    `UPDATE datapai.runs
     SET finished_at=$1, status='SUCCESS',
         scanned_count=$2, completed_count=$2, changed_count=$3,
         alerts_created=$4, failed_count=$5
     WHERE id=$6`,
    [finishedAt, counts.scanned, counts.changed, counts.alerts, counts.failed, id]
  );
}

export async function failRun(id: string, finishedAt: string, notes: string): Promise<void> {
  await exec(
    `UPDATE datapai.runs SET finished_at=$1, status='FAILED', notes=$2 WHERE id=$3`,
    [finishedAt, notes, id]
  );
}

export async function getRun(id: string): Promise<Run | undefined> {
  const rows = await q<Run>(`SELECT * FROM datapai.runs WHERE id=$1`, [id]);
  return rows[0];
}

export async function getRecentRuns(limit = 20): Promise<Run[]> {
  return q<Run>(`SELECT * FROM datapai.runs ORDER BY started_at DESC LIMIT $1`, [limit]);
}

// ─── Snapshot helpers ─────────────────────────────────────────────────────

export async function insertSnapshot(s: Snapshot): Promise<void> {
  await exec(
    `INSERT INTO datapai.snapshots
       (id, run_id, ticker, url, fetched_at, final_url, title,
        text, cleaned_text, content_hash, word_count, extractor, quality_flags_json)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [s.id, s.run_id, s.ticker, s.url, s.fetched_at, s.final_url, s.title,
     s.text, s.cleaned_text, s.content_hash, s.word_count, s.extractor, s.quality_flags_json]
  );
}

export async function getPreviousSnapshot(ticker: string, excludeId: string): Promise<Snapshot | undefined> {
  const rows = await q<Snapshot>(
    `SELECT * FROM datapai.snapshots
     WHERE ticker=$1 AND id!=$2
     ORDER BY fetched_at DESC LIMIT 1`,
    [ticker, excludeId]
  );
  return rows[0];
}

export async function getTickerSnapshots(ticker: string, limit = 5): Promise<Snapshot[]> {
  return q<Snapshot>(
    `SELECT * FROM datapai.snapshots WHERE ticker=$1 ORDER BY fetched_at DESC LIMIT $2`,
    [ticker, limit]
  );
}

// ─── Diff helpers ─────────────────────────────────────────────────────────

export async function insertDiff(d: Diff): Promise<void> {
  await exec(
    `INSERT INTO datapai.diffs
       (id, snapshot_new_id, snapshot_old_id, similarity, changed_pct,
        added_lines, removed_lines, snippet)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [d.id, d.snapshot_new_id, d.snapshot_old_id, d.similarity, d.changed_pct,
     d.added_lines, d.removed_lines, d.snippet]
  );
}

export async function getTickerDiffs(
  ticker: string, limit = 5
): Promise<(Diff & { fetched_at: string })[]> {
  return q<Diff & { fetched_at: string }>(
    `SELECT d.*, s.fetched_at FROM datapai.diffs d
     JOIN datapai.snapshots s ON d.snapshot_new_id = s.id
     WHERE s.ticker=$1
     ORDER BY s.fetched_at DESC LIMIT $2`,
    [ticker, limit]
  );
}

// ─── Analysis helpers ─────────────────────────────────────────────────────

export async function insertAnalysis(a: Analysis): Promise<void> {
  await exec(
    `INSERT INTO datapai.analyses
       (id, snapshot_new_id, diff_id, commitment_delta, hedging_delta,
        risk_delta, alert_score, confidence, categories_json,
        llm_summary_paid, llm_summary_private, reasoning_evidence_json, signal_type,
        agent_signal_type, agent_severity, agent_confidence, agent_financial_relevance,
        agent_evidence_json, validation_status, validation_summary,
        validation_evidence_json, agent_what_changed, agent_why_matters,
        change_type, change_quality_score, financial_relevance_score,
        investigation_summary, investigation_sources, corroborating_count)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
             $18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)`,
    [a.id, a.snapshot_new_id, a.diff_id, a.commitment_delta, a.hedging_delta,
     a.risk_delta, a.alert_score, a.confidence, a.categories_json,
     a.llm_summary_paid, a.llm_summary_private, a.reasoning_evidence_json, a.signal_type,
     a.agent_signal_type, a.agent_severity, a.agent_confidence, a.agent_financial_relevance,
     a.agent_evidence_json, a.validation_status, a.validation_summary,
     a.validation_evidence_json, a.agent_what_changed, a.agent_why_matters,
     a.change_type, a.change_quality_score, a.financial_relevance_score,
     a.investigation_summary, a.investigation_sources, a.corroborating_count]
  );
}

export async function getLatestAnalyses(limit = 50): Promise<(Analysis & Pick<Snapshot, "ticker" | "fetched_at" | "url"> & { changed_pct: number | null })[]> {
  return q(
    `SELECT a.*, s.ticker, s.fetched_at, s.url, d.changed_pct
     FROM datapai.analyses a
     JOIN datapai.snapshots s ON a.snapshot_new_id = s.id
     LEFT JOIN datapai.diffs d ON a.diff_id = d.id
     ORDER BY a.alert_score DESC LIMIT $1`,
    [limit]
  );
}

export async function getLatestAnalysesBySignalType(
  signalType: string | null, limit = 50
): Promise<(Analysis & Pick<Snapshot, "ticker" | "fetched_at" | "url"> & { changed_pct: number | null })[]> {
  if (!signalType) return getLatestAnalyses(limit);
  return q(
    `SELECT a.*, s.ticker, s.fetched_at, s.url, d.changed_pct
     FROM datapai.analyses a
     JOIN datapai.snapshots s ON a.snapshot_new_id = s.id
     LEFT JOIN datapai.diffs d ON a.diff_id = d.id
     WHERE a.signal_type=$1
     ORDER BY a.alert_score DESC LIMIT $2`,
    [signalType, limit]
  );
}

export async function getTickerAnalyses(
  ticker: string, limit = 5
): Promise<(Analysis & Pick<Snapshot, "fetched_at" | "url">)[]> {
  return q(
    `SELECT a.*, s.fetched_at, s.url
     FROM datapai.analyses a
     JOIN datapai.snapshots s ON a.snapshot_new_id = s.id
     WHERE s.ticker=$1
     ORDER BY s.fetched_at DESC LIMIT $2`,
    [ticker, limit]
  );
}

export async function getLatestAnalysisWithAgentContent(
  ticker: string
): Promise<(Analysis & Pick<Snapshot, "fetched_at" | "url">) | null> {
  const rows = await q(
    `SELECT a.*, s.fetched_at, s.url
     FROM datapai.analyses a
     JOIN datapai.snapshots s ON a.snapshot_new_id = s.id
     WHERE s.ticker=$1
       AND a.agent_signal_type IS NOT NULL
       AND a.agent_signal_type != 'NO_SIGNAL'
       AND a.agent_what_changed IS NOT NULL
       AND a.agent_what_changed != ''
     ORDER BY s.fetched_at DESC LIMIT 1`,
    [ticker]
  );
  return (rows[0] as unknown as (Analysis & Pick<Snapshot, "fetched_at" | "url">) | undefined) ?? null;
}

export async function getTickerScanCount(ticker: string): Promise<number> {
  const rows = await q<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM datapai.snapshots WHERE ticker=$1`, [ticker]
  );
  return parseInt(rows[0]?.cnt ?? "0");
}

export async function getAlertSummaryMap(): Promise<Record<
  string,
  Analysis & Pick<Snapshot, "fetched_at" | "url"> & { ticker: string; changed_pct: number | null }
>> {
  const rows = await q<Analysis & { ticker: string; fetched_at: string; url: string; changed_pct: number | null }>(
    `SELECT a.*, s.ticker, s.fetched_at, s.url, d.changed_pct
     FROM datapai.analyses a
     JOIN datapai.snapshots s ON a.snapshot_new_id = s.id
     LEFT JOIN datapai.diffs d ON a.diff_id = d.id
     INNER JOIN (
       SELECT s2.ticker, MAX(s2.fetched_at) AS max_at
       FROM datapai.analyses a2
       JOIN datapai.snapshots s2 ON a2.snapshot_new_id = s2.id
       GROUP BY s2.ticker
     ) latest ON s.ticker = latest.ticker AND s.fetched_at = latest.max_at`
  );
  return Object.fromEntries(rows.map((r) => [r.ticker, r]));
}

// ─── Scan event helpers ────────────────────────────────────────────────────

export async function insertScanEvent(e: ScanEvent): Promise<void> {
  await exec(
    `INSERT INTO datapai.scan_events (id, run_id, ticker, step, status, message, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [e.id, e.run_id, e.ticker, e.step, e.status, e.message, e.created_at]
  );
}

export async function getScanEvents(runId: string): Promise<ScanEvent[]> {
  return q<ScanEvent>(
    `SELECT * FROM datapai.scan_events WHERE run_id=$1 ORDER BY created_at ASC`, [runId]
  );
}

// ─── Price helpers ────────────────────────────────────────────────────────

export async function upsertPrice(ticker: string, date: string, close: number, volume: number): Promise<void> {
  await exec(
    `INSERT INTO datapai.prices (ticker, date, close, volume) VALUES ($1,$2,$3,$4)
     ON CONFLICT (ticker, date) DO UPDATE SET close=$3, volume=$4`,
    [ticker, date, close, volume]
  );
}

export async function getCachedPrices(ticker: string, limit = 30): Promise<{ date: string; close: number; volume: number }[]> {
  return q(
    `SELECT date, close, volume FROM datapai.prices
     WHERE ticker=$1 ORDER BY date DESC LIMIT $2`,
    [ticker, limit]
  );
}

// ─── Stock directory ──────────────────────────────────────────────────────

export async function lookupStock(symbol: string): Promise<StockDirectoryEntry | null> {
  const rows = await q<StockDirectoryEntry>(
    `SELECT symbol, name, exchange, sector FROM datapai.stock_directory
     WHERE symbol=$1 ORDER BY exchange LIMIT 1`,
    [symbol.toUpperCase()]
  );
  return rows[0] ?? null;
}

export async function searchStocks(query: string, exchange?: string): Promise<StockDirectoryEntry[]> {
  const like = `${query.toUpperCase()}%`;
  if (exchange) {
    return q<StockDirectoryEntry>(
      `SELECT symbol, name, exchange, sector FROM datapai.stock_directory
       WHERE symbol LIKE $1 AND exchange=$2 ORDER BY symbol LIMIT 20`,
      [like, exchange]
    );
  }
  return q<StockDirectoryEntry>(
    `SELECT symbol, name, exchange, sector FROM datapai.stock_directory
     WHERE symbol LIKE $1 ORDER BY symbol LIMIT 20`,
    [like]
  );
}

export async function upsertStockDirectory(entries: StockDirectoryEntry[]): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    for (const e of entries) {
      await client.query(
        `INSERT INTO datapai.stock_directory (symbol, name, exchange, sector)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (symbol, exchange) DO UPDATE SET name=$2, sector=$4`,
        [e.symbol, e.name, e.exchange, e.sector]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function countStockDirectory(exchange?: string): Promise<number> {
  const rows = exchange
    ? await q<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM datapai.stock_directory WHERE exchange=$1`, [exchange])
    : await q<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM datapai.stock_directory`);
  return parseInt(rows[0]?.cnt ?? "0");
}

// ─── Users & Sessions ─────────────────────────────────────────────────────

export async function createUser(id: string, email: string, passwordHash: string): Promise<void> {
  await exec(
    `INSERT INTO datapai.users (id, email, password_hash, created_at) VALUES ($1,$2,$3,$4)`,
    [id, email.toLowerCase().trim(), passwordHash, new Date().toISOString()]
  );
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const rows = await q<User>(
    `SELECT * FROM datapai.users WHERE email=$1`, [email.toLowerCase().trim()]
  );
  return rows[0] ?? null;
}

export async function getUserById(id: string): Promise<User | null> {
  const rows = await q<User>(`SELECT * FROM datapai.users WHERE id=$1`, [id]);
  return rows[0] ?? null;
}

export async function createSession(token: string, userId: string, expiresAt: string): Promise<void> {
  await exec(
    `INSERT INTO datapai.sessions (token, user_id, expires_at, created_at) VALUES ($1,$2,$3,$4)`,
    [token, userId, expiresAt, new Date().toISOString()]
  );
}

export async function getSession(token: string): Promise<SessionRow | null> {
  const rows = await q<SessionRow>(
    `SELECT s.token, s.user_id, s.expires_at, s.created_at, u.email
     FROM datapai.sessions s JOIN datapai.users u ON s.user_id = u.id
     WHERE s.token=$1 AND s.expires_at > $2`,
    [token, new Date().toISOString()]
  );
  return rows[0] ?? null;
}

export async function deleteSession(token: string): Promise<void> {
  await exec(`DELETE FROM datapai.sessions WHERE token=$1`, [token]);
}

// ─── Watchlist ────────────────────────────────────────────────────────────

export async function getWatchlist(userId: string): Promise<WatchlistItem[]> {
  return q<WatchlistItem>(
    `SELECT user_id, symbol, exchange, name, added_at
     FROM datapai.watchlist WHERE user_id=$1 ORDER BY added_at DESC`,
    [userId]
  );
}

export async function addToWatchlist(userId: string, symbol: string, exchange: string, name: string | null): Promise<void> {
  await exec(
    `INSERT INTO datapai.watchlist (user_id, symbol, exchange, name, added_at)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (user_id, symbol) DO UPDATE SET exchange=$3, name=$4, added_at=$5`,
    [userId, symbol.toUpperCase(), exchange, name, new Date().toISOString()]
  );
}

export async function removeFromWatchlist(userId: string, symbol: string): Promise<void> {
  await exec(
    `DELETE FROM datapai.watchlist WHERE user_id=$1 AND symbol=$2`,
    [userId, symbol.toUpperCase()]
  );
}

export async function isInWatchlist(userId: string, symbol: string): Promise<boolean> {
  const rows = await q(
    `SELECT 1 FROM datapai.watchlist WHERE user_id=$1 AND symbol=$2 LIMIT 1`,
    [userId, symbol.toUpperCase()]
  );
  return rows.length > 0;
}

// ─── TA Signal cache ──────────────────────────────────────────────────────

export async function getCachedTaSignal(ticker: string, maxAgeHours = 6): Promise<TaSignalRow | null> {
  const cutoff = new Date(Date.now() - maxAgeHours * 3_600_000).toISOString();
  const rows = await q<TaSignalRow>(
    `SELECT * FROM datapai.ta_signals
     WHERE ticker=$1 AND generated_at > $2
     ORDER BY generated_at DESC LIMIT 1`,
    [ticker.toUpperCase(), cutoff]
  );
  return rows[0] ?? null;
}

export async function upsertTaSignal(row: Omit<TaSignalRow, "id">): Promise<void> {
  const id = `${row.ticker}_${row.generated_at}`;
  await exec(
    `INSERT INTO datapai.ta_signals
       (id, ticker, exchange, signal_md, current_price, change_pct,
        rsi, rsi_label, trend, macd_label, bb_label, indicators_json,
        generated_at, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (id) DO UPDATE SET
       signal_md=$4, current_price=$5, change_pct=$6,
       rsi=$7, rsi_label=$8, trend=$9, macd_label=$10, bb_label=$11,
       indicators_json=$12, generated_at=$13, expires_at=$14`,
    [id, row.ticker, row.exchange, row.signal_md, row.current_price, row.change_pct,
     row.rsi, row.rsi_label, row.trend, row.macd_label, row.bb_label,
     row.indicators_json, row.generated_at, row.expires_at]
  );
}

export async function getTaSignalHistory(ticker: string, limit = 10): Promise<TaSignalRow[]> {
  return q<TaSignalRow>(
    `SELECT * FROM datapai.ta_signals WHERE ticker=$1 ORDER BY generated_at DESC LIMIT $2`,
    [ticker.toUpperCase(), limit]
  );
}

// ─── Chart analysis cache ─────────────────────────────────────────────────

export async function getCachedChartAnalysis(ticker: string, timeframe = "1d", maxAgeHours = 24): Promise<ChartAnalysisRow | null> {
  const cutoff = new Date(Date.now() - maxAgeHours * 3_600_000).toISOString();
  const rows = await q<ChartAnalysisRow>(
    `SELECT * FROM datapai.chart_analyses
     WHERE ticker=$1 AND timeframe=$2 AND generated_at > $3
     ORDER BY generated_at DESC LIMIT 1`,
    [ticker.toUpperCase(), timeframe, cutoff]
  );
  return rows[0] ?? null;
}

export async function upsertChartAnalysis(row: Omit<ChartAnalysisRow, "id">): Promise<void> {
  const id = `${row.ticker}_${row.timeframe}_${row.generated_at}`;
  await exec(
    `INSERT INTO datapai.chart_analyses
       (id, ticker, timeframe, chart_b64, analysis_md, indicators_json, generated_at, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (id) DO UPDATE SET
       chart_b64=$4, analysis_md=$5, indicators_json=$6, generated_at=$7, expires_at=$8`,
    [id, row.ticker, row.timeframe, row.chart_b64, row.analysis_md,
     row.indicators_json, row.generated_at, row.expires_at]
  );
}
