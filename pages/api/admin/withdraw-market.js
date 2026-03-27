// ─── POST /api/admin/withdraw-market ─────────────────────────────────────────
//
// Marks a market as withdrawn, removing it from the public market list.
//
// Authentication:
//   POST → requires ADMIN_API_KEY (header X-Admin-Key or query ?key=)
//   GET  → requires ?token=<review_token> (sent in the review email)
//
// POST body: { market_id: number }
// GET param: ?token=<uuid>

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export default async function handler(req, res) {
  const supabase = getSupabase()

  // ── GET: token-based (email button click) ────────────────────────────────
  if (req.method === 'GET') {
    const { token } = req.query

    if (!token) {
      return res.status(400).send(htmlPage('Error', '❌ Token de revisión no proporcionado.'))
    }

    const { data: market, error: fetchErr } = await supabase
      .from('markets')
      .select('id, title, review_status')
      .eq('review_token', token)
      .single()

    if (fetchErr || !market) {
      return res.status(404).send(htmlPage('No encontrado', '❌ Token de revisión no encontrado.'))
    }

    if (market.review_status === 'withdrawn') {
      return res.status(200).send(htmlPage(
        'Ya retirado',
        `ℹ️ Este mercado ya fue retirado anteriormente.`
      ))
    }

    const { error: updateErr } = await supabase
      .from('markets')
      .update({ review_status: 'withdrawn', review_token: null })
      .eq('id', market.id)

    if (updateErr) {
      return res.status(500).send(htmlPage('Error', `❌ Error al retirar: ${updateErr.message}`))
    }

    return res.status(200).send(htmlPage(
      'Mercado retirado',
      `❌ El mercado "<strong>${escHtml(market.title)}</strong>" ha sido retirado y no es visible para los usuarios.`
    ))
  }

  // ── POST: API key-based ──────────────────────────────────────────────────
  if (req.method === 'POST') {
    const key      = (req.query.key || req.headers['x-admin-key'] || '').trim()
    const expected = (process.env.ADMIN_API_KEY || '').trim()
    if (!expected || key !== expected) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    const { market_id } = req.body || {}
    if (!market_id) {
      return res.status(400).json({ error: 'Parámetro requerido: market_id' })
    }

    const { data: market, error: fetchErr } = await supabase
      .from('markets')
      .select('id, title, review_status')
      .eq('id', market_id)
      .single()

    if (fetchErr || !market) {
      return res.status(404).json({ error: 'Mercado no encontrado' })
    }

    const { error: updateErr } = await supabase
      .from('markets')
      .update({ review_status: 'withdrawn', review_token: null })
      .eq('id', market_id)

    if (updateErr) {
      return res.status(500).json({ error: updateErr.message })
    }

    return res.status(200).json({
      success:    true,
      action:     'withdrawn',
      market_id,
      market_title: market.title,
      timestamp:  new Date().toISOString(),
    })
  }

  return res.status(405).json({ error: 'Método no permitido' })
}

function htmlPage(title, body) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title} — Forsii</title>
  <style>
    body { margin: 0; padding: 48px 24px; background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; box-sizing: border-box; }
    .card { background: #fff; border-radius: 12px; padding: 40px 48px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
    h1 { margin: 0 0 16px; font-size: 22px; color: #1e293b; }
    p  { margin: 0; font-size: 16px; color: #475569; line-height: 1.6; }
    .brand { font-size: 13px; color: #94a3b8; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${body}</p>
    <p class="brand">Forsii · Panel de administración</p>
  </div>
</body>
</html>`
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
