// POST /api/admin/rate-markets?key=ADMIN_KEY
// Rates all active markets that don't have a market_rating yet.
// Returns { rated: [...], count }

import { createClient }    from '@supabase/supabase-js'
import { rateMarket }      from '../../../lib/oracle-rating'
import { fetchTrendingNews } from './trending-spain'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const key      = (req.query.key || req.headers['x-admin-key'] || '').trim()
  const expected = (process.env.ADMIN_API_KEY || '').trim()
  if (!expected || key !== expected) return res.status(401).json({ error: 'No autorizado' })

  const supabase = getSupabase()

  const { data: markets, error } = await supabase
    .from('markets')
    .select('id, title, description, category, close_date, resolution_source, yes_pool, no_pool')
    .in('status', ['ACTIVE', 'CLOSED'])
    .is('market_rating', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return res.status(500).json({ error: error.message })
  if (!markets?.length) return res.status(200).json({ rated: [], count: 0, message: 'No markets to rate' })

  const trending = await fetchTrendingNews().catch(() => [])
  const rated    = []

  for (const market of markets) {
    const rating = rateMarket(market, trending)
    const { error: upErr } = await supabase
      .from('markets')
      .update({ market_rating: rating })
      .eq('id', market.id)

    if (!upErr) {
      rated.push({ id: market.id, title: market.title, score: rating.score })
    }
  }

  return res.status(200).json({ rated, count: rated.length })
}
