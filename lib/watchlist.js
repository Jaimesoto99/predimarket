// ============================================================
// Watchlist — follow/unfollow markets + popularity scoring
// ============================================================

import { supabase } from './supabase'
import { calculatePrices } from './amm'

// ─── Slug generation ──────────────────────────────────────────────────────

export function slugify(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[¿?¡!]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

// ─── Follow a market ──────────────────────────────────────────────────────

export async function followMarket(userEmail, marketId) {
  const res = await fetch('/api/watchlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userEmail, marketId, action: 'follow' }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    console.error('[watchlist] follow error:', data.error)
    return false
  }
  return true
}

// ─── Unfollow a market ────────────────────────────────────────────────────

export async function unfollowMarket(userEmail, marketId) {
  const res = await fetch('/api/watchlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userEmail, marketId, action: 'unfollow' }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    console.error('[watchlist] unfollow error:', data.error)
    return false
  }
  return true
}

// ─── Get user's watched market IDs ───────────────────────────────────────

export async function getWatchlistIds(userEmail) {
  if (!userEmail) return []

  const res = await fetch(`/api/watchlist?email=${encodeURIComponent(userEmail)}`).catch(() => null)
  if (!res?.ok) return []
  const data = await res.json().catch(() => ({}))
  return data.ids || []
}

// ─── Get full watchlist markets ───────────────────────────────────────────

export async function getWatchlistMarkets(userEmail) {
  if (!userEmail) return []

  const { data, error } = await supabase
    .from('user_watchlists')
    .select(`
      created_at,
      market:market_id (
        id, title, category, status, close_date,
        yes_pool, no_pool, total_volume, created_at, description
      )
    `)
    .eq('user_email', userEmail.toLowerCase())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[watchlist] getWatchlistMarkets error:', error.message)
    return []
  }

  return (data || [])
    .map(r => r.market)
    .filter(Boolean)
    .map(m => ({
      ...m,
      prices: calculatePrices(parseFloat(m.yes_pool), parseFloat(m.no_pool)),
      isExpired: new Date(m.close_date) < new Date(),
    }))
}

// ─── Record a market view ─────────────────────────────────────────────────

export async function recordView(marketId, userEmail = null) {
  await supabase
    .from('market_views')
    .insert({ market_id: marketId, user_email: userEmail })
    .catch(() => {}) // non-critical
}

// ─── Compute and persist popularity scores ────────────────────────────────
// Called from the intelligence job or API.
// popularity = 0.40*volume + 0.30*watchlists + 0.20*traders + 0.10*trending

export async function computePopularityScores() {
  const { data: markets, error } = await supabase
    .from('markets')
    .select('id, total_volume, watchlist_count, active_traders, trending, market_score')
    .eq('status', 'ACTIVE')
    .gt('close_date', new Date().toISOString())

  if (error || !markets?.length) return { updated: 0 }

  const maxVol  = Math.max(...markets.map(m => m.total_volume || 0), 1)
  const maxWL   = Math.max(...markets.map(m => m.watchlist_count || 0), 1)
  const maxTr   = Math.max(...markets.map(m => m.active_traders || 0), 1)

  const logNorm = (v, max) => Math.log1p(v) / Math.log1p(max)

  let updated = 0
  for (const market of markets) {
    const score =
      0.40 * logNorm(market.total_volume   || 0, maxVol) +
      0.30 * logNorm(market.watchlist_count || 0, maxWL)  +
      0.20 * logNorm(market.active_traders  || 0, maxTr)  +
      0.10 * (market.trending ? 1 : 0)

    await supabase
      .from('markets')
      .update({ popularity_score: parseFloat(score.toFixed(4)) })
      .eq('id', market.id)

    updated++
  }

  return { updated }
}

// ─── Get markets with alerts (prob change > 10pp since watchlisted) ───────

export function getAlertMarkets(watchlistMarkets) {
  return watchlistMarkets.filter(m => {
    const change = parseFloat(m.prob_change_24h)
    return !isNaN(change) && Math.abs(change) >= 10
  })
}
