// ============================================================
// Market Creator — persists validated candidates to the database
//
// Flow:
//   1. Save candidate to market_candidates (status=APPROVED)
//   2. Call existing create_market Supabase RPC
//   3. Link created market_id back to candidate
//   4. Log lifecycle event: CANDIDATE → ACTIVE
//   5. Return created market data
// ============================================================

import { createClient }  from '@supabase/supabase-js'
import { logLifecycle }  from './marketLifecycle'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Persist candidate record ─────────────────────────────────────────────

async function saveCandidateRecord(supabase, candidate) {
  // Strip internal-only fields before inserting
  const { _detection, _scoring, initial_prob, ...dbRecord } = candidate

  const { data, error } = await supabase
    .from('market_candidates')
    .insert({ ...dbRecord, status: 'APPROVED', validated_at: new Date().toISOString() })
    .select('id')
    .single()

  if (error) {
    console.error('[marketCreator] saveCandidateRecord error:', error.message)
    return null
  }
  return data?.id
}

// ─── Map oracle_type to market_type ──────────────────────────────────────

function resolveMarketType(durationHours) {
  if (durationHours <= 24)  return 'DIARIO'
  if (durationHours <= 168) return 'SEMANAL'
  return 'MENSUAL'
}

// ─── Create market via existing Supabase RPC ──────────────────────────────

async function createMarketRecord(supabase, candidate) {
  const marketType = resolveMarketType(candidate.duration_hours)

  const { data, error } = await supabase.rpc('create_market', {
    p_title:          candidate.question,
    p_description:    candidate.description || `Mercado generado automáticamente. Fuente: datos de noticias verificadas. Categoría: ${candidate.category}.`,
    p_category:       candidate.category,
    p_market_type:    marketType,
    p_duration_hours: Math.round(candidate.duration_hours),
    p_initial_pool:   5000,
  })

  if (error) {
    console.error('[marketCreator] createMarket RPC error:', error.message)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

// ─── Enrich market with auto_created + oracle metadata ───────────────────

async function enrichMarketMetadata(supabase, marketId, candidate, candidateId) {
  const { error } = await supabase
    .from('markets')
    .update({
      oracle_type:         candidate.oracle_type,
      resolution_method:   candidate.oracle_type,
      source_candidate_id: candidateId,
      auto_created:        true,
      relevance_score:     candidate.relevance_score,
    })
    .eq('id', marketId)

  if (error) {
    console.error('[marketCreator] enrichMetadata error:', error.message)
  }
}

// ─── Link candidate to created market ────────────────────────────────────

async function linkCandidateToMarket(supabase, candidateId, marketId) {
  const { error } = await supabase
    .from('market_candidates')
    .update({ status: 'CREATED', market_id: marketId })
    .eq('id', candidateId)

  if (error) {
    console.error('[marketCreator] linkCandidate error:', error.message)
  }
}

// ─── Main create function ─────────────────────────────────────────────────

export async function createMarket(candidate) {
  const supabase    = getSupabase()

  // 1. Save candidate record
  const candidateId = await saveCandidateRecord(supabase, candidate)

  // 2. Create market
  const { success, data, error } = await createMarketRecord(supabase, candidate)
  if (!success) {
    // Mark candidate as failed
    if (candidateId) {
      await supabase
        .from('market_candidates')
        .update({ status: 'REJECTED', rejection_reason: error })
        .eq('id', candidateId)
    }
    return { success: false, error }
  }

  // Extract market ID from RPC result
  const marketId = data?.market_id || data?.id || (typeof data === 'object' ? data?.id : null)
  if (!marketId) {
    console.error('[marketCreator] no market_id in RPC response:', data)
    return { success: true, data, warning: 'Could not extract market_id for metadata' }
  }

  // 3. Enrich market with oracle metadata
  await enrichMarketMetadata(supabase, marketId, candidate, candidateId)

  // 4. Link candidate → market
  if (candidateId) {
    await linkCandidateToMarket(supabase, candidateId, marketId)
  }

  // 5. Log lifecycle event
  await logLifecycle({
    market_id:    marketId,
    candidate_id: candidateId,
    from_state:   null,
    to_state:     'ACTIVE',
    triggered_by: 'auto',
    reason:       `Auto-created from template ${candidate.template_id}. Score: ${candidate.relevance_score?.toFixed(2)}`,
    metadata: {
      template_id:     candidate.template_id,
      relevance_score: candidate.relevance_score,
      oracle_type:     candidate.oracle_type,
      entities:        Object.keys(candidate.entities || {}),
    },
  })

  return {
    success:     true,
    marketId,
    candidateId,
    question:    candidate.question,
    category:    candidate.category,
    oracleType:  candidate.oracle_type,
    score:       candidate.relevance_score,
  }
}

// ─── Batch create from approved candidates ────────────────────────────────

export async function createMarkets(approvedCandidates, maxPerRun = 5) {
  const toCreate = approvedCandidates.slice(0, maxPerRun)
  const created  = []
  const failed   = []

  for (const { candidate } of toCreate) {
    const result = await createMarket(candidate)
    if (result.success) {
      created.push(result)
    } else {
      failed.push({ candidate, error: result.error })
    }
  }

  return { created: created.length, failed: failed.length, details: created, errors: failed }
}
