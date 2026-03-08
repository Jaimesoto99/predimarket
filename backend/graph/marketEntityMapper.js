// ============================================================
// Market Entity Mapper — links markets to graph entities
//
// On market creation, auto-detects entities from:
//   - oracle_type + category
//   - title keyword matching
//   - source_candidate_id entities
//
// Enables queries like "which markets are affected by BITCOIN?"
// ============================================================

import { createClient }    from '@supabase/supabase-js'
import { resolveEntityIds } from './entityRegistry'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Entity detection patterns from market titles ─────────────────────────────

const TITLE_ENTITY_PATTERNS = [
  { pattern: /bitcoin|btc/i,            entity: 'BITCOIN' },
  { pattern: /ethereum|eth\b/i,         entity: 'ETHEREUM' },
  { pattern: /ibex\s?35|ibex/i,         entity: 'IBEX_35' },
  { pattern: /s&p\s?500|sp500/i,        entity: 'SP500' },
  { pattern: /nasdaq/i,                 entity: 'NASDAQ' },
  { pattern: /brent|petróleo|petroleo/i, entity: 'BRENT' },
  { pattern: /luz|pvpc|mwh|electricidad/i, entity: 'LUZ_PVPC' },
  { pattern: /euríbor|euribor/i,        entity: 'EURIBOR' },
  { pattern: /ipc|inflaci[oó]n/i,       entity: 'IPC_ES' },
  { pattern: /real madrid/i,            entity: 'REAL_MADRID' },
  { pattern: /barcelona|barça|fcb/i,    entity: 'FC_BARCELONA' },
  { pattern: /atl[eé]tico/i,            entity: 'ATLETICO' },
  { pattern: /sevilla\s*fc?/i,          entity: 'SEVILLA_FC' },
  { pattern: /bce|banco central europeo/i, entity: 'BCE' },
  { pattern: /fed\b|reserva federal/i,  entity: 'FED' },
  { pattern: /congreso|parlamento/i,    entity: 'CONGRESO' },
  { pattern: /opec|opep/i,              entity: 'OPEC' },
  { pattern: /s[aá]nchez/i,            entity: 'SANCHEZ' },
  { pattern: /laliga|la liga/i,         entity: 'LALIGA' },
]

// ─── Oracle-type to entity mappings ──────────────────────────────────────────

const ORACLE_ENTITY_MAP = {
  PRICE_THRESHOLD: null,   // determined by title patterns
  PRICE_DIRECTION: null,
  SPORTS_RESULT:   null,
  DATA_RELEASE:    'IPC_ES',
  RATE_CHANGE:     'EURIBOR',
  BOE_PUBLICATION: 'CONGRESO',
  ELECTORAL_RESULT: 'CONGRESO',
  NEWS_CONFIRMATION: null,
  OFFICIAL_STATEMENT: null,
}

// ─── Detect entity IDs from a market ─────────────────────────────────────────

export function detectMarketEntities(market) {
  const found = new Set()

  // From title patterns
  const title = market.title || ''
  for (const { pattern, entity } of TITLE_ENTITY_PATTERNS) {
    if (pattern.test(title)) found.add(entity)
  }

  // From oracle_type
  const oracleEntity = ORACLE_ENTITY_MAP[market.oracle_type]
  if (oracleEntity) found.add(oracleEntity)

  // From candidate entities (already resolved in marketCreator)
  const entityObj = market.entities || {}
  const fromExtractor = resolveEntityIds(Object.keys(entityObj))
  for (const id of fromExtractor) found.add(id)

  return [...found]
}

// ─── Link market to entities in DB ───────────────────────────────────────────

export async function linkMarketToEntities(marketId, entityIds, { linkType = 'SUBJECT', strength = 1.0, autoDetected = true } = {}) {
  if (!entityIds?.length) return 0
  const supabase = getSupabase()

  const rows = entityIds.map(entityId => ({
    market_id:     marketId,
    entity_id:     entityId,
    link_type:     linkType,
    strength,
    auto_detected: autoDetected,
  }))

  const { error } = await supabase
    .from('market_entity_links')
    .upsert(rows, { onConflict: 'market_id,entity_id,link_type', ignoreDuplicates: true })

  if (error) {
    console.error('[marketEntityMapper] linkMarketToEntities error:', error.message)
    return 0
  }

  // Update entity market_count
  const { data: entity } = await supabase
    .from('graph_entities')
    .select('market_count')
    .in('id', entityIds)

  for (const e of entity || []) {
    await supabase
      .from('graph_entities')
      .update({ market_count: e.market_count + 1, updated_at: new Date().toISOString() })
      .eq('id', e.id)
  }

  return rows.length
}

// ─── Auto-link market on creation ────────────────────────────────────────────

export async function autoLinkMarket(market) {
  const entityIds = detectMarketEntities(market)
  if (!entityIds.length) return { linked: 0 }

  const linked = await linkMarketToEntities(market.id, entityIds)
  return { linked, entity_ids: entityIds }
}

// ─── Get entities linked to a market ─────────────────────────────────────────

export async function getMarketEntities(marketId) {
  const supabase = getSupabase()

  const { data } = await supabase
    .from('market_entity_links')
    .select(`
      link_type, strength, auto_detected,
      entity:entity_id(id, name, entity_type, importance, aliases)
    `)
    .eq('market_id', marketId)
    .order('strength', { ascending: false })

  return (data || []).map(row => ({
    ...row.entity,
    link_type: row.link_type,
    strength:  row.strength,
  }))
}

// ─── Get markets linked to an entity ─────────────────────────────────────────

export async function getEntityMarkets(entityId, { status = 'ACTIVE', limit = 20 } = {}) {
  const supabase = getSupabase()

  const { data } = await supabase
    .from('market_entity_links')
    .select(`
      link_type, strength,
      market:market_id(id, title, status, close_date, category, oracle_type)
    `)
    .eq('entity_id', entityId)
    .order('strength', { ascending: false })
    .limit(limit)

  const markets = (data || [])
    .map(row => ({ ...row.market, link_type: row.link_type, link_strength: row.strength }))
    .filter(m => !status || m.status === status)

  return markets
}

// ─── Batch link all active markets (initial sync job) ────────────────────────

export async function syncAllMarketEntityLinks() {
  const supabase = getSupabase()

  const { data: markets } = await supabase
    .from('markets')
    .select('id, title, oracle_type, entities:source_candidate_id(entities)')
    .in('status', ['ACTIVE', 'CLOSING'])

  if (!markets?.length) return { synced: 0 }

  let synced = 0
  for (const market of markets) {
    const enriched = {
      ...market,
      entities: market.entities?.entities || {},
    }
    const { linked } = await autoLinkMarket(enriched)
    synced += linked
  }

  return { synced, markets: markets.length }
}

// ─── Get markets affected by a list of entity IDs ────────────────────────────

export async function getMarketsForEntities(entityIds, { status = 'ACTIVE' } = {}) {
  if (!entityIds?.length) return []
  const supabase = getSupabase()

  const { data } = await supabase
    .from('market_entity_links')
    .select('market_id, entity_id, link_type, strength')
    .in('entity_id', entityIds)

  const marketIds = [...new Set((data || []).map(r => r.market_id))]
  if (!marketIds.length) return []

  let q = supabase
    .from('markets')
    .select('id, title, status, close_date, category, oracle_type, yes_pool, no_pool')
    .in('id', marketIds)

  if (status) q = q.eq('status', status)

  const { data: markets } = await q
  return markets || []
}
