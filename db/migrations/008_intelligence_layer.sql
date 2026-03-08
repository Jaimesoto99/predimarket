-- ============================================================
-- Migration 008 — Intelligence Layer
-- Run in Supabase SQL Editor
-- ============================================================

-- topic_signals: dominant topics from RSS analysis
CREATE TABLE IF NOT EXISTS topic_signals (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  topic               text UNIQUE NOT NULL,      -- e.g. 'ECB_RATES', 'CRYPTO_PRICES'
  label               text,                      -- human-readable label
  category            text,                      -- linked market category
  signal_strength     numeric NOT NULL,          -- 0-1
  article_count       int DEFAULT 0,
  sample_headlines    jsonb DEFAULT '[]',
  related_market_ids  jsonb DEFAULT '[]',        -- array of market UUIDs
  computed_at         timestamptz DEFAULT now(),
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_topic_signals_strength ON topic_signals(signal_strength DESC);
CREATE INDEX IF NOT EXISTS idx_topic_signals_computed ON topic_signals(computed_at DESC);

-- Extend markets table with intelligence fields
ALTER TABLE markets
  ADD COLUMN IF NOT EXISTS market_score      numeric,        -- 0-1 ranking score
  ADD COLUMN IF NOT EXISTS cluster_id        text,           -- e.g. 'EU_ECONOMY'
  ADD COLUMN IF NOT EXISTS trending          boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stale_flag        boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS calibration_flag  text,           -- STALE|MISPRICED|LOPSIDED|EXPIRING
  ADD COLUMN IF NOT EXISTS prob_change_6h    numeric,        -- pp change in 6h
  ADD COLUMN IF NOT EXISTS prob_change_24h   numeric;        -- pp change in 24h

-- Useful indexes on new columns
CREATE INDEX IF NOT EXISTS idx_markets_market_score   ON markets(market_score DESC) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_markets_cluster_id     ON markets(cluster_id)        WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_markets_trending       ON markets(trending)           WHERE trending = true;

-- RLS
ALTER TABLE topic_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_topic_signals" ON topic_signals
  FOR SELECT USING (true);

CREATE POLICY "service_write_topic_signals" ON topic_signals
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE topic_signals IS
  'Dominant news topics detected from RSS articles, linked to related active markets.';
