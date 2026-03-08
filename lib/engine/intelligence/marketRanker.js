// ============================================================
// Market Ranker — scores ACTIVE live markets for display ranking
//
// Distinct from marketScorer.js (which scores creation candidates).
// This ranks markets that already exist and are open for trading.
//
// score = 0.30*volume + 0.25*liquidity + 0.20*volatility
//       + 0.15*newsSignals + 0.10*recency
//
// Result stored in markets.market_score (0-1)
// ============================================================

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Normalise to [0,1] (soft log scale) ─────────────────────────────────

function logNorm(value, max) {
  if (!max || !value) return 0
  return Math.log1p(value) / Math.log1p(Math.max(max, 1))
}

// ─── Individual scoring components ───────────────────────────────────────

function volumeScore(market, maxVolume) {
  return logNorm(market.total_volume || 0, maxVolume)
}

function liquidityScore(market, maxLiquidity) {
  const liq = Math.min(
    parseFloat(market.yes_pool) || 5000,
    parseFloat(market.no_pool)  || 5000,
  )
  return logNorm(liq, maxLiquidity)
}

function volatilityScore(market) {
  // vol_24h is stored on the market row by the amm_metrics job (0–100pp range)
  const vol = parseFloat(market.vol_24h) || 0
  return Math.min(1, vol / 10)  // 10pp std dev = score 1.0
}

function newsSignalScore(market, signalCounts) {
  const count = signalCounts[market.id] || 0
  return Math.min(1, count / 5)  // 5 active signals = score 1.0
}

function recencyScore(market) {
  if (!market.created_at) return 0
  const ageHours = (Date.now() - new Date(market.created_at).getTime()) / 3600000
  // New markets (<24h) score 1.0, decay to 0 after 30 days
  return Math.max(0, 1 - ageHours / 720)
}

// ─── Fetch active signal counts per market ────────────────────────────────

async function fetchSignalCounts(supabase) {
  const { data, error } = await supabase
    .from('signals')
    .select('market_id')
    .eq('is_active', true)
    .gte('expires_at', new Date().toISOString())

  if (error || !data) return {}

  const counts = {}
  for (const row of data) {
    counts[row.market_id] = (counts[row.market_id] || 0) + 1
  }
  return counts
}

// ─── Main ranking function ────────────────────────────────────────────────

export async function rankMarkets() {
  const supabase = getSupabase()

  const { data: markets, error } = await supabase
    .from('markets')
    .select('id, title, category, total_volume, yes_pool, no_pool, vol_24h, created_at, status, close_date')
    .eq('status', 'ACTIVE')
    .gt('close_date', new Date().toISOString())

  if (error || !markets?.length) return { ranked: 0 }

  const signalCounts = await fetchSignalCounts(supabase)

  // Compute max values for normalisation
  const maxVolume    = Math.max(...markets.map(m => m.total_volume || 0), 1)
  const maxLiquidity = Math.max(...markets.map(m =>
    Math.min(parseFloat(m.yes_pool) || 5000, parseFloat(m.no_pool) || 5000)
  ), 1)

  const WEIGHTS = {
    volume:      0.30,
    liquidity:   0.25,
    volatility:  0.20,
    newsSignals: 0.15,
    recency:     0.10,
  }

  const scored = markets.map(market => {
    const components = {
      volume:      volumeScore(market, maxVolume),
      liquidity:   liquidityScore(market, maxLiquidity),
      volatility:  volatilityScore(market),
      newsSignals: newsSignalScore(market, signalCounts),
      recency:     recencyScore(market),
    }

    const score = Object.entries(WEIGHTS).reduce((sum, [k, w]) => sum + w * components[k], 0)

    return {
      id:         market.id,
      score:      parseFloat(score.toFixed(4)),
      components,
    }
  })

  // Persist scores
  const updates = scored.map(({ id, score }) =>
    supabase.from('markets').update({ market_score: score }).eq('id', id)
  )
  await Promise.all(updates)

  const sorted = [...scored].sort((a, b) => b.score - a.score)

  console.log('[marketRanker] ranked', scored.length, 'markets. Top:', sorted[0]?.id, sorted[0]?.score)

  return {
    ranked:    scored.length,
    topMarket: sorted[0]?.id || null,
    topScore:  sorted[0]?.score || 0,
  }
}
