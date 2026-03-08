// GET  /api/markets/candidates         — list candidates (admin)
// POST /api/markets/candidates/detect  — trigger detection pipeline (admin)
//
// Query params (GET):
//   status  = PENDING | APPROVED | REJECTED | CREATED | ALL (default=PENDING)
//   limit   = 20
//
// Body (POST):
//   { force: true }   — bypass interval check

import { createClient }           from '@supabase/supabase-js'
import { runCreateMarkets }       from '../../../lib/engine/scheduler/jobs'
import { validateCandidate }      from '../../../backend/markets/marketValidator'
import { createMarket }           from '../../../backend/markets/marketCreator'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function authCheck(req) {
  const key      = (req.query.key || req.headers['x-admin-key'] || '').trim()
  const expected = (process.env.ADMIN_API_KEY || '').trim()
  return expected && key === expected
}

export default async function handler(req, res) {
  if (!authCheck(req)) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  // ── GET: list candidates ────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { status = 'PENDING', limit = '20' } = req.query
    const limitN = Math.min(100, parseInt(limit, 10) || 20)
    const supabase = getSupabase()

    let query = supabase
      .from('market_candidates')
      .select('*')
      .order('relevance_score', { ascending: false, nullsFirst: false })
      .limit(limitN)

    if (status !== 'ALL') {
      query = query.eq('status', status.toUpperCase())
    }

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({
      candidates: data || [],
      count:      data?.length ?? 0,
      status,
    })
  }

  // ── POST: trigger detection ─────────────────────────────────────────────
  if (req.method === 'POST') {
    const action = req.query.action || 'detect'

    // Action: detect — run full pipeline
    if (action === 'detect') {
      const startedAt = Date.now()
      try {
        const result = await runCreateMarkets()
        return res.status(200).json({
          ok:          true,
          duration_ms: Date.now() - startedAt,
          ...result,
        })
      } catch (err) {
        console.error('[/api/markets/candidates] detect error:', err)
        return res.status(500).json({ error: err.message })
      }
    }

    // Action: approve — manually approve a pending candidate and create market
    if (action === 'approve') {
      const { candidateId } = req.body || req.query
      if (!candidateId) return res.status(400).json({ error: 'Missing candidateId' })

      const supabase = getSupabase()
      const { data: candidate, error } = await supabase
        .from('market_candidates')
        .select('*')
        .eq('id', candidateId)
        .single()

      if (error || !candidate) return res.status(404).json({ error: 'Candidate not found' })
      if (candidate.status !== 'PENDING') return res.status(400).json({ error: `Candidate is ${candidate.status}` })

      const result = await createMarket(candidate)
      return res.status(result.success ? 200 : 500).json(result)
    }

    // Action: reject — manually reject a candidate
    if (action === 'reject') {
      const { candidateId, reason } = req.body || req.query
      if (!candidateId) return res.status(400).json({ error: 'Missing candidateId' })

      const supabase = getSupabase()
      const { error } = await supabase
        .from('market_candidates')
        .update({ status: 'REJECTED', rejection_reason: reason || 'Manual rejection' })
        .eq('id', candidateId)

      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ ok: true, candidateId })
    }

    return res.status(400).json({ error: 'Unknown action. Use: detect | approve | reject' })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
