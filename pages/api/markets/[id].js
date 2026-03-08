// GET /api/markets/:id
// Returns full market detail with signals, probability, liquidity, and AMM book.

import { createClient }         from '@supabase/supabase-js'
import { calculatePrices, previewTrade }
                                from '../../../lib/amm'
import { computeAMMBook }       from '../../../lib/theme'
import { computeBaseProbability, compute24hChange, computeLiquidity }
                                from '../../../lib/engine/probability/baseProbability'
import { getActiveSignals }     from '../../../lib/engine/signals/signalPublisher'
import { applySignalImpact, computeSignalView }
                                from '../../../lib/engine/probability/signalImpact'
import { getLatestProbability } from '../../../lib/engine/probability/probabilityHistory'

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
  'Cache-Control':                'public, s-maxage=15, stale-while-revalidate=30',
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET')     return res.status(405).json({ error: 'Method not allowed' })

  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v))

  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'Missing market id' })

  try {
    const supabase = getSupabase()

    const { data: market, error } = await supabase
      .from('markets')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !market) {
      return res.status(404).json({ error: 'Market not found' })
    }

    const yp     = parseFloat(market.yes_pool) || 5000
    const np     = parseFloat(market.no_pool)  || 5000
    const prices = calculatePrices(yp, np)
    const prob   = computeBaseProbability(yp, np)
    const change = compute24hChange(yp, np)
    const liq    = computeLiquidity(yp, np)
    const book   = computeAMMBook(yp, np)

    // Fetch signals
    const signals = await getActiveSignals(id, 10)
    const view    = computeSignalView({ ...market, prices }, signals)

    // Last snapshot timestamp
    const lastSnap = await getLatestProbability(id)

    // Preview trade impact for standard amounts
    const tradePreview = {
      yes_50:  previewTrade(50,  'YES', yp, np),
      yes_200: previewTrade(200, 'YES', yp, np),
      no_50:   previewTrade(50,  'NO',  yp, np),
      no_200:  previewTrade(200, 'NO',  yp, np),
    }

    // Fetch recent trade count
    const { count: tradeCount } = await supabase
      .from('trades')
      .select('id', { count: 'exact', head: true })
      .eq('market_id', id)
      .gte('created_at', new Date(Date.now() - 24 * 3600000).toISOString())

    return res.status(200).json({
      market: {
        ...market,
        yes_pool: yp,
        no_pool:  np,
        prices,
        probability: {
          amm:        prob.yes,
          adjusted:   view.adjusted_probability,
          delta:      view.signal_delta,
          change_24h: change,
          direction:  view.dominant_direction,
        },
        liquidity:       liq,
        amm_book:        book,
        trade_preview:   tradePreview,
        trades_24h:      tradeCount || 0,
        last_snapshot:   lastSnap?.created_at || null,
        signals,
        signal_count:    signals.length,
        is_new:          market.open_date
          ? (Date.now() - new Date(market.open_date).getTime()) < 48 * 3600000
          : false,
      },
    })
  } catch (err) {
    console.error('[/api/markets/[id]] error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
