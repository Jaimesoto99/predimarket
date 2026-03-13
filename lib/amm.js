// ============================================================
// AMM CORREGIDO - FIXED PRODUCT MARKET MAKER (FPMM)
// ============================================================

// ─── Re-exports from liquidity constants (consolidated here) ─────────────
export const DEFAULT_INITIAL_PROBABILITY = 0.50
export const MIN_LIQUIDITY_POOL          = 500
export const PROB_MIN                    = 0.05
export const PROB_MAX                    = 0.95

export function clampProbability(p) {
  return Math.max(PROB_MIN, Math.min(PROB_MAX, parseFloat(p) || 0.5))
}


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
  if (a > 200) {
    return { valid: false, error: 'Máximo €200 por trade' }
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
  if (a > 200) return 'Máximo €200 por trade'
  if (a < 0.01) return 'Mínimo €0.01 por trade'
  if (side !== 'YES' && side !== 'NO') return 'Selecciona SÍ o NO'
  if (userBalance !== undefined && a > parseFloat(userBalance)) return 'Saldo insuficiente'

  return null
}

// ============================================================
// LMSR — Logarithmic Market Scoring Rule (supplementary view)
// Used alongside FPMM to provide an alternative probability estimate.
//
// b = liquidity parameter. Higher b → lower price sensitivity per trade.
// For binary markets: b = initialPool / ln(2) ≈ initialPool * 1.4427
//
// NOTE: This does NOT replace FPMM. Pool mechanics (previewTrade,
// previewSellValue) continue to use FPMM. LMSR prices are
// supplementary analytics only.
// ============================================================

const LN2 = Math.LN2  // ≈ 0.6931

/**
 * Compute LMSR probability for YES.
 * @param {number} qYes   — quantity of YES shares outstanding
 * @param {number} qNo    — quantity of NO shares outstanding
 * @param {number} b      — liquidity parameter (default: 5000 / ln(2))
 * @returns {{ yes: number, no: number, b: number }}
 */
export function computeLMSRPrice(qYes, qNo, b) {
  const qy = parseFloat(qYes) || 0
  const qn = parseFloat(qNo)  || 0
  const bv = parseFloat(b)    || (5000 / LN2)

  // Numerical stability: subtract max before exp to avoid overflow
  const maxQ  = Math.max(qy, qn)
  const eYes  = Math.exp((qy - maxQ) / bv)
  const eNo   = Math.exp((qn - maxQ) / bv)
  const total = eYes + eNo

  if (!isFinite(total) || total === 0) return { yes: 50, no: 50, b: bv }

  const yes = (eYes / total) * 100
  const no  = 100 - yes

  return {
    yes: parseFloat(yes.toFixed(4)),
    no:  parseFloat(no.toFixed(4)),
    b:   bv,
  }
}

/**
 * LMSR cost to move market from (qYes, qNo) by buying `delta` YES shares.
 * C(q) = b * ln(exp(qYes/b) + exp(qNo/b))
 */
export function lmsrCost(qYes, qNo, b) {
  const bv   = parseFloat(b) || (5000 / LN2)
  const maxQ = Math.max(qYes, qNo)
  const cost = bv * (Math.log(Math.exp((qYes - maxQ) / bv) + Math.exp((qNo - maxQ) / bv)) + maxQ / bv)
  return isFinite(cost) ? cost : 0
}

// ============================================================
// DYNAMIC SPREAD
// spread = baseSpread / sqrt(liquidity), where liquidity = min(yesPool, noPool)
// Low liquidity  → high spread (3–5%)
// High liquidity → low spread (<1%)
// ============================================================

const BASE_SPREAD = 150  // tuned so that at 5000 liquidity → ~2.1% spread

/**
 * Returns spread in cents (¢).
 * @param {number} yesPool
 * @param {number} noPool
 * @returns {number}  spread in ¢ (e.g. 2.1 means 2.1¢ between bid and ask)
 */
export function computeDynamicSpread(yesPool, noPool) {
  const yp  = parseFloat(yesPool) || 5000
  const np  = parseFloat(noPool)  || 5000
  const liq = Math.min(yp, np)

  const spread = BASE_SPREAD / Math.sqrt(Math.max(liq, 1))
  // Clamp: minimum 0.1¢, maximum 10¢
  return parseFloat(Math.min(10, Math.max(0.1, spread)).toFixed(2))
}

// ============================================================
// SLIPPAGE
// priceImpact = tradeSize / effectiveLiquidityPool
// Expressed as percent of the market probability.
// ============================================================

/**
 * Estimate slippage percent for a trade.
 * @param {number} tradeSize     — trade amount in €
 * @param {number} yesPool
 * @param {number} noPool
 * @param {string} side          — 'YES' | 'NO'
 * @returns {number}  slippage in percentage points (e.g. 0.5 = 0.5pp)
 */
export function computeSlippage(tradeSize, yesPool, noPool, side) {
  const yp  = parseFloat(yesPool) || 5000
  const np  = parseFloat(noPool)  || 5000
  const ts  = parseFloat(tradeSize) || 0

  // The pool being depleted determines liquidity sensitivity
  const relevantPool = side === 'YES' ? yp : np
  const slippage     = (ts / relevantPool) * 100

  return parseFloat(Math.min(slippage, 50).toFixed(4))  // cap at 50% for display
}

// ============================================================
// TRADE FEE — 0.3% LP fee on every trade
// ============================================================

export const LP_FEE_RATE = 0.003  // 0.3%

/**
 * Compute the LP fee for a trade amount.
 * @param {number} amount — trade amount in €
 * @returns {{ fee: number, netAmount: number }}
 */
export function computeTradeFee(amount) {
  const a   = parseFloat(amount) || 0
  const fee = parseFloat((a * LP_FEE_RATE).toFixed(4))
  return { fee, netAmount: parseFloat((a - fee).toFixed(4)) }
}

// ============================================================
// MID PRICE — from real order book entries
// Returns the midpoint between best YES bid and best YES ask.
// If no orders exist, returns 50/50 (maximum uncertainty).
//
// orderBook entries: { side: 'YES'|'NO', target_price: 0–1, total_amount }
// YES orders = buyers willing to pay X for YES  → bids
// NO  orders = buyers willing to pay Y for NO   → equivalent ask for YES at (1-Y)
// ============================================================

export function calculateMidPrice(orderBook) {
  if (!orderBook || orderBook.length === 0) return { yes: 50, no: 50 }

  const yesBids = orderBook.filter(o => o.side === 'YES').map(o => o.target_price * 100)
  const noAsks  = orderBook.filter(o => o.side === 'NO').map(o => (1 - o.target_price) * 100)

  const bestBid = yesBids.length > 0 ? Math.max(...yesBids) : null
  const bestAsk = noAsks.length  > 0 ? Math.min(...noAsks)  : null

  if (bestBid === null && bestAsk === null) return { yes: 50, no: 50 }

  let midYes
  if (bestBid !== null && bestAsk !== null) {
    midYes = (bestBid + bestAsk) / 2
  } else if (bestBid !== null) {
    midYes = bestBid
  } else {
    midYes = bestAsk
  }

  midYes = Math.max(5, Math.min(95, midYes))
  return {
    yes: Math.round(midYes * 100) / 100,
    no:  Math.round((100 - midYes) * 100) / 100,
  }
}

// ============================================================
// VOLATILITY — computed from probability_snapshots history
// ============================================================

/**
 * Compute standard deviation of probability over a set of snapshots.
 * @param {Array<{amm_probability: number, created_at: string}>} snapshots
 * @returns {number|null}  volatility in percentage points
 */
export function computeVolatility(snapshots) {
  if (!snapshots || snapshots.length < 2) return null

  const probs = snapshots.map(s => parseFloat(s.amm_probability))
  const mean  = probs.reduce((a, b) => a + b, 0) / probs.length
  const variance = probs.reduce((sum, p) => sum + (p - mean) ** 2, 0) / (probs.length - 1)

  return parseFloat(Math.sqrt(variance).toFixed(4))
}

/**
 * Compute volatility for a specific time window (hours).
 * @param {Array<{amm_probability: number, created_at: string}>} snapshots  — full history
 * @param {number} hours — window size
 * @returns {number|null}
 */
export function computeWindowVolatility(snapshots, hours) {
  if (!snapshots?.length) return null
  const cutoff   = Date.now() - hours * 3600000
  const windowed = snapshots.filter(s => new Date(s.created_at).getTime() >= cutoff)
  return computeVolatility(windowed)
}

/**
 * Return all standard volatility metrics from snapshot history.
 */
export function computeVolatilityMetrics(snapshots) {
  return {
    vol_24h: computeWindowVolatility(snapshots, 24),
    vol_7d:  computeWindowVolatility(snapshots, 168),
    vol_all: computeVolatility(snapshots),
  }
}

// ============================================================
// ENRICHED TRADE PREVIEW — extends previewTrade with
// spread, slippage, fee, and LMSR comparison price
// ============================================================

/**
 * Same as previewTrade but includes spread, slippage, fee, LMSR price.
 * Fully backwards-compatible — all original fields preserved.
 */
export function previewTradeEnriched(amount, side, yesPool, noPool, b) {
  const base = previewTrade(amount, side, yesPool, noPool)
  if (!base.valid) return base

  const yp = parseFloat(yesPool)
  const np = parseFloat(noPool)
  const a  = parseFloat(amount)

  const spread    = computeDynamicSpread(yp, np)
  const slippage  = computeSlippage(a, yp, np, side)
  const { fee, netAmount } = computeTradeFee(a)
  const lmsrPrice = computeLMSRPrice(yp, np, b)

  return {
    ...base,
    spread,
    slippage,
    slippagePercent: slippage.toFixed(2) + '%',
    fee,
    netAmount,
    lmsrPrice: side === 'YES' ? lmsrPrice.yes : lmsrPrice.no,
    lmsr:      lmsrPrice,
  }
}