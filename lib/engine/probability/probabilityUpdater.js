// ============================================================
// Probability Updater — records probability snapshots
// Triggered by: trades (via hook), new signals, or scheduled scan
// ============================================================

import { createClient } from '@supabase/supabase-js'
import { buildSnapshot } from './signalImpact'
import { computeBaseProbability, hasMoved } from './baseProbability'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Record a single probability snapshot ────────────────────────────────

export async function recordSnapshot(market, triggerType, signalId = null) {
  const supabase = getSupabase()
  const snapshot = buildSnapshot(market, triggerType, signalId)

  const { error } = await supabase
    .from('probability_snapshots')
    .insert(snapshot)

  if (error) {
    console.error('[probabilityUpdater] recordSnapshot error:', error.message)
    return false
  }
  return true
}

// ─── Conditional snapshot: only record if probability moved ──────────────
// Prevents duplicate snapshots when nothing changed

export async function recordSnapshotIfMoved(market, triggerType, thresholdPp = 1.0, signalId = null) {
  const supabase = getSupabase()

  // Get last snapshot for this market
  const { data: last } = await supabase
    .from('probability_snapshots')
    .select('amm_probability')
    .eq('market_id', market.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const currentProb = computeBaseProbability(market.yes_pool, market.no_pool).yes
  const lastProb    = last?.amm_probability

  if (!hasMoved(currentProb, lastProb, thresholdPp)) {
    return false   // no change, skip
  }

  return recordSnapshot(market, triggerType, signalId)
}

// ─── Scheduled scan: snapshot all active markets ─────────────────────────
// Called hourly by scheduler. Only records markets that moved since last snap.

export async function snapshotAllActiveMarkets() {
  const supabase = getSupabase()

  const { data: markets, error } = await supabase
    .from('markets')
    .select('id, title, yes_pool, no_pool, status, close_date')
    .eq('status', 'ACTIVE')
    .gt('close_date', new Date().toISOString())

  if (error || !markets?.length) {
    return { snapped: 0, skipped: 0 }
  }

  let snapped = 0
  let skipped = 0

  for (const market of markets) {
    const moved = await recordSnapshotIfMoved(market, 'SCHEDULED', 1.0)
    if (moved) snapped++
    else skipped++
  }

  return { snapped, skipped, total: markets.length }
}

// ─── Record snapshot when a new signal is published ──────────────────────

export async function recordSignalSnapshot(market, signalId) {
  return recordSnapshot(market, 'SIGNAL', signalId)
}
