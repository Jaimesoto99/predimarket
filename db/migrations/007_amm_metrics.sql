-- ============================================================
-- Migration 007 — AMM Metrics & LP Rewards
-- Run in Supabase SQL Editor
-- ============================================================

-- AMM metrics: per-market volatility and spread snapshots
CREATE TABLE IF NOT EXISTS amm_metrics (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  market_id    uuid REFERENCES markets(id) ON DELETE CASCADE,
  vol_24h      numeric,          -- 24h probability volatility (pp std dev)
  vol_7d       numeric,          -- 7d probability volatility (pp std dev)
  vol_all      numeric,          -- all-time volatility
  spread       numeric,          -- dynamic spread in ¢
  lmsr_yes     numeric,          -- LMSR YES price (supplementary)
  lmsr_no      numeric,          -- LMSR NO price
  lmsr_b       numeric,          -- LMSR liquidity parameter b
  computed_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_amm_metrics_market    ON amm_metrics(market_id);
CREATE INDEX IF NOT EXISTS idx_amm_metrics_computed  ON amm_metrics(computed_at DESC);

-- LP reward tracking
CREATE TABLE IF NOT EXISTS lp_rewards (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  market_id    uuid REFERENCES markets(id) ON DELETE SET NULL,
  trade_id     uuid,             -- references trades.id
  trade_amount numeric NOT NULL,
  fee_rate     numeric DEFAULT 0.003,
  fee_amount   numeric NOT NULL, -- trade_amount * fee_rate
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lp_rewards_market ON lp_rewards(market_id);
CREATE INDEX IF NOT EXISTS idx_lp_rewards_date   ON lp_rewards(created_at DESC);

-- Add AMM extended fields to markets table
ALTER TABLE markets
  ADD COLUMN IF NOT EXISTS vol_24h   numeric,
  ADD COLUMN IF NOT EXISTS vol_7d    numeric,
  ADD COLUMN IF NOT EXISTS spread    numeric,
  ADD COLUMN IF NOT EXISTS lmsr_yes  numeric,
  ADD COLUMN IF NOT EXISTS lmsr_no   numeric;

-- RLS
ALTER TABLE amm_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE lp_rewards  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_amm_metrics" ON amm_metrics
  USING (true) WITH CHECK (true);

CREATE POLICY "service_role_lp_rewards" ON lp_rewards
  USING (true) WITH CHECK (true);

COMMENT ON TABLE amm_metrics IS 'AMM volatility, spread and LMSR supplementary metrics per market.';
COMMENT ON TABLE lp_rewards  IS 'LP fee tracking: 0.3% of each trade amount.';
