-- ============================================================
-- MIGRACIONES PENDIENTES — PrediMarket
-- Ejecutar en Supabase SQL Editor en el orden indicado.
-- ============================================================

-- ─── 0. Limpiar caracteres UTF-8 corruptos (◆ y similares) ─────────────────
-- Ejecutar PRIMERO. Limpia títulos, descripciones y resolution_source de mercados.

UPDATE markets SET
  title = REGEXP_REPLACE(
    REPLACE(REPLACE(REPLACE(title, '◆', ''), chr(65533), ''), '', ''),
    '\s{2,}', ' ', 'g'
  ),
  description = REGEXP_REPLACE(
    REPLACE(REPLACE(REPLACE(COALESCE(description,''), '◆', ''), chr(65533), ''), '', ''),
    '\s{2,}', ' ', 'g'
  ),
  resolution_source = REGEXP_REPLACE(
    REPLACE(REPLACE(REPLACE(COALESCE(resolution_source,''), '◆', ''), chr(65533), ''), '', ''),
    '\s{2,}', ' ', 'g'
  )
WHERE
  title            LIKE '%◆%' OR title            LIKE '%' || chr(65533) || '%'
  OR description   LIKE '%◆%' OR description   LIKE '%' || chr(65533) || '%'
  OR resolution_source LIKE '%◆%' OR resolution_source LIKE '%' || chr(65533) || '%';

-- Verificar cuántos registros quedan sucios tras la limpieza:
-- SELECT COUNT(*) FROM markets WHERE title LIKE '%◆%' OR description LIKE '%◆%';


-- ─── 1. match_orders RPC ─────────────────────────────────────────────────────
-- Busca pares YES/NO que se cruzan (bid_yes + bid_no >= 1.00) y los ejecuta.
-- PrediMarket cobra 2% de comisión del total del contrato (1€).
-- Llamar tras cada place_limit_order, o desde un cron cada pocos minutos.

CREATE OR REPLACE FUNCTION match_orders(p_market_id BIGINT)
RETURNS TABLE (matched_count INT, total_volume NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_yes_order   limit_orders%ROWTYPE;
  v_no_order    limit_orders%ROWTYPE;
  v_match_count INT := 0;
  v_volume      NUMERIC := 0;
  v_payout      NUMERIC;
  v_fee         NUMERIC;
  v_commission_rate CONSTANT NUMERIC := 0.02; -- 2%
BEGIN
  -- Loop mientras haya pares que se crucen
  LOOP
    -- Mejor orden YES (mayor precio = más dispuesto a pagar)
    SELECT * INTO v_yes_order
    FROM limit_orders
    WHERE market_id = p_market_id
      AND side = 'YES'
      AND status = 'PENDING'
    ORDER BY target_price DESC, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN EXIT; END IF;

    -- Mejor orden NO (mayor precio = más dispuesto a pagar)
    SELECT * INTO v_no_order
    FROM limit_orders
    WHERE market_id = p_market_id
      AND side = 'NO'
      AND status = 'PENDING'
    ORDER BY target_price DESC, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN EXIT; END IF;

    -- ¿Se cruzan? YES_price + NO_price >= 1.00 (suma cubre el contrato de €1)
    IF (v_yes_order.target_price + v_no_order.target_price) < 1.00 THEN
      EXIT; -- No hay match posible con las mejores órdenes
    END IF;

    -- Ejecutar match: el precio de liquidación es el precio de la orden más antigua
    v_payout := 1.00; -- cada contrato vale €1 si aciertas
    v_fee    := v_payout * v_commission_rate; -- 2¢ de comisión

    -- Marcar órdenes como ejecutadas
    UPDATE limit_orders SET status = 'EXECUTED', updated_at = NOW()
    WHERE id IN (v_yes_order.id, v_no_order.id);

    -- Crear trades (posiciones abiertas) para ambos usuarios
    INSERT INTO trades (user_email, market_id, side, amount, shares, status, created_at)
    VALUES
      (v_yes_order.user_email, p_market_id, 'YES', v_yes_order.amount, 1, 'OPEN', NOW()),
      (v_no_order.user_email,  p_market_id, 'NO',  v_no_order.amount,  1, 'OPEN', NOW());

    -- Actualizar precio de referencia del mercado (último precio ejecutado)
    UPDATE markets
    SET reference_price = v_yes_order.target_price,
        total_volume    = COALESCE(total_volume, 0) + v_yes_order.amount + v_no_order.amount,
        updated_at      = NOW()
    WHERE id = p_market_id;

    v_match_count := v_match_count + 1;
    v_volume := v_volume + v_yes_order.amount + v_no_order.amount;
  END LOOP;

  RETURN QUERY SELECT v_match_count, v_volume;
END;
$$;


-- ─── 2. Llamar match_orders automáticamente desde place_limit_order ──────────
-- Añadir al final de la función place_limit_order existente:

-- PERFORM match_orders(p_market_id);
-- (Ya dentro de la transacción existente de place_limit_order)

-- Si place_limit_order ya hace matching interno, ignorar esto.
-- Verificar con: SELECT proname, prosrc FROM pg_proc WHERE proname = 'place_limit_order';


-- ─── 3. Auth checks en RPCs existentes ───────────────────────────────────────
-- Añadir a execute_trade, place_limit_order, cancel_limit_order, execute_sell:

CREATE OR REPLACE FUNCTION execute_trade(
  p_email TEXT, p_market_id BIGINT, p_side TEXT, p_amount NUMERIC
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Auth check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) != lower(trim(p_email)) THEN
    RAISE EXCEPTION 'No autorizado: el email no coincide con la sesión';
  END IF;

  -- ... (resto de la lógica original de execute_trade) ...
  -- IMPORTANTE: copiar aquí el cuerpo completo de la función existente
  RAISE EXCEPTION 'Reemplazar con cuerpo original de execute_trade';
END;
$$;

-- NOTA: Las funciones place_limit_order y cancel_limit_order necesitan el mismo patrón.
-- Obtener el cuerpo actual con:
-- SELECT prosrc FROM pg_proc WHERE proname IN ('place_limit_order','cancel_limit_order','execute_sell');
-- Luego añadir el bloque de auth check al inicio de cada una.


-- ─── 4. RLS — Row Level Security ─────────────────────────────────────────────

-- trades
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own trades"
  ON trades FOR SELECT
  USING (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Users insert own trades"
  ON trades FOR INSERT
  WITH CHECK (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Service role full access on trades"
  ON trades FOR ALL
  USING (auth.role() = 'service_role');


-- limit_orders
ALTER TABLE limit_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own orders"
  ON limit_orders FOR SELECT
  USING (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Users insert own orders"
  ON limit_orders FOR INSERT
  WITH CHECK (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Users cancel own orders"
  ON limit_orders FOR UPDATE
  USING (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Service role full access on limit_orders"
  ON limit_orders FOR ALL
  USING (auth.role() = 'service_role');


-- comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments"
  ON comments FOR SELECT
  USING (true);

CREATE POLICY "Users insert own comments"
  ON comments FOR INSERT
  WITH CHECK (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Service role full access on comments"
  ON comments FOR ALL
  USING (auth.role() = 'service_role');


-- markets — lectura pública, escritura solo service_role
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read markets"
  ON markets FOR SELECT
  USING (true);

CREATE POLICY "Service role write markets"
  ON markets FOR ALL
  USING (auth.role() = 'service_role');


-- price_history — lectura pública, escritura solo service_role
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read price_history"
  ON price_history FOR SELECT
  USING (true);

CREATE POLICY "Service role write price_history"
  ON price_history FOR ALL
  USING (auth.role() = 'service_role');


-- ─── 5. Columna reference_price en markets (si no existe) ────────────────────
-- Precio de referencia del último match P2P (no mueve pools AMM).

ALTER TABLE markets
  ADD COLUMN IF NOT EXISTS reference_price NUMERIC(5,4) DEFAULT 0.5;


-- ─── NOTAS IMPORTANTES ───────────────────────────────────────────────────────
-- 1. Activar RLS puede romper queries si las políticas no cubren todos los accesos.
--    Testear en staging antes de producción.
-- 2. Los RPCs con SECURITY DEFINER no están sujetos a RLS para las tablas que acceden.
--    Los checks de auth.uid() dentro del RPC son la barrera de seguridad real.
-- 3. ENGINE_CREATE_MARKETS=true habilita creación automática de mercados desde el engine.
--    Por defecto desactivado; usar solo pages/api/create-markets.js en producción.
-- 4. ENGINE_RESOLVE_MARKETS=true habilita resolución desde el engine pipeline.
--    Por defecto desactivado; usar pages/api/resolve-markets.js en producción.
