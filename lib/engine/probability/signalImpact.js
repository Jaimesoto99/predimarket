// ============================================================
// Signal Impact — computes signal-adjusted probability for display
//
// The AMM price is always the canonical price for trades.
// Signal-adjusted probability is a DISPLAY CONTEXT metric:
//   displayed_prob = amm_prob + signal_delta
//
// This is shown alongside the AMM price, never replaces it.
// ============================================================

import { aggregateSignalDelta } from '../signals/signalScorer'

// ─── Apply signal delta to base probability ───────────────────────────────

export function applySignalImpact(ammProbability, activeSignals) {
  if (!activeSignals || activeSignals.length === 0) {
    return {
      adjusted:     ammProbability,
      delta:        0,
      signalCount:  0,
      hasSignals:   false,
    }
  }

  const delta    = aggregateSignalDelta(activeSignals)
  const adjusted = Math.max(5, Math.min(95, ammProbability + delta))

  return {
    adjusted:     parseFloat(adjusted.toFixed(2)),
    delta:        parseFloat(delta.toFixed(2)),
    signalCount:  activeSignals.length,
    hasSignals:   true,
    dominantType: getDominantSignalType(activeSignals),
  }
}

// ─── Dominant signal direction (for UI badge) ─────────────────────────────

function getDominantSignalType(signals) {
  const counts = { YES: 0, NO: 0, NEUTRAL: 0 }
  for (const s of signals) {
    counts[s.direction] = (counts[s.direction] || 0) + s.strength
  }
  if (counts.YES > counts.NO + 0.1)  return 'BULLISH'
  if (counts.NO  > counts.YES + 0.1) return 'BEARISH'
  return 'NEUTRAL'
}

// ─── Compute signal-adjusted view for a market ───────────────────────────

export function computeSignalView(market, activeSignals) {
  const ammProb = parseFloat(market.prices?.yes || 50)
  const impact  = applySignalImpact(ammProb, activeSignals)

  return {
    amm_probability:      ammProb,
    adjusted_probability: impact.adjusted,
    signal_delta:         impact.delta,
    signal_count:         impact.signalCount,
    dominant_direction:   impact.dominantType,
    signals:              activeSignals,
  }
}

// ─── Build snapshot record for the probability_snapshots table ───────────

export function buildSnapshot(market, triggerType, signalId = null) {
  const ammProb = parseFloat(market.prices?.yes
    || ((parseFloat(market.no_pool) / (parseFloat(market.yes_pool) + parseFloat(market.no_pool))) * 100)
    || 50)

  return {
    market_id:       market.id,
    amm_probability: parseFloat(ammProb.toFixed(4)),
    yes_pool:        parseFloat(market.yes_pool) || 5000,
    no_pool:         parseFloat(market.no_pool)  || 5000,
    signal_id:       signalId,
    trigger_type:    triggerType,
  }
}
