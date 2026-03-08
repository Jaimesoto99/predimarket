-- ============================================================
-- Migration 009 — Discovery Layer
-- Run in Supabase SQL Editor
-- ============================================================

-- User watchlists: markets a user is following
CREATE TABLE IF NOT EXISTS user_watchlists (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email   text NOT NULL,
  market_id    uuid NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(user_email, market_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlists_user    ON user_watchlists(user_email);
CREATE INDEX IF NOT EXISTS idx_watchlists_market  ON user_watchlists(market_id);

-- Market view tracking
CREATE TABLE IF NOT EXISTS market_views (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  market_id  uuid NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  user_email text,                    -- null for anonymous views
  viewed_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_views_market ON market_views(market_id);
CREATE INDEX IF NOT EXISTS idx_market_views_time   ON market_views(viewed_at DESC);

-- Extend markets table with discovery fields
ALTER TABLE markets
  ADD COLUMN IF NOT EXISTS slug             text,           -- url-friendly slug
  ADD COLUMN IF NOT EXISTS popularity_score numeric,        -- 0-1 computed score
  ADD COLUMN IF NOT EXISTS view_count       int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS watchlist_count  int DEFAULT 0;

-- Unique slug index (partial: only non-null slugs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_markets_slug ON markets(slug)
  WHERE slug IS NOT NULL;

-- RLS on watchlists (users see only their own)
ALTER TABLE user_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_views    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_watchlist" ON user_watchlists
  USING (true) WITH CHECK (true);

CREATE POLICY "market_views_policy" ON market_views
  USING (true) WITH CHECK (true);

COMMENT ON TABLE user_watchlists IS 'Markets followed by each user.';
COMMENT ON TABLE market_views    IS 'Per-market page views for popularity scoring.';
