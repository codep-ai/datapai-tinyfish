#!/bin/bash
# Clear all scan data for ASX stocks so they get a fresh baseline
# with the new proper IR page URLs.
# Run on EC2: bash scripts/clear-asx-data.sh
# The service does NOT need to be stopped — these are just DELETEs.

DB="${1:-/home/ubuntu/datapai-tinyfish/data/tinyfish.db}"
ASX_TICKERS="'BHP','CBA','CSL','NAB','ANZ','WBC','WES','MQG','TLS','WOW','RIO','FMG','TWE','GMG','STO','ORG','WDS','NCM'"

echo "=== Clearing ASX scan data from: $DB ==="

sqlite3 "$DB" <<SQL
PRAGMA foreign_keys = OFF;

-- 1. Delete analyses linked to ASX snapshots
DELETE FROM analyses
WHERE snapshot_new_id IN (
  SELECT id FROM snapshots WHERE ticker IN ($ASX_TICKERS)
);

-- 2. Delete diffs linked to ASX snapshots
DELETE FROM diffs
WHERE snapshot_new_id IN (
  SELECT id FROM snapshots WHERE ticker IN ($ASX_TICKERS)
)
OR snapshot_old_id IN (
  SELECT id FROM snapshots WHERE ticker IN ($ASX_TICKERS)
);

-- 3. Delete scan_events for ASX tickers
DELETE FROM scan_events WHERE ticker IN ($ASX_TICKERS);

-- 4. Delete the snapshots themselves
DELETE FROM snapshots WHERE ticker IN ($ASX_TICKERS);

-- 5. Delete price cache for ASX tickers
DELETE FROM prices WHERE ticker IN ($ASX_TICKERS);

PRAGMA foreign_keys = ON;

-- Confirm counts
SELECT 'snapshots remaining for ASX: ' || COUNT(*)
FROM snapshots WHERE ticker IN ($ASX_TICKERS);

SELECT 'analyses remaining for ASX: ' || COUNT(*)
FROM analyses
WHERE snapshot_new_id IN (
  SELECT id FROM snapshots WHERE ticker IN ($ASX_TICKERS)
);
SQL

echo "=== Done. ASX stocks are cleared — rescan to populate with new IR page URLs. ==="
