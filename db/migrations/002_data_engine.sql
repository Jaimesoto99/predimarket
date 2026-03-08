-- ============================================================
-- PrediMarket — Phase 2: Data Engine
-- Migration 002: articles, signals, probability_snapshots,
--                activity_events, scheduler_jobs
-- ============================================================

-- ─── Articles (ingested from RSS/scraper) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  url           TEXT        UNIQUE NOT NULL,
  title         TEXT        NOT NULL,
  description   TEXT,
  raw_text      TEXT,
  source_key    TEXT        NOT NULL,   -- matches sourceRegistry key
  source_label  TEXT,                  -- human-readable source name
  category      TEXT,                  -- ECONOMIA | CRIPTO | DEPORTES | POLITICA | ENERGIA | ACTUALIDAD
  published_at  TIMESTAMPTZ,
  ingested_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed     BOOLEAN     NOT NULL DEFAULT FALSE,
  entities      JSONB       NOT NULL DEFAULT '[]',   -- extracted entity list
  event_type    TEXT                                 -- classified event type
);

CREATE INDEX IF NOT EXISTS idx_articles_unprocessed
  ON articles (processed, ingested_at DESC)
  WHERE processed = FALSE;

CREATE INDEX IF NOT EXISTS idx_articles_source
  ON articles (source_key, published_at DESC);

-- ─── Signals ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS signals (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id     UUID        NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  article_id    UUID        REFERENCES articles(id) ON DELETE SET NULL,
  signal_type   TEXT        NOT NULL CHECK (signal_type IN ('BULLISH','BEARISH','BREAKING','DATA_RELEASE','NEUTRAL')),
  direction     TEXT        NOT NULL CHECK (direction IN ('YES','NO','NEUTRAL')),
  strength      FLOAT       NOT NULL CHECK (strength >= 0 AND strength <= 1),
  title         TEXT        NOT NULL,
  description   TEXT,
  source_label  TEXT,
  source_url    TEXT,
  prob_delta    FLOAT       NOT NULL DEFAULT 0,   -- percentage points shift (-25 to +25)
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_signals_market_active
  ON signals (market_id, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_signals_active_recent
  ON signals (is_active, created_at DESC)
  WHERE is_active = TRUE;

-- ─── Probability snapshots ─────────────────────────────────────────────────
-- Records AMM price history + signal-adjusted probability over time
CREATE TABLE IF NOT EXISTS probability_snapshots (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id       UUID        NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  amm_probability FLOAT       NOT NULL,   -- raw AMM yes price (0-100)
  yes_pool        FLOAT,
  no_pool         FLOAT,
  signal_id       UUID        REFERENCES signals(id) ON DELETE SET NULL,
  trigger_type    TEXT        NOT NULL CHECK (trigger_type IN ('AMM_TRADE','SIGNAL','SCHEDULED','ORACLE','RESOLUTION')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prob_snapshots_market_time
  ON probability_snapshots (market_id, created_at ASC);

-- ─── Activity events ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT        NOT NULL CHECK (type IN ('TRADE','SIGNAL','RESOLUTION','PROB_MOVE','MARKET_CREATED')),
  market_id     UUID        REFERENCES markets(id) ON DELETE CASCADE,
  user_email    TEXT,
  display_name  TEXT,
  emoji         TEXT,
  payload       JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_time
  ON activity_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_events_market
  ON activity_events (market_id, created_at DESC);

-- ─── Scheduler jobs ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scheduler_jobs (
  job_name      TEXT        PRIMARY KEY,
  last_run      TIMESTAMPTZ,
  next_run      TIMESTAMPTZ,
  status        TEXT        NOT NULL DEFAULT 'idle' CHECK (status IN ('idle','running','failed','disabled')),
  locked_at     TIMESTAMPTZ,
  last_result   JSONB,
  run_count     INTEGER     NOT NULL DEFAULT 0,
  error_count   INTEGER     NOT NULL DEFAULT 0
);

-- Seed initial job rows
INSERT INTO scheduler_jobs (job_name, status, next_run) VALUES
  ('ingest',      'idle', NOW()),
  ('detect',      'idle', NOW()),
  ('signals',     'idle', NOW()),
  ('probability', 'idle', NOW()),
  ('activity',    'idle', NOW())
ON CONFLICT (job_name) DO NOTHING;

-- ─── RLS: disable for service role access ──────────────────────────────────
ALTER TABLE articles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE probability_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduler_jobs        ENABLE ROW LEVEL SECURITY;

-- Public read access for signals, snapshots, activity
CREATE POLICY "public_read_signals"
  ON signals FOR SELECT USING (TRUE);

CREATE POLICY "public_read_snapshots"
  ON probability_snapshots FOR SELECT USING (TRUE);

CREATE POLICY "public_read_activity"
  ON activity_events FOR SELECT USING (TRUE);

-- Service role handles all writes (no anon write policies)
