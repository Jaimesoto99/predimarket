// GET /api/activity
// Returns global activity feed (trades + signals + resolutions).
// Query params:
//   limit      = 30 (default)
//   sinceHours = 24 (default)
//   type       = TRADE | SIGNAL | RESOLUTION | ALL (default)
//   market_id  = optional market filter

import { getGlobalActivity } from '../../../lib/engine/activity/activityGenerator'
import { createClient }      from '@supabase/supabase-js'

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

  const {
    limit      = '30',
    sinceHours = '24',
    type,
    market_id,
  } = req.query

  const limitN  = Math.min(100, Math.max(1, parseInt(limit,      10) || 30))
  const hoursN  = Math.min(72,  Math.max(1, parseInt(sinceHours, 10) || 24))

  try {
    const supabase = getSupabase()
    const since    = new Date(Date.now() - hoursN * 3600000).toISOString()

    let query = supabase
      .from('activity_events')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(limitN)

    if (type && type !== 'ALL') {
      query = query.eq('type', type.toUpperCase())
    }
    if (market_id) {
      query = query.eq('market_id', market_id)
    }

    const { data: events, error } = await query
    if (error) return res.status(500).json({ error: error.message })

    // Shape events for frontend consumption
    const activity = (events || []).map(e => ({
      id:           e.id,
      type:         e.type,
      market_id:    e.market_id,
      user_email:   e.user_email,
      display_name: e.display_name,
      emoji:        e.emoji,
      created_at:   e.created_at,
      // Flatten payload fields to top level for ease of use
      side:         e.payload?.side,
      amount:       e.payload?.amount,
      market_title: e.payload?.market_title,
      signal_type:  e.payload?.signal_type,
      direction:    e.payload?.direction,
      strength:     e.payload?.strength,
      signal_title: e.payload?.title,
      outcome:      e.payload?.outcome,
    }))

    return res.status(200).json({
      activity,
      count:       activity.length,
      since_hours: hoursN,
    })
  } catch (err) {
    console.error('[/api/activity] error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
