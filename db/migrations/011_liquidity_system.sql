-- ============================================================
-- Migration 011 — Minimum Liquidity System (Phase 5)
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE markets
  ADD COLUMN IF NOT EXISTS initial_probability numeric,   -- 0-1, set at creation
  ADD COLUMN IF NOT EXISTS current_probability numeric,   -- 0-1, updated after trades
  ADD COLUMN IF NOT EXISTS liquidity_pool      numeric;   -- display liquidity depth (€)

-- Default values for existing markets (derive from pools)
UPDATE markets
SET
  initial_probability = COALESCE(
    initial_probability,
    CASE WHEN yes_pool > 0 AND no_pool > 0
      THEN LEAST(0.95, GREATEST(0.05, no_pool::numeric / (yes_pool + no_pool)))
      ELSE 0.50
    END
  ),
  current_probability = COALESCE(
    current_probability,
    CASE WHEN yes_pool > 0 AND no_pool > 0
      THEN LEAST(0.95, GREATEST(0.05, no_pool::numeric / (yes_pool + no_pool)))
      ELSE 0.50
    END
  ),
  liquidity_pool = COALESCE(
    liquidity_pool,
    CASE WHEN yes_pool > 0 AND no_pool > 0
      THEN LEAST(yes_pool::numeric, no_pool::numeric)
      ELSE 500
    END
  )
WHERE status IN ('ACTIVE', 'CLOSING', 'CLOSED');

-- Indexes for probability-based queries
CREATE INDEX IF NOT EXISTS idx_markets_current_prob ON markets(current_probability);

COMMENT ON COLUMN markets.initial_probability IS 'Starting probability at market creation (0–1). Clamped to [0.05, 0.95].';
COMMENT ON COLUMN markets.current_probability IS 'Current probability derived from AMM pools (0–1). Updated by trades.';
COMMENT ON COLUMN markets.liquidity_pool      IS 'Effective liquidity depth in €. Used for display price-impact estimation.';
