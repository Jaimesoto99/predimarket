-- ============================================================
-- Migration 016 — Supervised Market Resolution
-- Run in Supabase SQL Editor.
-- ============================================================
-- Stores oracle results that are waiting for manual admin
-- confirmation before liquidation is executed.

CREATE TABLE IF NOT EXISTS pending_resolutions (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  market_id           bigint REFERENCES markets(id) ON DELETE CASCADE,
  suggested_result    boolean NOT NULL,           -- true=YES, false=NO (oracle suggestion)
  oracle_data         jsonb NOT NULL DEFAULT '{}', -- raw oracle response: source, value, url
  oracle_type         text,                        -- IBEX, LUZ, BITCOIN, FUTBOL, etc.
  status              text NOT NULL DEFAULT 'pending', -- pending | confirmed | rejected | expired
  confirmation_token  uuid DEFAULT gen_random_uuid() UNIQUE,
  created_at          timestamptz DEFAULT now(),
  resolved_at         timestamptz,
  notes               text
);

CREATE INDEX IF NOT EXISTS idx_pending_resolutions_market_id ON pending_resolutions(market_id);
CREATE INDEX IF NOT EXISTS idx_pending_resolutions_status    ON pending_resolutions(status);
CREATE INDEX IF NOT EXISTS idx_pending_resolutions_token     ON pending_resolutions(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_pending_resolutions_created   ON pending_resolutions(created_at DESC);

-- RLS: service role only
ALTER TABLE pending_resolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON pending_resolutions
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE pending_resolutions IS
  'Oracle-determined market resolutions awaiting manual admin confirmation before liquidation.';
COMMENT ON COLUMN pending_resolutions.suggested_result IS
  'Oracle-suggested outcome: true=YES/SÍ, false=NO.';
COMMENT ON COLUMN pending_resolutions.oracle_data IS
  'JSON with oracle details: { source, value, oracleUrl, threshold }.';
COMMENT ON COLUMN pending_resolutions.confirmation_token IS
  'One-time UUID used to authenticate email action links (confirm/reject).';
COMMENT ON COLUMN pending_resolutions.status IS
  'pending: awaiting admin action | confirmed: liquidation executed | rejected: sent for manual review | expired: auto-refunded after 24h.';
