// ============================================================
// Oracle Verifier — tracks oracle health and reliability
//
// Maintains oracle_reliability table with:
//   - availability checks (ping)
//   - resolution accuracy (post-hoc comparison)
//   - response latency
// ============================================================

import { createClient }   from '@supabase/supabase-js'
import {
  resolveYahooFinance,
  resolveCoinGecko,
  resolveREEPrice,
  resolveINEData,
  resolveBOEPublication,
} from '../resolution/resolutionSources'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Oracle probe definitions (lightweight availability checks) ──────────────

const ORACLE_PROBES = {
  PRICE_THRESHOLD: async () => resolveYahooFinance('%5EIBEX', null, 'direction'),
  PRICE_DIRECTION: async () => resolveYahooFinance('%5EGSPC', null, 'direction'),
  DATA_RELEASE:    async () => resolveINEData('IPC', 3),
  RATE_CHANGE:     async () => resolveINEData('IPC', 3),  // same underlying source
  BOE_PUBLICATION: async () => resolveBOEPublication(['ley']),
  NEWS_CONFIRMATION: async () => resolveBOEPublication(['decreto']),
}

// These oracle types require live event data — can't probe without a real market
const PASSIVE_ORACLE_TYPES = new Set([
  'SPORTS_RESULT',
  'ELECTORAL_RESULT',
  'OFFICIAL_STATEMENT',
])

// ─── Probe a single oracle for availability ───────────────────────────────────

export async function probeOracle(oracleType) {
  if (PASSIVE_ORACLE_TYPES.has(oracleType)) {
    return {
      oracle_type: oracleType,
      response_ok: true,
      response_ms: 0,
      passive:     true,
    }
  }

  const probe = ORACLE_PROBES[oracleType]
  if (!probe) {
    return { oracle_type: oracleType, response_ok: false, error: 'No probe defined' }
  }

  const startMs = Date.now()
  try {
    const result = await probe()
    const responseMs = Date.now() - startMs

    return {
      oracle_type: oracleType,
      response_ok: result !== null,
      response_ms: responseMs,
      value:       result?.value ?? null,
    }
  } catch (err) {
    return {
      oracle_type: oracleType,
      response_ok: false,
      response_ms: Date.now() - startMs,
      error:       err.message,
    }
  }
}

// ─── Record oracle check result in DB ────────────────────────────────────────

async function recordOracleCheck(supabase, probeResult, marketId = null) {
  await supabase
    .from('oracle_verification_log')
    .insert({
      oracle_type:    probeResult.oracle_type,
      market_id:      marketId,
      response_ok:    probeResult.response_ok,
      response_ms:    probeResult.response_ms || null,
      value_returned: probeResult.value       || null,
      error_message:  probeResult.error       || null,
    })
    .then(({ error }) => {
      if (error) console.error('[oracleVerifier] log error:', error.message)
    })
}

// ─── Update aggregate reliability stats ──────────────────────────────────────

async function updateReliabilityStats(supabase, oracleType, responseOk, responseMs) {
  const { data: row } = await supabase
    .from('oracle_reliability')
    .select('total_checks, successful_checks, failed_checks, avg_response_ms')
    .eq('oracle_type', oracleType)
    .single()

  if (!row) return

  const total      = row.total_checks + 1
  const successful = row.successful_checks + (responseOk ? 1 : 0)
  const failed     = row.failed_checks     + (responseOk ? 0 : 1)

  // Exponential moving average for response time (α = 0.2)
  const avgMs = responseMs && row.avg_response_ms
    ? Math.round(row.avg_response_ms * 0.8 + responseMs * 0.2)
    : responseMs || row.avg_response_ms

  // Reliability score: Bayesian estimate with prior=5 (assume reliable)
  const prior = 5
  const reliabilityScore = (successful + prior) / (total + prior * 2)

  const now = new Date().toISOString()

  await supabase
    .from('oracle_reliability')
    .update({
      total_checks:      total,
      successful_checks: successful,
      failed_checks:     failed,
      avg_response_ms:   avgMs,
      reliability_score: Math.max(0.01, Math.min(1.0, reliabilityScore)),
      last_checked_at:   now,
      ...(responseOk ? { last_success_at: now } : { last_failure_at: now }),
      updated_at:        now,
    })
    .eq('oracle_type', oracleType)
}

// ─── Run all oracle probes ────────────────────────────────────────────────────

export async function runOracleHealthCheck() {
  const supabase = getSupabase()

  const oracleTypes = [
    'PRICE_THRESHOLD', 'PRICE_DIRECTION', 'SPORTS_RESULT',
    'DATA_RELEASE', 'RATE_CHANGE', 'BOE_PUBLICATION',
    'ELECTORAL_RESULT', 'NEWS_CONFIRMATION', 'OFFICIAL_STATEMENT',
  ]

  const results = []

  for (const oracleType of oracleTypes) {
    const result = await probeOracle(oracleType)

    if (!result.passive) {
      await recordOracleCheck(supabase, result)
      await updateReliabilityStats(supabase, oracleType, result.response_ok, result.response_ms)
    }

    results.push(result)
  }

  const available = results.filter(r => r.response_ok).length

  return {
    checked:    results.length,
    available,
    degraded:   results.length - available,
    details:    results,
  }
}

// ─── Record resolution outcome against prediction ────────────────────────────
// Called after a market resolves to update resolution accuracy stats

export async function recordResolutionOutcome(oracleType, { predictedOutcome, actualOutcome, marketId }) {
  const supabase = getSupabase()
  const correct  = predictedOutcome === actualOutcome

  // Update most recent log entry for this market
  await supabase
    .from('oracle_verification_log')
    .update({
      expected_outcome: predictedOutcome,
      actual_outcome:   actualOutcome,
    })
    .eq('oracle_type', oracleType)
    .eq('market_id', marketId)
    .is('expected_outcome', null)
    .order('checked_at', { ascending: false })
    .limit(1)

  // Update resolution accuracy in aggregate stats
  const { data: row } = await supabase
    .from('oracle_reliability')
    .select('total_resolutions, correct_resolutions')
    .eq('oracle_type', oracleType)
    .single()

  if (!row) return

  const totalRes   = row.total_resolutions + 1
  const correctRes = row.correct_resolutions + (correct ? 1 : 0)

  await supabase
    .from('oracle_reliability')
    .update({
      total_resolutions:   totalRes,
      correct_resolutions: correctRes,
      updated_at:          new Date().toISOString(),
    })
    .eq('oracle_type', oracleType)
}

// ─── Get oracle reliability summary ──────────────────────────────────────────

export async function getOracleReliability() {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('oracle_reliability')
    .select('*')
    .order('reliability_score', { ascending: false })

  if (error) return []

  return (data || []).map(row => ({
    ...row,
    resolution_accuracy: row.total_resolutions > 0
      ? row.correct_resolutions / row.total_resolutions
      : null,
    availability_rate: row.total_checks > 0
      ? row.successful_checks / row.total_checks
      : null,
  }))
}

// ─── Get reliability score for a specific oracle type ────────────────────────

export async function getOracleScore(oracleType) {
  const supabase = getSupabase()

  const { data } = await supabase
    .from('oracle_reliability')
    .select('reliability_score')
    .eq('oracle_type', oracleType)
    .single()

  return data?.reliability_score ?? 1.0  // default: full trust if not yet checked
}
