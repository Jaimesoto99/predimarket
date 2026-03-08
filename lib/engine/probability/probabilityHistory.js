// ============================================================
// Probability History — queries probability snapshots
// Used by the /api/markets/[id]/probability-history endpoint
// ============================================================

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Fetch probability history for a market ───────────────────────────────

export async function getProbabilityHistory(marketId, opts = {}) {
  const { hours = 168, limit = 500, includeSignals = false } = opts

  const supabase = getSupabase()
  const since    = new Date(Date.now() - hours * 3600000).toISOString()

  let query = supabase
    .from('probability_snapshots')
    .select(includeSignals
      ? '*, signals(title, direction, strength, signal_type)'
      : 'id, market_id, amm_probability, yes_pool, no_pool, trigger_type, created_at'
    )
    .eq('market_id', marketId)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(limit)

  const { data, error } = await query

  if (error) {
    console.error('[probabilityHistory] query error:', error.message)
    return []
  }

  return data || []
}

// ─── Downsample for charting (max N points, evenly distributed) ──────────

export function downsampleHistory(snapshots, maxPoints = 120) {
  if (snapshots.length <= maxPoints) return snapshots

  const step     = snapshots.length / maxPoints
  const result   = []

  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.min(Math.round(i * step), snapshots.length - 1)
    result.push(snapshots[idx])
  }

  // Always include the latest point
  const last = snapshots[snapshots.length - 1]
  if (result[result.length - 1]?.id !== last.id) result.push(last)

  return result
}

// ─── Compute summary stats for history ────────────────────────────────────

export function computeHistoryStats(snapshots) {
  if (!snapshots.length) {
    return { min: null, max: null, avg: null, current: null, change: null, changePercent: null }
  }

  const probs   = snapshots.map(s => s.amm_probability)
  const min     = Math.min(...probs)
  const max     = Math.max(...probs)
  const avg     = probs.reduce((a, b) => a + b, 0) / probs.length
  const current = probs[probs.length - 1]
  const first   = probs[0]
  const change  = current - first

  return {
    min:           parseFloat(min.toFixed(2)),
    max:           parseFloat(max.toFixed(2)),
    avg:           parseFloat(avg.toFixed(2)),
    current:       parseFloat(current.toFixed(2)),
    change:        parseFloat(change.toFixed(2)),
    changePercent: parseFloat(((change / first) * 100).toFixed(2)),
    dataPoints:    snapshots.length,
  }
}

// ─── Compute volatility metrics from history ──────────────────────────────

import { computeVolatilityMetrics } from '../../amm'

export function computeHistoryVolatility(snapshots) {
  return computeVolatilityMetrics(snapshots)
}

// ─── Get latest snapshot probability (fast cache check) ───────────────────

export async function getLatestProbability(marketId) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('probability_snapshots')
    .select('amm_probability, created_at')
    .eq('market_id', marketId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return data
}
