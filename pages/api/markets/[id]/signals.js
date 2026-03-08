// GET /api/markets/:id/signals
// Returns active signals for a market, with signal-adjusted probability view.
// Query params:
//   limit = 10 (max signals)
//   all   = false (include inactive/expired signals)

import { createClient }         from '@supabase/supabase-js'
import { calculatePrices }      from '../../../../lib/amm'
import { applySignalImpact }    from '../../../../lib/engine/probability/signalImpact'
import { aggregateSignalDelta } from '../../../../lib/engine/signals/signalScorer'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control':                'public, s-maxage=30, stale-while-revalidate=60',
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET')     return res.status(405).json({ error: 'Method not allowed' })

  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v))

  const { id, limit = '10', all = 'false' } = req.query
  if (!id) return res.status(400).json({ error: 'Missing market id' })

  const limitN   = Math.min(50, Math.max(1, parseInt(limit, 10) || 10))
  const showAll  = all === 'true'

  try {
    const supabase = getSupabase()

    // Fetch market for context
    const { data: market, error: mErr } = await supabase
      .from('markets')
      .select('id, title, yes_pool, no_pool, status')
      .eq('id', id)
      .single()

    if (mErr || !market) return res.status(404).json({ error: 'Market not found' })

    // Fetch signals
    let query = supabase
      .from('signals')
      .select('*')
      .eq('market_id', id)
      .order('strength', { ascending: false })
      .limit(limitN)

    if (!showAll) query = query.eq('is_active', true)

    const { data: signals, error: sErr } = await query
    if (sErr) return res.status(500).json({ error: sErr.message })

    // Compute signal-adjusted probability
    const yp         = parseFloat(market.yes_pool) || 5000
    const np         = parseFloat(market.no_pool)  || 5000
    const prices     = calculatePrices(yp, np)
    const ammProb    = prices.yes
    const active     = (signals || []).filter(s => s.is_active)
    const impact     = applySignalImpact(ammProb, active)

    return res.status(200).json({
      market_id:            id,
      amm_probability:      ammProb,
      adjusted_probability: impact.adjusted,
      signal_delta:         impact.delta,
      dominant_direction:   impact.dominantType,
      signals:              signals || [],
      active_count:         active.length,
    })
  } catch (err) {
    console.error('[/api/markets/[id]/signals] error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
