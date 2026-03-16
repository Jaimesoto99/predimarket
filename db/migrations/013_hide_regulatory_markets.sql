-- ============================================================
-- Migration 013: Ocultar mercados crypto y meteorológicos triviales
-- Para: demo regulatoria CNMV / reunión viernes 20 marzo 2026
-- ============================================================

-- 1. Ocultar mercados CRIPTO por categoría
UPDATE markets
SET    status     = 'HIDDEN',
       updated_at = NOW()
WHERE  category IN ('CRIPTO', 'CRYPTO')
  AND  status    = 'ACTIVE';

-- 2. Ocultar mercados crypto por título (por si hay categoría mixta)
UPDATE markets
SET    status     = 'HIDDEN',
       updated_at = NOW()
WHERE  (
         lower(title) LIKE '%bitcoin%'
      OR lower(title) LIKE '%ethereum%'
      OR lower(title) LIKE '%btc%'
      OR lower(title) LIKE '%eth%'
       )
  AND  status = 'ACTIVE';

-- 3. Ocultar mercados meteorológicos triviales
UPDATE markets
SET    status     = 'HIDDEN',
       updated_at = NOW()
WHERE  (
         lower(title) LIKE '%temperatura%'
      OR lower(title) LIKE '%lluvia%'
      OR lower(title) LIKE '%grados%'
      OR lower(title) LIKE '%°c%'
      OR lower(title) LIKE '%38°%'
       )
  AND  status = 'ACTIVE';

-- Verificar resultado
SELECT category, count(*) as total, status
FROM   markets
WHERE  status IN ('ACTIVE', 'HIDDEN')
GROUP  BY category, status
ORDER  BY category, status;
