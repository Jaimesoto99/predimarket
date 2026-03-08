// ============================================================
// Market Trust Score — composite credibility for each market
//
// trust_score (0-1) = weighted average of:
//   source_diversity   (20%) — breadth of sources covering this market
//   signal_quality     (25%) — avg trust score of active signals
//   oracle_reliability (25%) — track record of the oracle type
//   manipulation_risk  (20%) — inverted risk score (1 - risk)
//   consensus_level    (10%) — source agreement on direction
//
// Trust labels:
//   [0.00, 0.30)  → UNVERIFIED
//   [0.30, 0.45)  → LOW
//   [0.45, 0.60)  → MODERATE
//   [0.60, 0.75)  → GOOD
//   [0.75, 0.90)  → HIGH
//   [0.90, 1.00]  → VERIFIED
// ============================================================

import { createClient }           from '@supabase/supabase-js'
import { getMarketConsensus,
         computeSourceDiversity } from './sourceConsensus'
import { getOracleScore }         from './oracleVerifier'
import { computeManipulationRisk } from './manipulationDetector'
import { filterByTrust }          from './signalTrustEngine'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Trust label from score ───────────────────────────────────────────────────

export function trustLabel(score) {
  if (score >= 0.90) return 'VERIFIED'
  if (score >= 0.75) return 'HIGH'
  if (score >= 0.60) return 'GOOD'
  if (score >= 0.45) return 'MODERATE'
  if (score >= 0.30) return 'LOW'
  return 'UNVERIFIED'
}

// ─── Compute trust score for a single market ──────────────────────────────────

export async function computeMarketTrust(market) {
  const supabase   = getSupabase()
  const marketId   = market.id
  const oracleType = market.oracle_type || 'PRICE_THRESHOLD'

  // 1. Fetch active signals
  const { data: signals } = await supabase
    .from('signals')
    .select('id, source_key, strength, trust_score, direction, created_at, event_type')
    .eq('market_id', marketId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(50)

  const activeSignals = signals || []

  // 2. Source diversity (from signal source_keys + candidate source_articles)
  const signalSources    = activeSignals.map(s => s.source_key).filter(Boolean)
  const sourceDiversity  = computeSourceDiversity(signalSources)

  // 3. Signal quality — avg trust_score of trusted signals
  const trustedSignals   = filterByTrust(activeSignals, 0.30)
  const signalQuality    = trustedSignals.length > 0
    ? trustedSignals.reduce((a, s) => a + (s.trust_score ?? 0.5), 0) / trustedSignals.length
    : (activeSignals.length > 0 ? 0.40 : 0.25)

  // 4. Oracle reliability
  const oracleReliability = await getOracleScore(oracleType)

  // 5. Manipulation risk (inverted: high risk = low trust)
  const rawManipulationRisk = await computeManipulationRisk(marketId)
  const manipulationScore   = 1 - rawManipulationRisk

  // 6. Source consensus
  const consensusData  = await getMarketConsensus(marketId, { sinceHours: 6 })
  const consensusLevel = consensusData.consensus_score ?? 0.25

  // 7. Composite score (weighted)
  const trustScore = (
    sourceDiversity  * 0.20 +
    signalQuality    * 0.25 +
    oracleReliability * 0.25 +
    manipulationScore * 0.20 +
    consensusLevel   * 0.10
  )

  // 8. Active alert count
  const { data: alerts } = await supabase
    .from('manipulation_alerts')
    .select('id', { count: 'exact' })
    .eq('market_id', marketId)
    .eq('resolved', false)

  const activeAlertCount = alerts?.length ?? 0

  const score = Math.max(0, Math.min(1, trustScore))

  return {
    market_id:          marketId,
    trust_score:        score,
    source_diversity:   sourceDiversity,
    signal_quality:     signalQuality,
    oracle_reliability: oracleReliability,
    manipulation_risk:  rawManipulationRisk,
    consensus_level:    consensusLevel,
    active_alert_count: activeAlertCount,
    trust_label:        trustLabel(score),
    computed_at:        new Date().toISOString(),
    components: {
      source_diversity:    sourceDiversity,
      signal_quality:      signalQuality,
      oracle_reliability:  oracleReliability,
      manipulation_score:  manipulationScore,
      consensus_level:     consensusLevel,
    },
  }
}

// ─── Persist trust score to DB ────────────────────────────────────────────────

export async function persistMarketTrust(trustData) {
  const supabase = getSupabase()

  const { components: _, ...row } = trustData  // strip non-DB field

  const { error } = await supabase
    .from('market_trust_scores')
    .upsert(row, { onConflict: 'market_id' })

  if (error) {
    console.error('[marketTrustScore] persistMarketTrust error:', error.message)
  }
}

// ─── Compute + persist for a single market ────────────────────────────────────

export async function updateMarketTrust(market) {
  const trust = await computeMarketTrust(market)
  await persistMarketTrust(trust)
  return trust
}

// ─── Batch update all active markets ─────────────────────────────────────────

export async function updateAllMarketTrustScores() {
  const supabase = getSupabase()

  const { data: markets, error } = await supabase
    .from('markets')
    .select('id, oracle_type, status')
    .in('status', ['ACTIVE', 'CLOSING'])

  if (error || !markets?.length) return { updated: 0, errors: 0 }

  let updated = 0
  let errors  = 0

  for (const market of markets) {
    try {
      await updateMarketTrust(market)
      updated++
    } catch (err) {
      console.error('[marketTrustScore] update error for', market.id, err.message)
      errors++
    }
  }

  return { updated, errors }
}

// ─── Get cached trust score from DB (fast path) ──────────────────────────────

export async function getMarketTrust(marketId) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('market_trust_scores')
    .select('*')
    .eq('market_id', marketId)
    .single()

  if (error || !data) return null

  return {
    ...data,
    trust_label: data.trust_label || trustLabel(data.trust_score),
  }
}

// ─── Get trust scores for multiple markets (batch) ───────────────────────────

export async function getMarketTrustBatch(marketIds) {
  if (!marketIds?.length) return {}

  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('market_trust_scores')
    .select('*')
    .in('market_id', marketIds)

  if (error) return {}

  return Object.fromEntries(
    (data || []).map(row => [row.market_id, {
      ...row,
      trust_label: row.trust_label || trustLabel(row.trust_score),
    }])
  )
}
