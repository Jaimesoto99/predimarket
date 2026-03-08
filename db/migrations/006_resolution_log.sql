-- ============================================================
-- Migration 006 — Resolution Log
-- Run in Supabase SQL Editor
-- ============================================================

-- Resolution log: persists oracle resolution results for audit
CREATE TABLE IF NOT EXISTS market_resolution_log (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  market_id           uuid REFERENCES markets(id) ON DELETE SET NULL,
  question            text,
  outcome             boolean,                -- true=YES, false=NO, null=unresolved
  oracle_source       text,
  oracle_value        numeric,
  oracle_credibility  numeric,
  evidence            jsonb DEFAULT '[]',     -- array of { source, headline, url, publishedAt, credibilityScore }
  status              text NOT NULL,          -- RESOLVED | ORACLE_UNAVAILABLE | TRUST_FAILED | EXPIRED | ERROR
  resolved_at         timestamptz,
  created_at          timestamptz DEFAULT now()
);

-- Index for fast lookup by market
CREATE INDEX IF NOT EXISTS idx_resolution_log_market_id ON market_resolution_log(market_id);
CREATE INDEX IF NOT EXISTS idx_resolution_log_status    ON market_resolution_log(status);
CREATE INDEX IF NOT EXISTS idx_resolution_log_resolved  ON market_resolution_log(resolved_at DESC);

-- Add resolution evidence columns to markets table (if not present)
ALTER TABLE markets
  ADD COLUMN IF NOT EXISTS resolution_source   text,
  ADD COLUMN IF NOT EXISTS resolution_evidence jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS resolution_value    numeric;

-- RLS: readable by service role only
ALTER TABLE market_resolution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON market_resolution_log
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE market_resolution_log IS
  'Audit log of all market resolution attempts with oracle evidence and trust scores.';
