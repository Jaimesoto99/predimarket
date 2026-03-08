// ============================================================
// Relationship Graph — query and traverse entity relationships
//
// Relationships are seeded in migration 005 and extended at
// runtime as new entities are discovered.
//
// Key operations:
//   getNeighbors(entityId)         — direct neighbors
//   getPropagationTargets(ids)     — all entities reachable via
//                                    influence/correlation edges
//   shortestPath(from, to)         — BFS path between entities
//   getRelationshipStrength(a, b)  — direct edge strength
// ============================================================

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Relationship types that propagate signals ────────────────────────────────

export const PROPAGATING_TYPES = new Set([
  'INFLUENCES',
  'CORRELATES_WITH',
  'SETS_RATE',      // rate changes → markets
  'CONTROLS_SUPPLY', // OPEC → oil
  'REGULATES',       // regulatory events → asset prices
])

// ─── Get direct neighbors of an entity ───────────────────────────────────────

export async function getNeighbors(entityId, {
  relationshipTypes = null,
  minStrength       = 0.30,
  direction         = 'both',   // 'outgoing' | 'incoming' | 'both'
} = {}) {
  const supabase = getSupabase()

  const results = []

  // Outgoing edges
  if (direction !== 'incoming') {
    let q = supabase
      .from('graph_relationships')
      .select('to_entity_id, relationship_type, strength, direction')
      .eq('from_entity_id', entityId)
      .eq('is_active', true)
      .gte('strength', minStrength)

    if (relationshipTypes?.length) {
      q = q.in('relationship_type', relationshipTypes)
    }
    const { data } = await q
    for (const row of data || []) {
      results.push({ entity_id: row.to_entity_id, relationship_type: row.relationship_type, strength: row.strength, direction: row.direction, edge_direction: 'outgoing' })
    }
  }

  // Incoming edges
  if (direction !== 'outgoing') {
    let q = supabase
      .from('graph_relationships')
      .select('from_entity_id, relationship_type, strength, direction')
      .eq('to_entity_id', entityId)
      .eq('is_active', true)
      .gte('strength', minStrength)

    if (relationshipTypes?.length) {
      q = q.in('relationship_type', relationshipTypes)
    }
    const { data } = await q
    for (const row of data || []) {
      results.push({ entity_id: row.from_entity_id, relationship_type: row.relationship_type, strength: row.strength, direction: row.direction, edge_direction: 'incoming' })
    }
  }

  return results
}

// ─── Get all propagation targets (BFS, max 2 hops) ────────────────────────────
// Returns map: entityId → { strength, path, direction }

export async function getPropagationTargets(startEntityIds, { maxHops = 2, minStrength = 0.30 } = {}) {
  const supabase = getSupabase()

  // Load all active propagating relationships once (graph is small)
  const { data: allEdges } = await supabase
    .from('graph_relationships')
    .select('from_entity_id, to_entity_id, relationship_type, strength, direction')
    .in('relationship_type', [...PROPAGATING_TYPES])
    .eq('is_active', true)
    .gte('strength', minStrength)

  if (!allEdges?.length) return {}

  // Build adjacency list
  const adj = {}
  for (const edge of allEdges) {
    if (!adj[edge.from_entity_id]) adj[edge.from_entity_id] = []
    adj[edge.from_entity_id].push(edge)
    // Bidirectional for CORRELATES_WITH
    if (edge.relationship_type === 'CORRELATES_WITH') {
      if (!adj[edge.to_entity_id]) adj[edge.to_entity_id] = []
      adj[edge.to_entity_id].push({
        ...edge,
        from_entity_id: edge.to_entity_id,
        to_entity_id:   edge.from_entity_id,
      })
    }
  }

  // BFS from all start entities
  const visited = new Map()  // entityId → { strength, path, relType, direction }
  const queue   = startEntityIds.map(id => ({ id, strength: 1.0, path: [id], hop: 0 }))

  while (queue.length > 0) {
    const { id, strength, path, hop } = queue.shift()

    if (hop >= maxHops) continue

    const edges = adj[id] || []
    for (const edge of edges) {
      const targetId       = edge.to_entity_id
      if (startEntityIds.includes(targetId)) continue  // skip start entities

      const propagated = strength * edge.strength * 0.85  // 15% damping per hop
      if (propagated < minStrength) continue

      const existing = visited.get(targetId)
      if (!existing || existing.strength < propagated) {
        visited.set(targetId, {
          strength:          propagated,
          path:              [...path, targetId],
          relationship_type: edge.relationship_type,
          direction:         edge.direction,
          hop:               hop + 1,
        })
        queue.push({ id: targetId, strength: propagated, path: [...path, targetId], hop: hop + 1 })
      }
    }
  }

  return Object.fromEntries(visited)
}

// ─── Get direct relationship strength between two entities ────────────────────

export async function getRelationshipStrength(fromId, toId) {
  const supabase = getSupabase()

  const { data } = await supabase
    .from('graph_relationships')
    .select('strength, relationship_type, direction')
    .or(`and(from_entity_id.eq.${fromId},to_entity_id.eq.${toId}),and(from_entity_id.eq.${toId},to_entity_id.eq.${fromId})`)
    .eq('is_active', true)
    .order('strength', { ascending: false })
    .limit(1)

  return data?.[0] || null
}

// ─── Get all relationships for an entity (for graph visualization) ───────────

export async function getEntityGraph(entityId, { depth = 1 } = {}) {
  const supabase = getSupabase()

  const { data: edges } = await supabase
    .from('graph_relationships')
    .select(`
      from_entity_id, to_entity_id, relationship_type, strength, direction,
      from_entity:from_entity_id(id, name, entity_type),
      to_entity:to_entity_id(id, name, entity_type)
    `)
    .or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`)
    .eq('is_active', true)
    .order('strength', { ascending: false })

  if (!edges?.length) return { nodes: [], edges: [] }

  // Collect unique node IDs
  const nodeIds = new Set([entityId])
  for (const e of edges) {
    nodeIds.add(e.from_entity_id)
    nodeIds.add(e.to_entity_id)
  }

  const nodes = []
  const seen  = new Set()
  for (const e of edges) {
    for (const side of ['from_entity', 'to_entity']) {
      const node = e[side]
      if (node && !seen.has(node.id)) {
        nodes.push({ ...node, is_root: node.id === entityId })
        seen.add(node.id)
      }
    }
  }

  return {
    nodes,
    edges: edges.map(e => ({
      from:              e.from_entity_id,
      to:                e.to_entity_id,
      relationship_type: e.relationship_type,
      strength:          e.strength,
      direction:         e.direction,
    })),
  }
}

// ─── Add a new relationship ───────────────────────────────────────────────────

export async function addRelationship(fromId, toId, type, { strength = 0.50, direction = 'NEUTRAL', description = '' } = {}) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('graph_relationships')
    .upsert({
      from_entity_id:    fromId,
      to_entity_id:      toId,
      relationship_type: type,
      strength,
      direction,
      description,
    }, { onConflict: 'from_entity_id,to_entity_id,relationship_type' })
    .select()
    .single()

  if (error) {
    console.error('[relationshipGraph] addRelationship error:', error.message)
    return null
  }
  return data
}

// ─── Get the full relationship list (for transparency API) ───────────────────

export async function getAllRelationships({ limit = 200 } = {}) {
  const supabase = getSupabase()

  const { data } = await supabase
    .from('graph_relationships')
    .select(`
      id, relationship_type, strength, direction, description,
      from_entity:from_entity_id(id, name, entity_type),
      to_entity:to_entity_id(id, name, entity_type)
    `)
    .eq('is_active', true)
    .order('strength', { ascending: false })
    .limit(limit)

  return data || []
}
