// ============================================
// AMM ROBUSTO - CONSTANT PRODUCT MARKET MAKER
// ============================================

/**
 * Constante de liquidez inicial
 * k = yes_pool * no_pool (siempre constante)
 */
const INITIAL_LIQUIDITY = 10000 // yes_pool * no_pool = 10000

/**
 * Protecciones del sistema
 */
const MIN_POOL_SIZE = 50 // Pool nunca puede bajar de 50
const MAX_PRICE_IMPACT = 0.10 // Trade no puede mover precio >10%
const MIN_TRADE_AMOUNT = 1 // Mínimo €1
const MAX_TRADE_AMOUNT = 500 // Máximo €500 por trade
const SLIPPAGE_TOLERANCE = 0.02 // 2% slippage máximo

/**
 * Calcula precios actuales basados en pools
 * Precio = pool / (yes_pool + no_pool)
 */
export function calculatePrices(yesPool, noPool) {
  // Validaciones
  if (yesPool <= 0 || noPool <= 0) {
    console.error('Pools inválidos:', { yesPool, noPool })
    return { yes: 50, no: 50 }
  }
  
  const total = yesPool + noPool
  const yesPrice = (yesPool / total) * 100
  const noPrice = (noPool / total) * 100
  
  return {
    yes: Math.round(yesPrice),
    no: Math.round(noPrice)
  }
}

/**
 * Calcula cuántas shares se obtienen por X euros
 * Usa la fórmula del Constant Product Market Maker:
 * k = yes_pool * no_pool (constante)
 * 
 * @param {number} amount - Cantidad en euros a invertir
 * @param {string} side - 'YES' o 'NO'
 * @param {number} yesPool - Pool actual de YES
 * @param {number} noPool - Pool actual de NO
 * @returns {object} - {shares, newYesPool, newNoPool, priceImpact, valid, error}
 */
export function calculateTradeImpact(amount, side, yesPool, noPool) {
  // 1. VALIDACIONES DE ENTRADA
  if (amount < MIN_TRADE_AMOUNT) {
    return { 
      valid: false, 
      error: `Mínimo €${MIN_TRADE_AMOUNT}` 
    }
  }
  
  if (amount > MAX_TRADE_AMOUNT) {
    return { 
      valid: false, 
      error: `Máximo €${MAX_TRADE_AMOUNT} por trade` 
    }
  }
  
  if (yesPool < MIN_POOL_SIZE || noPool < MIN_POOL_SIZE) {
    return { 
      valid: false, 
      error: 'Liquidez insuficiente en el mercado' 
    }
  }
  
  // 2. CALCULAR CONSTANTE k
  const k = yesPool * noPool
  
  // 3. CALCULAR NUEVO ESTADO SEGÚN LADO
  let newYesPool, newNoPool, shares
  
  if (side === 'YES') {
    // Añadir liquidez al pool YES
    newYesPool = yesPool + amount
    
    // Calcular nuevo NO pool manteniendo k constante
    newNoPool = k / newYesPool
    
    // Shares = diferencia en NO pool (lo que "sacas")
    shares = noPool - newNoPool
    
    // VALIDACIÓN: Pool NO no puede bajar demasiado
    if (newNoPool < MIN_POOL_SIZE) {
      return { 
        valid: false, 
        error: 'Trade demasiado grande, agotaría la liquidez' 
      }
    }
    
  } else if (side === 'NO') {
    // Añadir liquidez al pool NO
    newNoPool = noPool + amount
    
    // Calcular nuevo YES pool manteniendo k constante
    newYesPool = k / newNoPool
    
    // Shares = diferencia en YES pool
    shares = yesPool - newYesPool
    
    // VALIDACIÓN: Pool YES no puede bajar demasiado
    if (newYesPool < MIN_POOL_SIZE) {
      return { 
        valid: false, 
        error: 'Trade demasiado grande, agotaría la liquidez' 
      }
    }
    
  } else {
    return { 
      valid: false, 
      error: 'Lado inválido (debe ser YES o NO)' 
    }
  }
  
  // 4. CALCULAR PRECIO PROMEDIO
  const avgPrice = amount / shares
  
  // 5. CALCULAR IMPACTO DE PRECIO
  const pricesBefore = calculatePrices(yesPool, noPool)
  const pricesAfter = calculatePrices(newYesPool, newNoPool)
  
  const priceBefore = side === 'YES' ? pricesBefore.yes : pricesBefore.no
  const priceAfter = side === 'YES' ? pricesAfter.yes : pricesAfter.no
  
  const priceImpact = Math.abs(priceAfter - priceBefore) / priceBefore
  
  // 6. VALIDAR IMPACTO MÁXIMO
  if (priceImpact > MAX_PRICE_IMPACT) {
    return { 
      valid: false, 
      error: `Trade movería el precio ${(priceImpact * 100).toFixed(1)}%. Máximo permitido: ${MAX_PRICE_IMPACT * 100}%` 
    }
  }
  
  // 7. VALIDAR SLIPPAGE
  const expectedPrice = priceBefore / 100
  const actualPrice = avgPrice
  const slippage = Math.abs(actualPrice - expectedPrice) / expectedPrice
  
  if (slippage > SLIPPAGE_TOLERANCE) {
    return { 
      valid: false, 
      error: `Slippage demasiado alto (${(slippage * 100).toFixed(1)}%). Intenta con menos cantidad.` 
    }
  }
  
  // 8. VALIDAR SHARES POSITIVAS
  if (shares <= 0) {
    return { 
      valid: false, 
      error: 'Cantidad resultante inválida' 
    }
  }
  
  // 9. RETORNAR RESULTADO VÁLIDO
  return {
    valid: true,
    shares: shares,
    avgPrice: avgPrice,
    newYesPool: newYesPool,
    newNoPool: newNoPool,
    priceImpact: priceImpact,
    priceImpactPercent: (priceImpact * 100).toFixed(2),
    slippage: (slippage * 100).toFixed(2),
    priceBefore: priceBefore,
    priceAfter: priceAfter
  }
}

/**
 * Calcula el valor actual de una posición
 * (cuánto obtendrías si vendes ahora)
 */
export function calculateSellValue(shares, side, yesPool, noPool) {
  const k = yesPool * noPool
  
  let currentValue
  
  if (side === 'YES') {
    // Para vender YES, devuelves shares al NO pool
    const newNoPool = noPool + shares
    const newYesPool = k / newNoPool
    currentValue = yesPool - newYesPool
  } else {
    // Para vender NO, devuelves shares al YES pool
    const newYesPool = yesPool + shares
    const newNoPool = k / newYesPool
    currentValue = noPool - newNoPool
  }
  
  return Math.max(0, currentValue)
}

/**
 * Inicializa pools para un nuevo mercado
 * Empieza en 50/50 (probabilidad neutral)
 */
export function initializePools() {
  const initialPool = Math.sqrt(INITIAL_LIQUIDITY)
  return {
    yesPool: initialPool,
    noPool: initialPool
  }
}

/**
 * Valida integridad de pools
 * Detecta manipulaciones o corrupción de datos
 */
export function validatePools(yesPool, noPool) {
  const errors = []
  
  if (yesPool <= 0) errors.push('YES pool debe ser positivo')
  if (noPool <= 0) errors.push('NO pool debe ser positivo')
  if (yesPool < MIN_POOL_SIZE) errors.push('YES pool por debajo del mínimo')
  if (noPool < MIN_POOL_SIZE) errors.push('NO pool por debajo del mínimo')
  
  // Verificar que k no ha sido manipulado
  const expectedK = INITIAL_LIQUIDITY
  const actualK = yesPool * noPool
  const kDeviation = Math.abs(actualK - expectedK) / expectedK
  
  if (kDeviation > 0.001) { // 0.1% de tolerancia por redondeos
    errors.push(`Constante k comprometida. Esperado: ${expectedK}, Actual: ${actualK}`)
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Simula múltiples trades para testing
 * Útil para verificar que el AMM mantiene integridad
 */
export function simulateTrades(trades, initialYesPool, initialNoPool) {
  let yesPool = initialYesPool
  let noPool = initialNoPool
  const results = []
  
  for (const trade of trades) {
    const impact = calculateTradeImpact(trade.amount, trade.side, yesPool, noPool)
    
    if (impact.valid) {
      yesPool = impact.newYesPool
      noPool = impact.newNoPool
      
      results.push({
        trade,
        success: true,
        shares: impact.shares,
        priceImpact: impact.priceImpactPercent,
        newPrices: calculatePrices(yesPool, noPool)
      })
    } else {
      results.push({
        trade,
        success: false,
        error: impact.error
      })
    }
  }
  
  const validation = validatePools(yesPool, noPool)
  
  return {
    results,
    finalPools: { yesPool, noPool },
    finalPrices: calculatePrices(yesPool, noPool),
    integrity: validation
  }
}

/**
 * Testing automático del AMM
 */
export function testAMM() {
  console.log('🧪 Testing AMM...')
  
  const { yesPool, noPool } = initializePools()
  
  const testTrades = [
    { amount: 100, side: 'YES' },
    { amount: 50, side: 'NO' },
    { amount: 200, side: 'YES' },
    { amount: 150, side: 'NO' },
    { amount: 75, side: 'YES' }
  ]
  
  const simulation = simulateTrades(testTrades, yesPool, noPool)
  
  console.log('Resultados:', simulation)
  console.log('Integridad:', simulation.integrity.valid ? '✅ VÁLIDO' : '❌ COMPROMETIDO')
  
  return simulation
}

// Para debugging en desarrollo
if (typeof window !== 'undefined') {
  window.testAMM = testAMM
}