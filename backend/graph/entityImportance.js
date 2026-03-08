// ============================================================
// Entity Importance Engine — dynamic importance scoring
//
// importance = newsFrequency(35%) + marketConnections(35%) + signalVolume(30%)
//
// Scores are recomputed on each graph job run and persisted
// back to graph_entities.importance + logged to entity_importance_log.
// ============================================================

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Normalise raw counts to [0,1] using soft-max (log scale) ────────────────

function normalizeCount(count, maxCount) {
  if (!maxCount || !count) return 0
  return Math.log1p(count) / Math.log1p(maxCount)
}

// ─── Compute importance scores for all entities ───────────────────────────────

export async function computeAllImportanceScores() {
  const supabase = getSupabase()

  // Fetch raw counters for all entities
  const { data: entities, error } = await supabase
    .from('graph_entities')
    .select('id, news_frequency, market_count, signal_count, importance')

  if (error || !entities?.length) return { updated: 0 }

  // Find max values for normalization
  const maxNews    = Math.max(...entities.map(e => e.news_frequency || 0), 1)
  const maxMarkets = Math.max(...entities.map(e => e.market_count   || 0), 1)
  const maxSignals = Math.max(...entities.map(e => e.signal_count   || 0), 1)

  const now     = new Date().toISOString()
  const updates = []
  const logRows = []

  for (const entity of entities) {
    const newsScore    = normalizeCount(entity.news_frequency, maxNews)
    const marketScore  = normalizeCount(entity.market_count,   maxMarkets)
    const signalScore  = normalizeCount(entity.signal_count,   maxSignals)

    const rawScore = newsScore * 0.35 + marketScore * 0.35 + signalScore * 0.30

    // Blend with existing importance (EMA with α=0.3 for stability)
    const blended  = entity.importance * 0.70 + rawScore * 0.30
    const clamped  = Math.max(0.10, Math.min(1.0, blended))

    updates.push({ id: entity.id, importance: clamped, updated_at: now })
    logRows.push({
      entity_id:     entity.id,
      importance:    clamped,
      news_frequency: entity.news_frequency,
      market_count:  entity.market_count,
      signal_count:  entity.signal_count,
    })
  }

  // Batch update importance
  for (const update of updates) {
    await supabase
      .from('graph_entities')
      .update({ importance: update.importance, updated_at: update.updated_at })
      .eq('id', update.id)
  }

  // Log snapshots
  if (logRows.length) {
    await supabase
      .from('entity_importance_log')
      .insert(logRows)
      .then(({ error }) => {
        if (error) console.error('[entityImportance] log error:', error.message)
      })
  }

  return { updated: updates.length }
}

// ─── Recompute signal_count from signals table ────────────────────────────────
// Run periodically to keep counter accurate

export async function syncSignalCounts() {
  const supabase = getSupabase()

  // Get all market-entity links to join with signals
  const { data: links } = await supabase
    .from('market_entity_links')
    .select('entity_id, market_id')

  if (!links?.length) return { synced: 0 }

  // Group market_ids by entity
  const entityMarkets = {}
  for (const link of links) {
    if (!entityMarkets[link.entity_id]) entityMarkets[link.entity_id] = []
    entityMarkets[link.entity_id].push(link.market_id)
  }

  const since = new Date(Date.now() - 7 * 86400000).toISOString()  // last 7 days
  let synced  = 0

  for (const [entityId, marketIds] of Object.entries(entityMarkets)) {
    const { count } = await supabase
      .from('signals')
      .select('id', { count: 'exact', head: true })
      .in('market_id', marketIds)
      .gte('created_at', since)

    await supabase
      .from('graph_entities')
      .update({ signal_count: count || 0, updated_at: new Date().toISOString() })
      .eq('id', entityId)

    synced++
  }

  return { synced }
}

// ─── Get importance history for an entity ────────────────────────────────────

export async function getImportanceHistory(entityId, { limit = 30 } = {}) {
  const supabase = getSupabase()

  const { data } = await supabase
    .from('entity_importance_log')
    .select('importance, news_frequency, market_count, signal_count, computed_at')
    .eq('entity_id', entityId)
    .order('computed_at', { ascending: false })
    .limit(limit)

  return (data || []).reverse()  // chronological
}

// ─── Get entities ranked by recent importance change ─────────────────────────

export async function getTrendingEntities({ limit = 10 } = {}) {
  const supabase = getSupabase()

  // Compare current news_frequency to 24h ago (approximation via recent articles)
  const since24h = new Date(Date.now() - 24 * 3600000).toISOString()

  const { data: entities } = await supabase
    .from('graph_entities')
    .select('id, name, entity_type, importance, news_frequency, last_seen_at')
    .gte('last_seen_at', since24h)
    .order('news_frequency', { ascending: false })
    .limit(limit)

  return entities || []
}
