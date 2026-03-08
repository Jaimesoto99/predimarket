// GET /api/markets/:id/probability-history
// Returns probability snapshots for charting.
// Query params:
//   hours          = 168 (default = last 7 days)
//   limit          = 500 (max data points before downsampling)
//   maxPoints      = 120 (downsampled output points for chart)
//   includeSignals = false

import { getProbabilityHistory, downsampleHistory, computeHistoryStats }
  from '../../../../lib/engine/probability/probabilityHistory'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control':                'public, s-maxage=60, stale-while-revalidate=120',
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET')     return res.status(405).json({ error: 'Method not allowed' })

  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v))

  const { id, hours, limit, maxPoints, includeSignals } = req.query
  if (!id) return res.status(400).json({ error: 'Missing market id' })

  try {
    const snapshots = await getProbabilityHistory(id, {
      hours:          parseInt(hours,     10) || 168,
      limit:          parseInt(limit,     10) || 500,
      includeSignals: includeSignals === 'true',
    })

    const max        = parseInt(maxPoints, 10) || 120
    const downsampled = downsampleHistory(snapshots, max)
    const stats       = computeHistoryStats(snapshots)

    // Format for chart consumption: { t, p } tuples
    const series = downsampled.map(s => ({
      t:            s.created_at,
      p:            s.amm_probability,
      trigger:      s.trigger_type,
      signal_title: s.signals?.title || null,
    }))

    return res.status(200).json({
      market_id:   id,
      series,
      stats,
      raw_count:   snapshots.length,
      chart_count: series.length,
    })
  } catch (err) {
    console.error('[/api/markets/[id]/probability-history] error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
