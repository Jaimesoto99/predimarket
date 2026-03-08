// GET  /api/trust/sources          — ranked list of source credibility scores
// POST /api/trust/sources/sync     — sync source rows from registry (admin)
// POST /api/trust/sources/flag     — flag/unflag a source as spam (admin)
//
// Query params (GET):
//   limit = 50

import { getRankedSources, syncSourceRows, flagSourceAsSpam }
  from '../../../backend/trust/sourceScorer'

function authCheck(req) {
  const key      = (req.query.key || req.headers['x-admin-key'] || '').trim()
  const expected = (process.env.ADMIN_API_KEY || '').trim()
  return expected && key === expected
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')

  // ── GET: public transparency endpoint ─────────────────────────────────────
  if (req.method === 'GET') {
    const limit  = Math.min(100, parseInt(req.query.limit, 10) || 50)
    const sources = await getRankedSources({ limit })

    return res.status(200).json({
      sources,
      count: sources.length,
    })
  }

  // ── POST: admin-only mutations ─────────────────────────────────────────────
  if (req.method === 'POST') {
    if (!authCheck(req)) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    const action = req.query.action || 'sync'

    if (action === 'sync') {
      const result = await syncSourceRows()
      return res.status(200).json({ ok: true, ...result })
    }

    if (action === 'flag') {
      const { sourceKey, flagged = true } = req.body || {}
      if (!sourceKey) return res.status(400).json({ error: 'Missing sourceKey' })

      await flagSourceAsSpam(sourceKey, flagged)
      return res.status(200).json({ ok: true, sourceKey, spam_flag: flagged })
    }

    return res.status(400).json({ error: 'Unknown action. Use: sync | flag' })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
