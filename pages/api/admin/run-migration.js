// ONE-TIME migration endpoint — will be deleted after use
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const key = (req.query.key || req.headers['x-admin-key'] || '').trim()
  if (key !== 'p2p-migrate-2026') return res.status(401).json({ error: 'No autorizado' })

  const results = {}

  // STEP 1: Deprecate execute_trade
  const { error: e1 } = await supabase.rpc('run_sql', {
    query: `CREATE OR REPLACE FUNCTION public.execute_trade(p_email text, p_market_id bigint, p_side text, p_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN jsonb_build_object('success', false, 'error', 'Deprecated: use place_limit_order');
END;
$$;`
  }).catch(() => ({ error: { message: 'run_sql RPC not available' } }))

  if (e1) {
    // Fallback: try direct pg query via supabase-js
    // Supabase JS client does not expose raw SQL — must use pg_net or admin API
    results.step1 = { status: 'skipped', reason: e1.message }
  } else {
    results.step1 = { status: 'ok' }
  }

  // STEP 5: Delete test data
  const { error: e2, count: c2 } = await supabase
    .from('trades')
    .delete()
    .eq('id', 8138)
  results.step5_trades = e2 ? { status: 'error', error: e2.message } : { status: 'ok', deleted: c2 }

  const { error: e3, count: c3 } = await supabase
    .from('limit_orders')
    .delete()
    .eq('id', 191)
  results.step5_orders = e3 ? { status: 'error', error: e3.message } : { status: 'ok', deleted: c3 }

  return res.status(200).json({ results })
}
