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
// Legacy: previously seeded from hardcoded UNIVERSE_ALL arrays.
// Now companies live in ticker_universe + stock_directory tables (DB-driven).
// Kept as a no-op for backward compatibility of callers.
let _seeded = false;
export async function seedCompaniesOnce(): Promise<void> {
  if (_seeded) return;
  _seeded = true;
  // No-op: stocks are now managed via ticker_universe + stock_directory tables.
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
  // Added by migration 005
  stripe_customer_id?: string | null;
  plan?: string;
  plan_status?: string;
  plan_expires_at?: string | null;
  trial_ends_at?: string | null;
  // Added by migration 028 — Early Supporter badge
  badge?: string | null;
  badge_number?: number | null;
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
  const status =
    counts.failed > 0 && counts.scanned === counts.failed
      ? "FAILED"
      : counts.failed > 0
      ? "PARTIAL"
      : "SUCCESS";
  await exec(
    `UPDATE datapai.runs
     SET finished_at=$1, status=$2,
         scanned_count=$3, completed_count=$3, changed_count=$4,
         alerts_created=$5, failed_count=$6
     WHERE id=$7`,
    [finishedAt, status, counts.scanned, counts.changed, counts.alerts, counts.failed, id]
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

/** Returns a set of tickers that have at least one snapshot saved (baseline exists). */
export async function getScannedTickerSet(): Promise<Set<string>> {
  const rows = await q<{ ticker: string }>(`SELECT DISTINCT ticker FROM datapai.snapshots`);
  return new Set(rows.map((r) => r.ticker));
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

export async function lookupStock(symbol: string, lang = "en", exchange?: string): Promise<StockDirectoryEntry | null> {
  const upper = symbol.toUpperCase();
  // Check stock_directory — filter by lang + optional exchange, fallback to 'en'
  const exFilter = exchange ? "AND exchange=$3" : "";
  const exParams = exchange ? [upper, lang, exchange.toUpperCase()] : [upper, lang];

  let rows = await q<StockDirectoryEntry>(
    `SELECT symbol, name, exchange, sector FROM datapai.stock_directory
     WHERE symbol=$1 AND lang=$2 ${exFilter} ORDER BY exchange LIMIT 1`,
    exParams
  );
  if (!rows[0] && lang !== "en") {
    const enParams = exchange ? [upper, "en", exchange.toUpperCase()] : [upper, "en"];
    rows = await q<StockDirectoryEntry>(
      `SELECT symbol, name, exchange, sector FROM datapai.stock_directory
       WHERE symbol=$1 AND lang=$2 ${exFilter} ORDER BY exchange LIMIT 1`,
      enParams
    );
  }
  if (rows[0]) return rows[0];
  // Fallback: ticker_universe (covers indexes like ^GSPC, ^DJI, 000001.SS)
  const uniRows = await q<{ ticker: string; company_name: string; exchange: string }>(
    `SELECT ticker, company_name, exchange FROM datapai.ticker_universe
     WHERE ticker=$1 AND is_active=TRUE LIMIT 1`,
    [upper]
  );
  if (uniRows[0]) {
    return {
      symbol: uniRows[0].ticker,
      name: uniRows[0].company_name,
      exchange: uniRows[0].exchange,
      sector: null,
    } as StockDirectoryEntry;
  }
  return null;
}

export async function searchStocks(query: string, exchange?: string, lang = "en"): Promise<StockDirectoryEntry[]> {
  const upper = query.toUpperCase();
  const like = `${upper}%`;
  const nameLike = `%${upper}%`;
  // Search by symbol prefix OR company name (case-insensitive), filtered by lang
  if (exchange) {
    return q<StockDirectoryEntry>(
      `SELECT symbol, name, exchange, sector FROM datapai.stock_directory
       WHERE exchange=$2 AND lang=$4 AND (symbol LIKE $1 OR UPPER(name) LIKE $3)
       ORDER BY
         CASE WHEN symbol LIKE $1 THEN 0 ELSE 1 END,
         LENGTH(symbol), symbol
       LIMIT 20`,
      [like, exchange, nameLike, lang]
    );
  }
  return q<StockDirectoryEntry>(
    `SELECT symbol, name, exchange, sector FROM datapai.stock_directory
     WHERE lang=$3 AND (symbol LIKE $1 OR UPPER(name) LIKE $2)
     ORDER BY
       CASE WHEN symbol LIKE $1 THEN 0 ELSE 1 END,
       LENGTH(symbol), symbol
     LIMIT 20`,
    [like, nameLike, lang]
  );
}

export async function upsertStockDirectory(entries: StockDirectoryEntry[]): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    for (const e of entries) {
      await client.query(
        `INSERT INTO datapai.stock_directory (symbol, name, exchange, sector, lang)
         VALUES ($1,$2,$3,$4,'en')
         ON CONFLICT (symbol, exchange, lang) DO UPDATE SET name=$2, sector=$4`,
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
    ? await q<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM datapai.stock_directory WHERE exchange=$1 AND lang='en'`, [exchange])
    : await q<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM datapai.stock_directory WHERE lang='en'`);
  return parseInt(rows[0]?.cnt ?? "0");
}

/** Batch lookup localized stock names for a list of symbols. Returns {symbol: name} map. */
export async function getLocalizedNames(symbols: string[], exchange: string, lang = "en"): Promise<Record<string, string>> {
  if (symbols.length === 0) return {};
  const placeholders = symbols.map((_, i) => `$${i + 3}`).join(",");
  const rows = await q<{ symbol: string; name: string }>(
    `SELECT symbol, name FROM datapai.stock_directory
     WHERE exchange=$1 AND lang=$2 AND symbol IN (${placeholders})`,
    [exchange, lang, ...symbols]
  );
  const map: Record<string, string> = {};
  for (const r of rows) map[r.symbol] = r.name;
  return map;
}

/**
 * Load demo stocks for an exchange landing page.
 * Reads from market_demo_stocks (tiny: ~20 rows per market, pre-computed prices).
 * Falls back to ticker_universe + screener_metrics if market_demo_stocks is empty.
 */
export interface ActiveStock {
  symbol: string;
  name: string;
  exchange: string;
  sector: string | null;
  yf_symbol: string;
}

export async function getActiveStocks(exchange: string, lang = "en", limit = 50, featuredOnly = false): Promise<ActiveStock[]> {
  // Intraday price (live) takes priority over market_demo_stocks price (EOD)
  return q<ActiveStock>(
    `SELECT d.ticker AS symbol,
            COALESCE(sd.name, d.company_name, d.ticker) AS name,
            d.exchange,
            COALESCE(sd.sector, d.sector) AS sector,
            COALESCE(tu.yf_symbol, d.ticker) AS yf_symbol,
            COALESCE(live.close, d.price) AS price,
            COALESCE(d.change_1d_pct) AS change_1d_pct
     FROM datapai.market_demo_stocks d
     LEFT JOIN datapai.stock_directory sd
       ON sd.symbol = d.ticker AND sd.exchange = d.exchange AND sd.lang = $2
     LEFT JOIN datapai.ticker_universe tu
       ON tu.ticker = d.ticker AND tu.exchange = d.exchange
     LEFT JOIN LATERAL (
       SELECT close FROM datapai.ohlcv_intraday
       WHERE ticker = d.ticker AND exchange = d.exchange
       ORDER BY ts DESC LIMIT 1
     ) live ON true
     WHERE d.exchange = $1
     ORDER BY d.display_order ASC, d.ticker
     LIMIT $3`,
    [exchange, lang, limit]
  );
}

/** Get total count of active stocks for an exchange. */
export async function countActiveStocks(exchange: string): Promise<number> {
  const rows = await q<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM datapai.ticker_universe WHERE exchange=$1 AND is_active=TRUE`,
    [exchange]
  );
  return parseInt(rows[0]?.cnt ?? "0");
}

// ─── Users & Sessions ─────────────────────────────────────────────────────

export async function createUser(id: string, email: string, passwordHash: string): Promise<void> {
  await exec(
    `INSERT INTO datapai.users (id, email, password_hash, created_at, plan, plan_status)
     VALUES ($1,$2,$3,$4,'watch','active')`,
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

export async function getUserCount(): Promise<number> {
  const rows = await q<{ cnt: string }>(`SELECT COUNT(*)::text AS cnt FROM datapai.users`);
  return parseInt(rows[0]?.cnt ?? "0");
}

export async function assignEarlySupporterBadge(userId: string, badgeNumber: number): Promise<void> {
  await exec(
    `UPDATE datapai.users SET badge = 'early_supporter', badge_number = $2 WHERE id = $1`,
    [userId, badgeNumber]
  );
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

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  await exec(`UPDATE datapai.users SET password_hash=$1 WHERE id=$2`, [passwordHash, userId]);
}

export async function updateUserStripeCustomer(userId: string, stripeCustomerId: string): Promise<void> {
  await exec(`UPDATE datapai.users SET stripe_customer_id=$1 WHERE id=$2`, [stripeCustomerId, userId]);
}

export async function updateUserPlan(
  userId: string,
  plan: string,
  planStatus: string,
  planExpiresAt: string | null
): Promise<void> {
  await exec(
    `UPDATE datapai.users SET plan=$1, plan_status=$2, plan_expires_at=$3 WHERE id=$4`,
    [plan, planStatus, planExpiresAt, userId]
  );
}

export async function getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | null> {
  const rows = await q<User>(
    `SELECT * FROM datapai.users WHERE stripe_customer_id=$1`, [stripeCustomerId]
  );
  return rows[0] ?? null;
}

// ─── Password reset tokens ────────────────────────────────────────────────

export async function createPasswordResetToken(userId: string, tokenHash: string): Promise<void> {
  // Invalidate any existing unused tokens for this user first
  await exec(
    `UPDATE datapai.password_reset_tokens SET used=TRUE WHERE user_id=$1 AND used=FALSE`,
    [userId]
  );
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
  await exec(
    `INSERT INTO datapai.password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );
}

export async function getPasswordResetToken(tokenHash: string): Promise<{ user_id: string; expires_at: string; used: boolean } | null> {
  const rows = await q<{ user_id: string; expires_at: string; used: boolean }>(
    `SELECT user_id, expires_at, used FROM datapai.password_reset_tokens
     WHERE token_hash=$1`,
    [tokenHash]
  );
  return rows[0] ?? null;
}

export async function markPasswordResetTokenUsed(tokenHash: string): Promise<void> {
  await exec(
    `UPDATE datapai.password_reset_tokens SET used=TRUE WHERE token_hash=$1`,
    [tokenHash]
  );
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

export interface TickerPrice {
  ticker: string;
  close: number;
  prev_close: number;
  change_pct: number;
  trade_date: string;
}

export async function getLatestPricesForWatchlist(
  items: { symbol: string; exchange: string }[]
): Promise<Record<string, TickerPrice>> {
  if (!items.length) return {};
  const symbols = items.map(i => i.symbol);
  // Simple: just read latest intraday bar per ticker.
  // The EOD pipeline inserts a closing bar (16:00) into ohlcv_intraday
  // after fetching the correct daily close from Yahoo, so this always
  // returns the right price — live during trading, correct close after EOD.
  // change_pct: vs previous day's EOD close from datapai.prices.
  const rows = await q<TickerPrice>(
    `WITH latest AS (
       SELECT DISTINCT ON (ticker)
              ticker, close, ts::text AS trade_date
       FROM datapai.ohlcv_intraday
       WHERE ticker = ANY($1)
       ORDER BY ticker, ts DESC
     ),
     prev_eod AS (
       SELECT DISTINCT ON (ticker)
              ticker, close
       FROM datapai.prices
       WHERE ticker = ANY($1)
         AND trade_date::date < CURRENT_DATE
       ORDER BY ticker, trade_date DESC
     )
     SELECT l.ticker,
            l.close,
            COALESCE(pe.close, l.close) AS prev_close,
            CASE WHEN pe.close IS NOT NULL AND pe.close <> 0
                 THEN ROUND(((l.close - pe.close) / pe.close * 100)::numeric, 2)
                 ELSE 0
            END AS change_pct,
            l.trade_date
     FROM latest l
     LEFT JOIN prev_eod pe ON pe.ticker = l.ticker`,
    [symbols]
  );
  const result: Record<string, TickerPrice> = {};
  for (const r of rows) result[r.ticker] = r;
  return result;
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

// ── User scan log (daily quota) ───────────────────────────────────────────────

export async function logUserScan(userId: string, symbol: string): Promise<void> {
  await exec(
    `INSERT INTO datapai.user_scan_log (user_id, symbol) VALUES ($1, $2)`,
    [userId, symbol.toUpperCase()]
  );
}

export async function getUserScanCountToday(userId: string): Promise<number> {
  const rows = await q<{ cnt: string }>(
    `SELECT COUNT(*)::text AS cnt FROM datapai.user_scan_log
     WHERE user_id = $1 AND scanned_at >= date_trunc('day', now() AT TIME ZONE 'UTC')`,
    [userId]
  );
  return parseInt(rows[0]?.cnt ?? "0", 10);
}

// ── Material Events (Breaking News) ──────────────────────────────────────

export interface MaterialEventRow {
  id: number;
  ticker: string;
  exchange: string;
  event_type: string;
  severity: string;
  sentiment: string;
  headline: string;
  summary: string;
  source_url: string;
  source_name: string;
  published_at: string | null;
  detected_at: string;
}

/** Get recent material events for a single ticker (default last 72h). */
export async function getLatestMaterialEvents(
  ticker: string,
  exchange?: string,
  hours = 72,
  limit = 10
): Promise<MaterialEventRow[]> {
  if (exchange) {
    // Normalize exchange: NASDAQ/NYSE → US to match DB convention
    const dbExchange = (exchange === "NASDAQ" || exchange === "NYSE") ? "US" : exchange;
    return q<MaterialEventRow>(
      `SELECT id, ticker, exchange, event_type, severity, sentiment,
              headline, summary, source_url, source_name,
              published_at::text, detected_at::text
       FROM datapai.material_events
       WHERE ticker = $1 AND exchange = $2
         AND detected_at > NOW() - INTERVAL '1 hour' * $3
       ORDER BY detected_at DESC
       LIMIT $4`,
      [ticker, dbExchange, hours, limit]
    );
  }
  return q<MaterialEventRow>(
    `SELECT id, ticker, exchange, event_type, severity, sentiment,
            headline, summary, source_url, source_name,
            published_at::text, detected_at::text
     FROM datapai.material_events
     WHERE ticker = $1
       AND detected_at > NOW() - INTERVAL '1 hour' * $2
     ORDER BY detected_at DESC
     LIMIT $3`,
    [ticker, hours, limit]
  );
}

/** Bulk fetch CRITICAL/HIGH material events for multiple tickers (for watchlist). */
export async function getMaterialEventsForTickers(
  tickers: { symbol: string; exchange: string }[],
  hours = 72
): Promise<Record<string, MaterialEventRow[]>> {
  if (!tickers.length) return {};
  // Build pairs of (ticker, exchange) — also try .AX suffix for ASX
  const allTickers: string[] = [];
  const symbolToTickers: Record<string, string[]> = {};
  for (const t of tickers) {
    const candidates = [t.symbol];
    if (t.exchange === "ASX") candidates.push(`${t.symbol}.AX`);
    if (t.exchange === "HOSE") candidates.push(`${t.symbol}.VN`);
    if (t.exchange === "HKEX") candidates.push(`${t.symbol}.HK`);
    if (t.exchange === "SET") candidates.push(`${t.symbol}.BK`);
    if (t.exchange === "KLSE") candidates.push(`${t.symbol}.KL`);
    if (t.exchange === "IDX") candidates.push(`${t.symbol}.JK`);
    if (t.exchange === "LSE") candidates.push(`${t.symbol}.L`);
    symbolToTickers[t.symbol] = candidates;
    allTickers.push(...candidates);
  }
  const unique = [...new Set(allTickers)];
  const placeholders = unique.map((_, i) => `$${i + 1}`).join(",");
  const rows = await q<MaterialEventRow>(
    `SELECT id, ticker, exchange, event_type, severity, sentiment,
            headline, summary, source_url, source_name,
            published_at::text, detected_at::text
     FROM datapai.material_events
     WHERE ticker IN (${placeholders})
       AND severity IN ('CRITICAL', 'HIGH', 'MEDIUM')
       AND detected_at > NOW() - INTERVAL '${hours} hours'
     ORDER BY detected_at DESC`,
    unique
  );
  // Group by original watchlist symbol
  const result: Record<string, MaterialEventRow[]> = {};
  const byTicker: Record<string, MaterialEventRow[]> = {};
  for (const r of rows) {
    if (!byTicker[r.ticker]) byTicker[r.ticker] = [];
    byTicker[r.ticker].push(r);
  }
  for (const t of tickers) {
    const candidates = symbolToTickers[t.symbol] || [t.symbol];
    for (const c of candidates) {
      if (byTicker[c]) {
        if (!result[t.symbol]) result[t.symbol] = [];
        result[t.symbol].push(...byTicker[c]);
      }
    }
  }
  return result;
}

// ── Stock Synthesis (AG2 multi-agent) ─────────────────────────────────────

export interface StockSynthesis {
  ticker: string;
  exchange: string;
  direction: string;
  confidence: number;
  conviction: string;
  thesis: string;
  what_bulls_say: string;
  what_bears_say: string;
  key_risk: string;
  computed_at: string;
}

export async function getStockSynthesis(ticker: string, exchange: string): Promise<StockSynthesis | null> {
  const rows = await q<StockSynthesis>(
    `SELECT * FROM datapai.stock_synthesis
     WHERE ticker=$1 AND exchange=$2
     ORDER BY computed_at DESC LIMIT 1`,
    [ticker, exchange]
  );
  return rows[0] ?? null;
}

export async function getStockSynthesisFlexible(symbol: string, exchange: string): Promise<StockSynthesis | null> {
  // Try exact match first
  let result = await getStockSynthesis(symbol, exchange);
  if (result) return result;
  // Try with exchange-specific yfinance suffix
  const suffixMap: Record<string, string> = {
    ASX: ".AX", HOSE: ".VN", HKEX: ".HK", SET: ".BK", KLSE: ".KL", IDX: ".JK", SSE: ".SS", SZSE: ".SZ", LSE: ".L",
  };
  const suffix = suffixMap[exchange];
  if (suffix) {
    result = await getStockSynthesis(`${symbol}${suffix}`, exchange);
    if (result) return result;
  }
  // US: try without exchange variants
  if (!suffix) {
    for (const ex of ["US", "NASDAQ", "NYSE"]) {
      result = await getStockSynthesis(symbol, ex);
      if (result) return result;
    }
  }
  return null;
}

export async function getAllWatchlistTickers(): Promise<WatchlistItem[]> {
  return q<WatchlistItem>(
    `SELECT DISTINCT ON (symbol) user_id, symbol, exchange, name, added_at
     FROM datapai.watchlist
     ORDER BY symbol, added_at DESC`,
    []
  );
}

// ─── Intraday OHLCV ──────────────────────────────────────────────────────

export interface IntradayBar {
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function getIntradayBars(ticker: string, exchange: string, days: number = 5): Promise<IntradayBar[]> {
  return q<IntradayBar>(
    `SELECT ts::text, open, high, low, close, volume
     FROM datapai.ohlcv_intraday
     WHERE ticker = $1
       AND exchange = $2
     ORDER BY ts ASC`,
    [ticker, exchange]
  );
}

// ─── Stock Fundamentals Snapshot ──────────────────────────────────────────

export interface StockFundamentals {
  ticker: string;
  exchange: string;
  market_cap: number | null;
  pe_ttm: number | null;
  pe_forward: number | null;
  pb_ratio: number | null;
  ps_ratio: number | null;
  beta: number | null;
  dividend_yield: number | null;
  dividend_rate: number | null;
  fifty_two_week_high: number | null;
  fifty_two_week_low: number | null;
  shares_outstanding: number | null;
  float_shares: number | null;
  avg_volume_10d: number | null;
  sector: string | null;
  industry: string | null;
  currency: string | null;
  profit_margin: number | null;
  return_on_equity: number | null;
  debt_to_equity: number | null;
  revenue_ttm: number | null;
  net_income_ttm: number | null;
  earnings_growth: number | null;
  revenue_growth: number | null;
  current_ratio: number | null;
  updated_at: string | null;
}

export async function getStockFundamentals(ticker: string, exchange: string): Promise<StockFundamentals | null> {
  const suffixMap: Record<string, string> = { ASX: ".AX", HOSE: ".VN", HKEX: ".HK", SET: ".BK", KLSE: ".KL", IDX: ".JK", SSE: ".SS", SZSE: ".SZ", LSE: ".L" };
  const candidates = [ticker];
  const suffix = suffixMap[exchange];
  if (suffix) candidates.push(ticker.replace(suffix, ""));

  const placeholders = candidates.map((_, i) => `$${i + 1}`).join(",");
  const rows = await q<StockFundamentals>(
    `SELECT * FROM datapai.stock_fundamentals
     WHERE ticker IN (${placeholders}) AND exchange = $${candidates.length + 1}
     LIMIT 1`,
    [...candidates, exchange]
  );
  return rows[0] ?? null;
}

// ─── Regional Pricing ─────────────────────────────────────────────────────

export interface PricingTier {
  tier_id: string;
  region: string;
  currency: string;
  currency_symbol: string;
  monthly_price: number;
  annual_price: number;
  stripe_price_monthly: string | null;
  stripe_price_annual: string | null;
  trial_days: number;
}

/** Get pricing tiers for a region (lang code). Falls back to 'en' if region not found. */
export async function getPricingTiers(region: string): Promise<PricingTier[]> {
  let rows = await q<PricingTier>(
    `SELECT tier_id, region, currency, currency_symbol,
            monthly_price::float, annual_price::float,
            stripe_price_monthly, stripe_price_annual, trial_days
     FROM datapai.sys_pricing_tiers
     WHERE region = $1 AND is_active = true
     ORDER BY monthly_price`,
    [region]
  );
  // Fallback to English if no rows for this region
  if (rows.length === 0 && region !== "en") {
    rows = await q<PricingTier>(
      `SELECT tier_id, region, currency, currency_symbol,
              monthly_price::float, annual_price::float,
              stripe_price_monthly, stripe_price_annual, trial_days
       FROM datapai.sys_pricing_tiers
       WHERE region = 'en' AND is_active = true
       ORDER BY monthly_price`,
      []
    );
  }
  return rows;
}

/** Get a single pricing tier for checkout. */
export async function getPricingTier(tierId: string, region: string): Promise<PricingTier | null> {
  const rows = await q<PricingTier>(
    `SELECT tier_id, region, currency, currency_symbol,
            monthly_price::float, annual_price::float,
            stripe_price_monthly, stripe_price_annual, trial_days
     FROM datapai.sys_pricing_tiers
     WHERE tier_id = $1 AND region = $2 AND is_active = true`,
    [tierId, region]
  );
  if (rows[0]) return rows[0];
  // Fallback to en
  if (region !== "en") {
    const fallback = await q<PricingTier>(
      `SELECT tier_id, region, currency, currency_symbol,
              monthly_price::float, annual_price::float,
              stripe_price_monthly, stripe_price_annual, trial_days
       FROM datapai.sys_pricing_tiers
       WHERE tier_id = $1 AND region = 'en' AND is_active = true`,
      [tierId]
    );
    return fallback[0] ?? null;
  }
  return null;
}
