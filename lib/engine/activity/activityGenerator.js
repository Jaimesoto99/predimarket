// ============================================================
// Activity Generator — creates activity_events records from:
//   - New trades (from trades table, not yet mirrored to activity)
//   - New signals published
//   - Market probability moves > 3pp
//   - Market resolutions
// ============================================================

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Mask email for public display ────────────────────────────────────────

function maskEmail(email) {
  if (!email) return 'Anon'
  const [local] = email.split('@')
  if (local.length <= 3) return local[0] + '**'
  return local.slice(0, 3) + '***'
}

// ─── Sync trades → activity_events ────────────────────────────────────────
// Fetches recent trades that haven't been mirrored yet and creates TRADE events.

export async function syncTradeActivity(sinceMinutes = 10) {
  const supabase = getSupabase()
  const since    = new Date(Date.now() - sinceMinutes * 60000).toISOString()

  // Fetch recent trades
  const { data: trades, error: tErr } = await supabase
    .from('trades')
    .select('id, user_email, side, amount, market_id, created_at, markets(title)')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(50)

  if (tErr || !trades?.length) return { synced: 0 }

  // Find which trade IDs are already in activity_events
  const tradeIds = trades.map(t => t.id)
  const { data: existing } = await supabase
    .from('activity_events')
    .select('payload->>trade_id')
    .eq('type', 'TRADE')
    .in('payload->>trade_id', tradeIds.map(String))

  const existingIds = new Set((existing || []).map(e => e['?column?']))

  // Get user profiles for display names
  const emails = [...new Set(trades.map(t => t.user_email))]
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('email, display_name, emoji')
    .in('email', emails)
  const profileMap = Object.fromEntries((profiles || []).map(p => [p.email, p]))

  const events = []
  for (const trade of trades) {
    if (existingIds.has(String(trade.id))) continue

    const profile     = profileMap[trade.user_email] || {}
    const displayName = profile.display_name || maskEmail(trade.user_email)

    events.push({
      type:         'TRADE',
      market_id:    trade.market_id,
      user_email:   trade.user_email,
      display_name: displayName,
      emoji:        profile.emoji || null,
      payload: {
        trade_id:     trade.id,
        side:         trade.side,
        amount:       trade.amount,
        market_title: trade.markets?.title,
      },
      created_at: trade.created_at,
    })
  }

  if (!events.length) return { synced: 0 }

  const { error: iErr } = await supabase.from('activity_events').insert(events)
  if (iErr) {
    console.error('[activityGenerator] syncTrades error:', iErr.message)
    return { synced: 0 }
  }
  return { synced: events.length }
}

// ─── Record signal activity event ────────────────────────────────────────

export async function recordSignalActivity(signal, market) {
  const supabase = getSupabase()

  const { error } = await supabase
    .from('activity_events')
    .insert({
      type:      'SIGNAL',
      market_id: signal.market_id,
      payload: {
        signal_id:    signal.id,
        signal_type:  signal.signal_type,
        direction:    signal.direction,
        strength:     signal.strength,
        title:        signal.title,
        source_label: signal.source_label,
        market_title: market?.title,
      },
    })

  if (error) {
    console.error('[activityGenerator] recordSignal error:', error.message)
  }
}

// ─── Record market resolution ─────────────────────────────────────────────

export async function recordResolutionActivity(market, outcome) {
  const supabase = getSupabase()

  const { error } = await supabase
    .from('activity_events')
    .insert({
      type:      'RESOLUTION',
      market_id: market.id,
      payload: {
        outcome,
        market_title: market.title,
        category:     market.category,
      },
    })

  if (error) {
    console.error('[activityGenerator] recordResolution error:', error.message)
  }
}

// ─── Fetch global activity feed ───────────────────────────────────────────

export async function getGlobalActivity(limit = 30, sinceHours = 24) {
  const supabase = getSupabase()
  const since    = new Date(Date.now() - sinceHours * 3600000).toISOString()

  const { data, error } = await supabase
    .from('activity_events')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[activityGenerator] getGlobal error:', error.message)
    return []
  }
  return data || []
}

// ─── Fetch market-specific activity ──────────────────────────────────────

export async function getMarketActivity(marketId, limit = 20) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('activity_events')
    .select('*')
    .eq('market_id', marketId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[activityGenerator] getMarket error:', error.message)
    return []
  }
  return data || []
}

// ─── Prune old activity events (keep last 48h) ────────────────────────────

export async function pruneOldActivity() {
  const supabase = getSupabase()
  const cutoff   = new Date(Date.now() - 48 * 3600000).toISOString()

  const { error } = await supabase
    .from('activity_events')
    .delete()
    .lt('created_at', cutoff)

  if (error) {
    console.error('[activityGenerator] prune error:', error.message)
  }
}
