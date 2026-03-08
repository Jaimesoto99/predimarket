// ============================================================
// Signal Publisher — persists signals to Supabase
// Handles dedup (same article+market combo), expiry cleanup,
// and returns published signal IDs for downstream use
// ============================================================

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Publish signals (upsert-style: skip if same article+market exists) ──

export async function publishSignals(signals) {
  if (!signals.length) return { published: 0, skipped: 0, ids: [] }

  const supabase = getSupabase()
  const published = []
  const skipped   = []

  for (const signal of signals) {
    // Check if a signal for this article+market combo already exists
    if (signal.article_id) {
      const { data: existing } = await supabase
        .from('signals')
        .select('id')
        .eq('market_id', signal.market_id)
        .eq('article_id', signal.article_id)
        .limit(1)

      if (existing?.length > 0) {
        skipped.push(existing[0].id)
        continue
      }
    }

    const { data, error } = await supabase
      .from('signals')
      .insert(signal)
      .select('id')
      .single()

    if (error) {
      console.error('[signalPublisher] insert error:', error.message)
    } else if (data) {
      published.push(data.id)
    }
  }

  return { published: published.length, skipped: skipped.length, ids: published }
}

// ─── Expire old signals ────────────────────────────────────────────────────

export async function expireSignals() {
  const supabase = getSupabase()

  const { error, count } = await supabase
    .from('signals')
    .update({ is_active: false })
    .lt('expires_at', new Date().toISOString())
    .eq('is_active', true)

  if (error) {
    console.error('[signalPublisher] expire error:', error.message)
    return 0
  }
  return count || 0
}

// ─── Get active signals for a market ─────────────────────────────────────

export async function getActiveSignals(marketId, limit = 10) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('signals')
    .select('*')
    .eq('market_id', marketId)
    .eq('is_active', true)
    .order('strength', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[signalPublisher] getActive error:', error.message)
    return []
  }
  return data || []
}

// ─── Get signals for multiple markets (batch) ────────────────────────────

export async function getActiveSignalsBatch(marketIds) {
  if (!marketIds.length) return {}

  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('signals')
    .select('*')
    .in('market_id', marketIds)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[signalPublisher] getBatch error:', error.message)
    return {}
  }

  // Group by market_id
  const result = {}
  for (const signal of (data || [])) {
    if (!result[signal.market_id]) result[signal.market_id] = []
    result[signal.market_id].push(signal)
  }
  return result
}

// ─── Deactivate all signals for a resolved market ────────────────────────

export async function deactivateMarketSignals(marketId) {
  const supabase = getSupabase()

  const { error } = await supabase
    .from('signals')
    .update({ is_active: false })
    .eq('market_id', marketId)

  if (error) {
    console.error('[signalPublisher] deactivate error:', error.message)
  }
}
