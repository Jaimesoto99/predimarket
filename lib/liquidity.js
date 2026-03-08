// ============================================================
// Minimum Liquidity System — Phase 5
//
// Rules:
//   DEFAULT_INITIAL_PROBABILITY = 0.50
//   MIN_LIQUIDITY_POOL          = 500   (display / simple formula)
//   MAX_SPREAD                  = 0.10  (max deviation from mid for display)
//   PROB_MIN / PROB_MAX         = 0.05 / 0.95 (hard clamp)
//
// These utilities work alongside the existing FPMM AMM (lib/amm.js).
// The FPMM remains the canonical pricing mechanism.
// These helpers add:
//   - a simple price-impact formula for UX feedback
//   - spread-clamped display prices for very low liquidity
//   - initial probability management for new markets
// ============================================================

export const DEFAULT_INITIAL_PROBABILITY = 0.50
export const MIN_LIQUIDITY_POOL          = 500
export const MAX_SPREAD                  = 0.10
export const PROB_MIN                    = 0.05
export const PROB_MAX                    = 0.95

// ─── Clamp probability to [PROB_MIN, PROB_MAX] ────────────────────────────

export function clampProbability(p) {
  return Math.max(PROB_MIN, Math.min(PROB_MAX, parseFloat(p) || 0.5))
}

// ─── Compute spread-enforced display prices ───────────────────────────────
//
// Takes the raw AMM probability and returns display prices clamped so
// that the YES price never moves more than MAX_SPREAD from the midpoint
// when liquidity is below MIN_LIQUIDITY_POOL.
//
// At adequate liquidity (≥ MIN_LIQUIDITY_POOL) the raw AMM price is returned.
// At lower liquidity the display spread is compressed toward 50/50.

export function getDisplayPrices(yesPoolRaw, noPoolRaw, liquidityPool) {
  const yp  = parseFloat(yesPoolRaw)  || 5000
  const np  = parseFloat(noPoolRaw)   || 5000
  const liq = parseFloat(liquidityPool) || MIN_LIQUIDITY_POOL

  // Raw AMM probability
  const rawProb   = np / (yp + np)
  const clamped   = clampProbability(rawProb)

  // At full liquidity → display raw price
  if (liq >= MIN_LIQUIDITY_POOL) {
    return {
      yes:         Math.round(clamped * 10000) / 100,   // e.g. 62.50¢
      no:          Math.round((1 - clamped) * 10000) / 100,
      probability: clamped,
      spreadOk:    true,
    }
  }

  // Low liquidity → compress spread toward 50/50
  const liquidityRatio = Math.min(1, liq / MIN_LIQUIDITY_POOL)
  const maxAllowedDev  = MAX_SPREAD * liquidityRatio      // shrinks with liq
  const deviation      = clamped - 0.5
  const cappedDev      = Math.max(-maxAllowedDev, Math.min(maxAllowedDev, deviation))
  const displayProb    = clampProbability(0.5 + cappedDev)

  return {
    yes:         Math.round(displayProb * 10000) / 100,
    no:          Math.round((1 - displayProb) * 10000) / 100,
    probability: displayProb,
    spreadOk:    false,
  }
}

// ─── Simple price impact formula ─────────────────────────────────────────
//
// price_change = trade_size / liquidity_pool
// Used for fast UX preview; the FPMM in previewTrade() is more accurate.

export function computeSimplePriceImpact(tradeSize, liquidityPool) {
  const ts  = Math.abs(parseFloat(tradeSize)   || 0)
  const liq = Math.abs(parseFloat(liquidityPool) || MIN_LIQUIDITY_POOL)
  return parseFloat(Math.min(0.50, ts / liq).toFixed(4))
}

// ─── Update probability after a trade (simple formula) ───────────────────
//
// Returns the new probability after a trade, clamped to [PROB_MIN, PROB_MAX].
// side: 'YES' → probability goes up, 'NO' → goes down.

export function updateProbabilitySimple(currentProb, tradeSize, liquidityPool, side) {
  const impact = computeSimplePriceImpact(tradeSize, liquidityPool)
  const delta  = side === 'YES' ? impact : -impact
  return clampProbability(parseFloat(currentProb) + delta)
}

// ─── Derive initial liquidity pool from market pools ─────────────────────
//
// If the market has explicit yes_pool/no_pool (FPMM), use min() as the
// effective liquidity depth. Fall back to MIN_LIQUIDITY_POOL.

export function effectiveLiquidityPool(market) {
  const yp = parseFloat(market?.yes_pool)
  const np = parseFloat(market?.no_pool)
  if (yp > 0 && np > 0) return Math.min(yp, np)
  return parseFloat(market?.liquidity_pool) || MIN_LIQUIDITY_POOL
}

// ─── Initial probability for a new market ────────────────────────────────
//
// Uses the explicit initial_probability field if set in [0,1].
// Falls back to DEFAULT_INITIAL_PROBABILITY.

export function getInitialProbability(market) {
  const stored = parseFloat(market?.initial_probability)
  if (!isNaN(stored) && stored >= PROB_MIN && stored <= PROB_MAX) return stored
  return DEFAULT_INITIAL_PROBABILITY
}

// ─── Current probability ─────────────────────────────────────────────────
//
// Derives current probability from FPMM pools if available,
// otherwise from stored current_probability, otherwise initial.

export function getCurrentProbability(market) {
  const yp = parseFloat(market?.yes_pool)
  const np = parseFloat(market?.no_pool)
  if (yp > 0 && np > 0) return clampProbability(np / (yp + np))

  const stored = parseFloat(market?.current_probability)
  if (!isNaN(stored)) return clampProbability(stored)

  return getInitialProbability(market)
}
