// GET  /api/trust/markets/:id          — trust score + breakdown for a market
// POST /api/trust/markets/:id/refresh  — recompute trust score (admin)

import { getMarketTrust, computeMarketTrust, persistMarketTrust }
  from '../../../../backend/trust/marketTrustScore'
import { getMarketAlerts }
  from '../../../../backend/trust/manipulationDetector'
import { getMarketConsensus }
  from '../../../../backend/trust/sourceConsensus'
import { createClient }
  from '@supabase/supabase-js'

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
  const { id } = req.query

  if (!id) return res.status(400).json({ error: 'Missing market id' })

  // ── GET: public trust breakdown ────────────────────────────────────────────
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')

    // Try cached score first
    const cached = await getMarketTrust(id)

    if (cached) {
      // Attach public-facing alert summary (LOW/MEDIUM only per RLS)
      const alerts    = await getMarketAlerts(id)
      const consensus = await getMarketConsensus(id, { sinceHours: 6 })

      return res.status(200).json({
        market_id:          cached.market_id,
        trust_score:        cached.trust_score,
        trust_label:        cached.trust_label,
        components: {
          source_diversity:   cached.source_diversity,
          signal_quality:     cached.signal_quality,
          oracle_reliability: cached.oracle_reliability,
          manipulation_risk:  cached.manipulation_risk,
          consensus_level:    cached.consensus_level,
        },
        active_alert_count: cached.active_alert_count,
        alerts:             alerts.filter(a => ['LOW','MEDIUM'].includes(a.severity)),
        consensus:          consensus,
        computed_at:        cached.computed_at,
      })
    }

    // No cache — compute fresh (slower path)
    const supabase = getSupabase()
    const { data: market } = await supabase
      .from('markets')
      .select('id, oracle_type, status')
      .eq('id', id)
      .single()

    if (!market) return res.status(404).json({ error: 'Market not found' })

    const trust     = await computeMarketTrust(market)
    await persistMarketTrust(trust)

    const alerts    = await getMarketAlerts(id)
    const consensus = await getMarketConsensus(id, { sinceHours: 6 })

    return res.status(200).json({
      market_id:          trust.market_id,
      trust_score:        trust.trust_score,
      trust_label:        trust.trust_label,
      components:         trust.components,
      active_alert_count: trust.active_alert_count,
      alerts:             alerts.filter(a => ['LOW','MEDIUM'].includes(a.severity)),
      consensus:          consensus,
      computed_at:        trust.computed_at,
    })
  }

  // ── POST: force recompute (admin only) ─────────────────────────────────────
  if (req.method === 'POST') {
    if (!authCheck(req)) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    const supabase = getSupabase()
    const { data: market, error } = await supabase
      .from('markets')
      .select('id, oracle_type, status')
      .eq('id', id)
      .single()

    if (error || !market) return res.status(404).json({ error: 'Market not found' })

    const trust = await computeMarketTrust(market)
    await persistMarketTrust(trust)

    return res.status(200).json({ ok: true, ...trust })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
