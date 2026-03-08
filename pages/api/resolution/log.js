// GET /api/resolution/log
// Returns the resolution log: markets scanned, resolved, expired.
// Protected by ADMIN_API_KEY.

import { getResolutionLog, getResolutionStats } from '../../../backend/resolution/resolutionLogger'

export default async function handler(req, res) {
  const key      = (req.query.key || req.headers['x-admin-key'] || '').trim()
  const expected = (process.env.ADMIN_API_KEY || '').trim()

  if (!expected || key !== expected) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  try {
    const marketId = req.query.market_id || null
    const limit    = Math.min(parseInt(req.query.limit || '50', 10), 200)

    const [log, stats] = await Promise.all([
      getResolutionLog({ limit, marketId }),
      getResolutionStats(),
    ])

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      stats,
      log: log.map(entry => ({
        marketId:          entry.market_id,
        question:          entry.question,
        outcome:           entry.outcome === true ? 'YES' : entry.outcome === false ? 'NO' : null,
        oracleSource:      entry.oracle_source,
        oracleValue:       entry.oracle_value,
        oracleCredibility: entry.oracle_credibility,
        evidenceCount:     Array.isArray(entry.evidence) ? entry.evidence.length : 0,
        status:            entry.status,
        resolvedAt:        entry.resolved_at,
      })),
    })
  } catch (err) {
    console.error('[/api/resolution/log]', err)
    return res.status(500).json({ error: err.message })
  }
}
