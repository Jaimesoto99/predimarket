// ============================================================
// Market Lifecycle — state machine for market states
//
// Valid transitions:
//   null       → CANDIDATE   (detection)
//   CANDIDATE  → ACTIVE      (validation passes + create_market RPC)
//   CANDIDATE  → REJECTED    (validation fails)
//   ACTIVE     → CLOSING     (close_date passed, awaiting resolution)
//   ACTIVE     → ARCHIVED    (manual admin action or stale)
//   CLOSING    → RESOLVED    (oracle provides outcome)
//   CLOSING    → ARCHIVED    (oracle unavailable after 24h → refund)
//   RESOLVED   → ARCHIVED    (30 days after resolution)
// ============================================================

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Valid transitions map ────────────────────────────────────────────────

const TRANSITIONS = {
  null:       ['CANDIDATE', 'ACTIVE'],
  CANDIDATE:  ['ACTIVE', 'REJECTED'],
  ACTIVE:     ['CLOSING', 'ARCHIVED'],
  CLOSING:    ['RESOLVED', 'ARCHIVED'],
  RESOLVED:   ['ARCHIVED'],
  ARCHIVED:   [],
}

export function canTransition(from, to) {
  const allowed = TRANSITIONS[from] || []
  return allowed.includes(to)
}

// ─── Log lifecycle event to DB ────────────────────────────────────────────

export async function logLifecycle({ market_id, candidate_id, from_state, to_state, reason, triggered_by, metadata }) {
  const supabase = getSupabase()

  const { error } = await supabase
    .from('market_lifecycle_events')
    .insert({
      market_id,
      candidate_id: candidate_id || null,
      from_state:   from_state   || null,
      to_state,
      reason:       reason       || null,
      triggered_by: triggered_by || 'auto',
      metadata:     metadata     || {},
    })

  if (error) {
    console.error('[lifecycle] logLifecycle error:', error.message)
  }
}

// ─── Transition a market to a new state ──────────────────────────────────

export async function transitionMarket(marketId, toState, opts = {}) {
  const supabase = getSupabase()

  // Fetch current state
  const { data: market, error: mErr } = await supabase
    .from('markets')
    .select('id, status, close_date')
    .eq('id', marketId)
    .single()

  if (mErr || !market) {
    return { success: false, error: 'Market not found' }
  }

  const fromState = market.status
  if (!canTransition(fromState, toState)) {
    return {
      success: false,
      error:   `Invalid transition: ${fromState} → ${toState}`,
    }
  }

  // Build update payload
  const updatePayload = { status: toState }
  if (toState === 'ARCHIVED') updatePayload.archived_at = new Date().toISOString()

  const { error: uErr } = await supabase
    .from('markets')
    .update(updatePayload)
    .eq('id', marketId)

  if (uErr) {
    return { success: false, error: uErr.message }
  }

  await logLifecycle({
    market_id:    marketId,
    from_state:   fromState,
    to_state:     toState,
    triggered_by: opts.triggeredBy || 'auto',
    reason:       opts.reason,
    metadata:     opts.metadata || {},
  })

  return { success: true, from: fromState, to: toState }
}

// ─── Scheduled lifecycle jobs ─────────────────────────────────────────────

// Move expired ACTIVE markets to CLOSING
export async function closeExpiredMarkets() {
  const supabase = getSupabase()

  const { data: expired, error } = await supabase
    .from('markets')
    .select('id, title, close_date')
    .eq('status', 'ACTIVE')
    .lt('close_date', new Date().toISOString())

  if (error || !expired?.length) return { closed: 0 }

  let closed = 0
  for (const market of expired) {
    const result = await transitionMarket(market.id, 'CLOSING', {
      triggeredBy: 'scheduler',
      reason:      `close_date ${market.close_date} passed`,
    })
    if (result.success) closed++
  }
  return { closed, total: expired.length }
}

// Archive RESOLVED markets older than 30 days
export async function archiveOldMarkets() {
  const supabase = getSupabase()
  const cutoff   = new Date(Date.now() - 30 * 24 * 3600000).toISOString()

  const { data: old, error } = await supabase
    .from('markets')
    .select('id, title')
    .eq('status', 'RESOLVED')
    .lt('close_date', cutoff)

  if (error || !old?.length) return { archived: 0 }

  let archived = 0
  for (const market of old) {
    const result = await transitionMarket(market.id, 'ARCHIVED', {
      triggeredBy: 'scheduler',
      reason:      'Resolved >30 days ago',
    })
    if (result.success) archived++
  }
  return { archived, total: old.length }
}

// Reject expired CANDIDATE markets
export async function rejectExpiredCandidates() {
  const supabase = getSupabase()

  const { data: expired, error } = await supabase
    .from('market_candidates')
    .select('id, question')
    .eq('status', 'PENDING')
    .lt('expires_at', new Date().toISOString())

  if (error || !expired?.length) return { rejected: 0 }

  const ids = expired.map(c => c.id)
  await supabase
    .from('market_candidates')
    .update({ status: 'REJECTED', rejection_reason: 'Expired without validation' })
    .in('id', ids)

  return { rejected: expired.length }
}

// ─── Get lifecycle history for a market ──────────────────────────────────

export async function getLifecycleHistory(marketId) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('market_lifecycle_events')
    .select('*')
    .eq('market_id', marketId)
    .order('created_at', { ascending: true })

  if (error) return []
  return data || []
}
