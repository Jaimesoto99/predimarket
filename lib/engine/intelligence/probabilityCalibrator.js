// ============================================================
// Probability Calibrator — flags markets with quality issues
//
// Detects:
//   STALE     — probability unchanged for >48h (no trading activity)
//   MISPRICED — high volatility but very low liquidity (unreliable price)
//   LOPSIDED  — probability <5% or >95% (near-certain, low info value)
//   EXPIRING  — closes within 6h (urgent)
//
// Stores on markets row:
//   stale_flag:        boolean
//   calibration_flag:  'STALE' | 'MISPRICED' | 'LOPSIDED' | 'EXPIRING' | null
// ============================================================

import { createClient }          from '@supabase/supabase-js'
import { getProbabilityHistory } from '../probability/probabilityHistory'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Thresholds ───────────────────────────────────────────────────────────

const STALE_HOURS         = 48    // no movement for 48h → stale
const STALE_THRESHOLD_PP  = 0.5   // less than 0.5pp change = "no movement"
const MISPRICED_VOL_MIN   = 5     // vol_24h > 5pp = high volatility
const MISPRICED_LIQ_MAX   = 5500  // min(yesPool,noPool) < 5500 = low liquidity
const LOPSIDED_LOW        = 5     // probability < 5%
const LOPSIDED_HIGH       = 95    // probability > 95%
const EXPIRING_HOURS      = 6     // closes within 6h

// ─── Check staleness from snapshot history ────────────────────────────────

function isStale(snapshots) {
  if (!snapshots || snapshots.length < 2) return false  // not enough data

  const cutoff = Date.now() - STALE_HOURS * 3600000
  const recent = snapshots.filter(s => new Date(s.created_at).getTime() >= cutoff)

  if (!recent.length) return true  // no snapshots in 48h = stale

  const probs  = recent.map(s => s.amm_probability)
  const change = Math.abs(Math.max(...probs) - Math.min(...probs))

  return change < STALE_THRESHOLD_PP
}

// ─── Classify market quality issue ───────────────────────────────────────

function classifyFlag(market, stale) {
  const prob = parseFloat(market.prices_yes) ||
    (parseFloat(market.no_pool) / (parseFloat(market.yes_pool) + parseFloat(market.no_pool))) * 100 ||
    50

  // Expiring soon (highest priority)
  if (market.close_date) {
    const hoursLeft = (new Date(market.close_date).getTime() - Date.now()) / 3600000
    if (hoursLeft > 0 && hoursLeft <= EXPIRING_HOURS) return 'EXPIRING'
  }

  // Lopsided probability
  if (prob < LOPSIDED_LOW || prob > LOPSIDED_HIGH) return 'LOPSIDED'

  // Mispriced: high volatility + low liquidity
  const vol = parseFloat(market.vol_24h) || 0
  const liq = Math.min(parseFloat(market.yes_pool) || 5000, parseFloat(market.no_pool) || 5000)
  if (vol > MISPRICED_VOL_MIN && liq < MISPRICED_LIQ_MAX) return 'MISPRICED'

  // Stale
  if (stale) return 'STALE'

  return null
}

// ─── Main calibration function ────────────────────────────────────────────

export async function calibrateMarkets() {
  const supabase = getSupabase()

  const { data: markets, error } = await supabase
    .from('markets')
    .select('id, title, status, close_date, yes_pool, no_pool, vol_24h')
    .eq('status', 'ACTIVE')
    .gt('close_date', new Date().toISOString())

  if (error || !markets?.length) return { checked: 0 }

  const flagCounts = { STALE: 0, MISPRICED: 0, LOPSIDED: 0, EXPIRING: 0, OK: 0 }
  const flagged    = []

  for (const market of markets) {
    try {
      const snapshots = await getProbabilityHistory(market.id, { hours: 72, limit: 100 })
      const stale     = isStale(snapshots)
      const flag      = classifyFlag(market, stale)

      await supabase
        .from('markets')
        .update({
          stale_flag:       stale,
          calibration_flag: flag,
        })
        .eq('id', market.id)

      if (flag) {
        flagCounts[flag]++
        flagged.push({ id: market.id, title: market.title?.slice(0, 60), flag })
        console.log('[calibrator]', flag, '→', market.title?.slice(0, 60))
      } else {
        flagCounts.OK++
      }
    } catch (err) {
      console.error('[calibrator] market', market.id, err.message)
    }
  }

  return {
    checked:  markets.length,
    flagged:  flagged.length,
    flags:    flagCounts,
    details:  flagged,
  }
}
