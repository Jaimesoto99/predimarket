// ============================================================
// AMM CORREGIDO - FIXED PRODUCT MARKET MAKER (FPMM)
// ============================================================

export function calculatePrices(yesPool, noPool) {
  const y = parseFloat(yesPool)
  const n = parseFloat(noPool)

  if (y <= 0 || n <= 0 || !isFinite(y) || !isFinite(n)) {
    console.warn('calculatePrices: pools inválidos', { yesPool, noPool })
    return { yes: 50, no: 50 }
  }

  const total = y + n
  const yesPrice = (n / total) * 100
  const noPrice = 100 - yesPrice

  return {
    yes: Math.round(yesPrice * 100) / 100,
    no: Math.round(noPrice * 100) / 100
  }
}

export function previewTrade(amount, side, yesPool, noPool) {
  const a = parseFloat(amount)
  const y = parseFloat(yesPool)
  const n = parseFloat(noPool)

  if (!isFinite(a) || a <= 0) {
    return { valid: false, error: 'Cantidad debe ser mayor que 0' }
  }
  if (a > 500) {
    return { valid: false, error: 'Máximo €500 por trade' }
  }
  if (!isFinite(y) || !isFinite(n) || y <= 0 || n <= 0) {
    return { valid: false, error: 'Pools del mercado inválidos' }
  }
  if (side !== 'YES' && side !== 'NO') {
    return { valid: false, error: 'Side debe ser YES o NO' }
  }

  const k = y * n
  let newYesPool, newNoPool, sharesFromAmm, totalShares

  if (side === 'YES') {
    newNoPool = n + a
    newYesPool = k / newNoPool
    sharesFromAmm = y - newYesPool
    totalShares = a + sharesFromAmm
  } else {
    newYesPool = y + a
    newNoPool = k / newYesPool
    sharesFromAmm = n - newNoPool
    totalShares = a + sharesFromAmm
  }

  if (totalShares <= 0 || !isFinite(totalShares)) {
    return { valid: false, error: 'Trade inválido' }
  }

  const avgPrice = a / totalShares
  const pricesBefore = calculatePrices(y, n)
  const pricesAfter = calculatePrices(newYesPool, newNoPool)

  const priceBefore = side === 'YES' ? pricesBefore.yes : pricesBefore.no
  const priceAfter = side === 'YES' ? pricesAfter.yes : pricesAfter.no

  const potentialWinnings = totalShares
  const potentialProfit = potentialWinnings - a
  const roi = (potentialProfit / a) * 100

  return {
    valid: true,
    shares: totalShares,
    avgPrice: avgPrice,
    newYesPool: newYesPool,
    newNoPool: newNoPool,
    priceImpact: Math.abs(priceAfter - priceBefore),
    priceImpactPercent: Math.abs(priceAfter - priceBefore).toFixed(2),
    priceBefore: priceBefore,
    priceAfter: priceAfter,
    potentialWinnings: potentialWinnings,
    potentialProfit: potentialProfit,
    roi: roi
  }
}

export function previewSellValue(shares, side, yesPool, noPool) {
  const s = parseFloat(shares)
  const y = parseFloat(yesPool)
  const n = parseFloat(noPool)

  if (!isFinite(s) || s <= 0 || !isFinite(y) || !isFinite(n) || y <= 0 || n <= 0) {
    return 0
  }

  const k = y * n
  let poolA, poolB

  if (side === 'YES') {
    poolA = y + s
    poolB = n
  } else {
    poolA = y
    poolB = n + s
  }

  const sum = poolA + poolB
  const diff = poolA - poolB
  const discriminant = (diff * diff) + (4 * k)

  if (discriminant < 0) return 0

  const burned = (sum - Math.sqrt(discriminant)) / 2
  const finalYes = (side === 'YES' ? y + s : y) - burned
  const finalNo = (side === 'NO' ? n + s : n) - burned

  if (finalYes <= 0 || finalNo <= 0) return 0

  return Math.max(0, burned)
}

export function validateTradeInput(amount, side, userBalance) {
  const a = parseFloat(amount)
  
  if (!isFinite(a) || a <= 0) return 'Cantidad debe ser mayor que 0'
  if (a > 500) return 'Máximo €500 por trade'
  if (a < 0.01) return 'Mínimo €0.01 por trade'
  if (side !== 'YES' && side !== 'NO') return 'Selecciona SÍ o NO'
  if (userBalance !== undefined && a > parseFloat(userBalance)) return 'Saldo insuficiente'
  
  return null
}