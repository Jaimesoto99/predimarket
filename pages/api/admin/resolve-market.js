// ─── POST /api/admin/resolve-market ──────────────────────────────────────────
//
// Executes the confirmed or rejected resolution for a supervised market.
//
// Authentication:
//   POST  → requires ADMIN_API_KEY (header X-Admin-Key or query ?key=)
//   GET   → requires ?token=<confirmation_token> (sent in the email action links)
//
// POST body:  { market_id: string, result: 'YES' | 'NO' | 'REJECT' }
// GET params: ?token=<uuid>&result=YES|NO|REJECT
//
// Behaviour:
//   YES | NO  → resolves the market and distributes winnings
//   REJECT    → marks pending_resolution as rejected, sends alert email

import { createClient } from '@supabase/supabase-js'
import { sendEmail }    from '../../../lib/email/sendEmail'
import { buildAlertEmail } from '../../../lib/email/resolutionTemplate'

const ADMIN_EMAIL = 'jaime@forsii.com'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Core resolution logic ────────────────────────────────────────────────────

async function executeResolution(supabase, pendingRow, result) {
  const marketId = pendingRow.market_id
  const oracleData = pendingRow.oracle_data || {}

  if (result === 'REJECT') {
    // Mark as rejected — market stays CLOSED for manual review
    await supabase
      .from('pending_resolutions')
      .update({ status: 'rejected', resolved_at: new Date().toISOString() })
      .eq('id', pendingRow.id)

    // Fetch market for alert email
    const { data: market } = await supabase
      .from('markets')
      .select('id, title')
      .eq('id', marketId)
      .single()

    await sendEmail({
      to:      ADMIN_EMAIL,
      subject: `⚠️ Resolución rechazada — ${market?.title || marketId}`,
      html:    buildAlertEmail({
        market,
        reason:  'Resolución rechazada manualmente. El mercado requiere revisión.',
        details: `Oracle data: ${oracleData.source || 'N/A'}`,
      }),
    })

    return { success: true, action: 'REJECTED', marketId }
  }

  // YES or NO — resolve the market
  const outcome = result === 'YES'
  const source  = oracleData.source || `Confirmado manualmente (${result})`

  const { error: rErr } = await supabase.rpc('resolve_market_manual', {
    p_market_id: marketId,
    p_outcome:   outcome,
    p_source:    source,
  })

  if (rErr) {
    return { success: false, error: rErr.message }
  }

  // Distribute winnings
  try {
    await supabase.rpc('distribute_winnings', { p_market_id: marketId })
  } catch (e) {
    console.error('[resolve-market] distribute_winnings error:', e.message)
  }

  // Mark pending resolution as confirmed
  await supabase
    .from('pending_resolutions')
    .update({ status: 'confirmed', resolved_at: new Date().toISOString() })
    .eq('id', pendingRow.id)

  return { success: true, action: 'RESOLVED', marketId, outcome }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const supabase = getSupabase()

  // ── GET: token-based (email button click) ──────────────────────────────────
  if (req.method === 'GET') {
    const { token, result } = req.query

    if (!token || !['YES', 'NO', 'REJECT'].includes(result)) {
      return res.status(400).send(htmlPage('Error', '❌ Parámetros inválidos.'))
    }

    const { data: pending, error: fetchErr } = await supabase
      .from('pending_resolutions')
      .select('*')
      .eq('confirmation_token', token)
      .single()

    if (fetchErr || !pending) {
      return res.status(404).send(htmlPage('No encontrado', '❌ Token de confirmación no encontrado.'))
    }

    if (pending.status !== 'pending') {
      return res.status(200).send(htmlPage(
        'Ya procesado',
        `ℹ️ Esta resolución ya fue procesada anteriormente (estado: <strong>${pending.status}</strong>).`
      ))
    }

    const execResult = await executeResolution(supabase, pending, result)

    if (!execResult.success) {
      return res.status(500).send(htmlPage('Error', `❌ Error al procesar: ${execResult.error}`))
    }

    if (result === 'REJECT') {
      return res.status(200).send(htmlPage(
        'Resolución rechazada',
        '⚠️ Resolución rechazada. El mercado ha sido marcado para revisión manual y se ha enviado una alerta.'
      ))
    }

    return res.status(200).send(htmlPage(
      'Resolución confirmada',
      `✅ Mercado resuelto como <strong>${result === 'YES' ? 'SÍ' : 'NO'}</strong>. Las ganancias han sido distribuidas.`
    ))
  }

  // ── POST: API key-based ────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const key      = (req.query.key || req.headers['x-admin-key'] || '').trim()
    const expected = (process.env.ADMIN_API_KEY || '').trim()
    if (!expected || key !== expected) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    const { market_id, result } = req.body || {}

    if (!market_id || !['YES', 'NO', 'REJECT'].includes(result)) {
      return res.status(400).json({ error: 'Parámetros requeridos: market_id, result (YES|NO|REJECT)' })
    }

    const { data: pending, error: fetchErr } = await supabase
      .from('pending_resolutions')
      .select('*')
      .eq('market_id', market_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchErr || !pending) {
      return res.status(404).json({ error: 'No hay resolución pendiente para este mercado' })
    }

    const execResult = await executeResolution(supabase, pending, result)

    if (!execResult.success) {
      return res.status(500).json({ error: execResult.error })
    }

    return res.status(200).json({
      ...execResult,
      timestamp: new Date().toISOString(),
    })
  }

  return res.status(405).json({ error: 'Método no permitido' })
}

// ─── Simple HTML response page (for email link clicks) ────────────────────────

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
