-- Migration 005: broker_snapshots
-- Stores TinyFish scan results for broker fee pages.
-- Used by lib/broker-scanner.ts to track fee changes and flag discrepancies
-- vs the static data in lib/brokers.ts.

CREATE TABLE IF NOT EXISTS datapai.broker_snapshots (
    id              SERIAL PRIMARY KEY,

    -- Broker identity
    broker_id       TEXT        NOT NULL,   -- matches Broker.id in lib/brokers.ts
    market          TEXT        NOT NULL,   -- "US" or "AU"
    fee_page_url    TEXT        NOT NULL,

    -- Page content fingerprint (first 16 chars of SHA-256)
    page_hash       TEXT        NOT NULL,
    -- Raw page text snippet for audit trail (2000 chars max)
    page_text_snippet TEXT,

    -- LLM-extracted fee data (JSON object matching BrokerExtracted interface)
    extracted_fees  JSONB       NOT NULL DEFAULT '{}',

    -- Discrepancies vs lib/brokers.ts at scan time (array of {field, inConfig, onWebsite})
    discrepancies   JSONB       NOT NULL DEFAULT '[]',

    scanned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT broker_snapshots_broker_scan_uq UNIQUE (broker_id, scanned_at)
);

-- Fast lookup of latest snapshot per broker
CREATE INDEX IF NOT EXISTS idx_broker_snapshots_broker_id
    ON datapai.broker_snapshots (broker_id, scanned_at DESC);

-- Fast lookup of all unresolved discrepancies
CREATE INDEX IF NOT EXISTS idx_broker_snapshots_discrepancies
    ON datapai.broker_snapshots USING GIN (discrepancies)
    WHERE jsonb_array_length(discrepancies) > 0;

COMMENT ON TABLE datapai.broker_snapshots IS
    'TinyFish scan history for broker fee pages. Each row is one scan run per broker.';
