// GET /api/markets
// Returns enriched market list with signals, signal-adjusted probability,
// liquidity, and 24h change.
// Query params:
//   status   = ACTIVE (default) | CLOSED | RESOLVED | ALL
//   category = ECONOMIA | CRIPTO | DEPORTES | ENERGIA | POLITICA | ACTUALIDAD
//   type     = DIARIO | SEMANAL | MENSUAL
//   limit    = 50 (default)
//   page     = 0 (default, 0-indexed)

import { createClient }          from '@supabase/supabase-js'
import { calculatePrices }       from '../../../lib/amm'
import { computeBaseProbability, compute24hChange, computeLiquidity }
                                 from '../../../lib/engine/probability/baseProbability'
import { getActiveSignalsBatch } from '../../../lib/engine/signals/signalPublisher'
import { applySignalImpact }     from '../../../lib/engine/probability/signalImpact'

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

  const {
    status   = 'ACTIVE',
    category,
    type,
    limit    = '50',
    page     = '0',
  } = req.query

  const limitN = Math.min(100, Math.max(1, parseInt(limit, 10) || 50))
  const pageN  = Math.max(0, parseInt(page, 10) || 0)
  const offset = pageN * limitN

  try {
    const supabase = getSupabase()

    let query = supabase
      .from('markets')
      .select('*', { count: 'exact' })
      .order('close_date', { ascending: true })
      .range(offset, offset + limitN - 1)

    // Status filter
    if (status === 'ALL') {
      // no filter — but still hide pending_review and withdrawn
      query = query.neq('review_status', 'pending_review').neq('review_status', 'withdrawn')
    } else if (status === 'ACTIVE') {
      query = query.in('status', ['ACTIVE', 'CLOSED'])
        .gt('close_date', new Date().toISOString())
        .neq('review_status', 'pending_review')
        .neq('review_status', 'withdrawn')
    } else {
      query = query.eq('status', status)
        .neq('review_status', 'pending_review')
        .neq('review_status', 'withdrawn')
    }

    // Optional filters
    if (category) query = query.eq('category', category.toUpperCase())
    if (type)     query = query.eq('market_type', type.toUpperCase())

    const { data: markets, error, count } = await query

    if (error) return res.status(500).json({ error: error.message })
    if (!markets?.length) {
      return res.status(200).json({ markets: [], count: 0, page: pageN, limit: limitN })
    }

    // Batch fetch signals for all markets
    const marketIds   = markets.map(m => m.id)
    const signalsBatch = await getActiveSignalsBatch(marketIds)

    // Enrich each market
    const enriched = markets.map(m => {
      const yp      = parseFloat(m.yes_pool) || 5000
      const np      = parseFloat(m.no_pool)  || 5000
      const prices  = calculatePrices(yp, np)
      const prob    = computeBaseProbability(yp, np)
      const signals = signalsBatch[m.id] || []
      const impact  = applySignalImpact(prob.yes, signals)
      const change  = compute24hChange(yp, np)
      const liq     = computeLiquidity(yp, np)

      return {
        id:             m.id,
        title:          m.title,
        description:    m.description,
        category:       m.category,
        market_type:    m.market_type,
        status:         m.status,
        close_date:     m.close_date,
        open_date:      m.open_date,
        resolution_time: m.resolution_time,
        resolution_source: m.resolution_source,
        total_volume:   m.total_volume,
        total_traders:  m.total_traders ?? m.active_traders ?? 0,
        active_traders: m.active_traders ?? m.total_traders ?? 0,
        yes_pool:       yp,
        no_pool:        np,
        prices,
        probability: {
          implied:    prob.yes,
          adjusted:   impact.adjusted,
          delta:      impact.delta,
          change_24h: change,
        },
        liquidity:     liq,
        signals_count: signals.length,
        signals:       signals.slice(0, 3),
        is_new:        m.open_date
          ? (Date.now() - new Date(m.open_date).getTime()) < 48 * 3600000
          : false,
        market_rating: m.market_rating ?? null,
        mid_price:     np / (yp + np),
      }
    })

    return res.status(200).json({
      markets:  enriched,
      count:    count ?? enriched.length,
      page:     pageN,
      limit:    limitN,
      has_more: (pageN + 1) * limitN < (count ?? 0),
    })
  } catch (err) {
    console.error('[/api/markets] error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
