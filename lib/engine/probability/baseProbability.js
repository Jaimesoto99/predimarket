// ============================================================
// Base Probability — derives probabilities directly from AMM pools
// This is the source of truth for all market prices.
// Signals layer ON TOP of this for display context only.
// ============================================================

import { calculatePrices } from '../../amm'

// ─── Compute base probability from pool state ─────────────────────────────

export function computeBaseProbability(yesPool, noPool) {
  const yp = parseFloat(yesPool) || 5000
  const np = parseFloat(noPool)  || 5000

  const yesProbability = (np / (yp + np)) * 100
  const noProbability  = 100 - yesProbability

  return {
    yes:    parseFloat(yesProbability.toFixed(4)),
    no:     parseFloat(noProbability.toFixed(4)),
    spread: parseFloat(Math.abs(yesProbability - 50).toFixed(4)),
    total:  yp + np,
  }
}

// ─── Enrich markets with base probability ────────────────────────────────

export function enrichMarketWithProbability(market) {
  const prob = computeBaseProbability(market.yes_pool, market.no_pool)
  return {
    ...market,
    probability: prob,
    prices:      calculatePrices(parseFloat(market.yes_pool), parseFloat(market.no_pool)),
  }
}

// ─── Check if probability has moved significantly (for snapshot trigger) ─

export function hasMoved(newProb, previousProb, thresholdPp = 1.0) {
  if (previousProb === null || previousProb === undefined) return true
  return Math.abs(newProb - previousProb) >= thresholdPp
}

// ─── Pool-based 24h pseudo-change (mirrors ProbabilityDisplay.js logic) ──

export function compute24hChange(yesPool, noPool) {
  const yp    = parseFloat(yesPool) || 5000
  const np    = parseFloat(noPool)  || 5000
  const drift = (np - yp) / Math.max(yp + np, 100)
  return parseFloat((drift * 18).toFixed(2))
}

// ─── Liquidity depth (mirrors LiquidityBar.js logic) ─────────────────────

export function computeLiquidity(yesPool, noPool) {
  const yp    = parseFloat(yesPool) || 5000
  const np    = parseFloat(noPool)  || 5000
  const total = yp + np
  const real  = Math.max(0, total - 10000)
  return Math.min(100, Math.round((real / 8000) * 100))
}

// ─── Volatility from probability snapshots ────────────────────────────────
// Re-exported from amm.js so the engine layer can use them without
// importing from the frontend lib directly.

import {
  computeVolatility,
  computeWindowVolatility,
  computeVolatilityMetrics,
  computeDynamicSpread,
} from '../../amm'

export {
  computeVolatility,
  computeWindowVolatility,
  computeVolatilityMetrics,
  computeDynamicSpread,
}

// ─── Enrich market with full AMM analytics ────────────────────────────────
// Extends enrichMarketWithProbability with spread + volatility if snapshots
// are provided.

export function enrichMarketWithAMMMetrics(market, snapshots = []) {
  const base    = enrichMarketWithProbability(market)
  const spread  = computeDynamicSpread(market.yes_pool, market.no_pool)
  const volMets = computeVolatilityMetrics(snapshots)

  return {
    ...base,
    spread,
    volatility: volMets,
  }
}
