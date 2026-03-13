-- =============================================================================
-- DataP.ai × TinyFish  —  PostgreSQL Schema
-- =============================================================================
--
-- Schema   : datapai
-- Database : postgres  (default)
-- Host     : 172.28.0.3 (EC2 Docker — lightdash_db_1 container)
--
-- Applies to both services that share this Postgres instance:
--   • datapai-tinyfish   (Next.js 16, node-postgres / pg)
--   • datapai-streamlit  (Python FastAPI, psycopg2)
--
-- Usage
-- -----
--   psql -h 172.28.0.3 -U postgres -d postgres -f schema.sql
--
--   Or via Docker on EC2:
--   docker exec -i lightdash_db_1 psql -U postgres -d postgres < schema.sql
--
-- All statements use IF NOT EXISTS / ON CONFLICT so the script is safe to
-- re-run on an existing database (idempotent).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS datapai;

SET search_path = datapai, public;


-- ===========================================================================
-- GROUP 1 — Scan Pipeline (owned by datapai-tinyfish / Next.js)
--           Mirrors the original SQLite schema from radar_v2.db
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- companies  — universe of monitored tickers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS datapai.companies (
    ticker          TEXT        NOT NULL,
    name            TEXT        NOT NULL,
    website_root    TEXT,
    page_urls_json  TEXT        NOT NULL DEFAULT '[]',

    CONSTRAINT companies_pkey PRIMARY KEY (ticker)
);


-- ---------------------------------------------------------------------------
-- runs  — one row per full pipeline scan run
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS datapai.runs (
    id               TEXT    NOT NULL,
    started_at       TEXT    NOT NULL,
    finished_at      TEXT,
    status           TEXT    NOT NULL DEFAULT 'PENDING',   -- PENDING | RUNNING | SUCCESS | FAILED
    tinyfish_run_ref TEXT,
    notes            TEXT,
    planned_count    INTEGER          DEFAULT 0,
    completed_count  INTEGER          DEFAULT 0,
    scanned_count    INTEGER          DEFAULT 0,
    changed_count    INTEGER          DEFAULT 0,
    alerts_created   INTEGER          DEFAULT 0,
    failed_count     INTEGER          DEFAULT 0,

    CONSTRAINT runs_pkey PRIMARY KEY (id)
);


-- ---------------------------------------------------------------------------
-- snapshots  — one row per IR page fetch per ticker per run
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS datapai.snapshots (
    id                  TEXT    NOT NULL,
    run_id              TEXT,               -- FK → runs.id
    ticker              TEXT,
    url                 TEXT    NOT NULL,
    fetched_at          TEXT    NOT NULL,
    final_url           TEXT,
    title               TEXT,
    text                TEXT    NOT NULL DEFAULT '',
    cleaned_text        TEXT    NOT NULL DEFAULT '',
    content_hash        TEXT    NOT NULL DEFAULT '',
    word_count          INTEGER          DEFAULT 0,
    extractor           TEXT             DEFAULT 'tinyfish',
    quality_flags_json  TEXT,

    CONSTRAINT snapshots_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_snap_ticker_fetched
    ON datapai.snapshots (ticker, fetched_at DESC);


-- ---------------------------------------------------------------------------
-- diffs  — text diff between two consecutive snapshots
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS datapai.diffs (
    id               TEXT              NOT NULL,
    snapshot_new_id  TEXT,             -- FK → snapshots.id
    snapshot_old_id  TEXT,             -- FK → snapshots.id
    similarity       DOUBLE PRECISION,
    changed_pct      DOUBLE PRECISION,
    added_lines      INTEGER,
    removed_lines    INTEGER,
    snippet          TEXT,

    CONSTRAINT diffs_pkey PRIMARY KEY (id)
);


-- ---------------------------------------------------------------------------
-- analyses  — AI signal analysis result for a diff
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS datapai.analyses (
    id                          TEXT              NOT NULL,
    snapshot_new_id             TEXT,             -- FK → snapshots.id
    diff_id                     TEXT,             -- FK → diffs.id

    -- Rule-based scoring
    commitment_delta            DOUBLE PRECISION,
    hedging_delta               DOUBLE PRECISION,
    risk_delta                  DOUBLE PRECISION,
    alert_score                 DOUBLE PRECISION,
    confidence                  DOUBLE PRECISION,
    categories_json             TEXT,
    llm_summary_paid            TEXT,
    llm_summary_private         TEXT,
    reasoning_evidence_json     TEXT,
    signal_type                 TEXT             DEFAULT 'CONTENT_CHANGE',

    -- Agent outputs (v1.0+)
    agent_signal_type           TEXT,            -- BEARISH_SIGNAL | BULLISH_SIGNAL | NO_SIGNAL | etc.
    agent_severity              TEXT,            -- HIGH | MEDIUM | LOW
    agent_confidence            DOUBLE PRECISION,
    agent_financial_relevance   TEXT,
    agent_evidence_json         TEXT,
    validation_status           TEXT,
    validation_summary          TEXT,
    validation_evidence_json    TEXT,
    agent_what_changed          TEXT,
    agent_why_matters           TEXT,

    -- Signal quality filter (v1.5+)
    change_type                 TEXT             DEFAULT 'CONTENT_CHANGE', -- CONTENT | ARCHIVE | LAYOUT
    change_quality_score        DOUBLE PRECISION,
    financial_relevance_score   DOUBLE PRECISION,
    investigation_summary       TEXT,
    investigation_sources       TEXT,
    corroborating_count         INTEGER          DEFAULT 0,

    CONSTRAINT analyses_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_analyses_snap
    ON datapai.analyses (snapshot_new_id);


-- ---------------------------------------------------------------------------
-- scan_events  — step-level execution log (for progress streaming)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS datapai.scan_events (
    id          TEXT    NOT NULL,
    run_id      TEXT,                       -- FK → runs.id
    ticker      TEXT,
    step        TEXT    NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'start',  -- start | done | error
    message     TEXT,
    created_at  TEXT    NOT NULL,

    CONSTRAINT scan_events_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_scan_events_run
    ON datapai.scan_events (run_id, ticker, created_at);


-- ---------------------------------------------------------------------------
-- prices  — end-of-day price cache (yfinance / Polygon)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS datapai.prices (
    ticker  TEXT              NOT NULL,
    date    TEXT              NOT NULL,      -- ISO date string YYYY-MM-DD
    close   DOUBLE PRECISION,
    volume  DOUBLE PRECISION,

    CONSTRAINT prices_pkey PRIMARY KEY (ticker, date)
);


-- ---------------------------------------------------------------------------
-- stock_directory  — searchable stock universe (seeded from ASX/NASDAQ lists)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS datapai.stock_directory (
    symbol    TEXT NOT NULL,
    name      TEXT NOT NULL,
    exchange  TEXT NOT NULL,
    sector    TEXT,

    CONSTRAINT stock_directory_pkey PRIMARY KEY (symbol, exchange)
);

CREATE INDEX IF NOT EXISTS idx_stock_dir_symbol
    ON datapai.stock_directory (symbol);


-- ===========================================================================
-- GROUP 2 — TA Signal & Chart Analysis Cache
--           Written by Python FastAPI (tinyfish_api.py) and
--           read by both Next.js pages and Python chat context builder
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- ta_signals  — cached technical analysis signal per ticker
--              (RSI, MACD, Bollinger, trend — generated by agents/technical_analysis.py)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS datapai.ta_signals (
    id              TEXT              NOT NULL,
    ticker          TEXT              NOT NULL,
    exchange        TEXT              NOT NULL DEFAULT 'US',
    signal_md       TEXT              NOT NULL,   -- Full markdown signal report
    current_price   DOUBLE PRECISION,
    change_pct      DOUBLE PRECISION,
    rsi             DOUBLE PRECISION,
    rsi_label       TEXT,                         -- OVERSOLD | NEUTRAL | OVERBOUGHT
    trend           TEXT,                         -- BULLISH | BEARISH | NEUTRAL
    macd_label      TEXT,                         -- BULLISH_CROSS | BEARISH_CROSS | NEUTRAL
    bb_label        TEXT,                         -- ABOVE_UPPER | BELOW_LOWER | WITHIN_BANDS
    indicators_json TEXT,                         -- Full indicators payload (JSON)
    generated_at    TEXT              NOT NULL,
    expires_at      TEXT              NOT NULL,

    CONSTRAINT ta_signals_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_ta_signals_ticker
    ON datapai.ta_signals (ticker, generated_at DESC);


-- ---------------------------------------------------------------------------
-- chart_analyses  — cached AI chart vision analysis (base64 chart + markdown)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS datapai.chart_analyses (
    id              TEXT    NOT NULL,
    ticker          TEXT    NOT NULL,
    timeframe       TEXT    NOT NULL DEFAULT '1d',   -- 5m | 30m | 1h | 1d
    chart_b64       TEXT    NOT NULL,                -- Base64-encoded chart PNG
    analysis_md     TEXT    NOT NULL,                -- AI markdown analysis
    indicators_json TEXT,
    generated_at    TEXT    NOT NULL,
    expires_at      TEXT    NOT NULL,

    CONSTRAINT chart_analyses_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_chart_analyses_ticker
    ON datapai.chart_analyses (ticker, generated_at DESC);


-- ===========================================================================
-- GROUP 3 — Auth & Watchlist (owned by datapai-tinyfish / Next.js)
--           Separate from Python user system — uses text UUIDs for user.id
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- users  — Next.js auth users (PBKDF2-SHA512 passwords)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS datapai.users (
    id             TEXT NOT NULL,
    email          TEXT NOT NULL,
    password_hash  TEXT NOT NULL,
    created_at     TEXT NOT NULL,

    CONSTRAINT users_pkey      PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email)
);


-- ---------------------------------------------------------------------------
-- sessions  — server-side session tokens (30-day TTL)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS datapai.sessions (
    token       TEXT NOT NULL,
    user_id     TEXT NOT NULL,   -- FK → users.id
    expires_at  TEXT NOT NULL,
    created_at  TEXT NOT NULL,

    CONSTRAINT sessions_pkey PRIMARY KEY (token)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user
    ON datapai.sessions (user_id);


-- ---------------------------------------------------------------------------
-- watchlist  — per-user stock watchlist
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS datapai.watchlist (
    user_id   TEXT NOT NULL,       -- FK → users.id
    symbol    TEXT NOT NULL,
    exchange  TEXT NOT NULL DEFAULT 'US',
    name      TEXT,
    added_at  TEXT NOT NULL,

    CONSTRAINT watchlist_pkey PRIMARY KEY (user_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user
    ON datapai.watchlist (user_id);


-- ===========================================================================
-- GROUP 4 — AI Stock Chat (owned by datapai-streamlit / Python FastAPI)
--           Uses integer user IDs from the Python auth system
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- chat_sessions  — one conversation thread per (user, ticker)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS datapai.chat_sessions (
    id          UUID                     NOT NULL DEFAULT gen_random_uuid(),
    user_id     INTEGER                  NOT NULL,   -- Python-side user ID
    ticker      VARCHAR(20)              NOT NULL,
    exchange    VARCHAR(10)                       DEFAULT 'US',
    title       TEXT,
    created_at  TIMESTAMP WITH TIME ZONE          DEFAULT now(),
    updated_at  TIMESTAMP WITH TIME ZONE          DEFAULT now(),

    CONSTRAINT chat_sessions_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_ticker
    ON datapai.chat_sessions (user_id, ticker);


-- ---------------------------------------------------------------------------
-- chat_messages  — individual messages within a session
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS datapai.chat_messages_id_seq;

CREATE TABLE IF NOT EXISTS datapai.chat_messages (
    id               BIGINT                   NOT NULL DEFAULT nextval('datapai.chat_messages_id_seq'),
    session_id       UUID                     NOT NULL,   -- FK → chat_sessions.id
    role             VARCHAR(10)              NOT NULL,   -- user | assistant
    content          TEXT                     NOT NULL,
    model_used       VARCHAR(50),
    tokens_used      INTEGER,
    context_sources  JSONB                             DEFAULT '[]',
    created_at       TIMESTAMP WITH TIME ZONE          DEFAULT now(),

    CONSTRAINT chat_messages_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session
    ON datapai.chat_messages (session_id, created_at);


-- ---------------------------------------------------------------------------
-- ticker_context_cache  — short-lived RAG context cache
--                         (IR snapshots, TA signals, etc. — keyed by ticker+type)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS datapai.ticker_context_cache (
    ticker        VARCHAR(20)              NOT NULL,
    context_type  VARCHAR(30)              NOT NULL,   -- ir_snapshot | ta_signal | ...
    content       TEXT                     NOT NULL,
    metadata      JSONB                             DEFAULT '{}',
    created_at    TIMESTAMP WITH TIME ZONE          DEFAULT now(),
    expires_at    TIMESTAMP WITH TIME ZONE,

    CONSTRAINT ticker_context_cache_pkey PRIMARY KEY (ticker, context_type)
);


-- ---------------------------------------------------------------------------
-- user_profiles  — per-user AI chat preferences (Python user system)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS datapai.user_profiles (
    user_id          INTEGER                  NOT NULL,
    portfolio_tickers TEXT[]                           DEFAULT '{}',
    risk_tolerance   VARCHAR(20)                       DEFAULT 'moderate',   -- conservative | moderate | aggressive
    investment_style VARCHAR(40)                       DEFAULT 'general',
    preferred_lang   VARCHAR(5)                        DEFAULT 'en',
    custom_context   JSONB                             DEFAULT '{}',
    created_at       TIMESTAMP WITH TIME ZONE          DEFAULT now(),
    updated_at       TIMESTAMP WITH TIME ZONE          DEFAULT now(),

    CONSTRAINT user_profiles_pkey PRIMARY KEY (user_id)
);


-- =============================================================================
-- End of schema.sql
-- =============================================================================
