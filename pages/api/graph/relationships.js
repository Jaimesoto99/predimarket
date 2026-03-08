// GET  /api/graph/relationships         — all entity relationships (graph view)
// GET  /api/graph/relationships?id=X   — subgraph for entity X
//
// Query params:
//   id    = entity ID for subgraph
//   limit = 200

import { getAllRelationships, getEntityGraph }
  from '../../../backend/graph/relationshipGraph'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')

  const { id, limit = '200' } = req.query

  if (id) {
    const graph = await getEntityGraph(id)
    return res.status(200).json({ ...graph, root_entity: id })
  }

  const limitN        = Math.min(500, parseInt(limit, 10) || 200)
  const relationships = await getAllRelationships({ limit: limitN })

  return res.status(200).json({
    relationships,
    count: relationships.length,
  })
}
