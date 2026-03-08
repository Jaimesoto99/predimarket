// ============================================================
// Event Graph — store detected events and link them to entities
//
// Events are created from classified articles. Each event
// records which entities are affected and what the directional
// impact is (BULLISH / BEARISH / NEUTRAL).
// ============================================================

import { createClient }    from '@supabase/supabase-js'
import { resolveEntityIds } from './entityRegistry'
import { recordArticleEntities } from './entityRegistry'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Create an event from a classified article ────────────────────────────────

export async function createEvent({ article, entities, eventType, impact = {} }) {
  const supabase = getSupabase()

  // Map extractor entity keys to graph entity IDs
  const entityKeys = Object.keys(entities || {})
  const entityIds  = resolveEntityIds(entityKeys)

  if (!entityIds.length) return null  // no known entities = not graphable

  const primaryEntity = entityIds[0]  // highest-priority entity

  // Record news_frequency increments
  await recordArticleEntities(entityIds)

  const { data, error } = await supabase
    .from('graph_events')
    .insert({
      title:          article.title,
      event_type:     eventType,
      primary_entity: primaryEntity,
      entity_ids:     entityIds,
      article_ids:    [article.id],
      impact: {
        direction:  impact.direction  || 'NEUTRAL',
        magnitude:  impact.magnitude  || 0.50,
        confidence: impact.confidence || 0.50,
        ...impact,
      },
    })
    .select('id')
    .single()

  if (error) {
    console.error('[eventGraph] createEvent error:', error.message)
    return null
  }

  return data?.id
}

// ─── Merge duplicate events (same entity + type within 1h) ───────────────────

export async function mergeOrCreateEvent({ article, entities, eventType, impact = {} }) {
  const supabase   = getSupabase()
  const entityKeys = Object.keys(entities || {})
  const entityIds  = resolveEntityIds(entityKeys)

  if (!entityIds.length) return null

  const primaryEntity = entityIds[0]
  const since         = new Date(Date.now() - 3600000).toISOString()

  // Check for recent similar event
  const { data: existing } = await supabase
    .from('graph_events')
    .select('id, entity_ids, article_ids')
    .eq('primary_entity', primaryEntity)
    .eq('event_type', eventType)
    .gte('detected_at', since)
    .order('detected_at', { ascending: false })
    .limit(1)

  if (existing?.length) {
    // Merge article into existing event
    const ev = existing[0]
    const articleIds = [...new Set([...ev.article_ids, article.id])]
    const allEntities = [...new Set([...ev.entity_ids, ...entityIds])]

    await supabase
      .from('graph_events')
      .update({ article_ids: articleIds, entity_ids: allEntities })
      .eq('id', ev.id)

    return ev.id
  }

  return createEvent({ article, entities, eventType, impact })
}

// ─── Get recent events for an entity ─────────────────────────────────────────

export async function getEntityEvents(entityId, { sinceHours = 24, limit = 20 } = {}) {
  const supabase = getSupabase()
  const since    = new Date(Date.now() - sinceHours * 3600000).toISOString()

  const { data } = await supabase
    .from('graph_events')
    .select('id, title, event_type, primary_entity, entity_ids, impact, detected_at')
    .contains('entity_ids', [entityId])
    .gte('detected_at', since)
    .order('detected_at', { ascending: false })
    .limit(limit)

  return data || []
}

// ─── Get unprocessed events (pending reasoning) ───────────────────────────────

export async function getPendingEvents({ limit = 50 } = {}) {
  const supabase = getSupabase()

  const { data } = await supabase
    .from('graph_events')
    .select('*')
    .eq('reasoning_done', false)
    .order('detected_at', { ascending: true })
    .limit(limit)

  return data || []
}

// ─── Mark event as processed by reasoning engine ─────────────────────────────

export async function markEventProcessed(eventId) {
  const supabase = getSupabase()
  await supabase
    .from('graph_events')
    .update({ reasoning_done: true })
    .eq('id', eventId)
}

// ─── Get recent events (global feed) ─────────────────────────────────────────

export async function getRecentEvents({ sinceHours = 6, limit = 30 } = {}) {
  const supabase = getSupabase()
  const since    = new Date(Date.now() - sinceHours * 3600000).toISOString()

  const { data } = await supabase
    .from('graph_events')
    .select(`
      id, title, event_type, primary_entity, entity_ids, impact, detected_at,
      entity:primary_entity(id, name, entity_type)
    `)
    .gte('detected_at', since)
    .order('detected_at', { ascending: false })
    .limit(limit)

  return data || []
}

// ─── Build event from article (used by graph job pipeline) ───────────────────
// Integrates with existing processed articles from articles table

export async function processArticleIntoGraph(article) {
  if (!article.processed || article.event_type === 'IRRELEVANT') return null

  const entities  = article.entities || {}
  const eventType = article.event_type

  // Derive impact from sentiment (embedded in entities as SENTIMENT meta-entity)
  const sentiment = entities.SENTIMENT?.values?.[0] || 'NEUTRAL'
  const urgency   = entities.URGENCY?.confidence   || 0
  const magnitude = Math.min(1.0, (article.relevance_score || 0.5) + urgency * 0.2)

  const direction = sentiment === 'BULLISH' ? 'BULLISH'
    : sentiment === 'BEARISH'               ? 'BEARISH'
    : 'NEUTRAL'

  return mergeOrCreateEvent({
    article,
    entities,
    eventType,
    impact: { direction, magnitude, confidence: magnitude * 0.8 },
  })
}
