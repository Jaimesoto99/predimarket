// ============================================================
// Source Consensus — measures agreement across distinct sources
// covering the same market within a time window
//
// Consensus score (0-1):
//   0.0 = single source (no consensus)
//   0.5 = 2 sources agreeing
//   0.7 = 3 sources agreeing
//   1.0 = 5+ sources agreeing (max diversity)
// ============================================================

import { createClient } from '@supabase/supabase-js'
import { SOURCE_MAP }   from '../../lib/engine/sources/sourceRegistry'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Consensus score from distinct source count ───────────────────────────────

export function scoreFromCount(distinctSources) {
  if (distinctSources <= 1) return 0.25  // floor: single source has low but non-zero consensus
  if (distinctSources === 2) return 0.50
  if (distinctSources === 3) return 0.70
  if (distinctSources === 4) return 0.85
  return 1.00  // 5+
}

// ─── Consensus score weighted by source credibility ──────────────────────────
// Rewards high-credibility source agreement more than low-credibility

export function weightedConsensus(sourceKeys) {
  if (!sourceKeys?.length) return 0.25

  const weights = sourceKeys.map(key => {
    const source = SOURCE_MAP[key]
    return source?.credibility ?? 0.50
  })

  const totalWeight   = weights.reduce((a, b) => a + b, 0)
  const avgWeight     = totalWeight / weights.length
  const diversityBonus = scoreFromCount(sourceKeys.length)

  // Blend: 60% diversity + 40% quality
  return Math.min(1.0, diversityBonus * 0.60 + avgWeight * 0.40)
}

// ─── Compute consensus for a market (based on active signals) ─────────────────

export async function computeConsensus(marketId, opts = {}) {
  const {
    sinceHours       = 6,
    currentSourceKey = null,
    eventType        = null,
  } = opts

  const supabase = getSupabase()
  const since    = new Date(Date.now() - sinceHours * 3600000).toISOString()

  // Fetch active signals for this market in the time window
  let query = supabase
    .from('signals')
    .select('source_key, direction, event_type, created_at')
    .eq('market_id', marketId)
    .eq('is_active', true)
    .gte('created_at', since)

  if (eventType) {
    query = query.eq('event_type', eventType)
  }

  const { data: signals, error } = await query

  if (error || !signals?.length) {
    return currentSourceKey ? 0.25 : 0.25
  }

  // Get distinct source keys (including current signal's source if provided)
  const allSourceKeys = [...new Set([
    ...signals.map(s => s.source_key),
    ...(currentSourceKey ? [currentSourceKey] : []),
  ].filter(Boolean))]

  // Direction agreement: what % of signals agree on direction?
  const directionCounts = { YES: 0, NO: 0, NEUTRAL: 0, null: 0 }
  for (const sig of signals) {
    const dir = sig.direction || 'null'
    directionCounts[dir] = (directionCounts[dir] || 0) + 1
  }

  const total    = signals.length
  const maxDir   = Math.max(...Object.values(directionCounts))
  const agreement = total > 0 ? maxDir / total : 1.0

  // Base score from distinct source diversity
  const base = weightedConsensus(allSourceKeys)

  // Scale by directional agreement (disagreement reduces consensus)
  return Math.max(0.10, base * agreement)
}

// ─── Get detailed consensus breakdown for a market ───────────────────────────

export async function getMarketConsensus(marketId, { sinceHours = 6 } = {}) {
  const supabase = getSupabase()
  const since    = new Date(Date.now() - sinceHours * 3600000).toISOString()

  const { data: signals, error } = await supabase
    .from('signals')
    .select('source_key, direction, strength, event_type, created_at')
    .eq('market_id', marketId)
    .eq('is_active', true)
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (error || !signals?.length) {
    return {
      distinct_sources:   0,
      consensus_score:    0.25,
      direction_agreement: 1.0,
      sources:            [],
      signal_count:       0,
    }
  }

  const distinctSourceKeys = [...new Set(signals.map(s => s.source_key).filter(Boolean))]
  const consensusScore     = weightedConsensus(distinctSourceKeys)

  // Direction agreement
  const dirCounts = {}
  for (const sig of signals) {
    const dir = sig.direction || 'NEUTRAL'
    dirCounts[dir] = (dirCounts[dir] || 0) + 1
  }
  const maxDir    = Math.max(...Object.values(dirCounts))
  const agreement = signals.length > 0 ? maxDir / signals.length : 1.0

  // Source summary
  const sourceSummary = distinctSourceKeys.map(key => {
    const src     = SOURCE_MAP[key]
    const srcSigs = signals.filter(s => s.source_key === key)
    return {
      source_key:   key,
      label:        src?.label || key,
      credibility:  src?.credibility || 0.5,
      signal_count: srcSigs.length,
      avg_strength: srcSigs.reduce((a, s) => a + (s.strength || 0), 0) / srcSigs.length,
    }
  })

  return {
    distinct_sources:    distinctSourceKeys.length,
    consensus_score:     Math.max(0.10, consensusScore * agreement),
    direction_agreement: agreement,
    direction_counts:    dirCounts,
    sources:             sourceSummary,
    signal_count:        signals.length,
  }
}

// ─── Source diversity score for a set of article source_keys ─────────────────
// Used by marketTrustScore to assess source breadth

export function computeSourceDiversity(sourceKeys) {
  const unique = [...new Set(sourceKeys.filter(Boolean))]
  return weightedConsensus(unique)
}
