// ============================================================
// Manipulation Detector — identifies suspicious market activity
//
// Alert types:
//   PROB_SPIKE       — sudden large probability jump (>15pp in <30min)
//   SIGNAL_STORM     — excessive signals from single source
//   SOURCE_DOMINANCE — one source drives >70% of market signals
//   VOLUME_ANOMALY   — trade volume far above market average
//   WASH_TRADE       — rapid buy+sell by same user
// ============================================================

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Thresholds ───────────────────────────────────────────────────────────────

const THRESHOLDS = {
  PROB_SPIKE_PP:          15,   // pp change in <30min = alert
  PROB_SPIKE_MINUTES:     30,
  SIGNAL_STORM_COUNT:     10,   // signals from 1 source in 1h
  SOURCE_DOMINANCE_RATIO: 0.70, // 70% from one source
  VOLUME_ANOMALY_MULT:    5.0,  // 5× normal volume
  WASH_TRADE_MINUTES:     10,   // buy+sell within 10min
}

// ─── Create manipulation alert ───────────────────────────────────────────────

async function createAlert(supabase, marketId, alertType, severity, description, evidence) {
  // Check for recent duplicate alert
  const { data: recent } = await supabase
    .from('manipulation_alerts')
    .select('id')
    .eq('market_id', marketId)
    .eq('alert_type', alertType)
    .eq('resolved', false)
    .gte('created_at', new Date(Date.now() - 3600000).toISOString())  // 1h window
    .limit(1)

  if (recent?.length) return null  // already alerted recently

  const { data, error } = await supabase
    .from('manipulation_alerts')
    .insert({ market_id: marketId, alert_type: alertType, severity, description, evidence })
    .select('id')
    .single()

  if (error) {
    console.error('[manipulationDetector] createAlert error:', error.message)
    return null
  }

  console.warn(`[manipulationDetector] ${severity} ${alertType} alert on market ${marketId}`)
  return data?.id
}

// ─── Detector: PROB_SPIKE ─────────────────────────────────────────────────────

async function detectProbSpike(supabase, market) {
  const since = new Date(Date.now() - THRESHOLDS.PROB_SPIKE_MINUTES * 60000).toISOString()

  const { data: snapshots } = await supabase
    .from('probability_snapshots')
    .select('probability, created_at')
    .eq('market_id', market.id)
    .gte('created_at', since)
    .order('created_at', { ascending: true })

  if (!snapshots || snapshots.length < 2) return null

  const first = snapshots[0].probability
  const last  = snapshots[snapshots.length - 1].probability
  const delta = Math.abs(last - first)

  if (delta < THRESHOLDS.PROB_SPIKE_PP) return null

  const severity = delta >= 30 ? 'HIGH' : delta >= 20 ? 'MEDIUM' : 'LOW'

  return createAlert(
    supabase,
    market.id,
    'PROB_SPIKE',
    severity,
    `Probability changed ${delta.toFixed(1)}pp in ${THRESHOLDS.PROB_SPIKE_MINUTES} minutes`,
    { from: first, to: last, delta, window_minutes: THRESHOLDS.PROB_SPIKE_MINUTES }
  )
}

// ─── Detector: SIGNAL_STORM ───────────────────────────────────────────────────

async function detectSignalStorm(supabase, market) {
  const since = new Date(Date.now() - 3600000).toISOString()  // last 1h

  const { data: signals } = await supabase
    .from('signals')
    .select('source_key')
    .eq('market_id', market.id)
    .gte('created_at', since)

  if (!signals?.length) return null

  // Count by source
  const sourceCounts = {}
  for (const sig of signals) {
    const key = sig.source_key || 'unknown'
    sourceCounts[key] = (sourceCounts[key] || 0) + 1
  }

  const maxCount  = Math.max(...Object.values(sourceCounts))
  const maxSource = Object.keys(sourceCounts).find(k => sourceCounts[k] === maxCount)

  if (maxCount < THRESHOLDS.SIGNAL_STORM_COUNT) return null

  const severity = maxCount >= 20 ? 'HIGH' : maxCount >= 15 ? 'MEDIUM' : 'LOW'

  return createAlert(
    supabase,
    market.id,
    'SIGNAL_STORM',
    severity,
    `Source "${maxSource}" generated ${maxCount} signals in 1h`,
    { source_key: maxSource, count: maxCount, all_sources: sourceCounts }
  )
}

// ─── Detector: SOURCE_DOMINANCE ───────────────────────────────────────────────

async function detectSourceDominance(supabase, market) {
  const since = new Date(Date.now() - 6 * 3600000).toISOString()  // last 6h

  const { data: signals } = await supabase
    .from('signals')
    .select('source_key')
    .eq('market_id', market.id)
    .gte('created_at', since)

  if (!signals || signals.length < 5) return null

  const sourceCounts = {}
  for (const sig of signals) {
    const key = sig.source_key || 'unknown'
    sourceCounts[key] = (sourceCounts[key] || 0) + 1
  }

  const total     = signals.length
  const maxCount  = Math.max(...Object.values(sourceCounts))
  const dominance = maxCount / total

  if (dominance < THRESHOLDS.SOURCE_DOMINANCE_RATIO) return null

  const maxSource = Object.keys(sourceCounts).find(k => sourceCounts[k] === maxCount)
  const severity  = dominance >= 0.90 ? 'MEDIUM' : 'LOW'

  return createAlert(
    supabase,
    market.id,
    'SOURCE_DOMINANCE',
    severity,
    `"${maxSource}" accounts for ${(dominance * 100).toFixed(0)}% of market signals`,
    { source_key: maxSource, dominance_ratio: dominance, total_signals: total }
  )
}

// ─── Detector: VOLUME_ANOMALY ─────────────────────────────────────────────────

async function detectVolumeAnomaly(supabase, market) {
  // Compare last-hour volume to 7-day hourly average
  const now      = new Date()
  const oneHAgo  = new Date(now - 3600000).toISOString()
  const sevenDays = new Date(now - 7 * 86400000).toISOString()

  const [recentRes, histRes] = await Promise.all([
    supabase
      .from('trades')
      .select('amount')
      .eq('market_id', market.id)
      .gte('created_at', oneHAgo),
    supabase
      .from('trades')
      .select('amount, created_at')
      .eq('market_id', market.id)
      .gte('created_at', sevenDays)
      .lt('created_at', oneHAgo),
  ])

  const recentVol  = (recentRes.data || []).reduce((a, t) => a + parseFloat(t.amount || 0), 0)
  const historical = histRes.data || []

  if (!historical.length || recentVol < 10) return null

  const histTotal  = historical.reduce((a, t) => a + parseFloat(t.amount || 0), 0)
  const histHours  = Math.max(1, (new Date(oneHAgo) - new Date(sevenDays)) / 3600000)
  const avgHourly  = histTotal / histHours

  if (avgHourly < 1) return null  // not enough baseline

  const multiplier = recentVol / avgHourly

  if (multiplier < THRESHOLDS.VOLUME_ANOMALY_MULT) return null

  const severity = multiplier >= 10 ? 'HIGH' : multiplier >= 7 ? 'MEDIUM' : 'LOW'

  return createAlert(
    supabase,
    market.id,
    'VOLUME_ANOMALY',
    severity,
    `Volume ${multiplier.toFixed(1)}× above 7-day hourly average`,
    { recent_volume: recentVol, avg_hourly: avgHourly, multiplier }
  )
}

// ─── Detector: WASH_TRADE ────────────────────────────────────────────────────

async function detectWashTrade(supabase, market) {
  const since = new Date(Date.now() - THRESHOLDS.WASH_TRADE_MINUTES * 60000).toISOString()

  const { data: trades } = await supabase
    .from('trades')
    .select('user_id, side, amount, created_at')
    .eq('market_id', market.id)
    .gte('created_at', since)
    .order('created_at', { ascending: true })

  if (!trades || trades.length < 4) return null

  // Check for rapid round-trips per user
  const userTrades = {}
  for (const t of trades) {
    const uid = t.user_id || 'anon'
    if (!userTrades[uid]) userTrades[uid] = []
    userTrades[uid].push(t)
  }

  const suspects = []
  for (const [userId, utrades] of Object.entries(userTrades)) {
    if (utrades.length < 2) continue
    const sides = utrades.map(t => t.side)
    const hasYes = sides.includes('YES')
    const hasNo  = sides.includes('NO')
    if (hasYes && hasNo) {
      suspects.push({ user_id: userId, trade_count: utrades.length })
    }
  }

  if (!suspects.length) return null

  return createAlert(
    supabase,
    market.id,
    'WASH_TRADE',
    'MEDIUM',
    `${suspects.length} user(s) with opposing trades within ${THRESHOLDS.WASH_TRADE_MINUTES} minutes`,
    { suspects, window_minutes: THRESHOLDS.WASH_TRADE_MINUTES }
  )
}

// ─── Run all detectors for a single market ────────────────────────────────────

export async function detectManipulation(market) {
  const supabase = getSupabase()

  const results = await Promise.allSettled([
    detectProbSpike(supabase, market),
    detectSignalStorm(supabase, market),
    detectSourceDominance(supabase, market),
    detectVolumeAnomaly(supabase, market),
    detectWashTrade(supabase, market),
  ])

  const alerts = results
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value)

  return { market_id: market.id, alerts_created: alerts.length }
}

// ─── Run all detectors for all active markets ─────────────────────────────────

export async function runManipulationDetection() {
  const supabase = getSupabase()

  const { data: markets, error } = await supabase
    .from('markets')
    .select('id, title, status')
    .eq('status', 'ACTIVE')
    .gt('close_date', new Date().toISOString())

  if (error || !markets?.length) return { checked: 0, alerts: 0 }

  let totalAlerts = 0

  for (const market of markets) {
    const { alerts_created } = await detectManipulation(market)
    totalAlerts += alerts_created
  }

  return { checked: markets.length, alerts: totalAlerts }
}

// ─── Get active alerts for a market ──────────────────────────────────────────

export async function getMarketAlerts(marketId, { includeResolved = false } = {}) {
  const supabase = getSupabase()

  let query = supabase
    .from('manipulation_alerts')
    .select('*')
    .eq('market_id', marketId)
    .order('created_at', { ascending: false })

  if (!includeResolved) {
    query = query.eq('resolved', false)
  }

  const { data, error } = await query
  if (error) return []
  return data || []
}

// ─── Compute manipulation risk score (0-1) for a market ─────────────────────

export async function computeManipulationRisk(marketId) {
  const alerts = await getMarketAlerts(marketId)

  if (!alerts.length) return 0.0

  const SEVERITY_WEIGHTS = { LOW: 0.15, MEDIUM: 0.35, HIGH: 0.65, CRITICAL: 1.0 }
  const typeWeight       = { WASH_TRADE: 1.5, PROB_SPIKE: 1.2, SIGNAL_STORM: 1.0, SOURCE_DOMINANCE: 0.8, VOLUME_ANOMALY: 1.0 }

  let risk = 0
  for (const alert of alerts) {
    const sev  = SEVERITY_WEIGHTS[alert.severity] || 0.35
    const type = typeWeight[alert.alert_type]     || 1.0
    risk = Math.min(1.0, risk + sev * type * 0.3)
  }

  return Math.min(1.0, risk)
}

// ─── Acknowledge / resolve alert ─────────────────────────────────────────────

export async function acknowledgeAlert(alertId) {
  const supabase = getSupabase()
  await supabase
    .from('manipulation_alerts')
    .update({ acknowledged: true })
    .eq('id', alertId)
}

export async function resolveAlert(alertId) {
  const supabase = getSupabase()
  await supabase
    .from('manipulation_alerts')
    .update({ resolved: true, acknowledged: true })
    .eq('id', alertId)
}
