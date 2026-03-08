// GET  /api/recommendations              — personalized market recommendations
// GET  /api/recommendations?market=id    — related markets for a specific market
//
// Query params:
//   email    = user email (for personalized recs)
//   market   = market ID (for related markets)
//   category = category filter (anonymous mode)
//   limit    = 10

import {
  getRecommendations,
  getAnonymousRecommendations,
  getRelatedMarkets,
} from '../../backend/recommendation/marketRecommender'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Cache-Control', 'private, s-maxage=60')

  const { email, market, category, limit = '10' } = req.query
  const limitN = Math.min(20, parseInt(limit, 10) || 10)

  // ── Related markets for a single market ────────────────────────────────────
  if (market) {
    const related = await getRelatedMarkets(market, { limit: limitN })
    return res.status(200).json({ related, count: related.length })
  }

  // ── Personalized recommendations ───────────────────────────────────────────
  if (email) {
    const result = await getRecommendations(email, { limit: limitN })
    return res.status(200).json(result)
  }

  // ── Anonymous / trending recommendations ───────────────────────────────────
  const result = await getAnonymousRecommendations({ limit: limitN, category })
  return res.status(200).json(result)
}
