// POST /api/watchlist
// body: { email, marketId, action: 'follow' | 'unfollow' }
// Uses service role key → bypasses RLS

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, marketId, action } = req.body
  if (!email || !marketId || !action) return res.status(400).json({ error: 'Missing params' })

  const userEmail = email.toLowerCase().trim()

  if (action === 'follow') {
    const { error } = await supabaseAdmin
      .from('user_watchlists')
      .insert({ user_email: userEmail, market_id: marketId })
    if (error && !error.message.includes('duplicate')) {
      console.error('[watchlist] follow error:', error.message)
      return res.status(500).json({ error: error.message })
    }
    return res.json({ ok: true })
  }

  if (action === 'unfollow') {
    const { error } = await supabaseAdmin
      .from('user_watchlists')
      .delete()
      .eq('user_email', userEmail)
      .eq('market_id', marketId)
    if (error) {
      console.error('[watchlist] unfollow error:', error.message)
      return res.status(500).json({ error: error.message })
    }
    return res.json({ ok: true })
  }

  return res.status(400).json({ error: 'Invalid action' })
}
