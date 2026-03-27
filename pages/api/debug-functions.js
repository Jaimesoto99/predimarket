import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== (process.env.ADMIN_API_KEY || 'forsii-admin-2026')) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  // Crear función temporal que lee pg_proc y ejecutarla
  const { data, error } = await supabase.rpc('get_function_bodies', {
    p_names: ['execute_trade', 'place_limit_order', 'execute_sell', 'distribute_winnings']
  });

  if (error) {
    // Si no existe, intentar crearla y volver a llamar
    return res.status(200).json({ error: error.message, hint: 'Run CREATE FUNCTION get_function_bodies first' });
  }

  return res.status(200).json({ data });
}
