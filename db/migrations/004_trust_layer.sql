-- ============================================================
-- PrediMarket — Phase 4: Trust Layer
-- Migration 004: source trust scores, oracle reliability,
--                manipulation alerts, market trust scores
-- ============================================================

-- ─── Source trust scores — dynamic credibility per source ─────────────────
CREATE TABLE IF NOT EXISTS source_trust_scores (
  source_key            TEXT        PRIMARY KEY,
  label                 TEXT,
  base_credibility      FLOAT       NOT NULL DEFAULT 0.50,  -- from sourceRegistry
  current_score         FLOAT       NOT NULL DEFAULT 0.50,  -- live-updated
  resolution_accuracy   FLOAT,                              -- % of aligned resolutions
  correct_signals       INTEGER     NOT NULL DEFAULT 0,
  incorrect_signals     INTEGER     NOT NULL DEFAULT 0,
  total_articles        INTEGER     NOT NULL DEFAULT 0,
  spam_flag             BOOLEAN     NOT NULL DEFAULT FALSE,
  last_feedback_at      TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_source_trust_score ON source_trust_scores (current_score DESC);

-- ─── Oracle reliability — track record per oracle type ────────────────────
CREATE TABLE IF NOT EXISTS oracle_reliability (
  oracle_type           TEXT        PRIMARY KEY,
  total_checks          INTEGER     NOT NULL DEFAULT 0,
  successful_checks     INTEGER     NOT NULL DEFAULT 0,
  failed_checks         INTEGER     NOT NULL DEFAULT 0,
  total_resolutions     INTEGER     NOT NULL DEFAULT 0,
  correct_resolutions   INTEGER     NOT NULL DEFAULT 0,
  avg_response_ms       INTEGER,
  reliability_score     FLOAT       NOT NULL DEFAULT 1.0,  -- 0-1
  last_checked_at       TIMESTAMPTZ,
  last_success_at       TIMESTAMPTZ,
  last_failure_at       TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Oracle verification log — individual check results ───────────────────
CREATE TABLE IF NOT EXISTS oracle_verification_log (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  oracle_type           TEXT        NOT NULL,
  market_id             UUID        REFERENCES markets(id) ON DELETE SET NULL,
  checked_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_ok           BOOLEAN     NOT NULL,
  response_ms           INTEGER,
  value_returned        FLOAT,
  error_message         TEXT,
  expected_outcome      BOOLEAN,                            -- set after market resolves
  actual_outcome        BOOLEAN                             -- set after market resolves
);

CREATE INDEX IF NOT EXISTS idx_oracle_log_type   ON oracle_verification_log (oracle_type, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_oracle_log_market ON oracle_verification_log (market_id);

-- ─── Manipulation alerts ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS manipulation_alerts (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id             UUID        NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  alert_type            TEXT        NOT NULL
    CHECK (alert_type IN ('PROB_SPIKE','SIGNAL_STORM','SOURCE_DOMINANCE','VOLUME_ANOMALY','WASH_TRADE')),
  severity              TEXT        NOT NULL DEFAULT 'LOW'
    CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  description           TEXT        NOT NULL,
  evidence              JSONB       NOT NULL DEFAULT '{}',
  acknowledged          BOOLEAN     NOT NULL DEFAULT FALSE,
  resolved              BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_market    ON manipulation_alerts (market_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_active    ON manipulation_alerts (resolved, severity) WHERE resolved = FALSE;

-- ─── Market trust scores — cached composite scores ────────────────────────
CREATE TABLE IF NOT EXISTS market_trust_scores (
  market_id             UUID        PRIMARY KEY REFERENCES markets(id) ON DELETE CASCADE,
  trust_score           FLOAT       NOT NULL DEFAULT 0.50,   -- 0-1 composite
  source_diversity      FLOAT,
  signal_quality        FLOAT,
  oracle_reliability    FLOAT,
  manipulation_risk     FLOAT,
  consensus_level       FLOAT,
  active_alert_count    INTEGER     NOT NULL DEFAULT 0,
  trust_label           TEXT,  -- UNVERIFIED | LOW | MODERATE | GOOD | HIGH | VERIFIED
  computed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_trust ON market_trust_scores (trust_score DESC);

-- ─── Add trust columns to signals table ───────────────────────────────────
ALTER TABLE signals ADD COLUMN IF NOT EXISTS trust_score   FLOAT;
ALTER TABLE signals ADD COLUMN IF NOT EXISTS decay_factor  FLOAT;
ALTER TABLE signals ADD COLUMN IF NOT EXISTS consensus_sources INTEGER DEFAULT 0;

-- ─── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE source_trust_scores   ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_reliability    ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_verification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE manipulation_alerts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_trust_scores   ENABLE ROW LEVEL SECURITY;

-- Public read (transparency layer)
CREATE POLICY "public_read_source_trust"
  ON source_trust_scores FOR SELECT USING (TRUE);

CREATE POLICY "public_read_oracle_reliability"
  ON oracle_reliability FOR SELECT USING (TRUE);

CREATE POLICY "public_read_market_trust"
  ON market_trust_scores FOR SELECT USING (TRUE);

-- Manipulation alerts: only show non-critical for public
CREATE POLICY "public_read_alerts"
  ON manipulation_alerts FOR SELECT
  USING (severity IN ('LOW','MEDIUM'));

-- ─── Seed oracle reliability rows ─────────────────────────────────────────
INSERT INTO oracle_reliability (oracle_type) VALUES
  ('PRICE_THRESHOLD'),
  ('PRICE_DIRECTION'),
  ('SPORTS_RESULT'),
  ('DATA_RELEASE'),
  ('RATE_CHANGE'),
  ('BOE_PUBLICATION'),
  ('ELECTORAL_RESULT'),
  ('NEWS_CONFIRMATION'),
  ('OFFICIAL_STATEMENT')
ON CONFLICT (oracle_type) DO NOTHING;

-- ─── Add trust job to scheduler ───────────────────────────────────────────
INSERT INTO scheduler_jobs (job_name, status, next_run) VALUES
  ('trust', 'idle', NOW())
ON CONFLICT (job_name) DO NOTHING;
