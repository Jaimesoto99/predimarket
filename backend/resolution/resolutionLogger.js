// ============================================================
// Resolution Logger — persists resolution results to Supabase
// and exposes query functions for the resolution log endpoint.
//
// Stores in: market_resolution_log table
// Falls back to console logging if table doesn't exist.
// ============================================================

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Log a resolution event ───────────────────────────────────────────────

export async function logResolution({
  marketId,
  question,
  outcome,
  oracleSource,
  oracleValue,
  evidence,
  oracleCredibility,
  resolvedAt,
  status,   // 'RESOLVED' | 'ORACLE_UNAVAILABLE' | 'TRUST_FAILED' | 'EXPIRED'
}) {
  const supabase  = getSupabase()
  const timestamp = resolvedAt || new Date().toISOString()

  const record = {
    market_id:          marketId,
    question:           question?.slice(0, 500),
    outcome:            outcome ?? null,
    oracle_source:      oracleSource?.slice(0, 500),
    oracle_value:       oracleValue ?? null,
    oracle_credibility: oracleCredibility ?? null,
    evidence:           evidence ?? [],
    status,
    resolved_at:        timestamp,
    created_at:         timestamp,
  }

  // Structured console log always (visible in Vercel logs)
  console.log('[resolution]', JSON.stringify({
    marketId,
    outcome: outcome === true ? 'YES' : outcome === false ? 'NO' : null,
    status,
    source:  oracleSource?.slice(0, 80),
    credibility: oracleCredibility,
    evidence: evidence?.length ?? 0,
  }))

  // Persist to DB (best-effort — table may not exist yet)
  try {
    const { error } = await supabase
      .from('market_resolution_log')
      .insert(record)

    if (error && !error.message.includes('does not exist')) {
      console.error('[resolutionLogger] DB error:', error.message)
    }
  } catch (err) {
    // Non-critical — log only
    console.error('[resolutionLogger] insert error:', err.message)
  }

  return record
}

// ─── Query resolution log ─────────────────────────────────────────────────

export async function getResolutionLog({ limit = 50, marketId = null } = {}) {
  const supabase = getSupabase()

  try {
    let query = supabase
      .from('market_resolution_log')
      .select('*')
      .order('resolved_at', { ascending: false })
      .limit(limit)

    if (marketId) query = query.eq('market_id', marketId)

    const { data, error } = await query
    if (error) return []
    return data || []
  } catch {
    return []
  }
}

// ─── Summary stats ────────────────────────────────────────────────────────

export async function getResolutionStats() {
  const supabase = getSupabase()

  try {
    const { data, error } = await supabase
      .from('market_resolution_log')
      .select('status, outcome, oracle_credibility')

    if (error || !data?.length) return { total: 0 }

    return {
      total:          data.length,
      resolved:       data.filter(r => r.status === 'RESOLVED').length,
      yes:            data.filter(r => r.outcome === true).length,
      no:             data.filter(r => r.outcome === false).length,
      unavailable:    data.filter(r => r.status === 'ORACLE_UNAVAILABLE').length,
      trust_failed:   data.filter(r => r.status === 'TRUST_FAILED').length,
      expired:        data.filter(r => r.status === 'EXPIRED').length,
      avg_credibility: data.length > 0
        ? (data.reduce((s, r) => s + (r.oracle_credibility || 0), 0) / data.length).toFixed(3)
        : 0,
    }
  } catch {
    return { total: 0 }
  }
}
