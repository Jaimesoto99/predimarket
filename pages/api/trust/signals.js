// GET  /api/trust/signals          — trust-filtered active signals
// POST /api/trust/signals/score    — run trust scoring job (admin)
//
// Query params (GET):
//   market_id = uuid       — filter to a specific market
//   min_trust = 0.30       — minimum trust threshold (0-1)
//   limit     = 25
//   decay     = true       — include decay_factor in response

import { createClient }           from '@supabase/supabase-js'
import { filterByTrust,
         scoreRecentSignals }     from '../../../backend/trust/signalTrustEngine'
import { applyDecayBatch }        from '../../../backend/trust/signalDecay'

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
  // ── GET: public trust-filtered signals ────────────────────────────────────
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')

    const {
      market_id,
      min_trust = '0.30',
      limit     = '25',
      decay     = 'true',
    } = req.query

    const minTrust    = Math.max(0, Math.min(1, parseFloat(min_trust) || 0.30))
    const limitN      = Math.min(100, parseInt(limit, 10) || 25)
    const includeDecay = decay !== 'false'

    const supabase = getSupabase()

    let query = supabase
      .from('signals')
      .select('id, market_id, source_key, direction, strength, trust_score, decay_factor, event_type, signal_type, headline, created_at, expires_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limitN)

    if (market_id) {
      query = query.eq('market_id', market_id)
    }

    // Filter by trust score (DB-level when possible)
    if (minTrust > 0) {
      // Use DB filter if trust_score column is populated
      query = query.or(`trust_score.gte.${minTrust},trust_score.is.null`)
    }

    const { data: signals, error } = await query
    if (error) return res.status(500).json({ error: error.message })

    let enriched = signals || []

    // Client-side trust filter for null trust_score rows
    enriched = filterByTrust(enriched.map(s => ({
      ...s,
      trust_score: s.trust_score ?? 0.50,
    })), minTrust)

    // Apply decay factors
    if (includeDecay) {
      enriched = applyDecayBatch(enriched)
    }

    // Sort by effective trust × decay × strength
    enriched.sort((a, b) => {
      const ea = (a.trust_score ?? 0.5) * (a.decay_factor ?? 1) * (a.strength || 0)
      const eb = (b.trust_score ?? 0.5) * (b.decay_factor ?? 1) * (b.strength || 0)
      return eb - ea
    })

    return res.status(200).json({
      signals: enriched,
      count:   enriched.length,
      filters: { min_trust: minTrust, market_id: market_id || null },
    })
  }

  // ── POST: admin scoring trigger ───────────────────────────────────────────
  if (req.method === 'POST') {
    if (!authCheck(req)) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    const action = req.query.action || 'score'

    if (action === 'score') {
      const { sinceHours = 6, batchSize = 50 } = req.body || {}
      const startedAt = Date.now()

      const result = await scoreRecentSignals({
        sinceHours: parseInt(sinceHours, 10) || 6,
        batchSize:  parseInt(batchSize, 10)  || 50,
      })

      return res.status(200).json({
        ok:          true,
        duration_ms: Date.now() - startedAt,
        ...result,
      })
    }

    return res.status(400).json({ error: 'Unknown action. Use: score' })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
