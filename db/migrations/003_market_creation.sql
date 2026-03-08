-- ============================================================
-- PrediMarket — Phase 3: Market Creation Engine
-- Migration 003: market_candidates, lifecycle states,
--                oracle_type + resolution_method on markets
-- ============================================================

-- ─── Safely expand markets.status constraint ──────────────────────────────
-- Existing values: ACTIVE, CLOSED, RESOLVED
-- New values: CANDIDATE, ARCHIVED

ALTER TABLE markets DROP CONSTRAINT IF EXISTS markets_status_check;
ALTER TABLE markets ADD CONSTRAINT markets_status_check
  CHECK (status IN ('CANDIDATE','ACTIVE','CLOSED','RESOLVED','ARCHIVED'));

-- ─── Add oracle metadata columns to markets ───────────────────────────────
ALTER TABLE markets ADD COLUMN IF NOT EXISTS oracle_type      TEXT;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS resolution_method TEXT;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS source_candidate_id UUID;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS auto_created     BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS relevance_score  FLOAT;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS archived_at      TIMESTAMPTZ;

-- ─── Market candidates table ───────────────────────────────────────────────
-- Stores detected market opportunities before they are validated + created

CREATE TABLE IF NOT EXISTS market_candidates (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     TEXT        NOT NULL,
  category        TEXT        NOT NULL,
  question        TEXT        NOT NULL,   -- filled template question
  description     TEXT,                  -- filled template description
  oracle_type     TEXT        NOT NULL,
  resolution_method TEXT,
  duration_hours  INTEGER     NOT NULL DEFAULT 168,
  entities        JSONB       NOT NULL DEFAULT '{}',   -- entity values used
  source_articles JSONB       NOT NULL DEFAULT '[]',   -- article IDs that triggered this
  relevance_score FLOAT,                               -- from marketScorer
  news_volume     INTEGER     DEFAULT 0,
  source_quality  FLOAT,
  entity_importance FLOAT,
  novelty_score   FLOAT,

  -- Validation
  status          TEXT        NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','APPROVED','REJECTED','DUPLICATE','CREATED')),
  rejection_reason TEXT,
  validated_at    TIMESTAMPTZ,

  -- Lifecycle
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,           -- auto-reject if not acted on
  market_id       UUID        REFERENCES markets(id) ON DELETE SET NULL  -- set when created
);

CREATE INDEX IF NOT EXISTS idx_candidates_status
  ON market_candidates (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_candidates_category
  ON market_candidates (category, status);

CREATE INDEX IF NOT EXISTS idx_candidates_template
  ON market_candidates (template_id, created_at DESC);

-- ─── Market lifecycle events log ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_lifecycle_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id   UUID        REFERENCES markets(id) ON DELETE CASCADE,
  candidate_id UUID       REFERENCES market_candidates(id) ON DELETE SET NULL,
  from_state  TEXT,
  to_state    TEXT        NOT NULL,
  reason      TEXT,
  triggered_by TEXT,      -- 'auto' | 'oracle' | 'admin' | 'scheduler'
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_market
  ON market_lifecycle_events (market_id, created_at DESC);

-- ─── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE market_candidates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_lifecycle_events  ENABLE ROW LEVEL SECURITY;

-- Public read for approved candidates and lifecycle events
CREATE POLICY "public_read_candidates"
  ON market_candidates FOR SELECT
  USING (status IN ('APPROVED','CREATED'));

CREATE POLICY "public_read_lifecycle"
  ON market_lifecycle_events FOR SELECT USING (TRUE);

-- ─── Add create_markets job to scheduler ──────────────────────────────────
INSERT INTO scheduler_jobs (job_name, status, next_run) VALUES
  ('create_markets', 'idle', NOW())
ON CONFLICT (job_name) DO NOTHING;

-- ─── Useful view: pending candidates with article counts ──────────────────
CREATE OR REPLACE VIEW candidate_summary AS
SELECT
  c.id,
  c.template_id,
  c.category,
  c.question,
  c.oracle_type,
  c.relevance_score,
  c.news_volume,
  c.status,
  c.created_at,
  c.expires_at,
  c.market_id,
  jsonb_array_length(c.source_articles) AS article_count
FROM market_candidates c
ORDER BY c.relevance_score DESC NULLS LAST, c.created_at DESC;
