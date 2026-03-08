// ============================================================
// Article Queue — Supabase-backed persistence with URL dedup
// ============================================================

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Enqueue articles (batch upsert, ignore URL conflicts) ───────────────

export async function enqueueArticles(articles) {
  if (!articles.length) return { inserted: 0, duplicates: 0, errors: [] }

  const supabase = getSupabase()

  // Insert in batches of 50 to avoid request size limits
  const BATCH_SIZE = 50
  let inserted  = 0
  let duplicates = 0
  const errors  = []

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE)

    const { data, error } = await supabase
      .from('articles')
      .upsert(batch, {
        onConflict:        'url',
        ignoreDuplicates:  true,
      })
      .select('id')

    if (error) {
      errors.push(error.message)
    } else {
      inserted += data?.length ?? 0
      duplicates += batch.length - (data?.length ?? 0)
    }
  }

  return { inserted, duplicates, errors }
}

// ─── Fetch unprocessed articles (ordered by newest first) ────────────────

export async function getUnprocessedArticles(limit = 50) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('processed', false)
    .order('ingested_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[articleQueue] getUnprocessed error:', error.message)
    return []
  }
  return data || []
}

// ─── Mark articles as processed (batch update) ───────────────────────────

export async function markProcessed(articleIds, updates = {}) {
  if (!articleIds.length) return

  const supabase = getSupabase()

  const { error } = await supabase
    .from('articles')
    .update({ processed: true, ...updates })
    .in('id', articleIds)

  if (error) {
    console.error('[articleQueue] markProcessed error:', error.message)
  }
}

// ─── Update article with extracted entities/event_type ───────────────────

export async function updateArticleDetection(id, { entities, event_type }) {
  const supabase = getSupabase()

  const { error } = await supabase
    .from('articles')
    .update({ entities, event_type, processed: true })
    .eq('id', id)

  if (error) {
    console.error('[articleQueue] updateDetection error:', error.message)
  }
}

// ─── Get recently ingested articles (for signal pipeline) ────────────────

export async function getRecentArticles(sinceMinutes = 60, limit = 100) {
  const supabase = getSupabase()
  const since    = new Date(Date.now() - sinceMinutes * 60000).toISOString()

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .gte('ingested_at', since)
    .order('ingested_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[articleQueue] getRecent error:', error.message)
    return []
  }
  return data || []
}

// ─── Prune old articles (keep last 7 days) ────────────────────────────────

export async function pruneOldArticles() {
  const supabase  = getSupabase()
  const cutoff    = new Date(Date.now() - 7 * 24 * 3600000).toISOString()

  const { error } = await supabase
    .from('articles')
    .delete()
    .lt('ingested_at', cutoff)
    .eq('processed', true)

  if (error) {
    console.error('[articleQueue] prune error:', error.message)
  }
}
