-- Migration 015: Trigger automático para total_traders
-- Ejecutar en Supabase SQL Editor.
-- Mantiene markets.total_traders sincronizado con COUNT(DISTINCT user_email)
-- en trades cada vez que se inserta un nuevo trade.

CREATE OR REPLACE FUNCTION update_market_traders()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE markets
  SET total_traders = (
    SELECT COUNT(DISTINCT user_email)
    FROM trades
    WHERE market_id = NEW.market_id
  )
  WHERE id = NEW.market_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_traders ON trades;
CREATE TRIGGER trigger_update_traders
AFTER INSERT ON trades
FOR EACH ROW EXECUTE FUNCTION update_market_traders();

-- Backfill: corregir contadores actuales
UPDATE markets m
SET total_traders = (
  SELECT COUNT(DISTINCT user_email)
  FROM trades
  WHERE market_id = m.id
)
WHERE status IN ('ACTIVE', 'CLOSED', 'RESOLVED');
