-- Migration 014: Deprecate AMM execute_trade — P2P migration
-- Run this in Supabase SQL Editor once.
-- After this, all trades go through place_limit_order → match_orders.

CREATE OR REPLACE FUNCTION public.execute_trade(
  p_email     text,
  p_market_id bigint,
  p_side      text,
  p_amount    numeric
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN jsonb_build_object(
    'success', false,
    'error',   'Deprecated: use place_limit_order'
  );
END;
$$;
