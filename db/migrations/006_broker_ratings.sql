-- Migration 006: broker_ratings
-- Stores Trustpilot TrustScore and review count per broker over time.
-- Scraped by lib/trustpilot-scanner.ts via TinyFish.

CREATE TABLE IF NOT EXISTS datapai.broker_ratings (
    id              SERIAL PRIMARY KEY,
    broker_id       TEXT        NOT NULL,
    broker_name     TEXT        NOT NULL,
    trustpilot_url  TEXT        NOT NULL,
    score           NUMERIC(3,1) NOT NULL,   -- 0.0–5.0
    review_count    INTEGER      NOT NULL DEFAULT 0,
    scanned_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT broker_ratings_uq UNIQUE (broker_id, scanned_at)
);

-- Latest rating per broker (most common query)
CREATE INDEX IF NOT EXISTS idx_broker_ratings_latest
    ON datapai.broker_ratings (broker_id, scanned_at DESC);

COMMENT ON TABLE datapai.broker_ratings IS
    'Trustpilot TrustScore history per broker. Scraped via TinyFish.';
