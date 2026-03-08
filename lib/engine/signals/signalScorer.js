// ============================================================
// Signal Scorer — computes strength (0-1) and prob_delta for matches
//
// Strength:    how credible/relevant the signal is
// prob_delta:  percentage point shift to apply to displayed probability
//              (does NOT change AMM pools — purely informational display)
//
// Capping rules:
//   - prob_delta capped at ±25 percentage points
//   - Final displayed probability capped at [5, 95]
// ============================================================

import { isBreaking, getSentiment } from '../detection/entityExtractor'
import { EVENT_TYPES } from '../detection/eventClassifier'

// ─── Strength factors ─────────────────────────────────────────────────────

// Source credibility feeds straight into strength
function sourceFactor(article) {
  return article.credibility || 0.5
}

// Match quality factor (0.35 is minimum threshold, 1.0 is perfect)
function matchFactor(matchScore) {
  return Math.min(1, (matchScore - 0.35) / 0.65)
}

// Event type factor — DATA_RELEASE and SPORTS_RESULT are most reliable
const EVENT_TYPE_WEIGHT = {
  [EVENT_TYPES.SPORTS_RESULT]:   1.0,
  [EVENT_TYPES.ECONOMIC_DATA]:   1.0,
  [EVENT_TYPES.RATE_CHANGE]:     0.95,
  [EVENT_TYPES.REGULATORY]:      0.90,
  [EVENT_TYPES.PRICE_MOVE]:      0.80,
  [EVENT_TYPES.CRYPTO_MOVE]:     0.75,
  [EVENT_TYPES.ENERGY_PRICE]:    0.75,
  [EVENT_TYPES.BREAKING_NEWS]:   0.70,
  [EVENT_TYPES.POLITICAL_VOTE]:  0.85,
  [EVENT_TYPES.SPORTS_UPCOMING]: 0.55,
  [EVENT_TYPES.MACRO_EVENT]:     0.50,
  [EVENT_TYPES.IRRELEVANT]:      0.10,
}

function eventFactor(article) {
  return EVENT_TYPE_WEIGHT[article.event_type] || 0.5
}

// Recency factor — fresh articles get full weight, older articles decay
function recencyFactor(article) {
  const pubAt = article.published_at || article.ingested_at
  if (!pubAt) return 0.5
  const ageMinutes = (Date.now() - new Date(pubAt).getTime()) / 60000
  if (ageMinutes < 15)  return 1.0
  if (ageMinutes < 60)  return 0.9
  if (ageMinutes < 240) return 0.75
  if (ageMinutes < 720) return 0.55
  return 0.35
}

// Urgency bonus
function urgencyBonus(article) {
  return isBreaking(article) ? 0.1 : 0
}

// ─── Compute strength ─────────────────────────────────────────────────────

export function computeStrength(match) {
  const { article, score } = match

  const s  = sourceFactor(article)
  const m  = matchFactor(score)
  const e  = eventFactor(article)
  const r  = recencyFactor(article)
  const u  = urgencyBonus(article)

  // Weighted average: source 30%, match quality 25%, event type 25%, recency 20%
  const base = (s * 0.30 + m * 0.25 + e * 0.25 + r * 0.20) + u

  return Math.min(1, Math.max(0, parseFloat(base.toFixed(3))))
}

// ─── Compute prob_delta ────────────────────────────────────────────────────
// Maximum shift is 25pp for strongest possible signal
// Direction: YES → positive delta, NO → negative delta, NEUTRAL → 0

const MAX_DELTA = 25  // percentage points

export function computeProbDelta(match, strength) {
  const { direction, market } = match
  if (direction === 'NEUTRAL') return 0

  const rawDelta = strength * MAX_DELTA
  const sign     = direction === 'YES' ? 1 : -1

  // Clamp to ensure displayed prob stays in [5, 95]
  const ammProb  = parseFloat(market.prices?.yes || 50)
  const proposed = ammProb + sign * rawDelta

  if (proposed > 95) {
    return parseFloat(((95 - ammProb) * sign).toFixed(2))
  }
  if (proposed < 5) {
    return parseFloat(((5 - ammProb) * sign).toFixed(2))
  }

  return parseFloat((sign * rawDelta).toFixed(2))
}

// ─── Score a single match ─────────────────────────────────────────────────

export function scoreMatch(match) {
  const strength  = computeStrength(match)
  const probDelta = computeProbDelta(match, strength)
  return { match, strength, probDelta }
}

// ─── Score batch of matches ───────────────────────────────────────────────

export function scoreMatches(matches) {
  return matches
    .map(scoreMatch)
    .filter(sm => sm.strength >= 0.2)          // discard very weak signals
    .sort((a, b) => b.strength - a.strength)   // strongest first
}

// ─── Aggregate signals for a market ─────────────────────────────────────
// Computes combined prob_delta from all active signals for a market

export function aggregateSignalDelta(signals) {
  if (!signals.length) return 0

  // Weight each signal's delta by its strength, then sum
  let weightedSum = 0
  let totalWeight = 0

  for (const signal of signals) {
    weightedSum += signal.prob_delta * signal.strength
    totalWeight += signal.strength
  }

  if (totalWeight === 0) return 0

  const raw = weightedSum / totalWeight
  // Dampen: single article shouldn't move market >20pp
  return Math.max(-20, Math.min(20, parseFloat(raw.toFixed(2))))
}
