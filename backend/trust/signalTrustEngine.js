// ============================================================
// Signal Trust Engine — enriches signals with trust metadata
//
// Trust score = source_score(40%) × match_quality(30%) × consensus(30%)
// Decay factor computed from signal age + type half-life
// ============================================================

import { getSourceScore }          from './sourceScorer'
import { computeConsensus }        from './sourceConsensus'
import { computeDecayFactor }      from './signalDecay'
import { createClient }            from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Compute trust score for a single signal ──────────────────────────────────

export async function computeSignalTrust(signal) {
  // 1. Source credibility
  const sourceScore = await getSourceScore(signal.source_key)

  // 2. Match quality (already embedded in signal strength from signalScorer)
  const matchQuality = Math.min(1.0, signal.strength || 0.5)

  // 3. Consensus across sources covering same market
  const consensus = await computeConsensus(signal.market_id, {
    currentSourceKey: signal.source_key,
    eventType:        signal.event_type,
  })

  // Composite trust score
  const trustScore = (
    sourceScore   * 0.40 +
    matchQuality  * 0.30 +
    consensus     * 0.30
  )

  // Decay factor from signal age
  const decayFactor = computeDecayFactor(signal)

  return {
    trust_score:       Math.max(0, Math.min(1, trustScore)),
    decay_factor:      decayFactor,
    consensus_sources: 0,  // will be updated by computeConsensus if needed
    components: {
      source_score:   sourceScore,
      match_quality:  matchQuality,
      consensus,
      decay_factor:   decayFactor,
    },
  }
}

// ─── Enrich a batch of signals with trust metadata ────────────────────────────

export async function enrichSignalsWithTrust(signals) {
  const enriched = []

  for (const signal of signals) {
    try {
      const trust = await computeSignalTrust(signal)
      enriched.push({ ...signal, ...trust })
    } catch (err) {
      console.error('[signalTrustEngine] enrichSignal error:', err.message)
      enriched.push({ ...signal, trust_score: 0.5, decay_factor: 1.0 })
    }
  }

  return enriched
}

// ─── Persist trust scores to DB (batch update) ───────────────────────────────

export async function persistSignalTrust(signalId, { trust_score, decay_factor, consensus_sources }) {
  const supabase = getSupabase()

  const { error } = await supabase
    .from('signals')
    .update({
      trust_score:       trust_score       ?? null,
      decay_factor:      decay_factor      ?? null,
      consensus_sources: consensus_sources ?? 0,
    })
    .eq('id', signalId)

  if (error) {
    console.error('[signalTrustEngine] persistSignalTrust error:', error.message)
  }
}

// ─── Run trust scoring for all recent unscored signals ───────────────────────

export async function scoreRecentSignals({ sinceHours = 6, batchSize = 50 } = {}) {
  const supabase  = getSupabase()
  const since     = new Date(Date.now() - sinceHours * 3600000).toISOString()

  const { data: signals, error } = await supabase
    .from('signals')
    .select('id, market_id, source_key, strength, event_type, signal_type, direction, created_at')
    .is('trust_score', null)
    .eq('is_active', true)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(batchSize)

  if (error || !signals?.length) return { scored: 0, errors: 0 }

  let scored = 0
  let errors = 0

  for (const signal of signals) {
    try {
      const trust = await computeSignalTrust(signal)
      await persistSignalTrust(signal.id, trust)
      scored++
    } catch (err) {
      console.error('[signalTrustEngine] scoring error for signal', signal.id, err.message)
      errors++
    }
  }

  return { scored, errors, total: signals.length }
}

// ─── Get effective signal strength (strength × decay × trust) ─────────────────

export function effectiveStrength(signal) {
  const strength = signal.strength      || 0
  const decay    = signal.decay_factor  ?? 1.0
  const trust    = signal.trust_score   ?? 0.5

  return strength * decay * trust
}

// ─── Filter signals by minimum trust threshold ────────────────────────────────

export function filterByTrust(signals, minTrust = 0.30) {
  return signals.filter(s => (s.trust_score ?? 0.5) >= minTrust)
}
