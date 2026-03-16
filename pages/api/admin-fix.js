// Temporary admin endpoint — remove after fixes confirmed
// Usage: POST /api/admin-fix?key=predi-admin-2026  { "fix": "unlock_jobs" | "check_all" }

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.query.key !== 'predi-admin-2026') return res.status(401).json({ error: 'Unauthorized' })

  const fix = req.query.fix || req.body?.fix || 'check_all'

  // ── Fix 1: Unlock all stuck scheduler jobs ─────────────────────────────
  if (fix === 'unlock_jobs') {
    const { data, error } = await supabaseAdmin
      .from('scheduler_jobs')
      .update({ locked_at: null, locked_by: null })
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id, status, locked_at')

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true, updated: data?.length ?? 0, jobs: data })
  }

  // ── check_all: diagnose current state ──────────────────────────────────
  if (fix === 'check_all') {
    const results = {}

    // Scheduler jobs
    const { data: jobs } = await supabaseAdmin
      .from('scheduler_jobs')
      .select('id, status, locked_at, last_run_at')
      .limit(15)
    results.scheduler_jobs = jobs

    // Watchlist table exists?
    const { error: wlErr } = await supabaseAdmin
      .from('user_watchlists')
      .select('id')
      .limit(1)
    results.user_watchlists_exists = !wlErr
    results.user_watchlists_error  = wlErr?.message ?? null

    // execute_trade RPC exists?
    const { error: tradeErr } = await supabaseAdmin.rpc('execute_trade', {
      p_email: 'check@check.com', p_market_id: 1, p_side: 'YES', p_amount: 0.01,
    })
    results.execute_trade_error = tradeErr?.message ?? 'OK (función existe)'

    // place_limit_order RPC exists?
    const { error: limitErr } = await supabaseAdmin.rpc('place_limit_order', {
      p_email: 'check@check.com', p_market_id: 1, p_side: 'YES',
      p_amount: 0.01, p_target_price: 0.50,
    })
    results.place_limit_order_error = limitErr?.message ?? 'OK (función existe)'

    return res.json(results)
  }

  return res.status(400).json({ error: 'Unknown fix' })
}
