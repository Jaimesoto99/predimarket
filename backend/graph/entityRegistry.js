// ============================================================
// Entity Registry — CRUD and lookup for knowledge graph entities
//
// Entities are pre-seeded in migration 005. This module provides
// runtime access, search, and incremental counters.
// ============================================================

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Entity types (matches DB CHECK constraint) ───────────────────────────────

export const ENTITY_TYPES = [
  'person', 'company', 'asset', 'country', 'institution',
  'team', 'index', 'commodity', 'rate', 'energy', 'data', 'competition',
]

// ─── Get entity by ID ─────────────────────────────────────────────────────────

export async function getEntity(entityId) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('graph_entities')
    .select('*')
    .eq('id', entityId)
    .single()

  if (error) return null
  return data
}

// ─── Get multiple entities by IDs ─────────────────────────────────────────────

export async function getEntitiesByIds(entityIds) {
  if (!entityIds?.length) return {}
  const supabase = getSupabase()

  const { data } = await supabase
    .from('graph_entities')
    .select('*')
    .in('id', entityIds)

  return Object.fromEntries((data || []).map(e => [e.id, e]))
}

// ─── Search entities by name or alias ────────────────────────────────────────

export async function searchEntities(query, { limit = 10, type = null } = {}) {
  const supabase = getSupabase()
  const term     = query.toLowerCase().trim()

  let q = supabase
    .from('graph_entities')
    .select('id, entity_type, name, aliases, importance')
    .order('importance', { ascending: false })
    .limit(limit)

  if (type) q = q.eq('entity_type', type)

  // Search name (ilike) + alias array containment
  q = q.or(`name.ilike.%${term}%,aliases.cs.{${term}}`)

  const { data } = await q
  return data || []
}

// ─── Get entities by type ─────────────────────────────────────────────────────

export async function getEntitiesByType(entityType, { limit = 50 } = {}) {
  const supabase = getSupabase()

  const { data } = await supabase
    .from('graph_entities')
    .select('*')
    .eq('entity_type', entityType)
    .order('importance', { ascending: false })
    .limit(limit)

  return data || []
}

// ─── Get top entities (by importance) ────────────────────────────────────────

export async function getTopEntities({ limit = 20, type = null } = {}) {
  const supabase = getSupabase()

  let q = supabase
    .from('graph_entities')
    .select('id, entity_type, name, aliases, importance, market_count, signal_count, last_seen_at')
    .order('importance', { ascending: false })
    .limit(limit)

  if (type) q = q.eq('entity_type', type)

  const { data } = await q
  return data || []
}

// ─── Resolve entity ID from raw text ─────────────────────────────────────────
// Maps extracted entity names (from entityExtractor) to graph entity IDs

const ENTITY_ID_MAP = {
  // From entityExtractor.js entity keys
  IBEX_35:      'IBEX_35',
  SP500:        'SP500',
  NASDAQ:       'NASDAQ',
  BITCOIN:      'BITCOIN',
  ETHEREUM:     'ETHEREUM',
  BRENT:        'BRENT',
  ORO:          'ORO',
  LUZ_PVPC:    'LUZ_PVPC',
  EURIBOR:      'EURIBOR',
  IPC_ES:       'IPC_ES',
  REAL_MADRID:  'REAL_MADRID',
  FC_BARCELONA: 'FC_BARCELONA',
  ATLETICO:     'ATLETICO',
  SEVILLA_FC:   'SEVILLA_FC',
  BCE:          'BCE',
  FED:          'FED',
  CONGRESO:     'CONGRESO',
  INE:          'INE',
  SANCHEZ:      'SANCHEZ',
  CHAMPIONS:    null,   // competition, no single entity ID yet
  LALIGA:       'LALIGA',
  COPA_REY:     null,
}

export function resolveEntityId(extractorKey) {
  return ENTITY_ID_MAP[extractorKey] ?? null
}

export function resolveEntityIds(extractorKeys) {
  return extractorKeys
    .map(resolveEntityId)
    .filter(Boolean)
}

// ─── Upsert entity (idempotent create/update) ─────────────────────────────────

export async function upsertEntity(entity) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('graph_entities')
    .upsert({
      id:          entity.id,
      entity_type: entity.entity_type,
      name:        entity.name,
      aliases:     entity.aliases || [],
      importance:  entity.importance ?? 0.50,
      description: entity.description || null,
      metadata:    entity.metadata    || {},
      updated_at:  new Date().toISOString(),
    }, { onConflict: 'id' })
    .select()
    .single()

  if (error) {
    console.error('[entityRegistry] upsertEntity error:', error.message)
    return null
  }
  return data
}

// ─── Increment counters ───────────────────────────────────────────────────────

export async function incrementEntityCounter(entityId, field) {
  const supabase = getSupabase()

  const { data: row } = await supabase
    .from('graph_entities')
    .select(field)
    .eq('id', entityId)
    .single()

  if (!row) return

  await supabase
    .from('graph_entities')
    .update({
      [field]:      (row[field] || 0) + 1,
      last_seen_at: new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    })
    .eq('id', entityId)
}

export async function recordEntityMention(entityId) {
  return incrementEntityCounter(entityId, 'news_frequency')
}

// ─── Batch record article entity mentions ────────────────────────────────────

export async function recordArticleEntities(entityIds) {
  const unique = [...new Set(entityIds.filter(Boolean))]
  for (const id of unique) {
    await recordEntityMention(id).catch(() => {})
  }
}

// ─── Get entity metadata for a market (via oracle metadata) ──────────────────

export function getOracleMetadata(entity) {
  return entity?.metadata || {}
}
