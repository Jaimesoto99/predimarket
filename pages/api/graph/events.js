// GET  /api/graph/events              — recent event graph
// GET  /api/graph/events?entity=id    — events for a specific entity
//
// Query params:
//   entity     = entity ID filter
//   sinceHours = 24
//   limit      = 30

import { getRecentEvents, getEntityEvents }
  from '../../../backend/graph/eventGraph'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120')

  const {
    entity,
    sinceHours = '24',
    limit      = '30',
  } = req.query

  const sinceHoursN = Math.min(168, parseInt(sinceHours, 10) || 24)
  const limitN      = Math.min(100, parseInt(limit, 10)      || 30)

  if (entity) {
    const events = await getEntityEvents(entity, { sinceHours: sinceHoursN, limit: limitN })
    return res.status(200).json({ events, count: events.length, entity })
  }

  const events = await getRecentEvents({ sinceHours: sinceHoursN, limit: limitN })
  return res.status(200).json({ events, count: events.length })
}
