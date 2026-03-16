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

  // STEP 5a: Delete test trade
  try {
    const r1 = await supabase.from('trades').delete().eq('id', 8138)
    results.delete_trade_8138 = r1.error ? { error: r1.error.message } : { ok: true }
  } catch (e) {
    results.delete_trade_8138 = { error: String(e) }
  }

  // STEP 5b: Delete test limit order
  try {
    const r2 = await supabase.from('limit_orders').delete().eq('id', 191)
    results.delete_order_191 = r2.error ? { error: r2.error.message } : { ok: true }
  } catch (e) {
    results.delete_order_191 = { error: String(e) }
  }

  // STEP 1: Deprecate execute_trade via SQL
  // Supabase JS doesn't expose raw DDL — try via pg RPC if available
  try {
    const sql = `CREATE OR REPLACE FUNCTION public.execute_trade(p_email text, p_market_id bigint, p_side text, p_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN jsonb_build_object('success', false, 'error', 'Deprecated: use place_limit_order');
END;
$$;`
    const r3 = await supabase.rpc('exec_sql', { sql })
    if (r3.error) {
      results.deprecate_execute_trade = { skipped: true, reason: r3.error.message }
    } else {
      results.deprecate_execute_trade = { ok: true }
    }
  } catch (e) {
    results.deprecate_execute_trade = { skipped: true, reason: String(e) }
  }

  return res.status(200).json({ ok: true, results })
}
