-- ============================================================
-- Migration 012 — Phase 6 Launch Layer
-- Run in Supabase SQL Editor
-- ============================================================

-- Featured markets flag
ALTER TABLE markets
  ADD COLUMN IF NOT EXISTS featured     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS trader_count int     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS archived_at  timestamptz;

-- Index for fast featured query
CREATE INDEX IF NOT EXISTS idx_markets_featured ON markets(featured) WHERE featured = true;

-- Populate trader_count from existing trades (unique traders per market)
UPDATE markets m
SET trader_count = (
  SELECT COUNT(DISTINCT user_email)
  FROM trades t
  WHERE t.market_id = m.id
    AND t.status IN ('OPEN','SOLD','WON','LOST')
)
WHERE m.status IN ('ACTIVE','CLOSING','RESOLVED');

-- Function to increment trader_count after a new trade
-- Call this from your trade execution hook or a DB trigger.
CREATE OR REPLACE FUNCTION update_trader_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE markets
  SET trader_count = (
    SELECT COUNT(DISTINCT user_email)
    FROM trades
    WHERE market_id = NEW.market_id
      AND status IN ('OPEN','SOLD','WON','LOST')
  )
  WHERE id = NEW.market_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: runs after every trade insert/update
DROP TRIGGER IF EXISTS trg_trader_count ON trades;
CREATE TRIGGER trg_trader_count
  AFTER INSERT OR UPDATE OF status ON trades
  FOR EACH ROW EXECUTE FUNCTION update_trader_count();

COMMENT ON COLUMN markets.featured     IS 'Admin-set flag for Featured Markets homepage section.';
COMMENT ON COLUMN markets.trader_count IS 'Number of unique traders. Maintained by trigger.';
COMMENT ON COLUMN markets.archived_at  IS 'Timestamp when market was archived (dead/resolved/old).';
