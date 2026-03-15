-- =============================================================================
-- Migration 005: auth extensions
--   - password_reset_tokens  (forgot-password flow)
--   - mfa_secrets            (TOTP multi-factor auth)
--   - users plan columns     (Stripe subscription tracking)
--
-- Apply:
--   psql $DATABASE_URL -f db/migrations/005_auth_extensions.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- password_reset_tokens
-- One-time tokens emailed to users who request a password reset.
-- Tokens expire after 1 hour; used=true means already consumed.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS datapai.password_reset_tokens (
    id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id     TEXT        NOT NULL,
    token_hash  TEXT        NOT NULL UNIQUE,   -- SHA-256 of the raw token
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON datapai.password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_prt_user_id    ON datapai.password_reset_tokens(user_id);

-- ---------------------------------------------------------------------------
-- mfa_secrets
-- TOTP secrets for authenticator-app MFA.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS datapai.mfa_secrets (
    user_id     TEXT        PRIMARY KEY,
    secret      TEXT        NOT NULL,          -- base32-encoded TOTP secret (encrypted at rest if possible)
    enabled     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    enabled_at  TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- Add subscription columns to users table (if not already present)
-- ---------------------------------------------------------------------------
ALTER TABLE datapai.users
    ADD COLUMN IF NOT EXISTS stripe_customer_id  TEXT,
    ADD COLUMN IF NOT EXISTS plan                TEXT    NOT NULL DEFAULT 'watch',
    ADD COLUMN IF NOT EXISTS plan_status         TEXT    NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS plan_expires_at     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS trial_ends_at       TIMESTAMPTZ;

COMMENT ON COLUMN datapai.users.plan IS 'watch | individual | professional | business | enterprise';
COMMENT ON COLUMN datapai.users.plan_status IS 'active | trialing | past_due | canceled';
