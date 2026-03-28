// POST /api/admin/update-market
//
// Updates a market's title and description with a recalibrated threshold.
// Replaces the old threshold number (>100) in the title/description with
// the new value, formatted in Spanish locale.
//
// Body: { market_id, new_threshold }
// Auth: X-Admin-Key header or ?key=

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// Format number in Spanish locale (e.g. 16700 → "16.700")
function formatSpanish(n) {
  return Math.round(n).toLocaleString('es-ES')
}

// Replace the first threshold-like number in a string.
// Handles both Spanish-formatted ("16.700") and plain ("16700") representations.
function replaceThreshold(text, oldThreshold, newThreshold) {
  const newStr = formatSpanish(newThreshold)
  // Try replacing Spanish-formatted version first (e.g. "16.700")
  const spanishOld = formatSpanish(oldThreshold)
  if (text.includes(spanishOld)) {
    return text.replace(spanishOld, newStr)
  }
  // Fallback: replace plain number
  const plainOld = String(Math.round(oldThreshold))
  return text.replace(plainOld, newStr)
}

function extractThreshold(title) {
  const m = title.match(/(?:encima\s+de|superar[áa]\s+(?:los?\s+)?|supera\s+(?:los?\s+)?)([\d.,]+)/i)
  if (!m) return null
  return parseFloat(m[1].replace(/\./g, '').replace(',', '.'))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const key      = (req.query.key || req.headers['x-admin-key'] || '').trim()
  const expected = (process.env.ADMIN_API_KEY || '').trim()
  if (!expected || key !== expected) return res.status(401).json({ error: 'No autorizado' })

  const { market_id, new_threshold } = req.body || {}
  if (!market_id || new_threshold == null) {
    return res.status(400).json({ error: 'Requerido: market_id, new_threshold' })
  }

  const thr = parseFloat(String(new_threshold).replace(/\./g, '').replace(',', '.'))
  if (isNaN(thr) || thr <= 0) {
    return res.status(400).json({ error: 'new_threshold inválido' })
  }

  const supabase = getSupabase()
  const { data: market, error: fetchErr } = await supabase
    .from('markets')
    .select('id, title, description')
    .eq('id', market_id)
    .single()

  if (fetchErr || !market) return res.status(404).json({ error: 'Mercado no encontrado' })

  const oldThreshold = extractThreshold(market.title)
  if (!oldThreshold) {
    return res.status(400).json({ error: 'No se encontró umbral en el título del mercado' })
  }

  const newTitle       = replaceThreshold(market.title,       oldThreshold, thr)
  const newDescription = replaceThreshold(market.description || '', oldThreshold, thr)

  const { error: updateErr } = await supabase
    .from('markets')
    .update({ title: newTitle, description: newDescription })
    .eq('id', market_id)

  if (updateErr) return res.status(500).json({ error: updateErr.message })

  return res.status(200).json({
    success:       true,
    market_id,
    old_threshold: oldThreshold,
    new_threshold: thr,
    new_title:     newTitle,
    timestamp:     new Date().toISOString(),
  })
}
