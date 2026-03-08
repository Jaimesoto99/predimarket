// GET  /api/graph/entities              — list entities (optionally by type)
// GET  /api/graph/entities?q=bitcoin    — search entities
// GET  /api/graph/entities/:id          — entity detail + graph
//
// Query params:
//   q     = search query
//   type  = entity_type filter
//   limit = 50

import { getTopEntities, searchEntities, getEntity }
  from '../../../backend/graph/entityRegistry'
import { getEntityGraph }
  from '../../../backend/graph/relationshipGraph'
import { getEntityEvents }
  from '../../../backend/graph/eventGraph'
import { getEntityMarkets }
  from '../../../backend/graph/marketEntityMapper'
import { getImportanceHistory }
  from '../../../backend/graph/entityImportance'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')

  const { q, type, limit = '50', id, include } = req.query

  // ── Single entity detail ───────────────────────────────────────────────────
  if (id) {
    const entity = await getEntity(id)
    if (!entity) return res.status(404).json({ error: 'Entity not found' })

    const [graph, events, markets, history] = await Promise.all([
      getEntityGraph(id),
      getEntityEvents(id, { sinceHours: 48, limit: 10 }),
      getEntityMarkets(id, { status: 'ACTIVE', limit: 10 }),
      include === 'history' ? getImportanceHistory(id, { limit: 30 }) : Promise.resolve([]),
    ])

    return res.status(200).json({
      entity,
      graph,
      recent_events:   events,
      active_markets:  markets,
      importance_history: history,
    })
  }

  // ── Search ─────────────────────────────────────────────────────────────────
  if (q) {
    const limitN   = Math.min(20, parseInt(limit, 10) || 10)
    const entities = await searchEntities(q, { limit: limitN, type })
    return res.status(200).json({ entities, count: entities.length, query: q })
  }

  // ── List top entities ──────────────────────────────────────────────────────
  const limitN   = Math.min(100, parseInt(limit, 10) || 50)
  const entities = await getTopEntities({ limit: limitN, type })

  return res.status(200).json({
    entities,
    count: entities.length,
    type:  type || null,
  })
}
