// ============================================================
// Signal Creator — builds signal records from market matches
// Signals are informational: they do NOT move AMM pools.
// They provide context for traders and adjust displayed probability.
// ============================================================

import { getSentiment, isBreaking } from '../detection/entityExtractor'
import { EVENT_TYPES } from '../detection/eventClassifier'

// ─── Signal type mapping ──────────────────────────────────────────────────

function resolveSignalType(article, direction) {
  const eventType = article.event_type

  if (isBreaking(article))                          return 'BREAKING'
  if (eventType === EVENT_TYPES.ECONOMIC_DATA
    || eventType === EVENT_TYPES.SPORTS_RESULT)     return 'DATA_RELEASE'
  if (direction === 'YES')                          return 'BULLISH'
  if (direction === 'NO')                           return 'BEARISH'
  return 'NEUTRAL'
}

// ─── Title generator ──────────────────────────────────────────────────────

function buildSignalTitle(article, market, direction) {
  const sentiment = getSentiment(article)
  const src       = article.source_label || article.source_key || ''

  // Use article headline directly — it's already a good signal title
  const headline = (article.title || '').slice(0, 120)
  if (headline.length > 10) return headline

  // Fallback
  const dir  = direction === 'YES' ? '↑ Señal positiva' : direction === 'NO' ? '↓ Señal negativa' : 'Señal informativa'
  return `${dir} — ${src}`
}

function buildSignalDescription(article, market, direction, score) {
  const src     = article.source_label || article.source_key || 'fuente'
  const dir     = direction === 'YES' ? 'a favor de SÍ' : direction === 'NO' ? 'a favor de NO' : 'neutral'
  const pct     = Math.round(score * 100)
  return `Artículo de ${src} detectado ${dir} (confianza ${pct}%). ${(article.description || '').slice(0, 200)}`
}

// ─── Expiry: signals decay over time ─────────────────────────────────────

function computeExpiry(article, signalType) {
  const now   = Date.now()
  const hours = signalType === 'BREAKING' || signalType === 'DATA_RELEASE' ? 6
    : signalType === 'BULLISH' || signalType === 'BEARISH'                 ? 12
    : 24  // NEUTRAL
  return new Date(now + hours * 3600000).toISOString()
}

// ─── Main builder ─────────────────────────────────────────────────────────

export function createSignal(match, strength, probDelta) {
  const { article, market, direction, score } = match

  const signal_type = resolveSignalType(article, direction)
  const title       = buildSignalTitle(article, market, direction)
  const description = buildSignalDescription(article, market, direction, score)
  const expires_at  = computeExpiry(article, signal_type)

  return {
    market_id:    market.id,
    article_id:   article.id || null,
    signal_type,
    direction,
    strength,
    title,
    description,
    source_label: article.source_label || article.source_key || '',
    source_url:   article.url || null,
    prob_delta:   probDelta,
    is_active:    true,
    expires_at,
  }
}

// ─── Batch creation from matches ─────────────────────────────────────────

export function createSignalsFromMatches(matches, scoredMatches) {
  // scoredMatches: same matches but with strength + probDelta from signalScorer
  return scoredMatches.map(sm => createSignal(sm.match, sm.strength, sm.probDelta))
}
