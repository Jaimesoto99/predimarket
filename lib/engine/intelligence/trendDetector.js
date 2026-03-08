// ============================================================
// Trend Detector — detects probability movements in active markets
//
// For each active market, computes:
//   change_6h   — probability change in last 6 hours
//   change_24h  — probability change in last 24 hours
//
// If |change_6h| > 5pp OR |change_24h| > 10pp → markets.trending = true
//
// Stores on markets row:
//   prob_change_6h, prob_change_24h, trending
// ============================================================

import { createClient }       from '@supabase/supabase-js'
import { getProbabilityHistory } from '../probability/probabilityHistory'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Thresholds ───────────────────────────────────────────────────────────

const TRENDING_THRESHOLD_6H  = 5   // pp change in 6h  → trending
const TRENDING_THRESHOLD_24H = 10  // pp change in 24h → trending

// ─── Compute change between first and last snapshot in window ─────────────

function windowChange(snapshots, hoursAgo) {
  if (!snapshots?.length) return null

  const cutoff   = Date.now() - hoursAgo * 3600000
  const inWindow = snapshots.filter(s => new Date(s.created_at).getTime() >= cutoff)

  if (inWindow.length < 2) return null

  const first   = inWindow[0].amm_probability
  const current = inWindow[inWindow.length - 1].amm_probability

  return parseFloat((current - first).toFixed(2))
}

// ─── Detect trends for all active markets ────────────────────────────────

export async function detectTrends() {
  const supabase = getSupabase()

  const { data: markets, error } = await supabase
    .from('markets')
    .select('id, title, status, close_date')
    .eq('status', 'ACTIVE')
    .gt('close_date', new Date().toISOString())

  if (error || !markets?.length) return { checked: 0, trending: 0 }

  let trendingCount = 0
  const details     = []

  for (const market of markets) {
    try {
      // Fetch 48h of snapshots (enough for both 6h and 24h windows)
      const snapshots = await getProbabilityHistory(market.id, { hours: 48, limit: 200 })

      const change6h  = windowChange(snapshots, 6)
      const change24h = windowChange(snapshots, 24)

      const isTrending = (
        (change6h  !== null && Math.abs(change6h)  >= TRENDING_THRESHOLD_6H) ||
        (change24h !== null && Math.abs(change24h) >= TRENDING_THRESHOLD_24H)
      )

      if (isTrending) trendingCount++

      await supabase
        .from('markets')
        .update({
          prob_change_6h:  change6h,
          prob_change_24h: change24h,
          trending:        isTrending,
        })
        .eq('id', market.id)

      if (isTrending) {
        details.push({
          id:       market.id,
          title:    market.title?.slice(0, 60),
          change6h,
          change24h,
        })
        console.log('[trendDetector] TRENDING:', market.title?.slice(0, 60),
          `6h:${change6h}pp 24h:${change24h}pp`)
      }
    } catch (err) {
      console.error('[trendDetector] market', market.id, err.message)
    }
  }

  return {
    checked:  markets.length,
    trending: trendingCount,
    details,
  }
}
