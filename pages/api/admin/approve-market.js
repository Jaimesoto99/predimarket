// ─── POST /api/admin/approve-market ──────────────────────────────────────────
//
// Marks a market as approved, making it visible to regular users.
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

    if (market.review_status !== 'pending_review') {
      return res.status(200).send(htmlPage(
        'Ya procesado',
        `ℹ️ Este mercado ya fue procesado anteriormente (estado: <strong>${market.review_status}</strong>).`
      ))
    }

    const { error: updateErr } = await supabase
      .from('markets')
      .update({ review_status: 'approved', review_token: null })
      .eq('id', market.id)

    if (updateErr) {
      return res.status(500).send(htmlPage('Error', `❌ Error al aprobar: ${updateErr.message}`))
    }

    return res.status(200).send(htmlPage(
      'Mercado aprobado',
      `✅ El mercado "<strong>${escHtml(market.title)}</strong>" ha sido aprobado y es ahora visible para los usuarios.`
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
      .select('id, title, description, category, close_date, open_date, resolution_source, review_status, market_rating')
      .eq('id', market_id)
      .single()

    if (fetchErr || !market) {
      return res.status(404).json({ error: 'Mercado no encontrado' })
    }

    if (market.review_status === 'approved') {
      return res.status(200).json({ success: true, message: 'El mercado ya estaba aprobado', market_id })
    }

    const approvedAt = new Date().toISOString()
    const ficha = buildFicha(market, approvedAt)

    const { error: updateErr } = await supabase
      .from('markets')
      .update({ review_status: 'approved', review_token: null, market_ficha: ficha })
      .eq('id', market_id)

    if (updateErr) {
      return res.status(500).json({ error: updateErr.message })
    }

    return res.status(200).json({
      success:    true,
      action:     'approved',
      market_id,
      market_title: market.title,
      timestamp:  approvedAt,
    })
  }

  return res.status(405).json({ error: 'Método no permitido' })
}

function buildFicha(market, approvedAt) {
  const text = `${market.title} ${market.description || ''}`.toLowerCase()

  let underlying = 'Indicador macroeconómico / económico'
  if (text.includes('ibex'))                                     underlying = 'IBEX 35 — Índice bursátil español (BME)'
  else if (text.includes('bitcoin') || text.includes('btc'))    underlying = 'Bitcoin (BTC) — Criptomoneda descentralizada'
  else if (text.includes('pvpc') || text.includes('mwh') || text.includes('electrici') || text.includes('eléctric'))
                                                                 underlying = 'PVPC — Precio Voluntario al Pequeño Consumidor (Red Eléctrica de España)'
  else if (text.includes('brent'))                              underlying = 'Brent Crude Oil — Petróleo crudo marcador europeo'
  else if (text.includes('euribor') || text.includes('euríbor')) underlying = 'Euríbor 12M — Tipo de interés interbancario europeo'
  else if (text.includes('ipc') || text.includes('inflación'))  underlying = 'IPC — Índice de Precios al Consumo (INE)'
  else if (text.includes('paro') || text.includes('sepe') || text.includes('empleo')) underlying = 'Paro registrado — Estadística mensual (SEPE)'
  else if (text.includes('vivienda') || text.includes('idealista')) underlying = 'Precio vivienda — Índice Idealista'
  else if (text.includes('renfe'))                              underlying = 'Operaciones ferroviarias — Renfe'
  else if (text.includes('congreso'))                           underlying = 'Actividad parlamentaria — Congreso de los Diputados'

  let sourceAgency = 'Resolución manual por oráculo Forsii'
  if (market.resolution_source) {
    const src = market.resolution_source
    if (src.includes('ine.es'))               sourceAgency = 'INE — Instituto Nacional de Estadística'
    else if (src.includes('ree.es') || src.includes('apidatos')) sourceAgency = 'REE — Red Eléctrica de España (apidatos)'
    else if (src.includes('finance.yahoo'))   sourceAgency = 'Yahoo Finance'
    else if (src.includes('coingecko'))       sourceAgency = 'CoinGecko'
    else if (src.includes('sepe.gob'))        sourceAgency = 'SEPE — Servicio Público de Empleo Estatal'
    else if (src.includes('idealista'))       sourceAgency = 'Idealista — Portal inmobiliario'
    else if (src.includes('renfe'))           sourceAgency = 'Renfe — Operadora ferroviaria nacional'
    else if (src.includes('congreso.es'))     sourceAgency = 'Congreso de los Diputados'
    else                                       sourceAgency = src
  }

  return {
    market_name:              market.title,
    category:                 market.category,
    underlying,
    source_agency:            sourceAgency,
    resolution_source_url:    market.resolution_source || null,
    resolution_criteria:      market.description || null,
    expiration_date:          market.close_date,
    settlement:               '€1.00 por contrato ganador',
    creation_date:            market.open_date || null,
    oracle_rating_at_approval: market.market_rating?.score ?? null,
    review_status:            'approved',
    approval_date:            approvedAt,
    position_limit:           null,
    prohibited_participants:  'Ninguno',
    generated_at:             approvedAt,
  }
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
