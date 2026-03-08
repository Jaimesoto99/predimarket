// ============================================================
// Source Scorer — maintains dynamic credibility scores
// for each news source based on historical oracle alignment
//
// Score formula:
//   base = sourceRegistry credibility (static)
//   live = Bayesian update from correct/incorrect signals
//   current_score = 0.4 * base + 0.6 * live (when ≥5 signals)
// ============================================================

import { createClient } from '@supabase/supabase-js'
import { SOURCE_MAP }   from '../../lib/engine/sources/sourceRegistry'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Bayesian credibility update ─────────────────────────────────────────────
// Uses Beta distribution mean: (correct + α) / (total + α + β)
// Prior: α=2, β=2 (neutral prior, avoids extremes on low data)

function bayesianScore(correct, total, prior = 2) {
  return (correct + prior) / (total + prior * 2)
}

// ─── Blend static base with live Bayesian score ───────────────────────────────

function blendScore(base, correct, incorrect) {
  const total = correct + incorrect
  if (total < 5) return base  // not enough data, trust static base
  const live = bayesianScore(correct, total)
  return 0.4 * base + 0.6 * live
}

// ─── Initialize source trust row if missing ───────────────────────────────────

export async function ensureSourceRow(sourceKey) {
  const supabase = getSupabase()
  const source   = SOURCE_MAP[sourceKey]
  if (!source) return null

  const { data: existing } = await supabase
    .from('source_trust_scores')
    .select('source_key')
    .eq('source_key', sourceKey)
    .single()

  if (existing) return existing

  const { data, error } = await supabase
    .from('source_trust_scores')
    .insert({
      source_key:      sourceKey,
      label:           source.label,
      base_credibility: source.credibility,
      current_score:   source.credibility,
    })
    .select()
    .single()

  if (error) {
    console.error('[sourceScorer] ensureSourceRow error:', error.message)
    return null
  }
  return data
}

// ─── Get source score (with fallback to sourceRegistry) ──────────────────────

export async function getSourceScore(sourceKey) {
  const supabase = getSupabase()

  const { data } = await supabase
    .from('source_trust_scores')
    .select('current_score, spam_flag')
    .eq('source_key', sourceKey)
    .single()

  if (!data) {
    const source = SOURCE_MAP[sourceKey]
    return source?.credibility ?? 0.50
  }

  if (data.spam_flag) return 0.10
  return data.current_score
}

// ─── Get all source scores (for batch operations) ─────────────────────────────

export async function getAllSourceScores() {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('source_trust_scores')
    .select('*')
    .order('current_score', { ascending: false })

  if (error) return []
  return data || []
}

// ─── Record signal feedback — update correct/incorrect counts ─────────────────
// Called after a market resolves: compare signal direction with actual outcome

export async function recordSignalFeedback(sourceKey, wasCorrect) {
  const supabase = getSupabase()
  const source   = SOURCE_MAP[sourceKey]

  // Ensure row exists
  await ensureSourceRow(sourceKey)

  // Fetch current counts
  const { data: row } = await supabase
    .from('source_trust_scores')
    .select('base_credibility, correct_signals, incorrect_signals')
    .eq('source_key', sourceKey)
    .single()

  if (!row) return

  const correct   = row.correct_signals   + (wasCorrect ? 1 : 0)
  const incorrect = row.incorrect_signals + (wasCorrect ? 0 : 1)
  const base      = row.base_credibility || source?.credibility || 0.50

  const newScore = blendScore(base, correct, incorrect)

  await supabase
    .from('source_trust_scores')
    .update({
      correct_signals:    correct,
      incorrect_signals:  incorrect,
      current_score:      Math.max(0.05, Math.min(1.0, newScore)),
      last_feedback_at:   new Date().toISOString(),
      updated_at:         new Date().toISOString(),
    })
    .eq('source_key', sourceKey)
}

// ─── Record article ingestion (increment total_articles) ─────────────────────

export async function recordArticleIngested(sourceKey) {
  const supabase = getSupabase()
  await ensureSourceRow(sourceKey)

  await supabase.rpc('increment_source_articles', { p_source_key: sourceKey })
    .catch(() => {
      // Fallback: manual increment
      return supabase
        .from('source_trust_scores')
        .select('total_articles')
        .eq('source_key', sourceKey)
        .single()
        .then(({ data }) => {
          if (data) {
            return supabase
              .from('source_trust_scores')
              .update({ total_articles: data.total_articles + 1, updated_at: new Date().toISOString() })
              .eq('source_key', sourceKey)
          }
        })
    })
}

// ─── Flag source as spam (emergency brake) ───────────────────────────────────

export async function flagSourceAsSpam(sourceKey, flagged = true) {
  const supabase = getSupabase()
  await ensureSourceRow(sourceKey)

  return supabase
    .from('source_trust_scores')
    .update({ spam_flag: flagged, updated_at: new Date().toISOString() })
    .eq('source_key', sourceKey)
}

// ─── Sync all source rows from sourceRegistry (idempotent) ───────────────────
// Creates rows for any source that doesn't yet have one

export async function syncSourceRows() {
  const supabase = getSupabase()
  const sources  = Object.values(SOURCE_MAP)

  const rows = sources.map(s => ({
    source_key:       s.key,
    label:            s.label,
    base_credibility: s.credibility,
    current_score:    s.credibility,
  }))

  const { error } = await supabase
    .from('source_trust_scores')
    .upsert(rows, {
      onConflict:        'source_key',
      ignoreDuplicates:  true,       // don't overwrite live scores
    })

  if (error) console.error('[sourceScorer] syncSourceRows error:', error.message)
  return { synced: rows.length }
}

// ─── Get ranked sources (for transparency API) ────────────────────────────────

export async function getRankedSources({ limit = 50 } = {}) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('source_trust_scores')
    .select('source_key, label, base_credibility, current_score, resolution_accuracy, correct_signals, incorrect_signals, total_articles, spam_flag, last_feedback_at')
    .order('current_score', { ascending: false })
    .limit(limit)

  if (error) return []

  return (data || []).map(row => ({
    ...row,
    total_signals: row.correct_signals + row.incorrect_signals,
    accuracy: row.correct_signals + row.incorrect_signals > 0
      ? row.correct_signals / (row.correct_signals + row.incorrect_signals)
      : null,
  }))
}
