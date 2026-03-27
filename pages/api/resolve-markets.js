import { createClient } from '@supabase/supabase-js'
import { sendEmail }    from '../../lib/email/sendEmail'
import { buildPendingResolutionEmail, buildAlertEmail } from '../../lib/email/resolutionTemplate'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'jaime@forsii.com'

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://forsii.com').replace(/\/$/, '')
}

// ─── Create a pending_resolution row and notify admin ─────────────────────────
async function createPendingResolution(market, oracleResult, oracleType) {
  const oracleData = {
    source:    oracleResult.source,
    value:     oracleResult.value ?? null,
    oracleUrl: oracleResult.oracleUrl || null,
  }

  const { data: row, error } = await supabase
    .from('pending_resolutions')
    .insert({
      market_id:       market.id,
      suggested_result: oracleResult.outcome,
      oracle_data:     oracleData,
      oracle_type:     oracleType,
      status:          'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('[resolve-markets] insert pending_resolution error:', error.message)
    return null
  }

  const siteUrl     = getSiteUrl()
  const token       = row.confirmation_token
  const confirmUrl  = `${siteUrl}/api/admin/resolve-market?token=${token}&result=${oracleResult.outcome ? 'YES' : 'NO'}`
  const rejectUrl   = `${siteUrl}/api/admin/resolve-market?token=${token}&result=REJECT`
  const adminUrl    = `${siteUrl}/admin/markets/${market.id}`

  await sendEmail({
    to:      ADMIN_EMAIL,
    subject: `⏳ Resolución pendiente — ${market.title}`,
    html:    buildPendingResolutionEmail({
      market:          { id: market.id, title: market.title, description: market.description || '' },
      oracleType,
      oracleData,
      suggestedResult: oracleResult.outcome,
      confirmUrl,
      rejectUrl,
      adminMarketUrl:  adminUrl,
    }),
  })

  return row
}

// ─── Auto-approve markets pending review for more than 24 hours ──────────────
async function autoApproveExpiredReviews() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: approved, error } = await supabase
    .from('markets')
    .update({ review_status: 'approved', review_token: null })
    .eq('review_status', 'pending_review')
    .lt('open_date', cutoff)
    .select('id, title')

  if (error) {
    console.error('[resolve-markets] autoApproveExpiredReviews error:', error.message)
    return []
  }

  if (approved?.length) {
    console.log(`[resolve-markets] Auto-approved ${approved.length} markets after 24h review window`)
  }

  return approved || []
}

// ─── Auto-expire pending resolutions older than 24 hours ─────────────────────
async function expireOldPendingResolutions() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: expired, error } = await supabase
    .from('pending_resolutions')
    .select('id, market_id')
    .eq('status', 'pending')
    .lt('created_at', cutoff)

  if (error || !expired?.length) return []

  const results = []
  for (const row of expired) {
    try {
      await supabase.rpc('refund_market', { p_market_id: row.market_id })

      await supabase
        .from('pending_resolutions')
        .update({ status: 'expired', resolved_at: new Date().toISOString() })
        .eq('id', row.id)

      const { data: market } = await supabase
        .from('markets')
        .select('id, title')
        .eq('id', row.market_id)
        .single()

      await sendEmail({
        to:      ADMIN_EMAIL,
        subject: `⚠️ Resolución expirada — reembolso automático — ${market?.title || row.market_id}`,
        html:    buildAlertEmail({
          market,
          reason:  'La resolución no fue confirmada en 24 horas. Se ha ejecutado un reembolso automático a todos los participantes.',
          details: `market_id: ${row.market_id}`,
        }),
      })

      results.push({ id: row.market_id, status: 'EXPIRED_AND_REFUNDED' })
    } catch (e) {
      console.error('[resolve-markets] expire error:', row.market_id, e.message)
      results.push({ id: row.market_id, status: 'EXPIRE_ERROR', error: e.message })
    }
  }

  return results
}

// ─── Oracle: IBEX 35 ─────────────────────────────────────────────────────
async function checkIBEXVerde() {
  try {
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EIBEX?interval=1d&range=5d',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) return null
    const quotes = result.indicators?.quote?.[0]
    const timestamps = result.timestamp
    if (!quotes || !timestamps || timestamps.length === 0) return null
    const lastIdx = timestamps.length - 1
    const open = quotes.open?.[lastIdx]
    const close = quotes.close?.[lastIdx]
    if (!open || !close) {
      const metaOpen = result.meta?.previousClose
      const metaClose = result.meta?.regularMarketPrice
      if (!metaOpen || !metaClose) return null
      return {
        outcome: metaClose > metaOpen,
        source: `Yahoo Finance — IBEX 35: Apertura ${metaOpen.toFixed(2)}, Cierre ${metaClose.toFixed(2)}. Variacion: ${((metaClose - metaOpen) / metaOpen * 100).toFixed(2)}%`,
        value: metaClose,
        oracleUrl: 'https://finance.yahoo.com/quote/%5EIBEX/'
      }
    }
    return {
      outcome: close > open,
      source: `Yahoo Finance — IBEX 35: Apertura ${open.toFixed(2)}, Cierre ${close.toFixed(2)}. Variacion: ${((close - open) / open * 100).toFixed(2)}%`,
      value: close,
      oracleUrl: 'https://finance.yahoo.com/quote/%5EIBEX/'
    }
  } catch (err) {
    console.error('Error IBEX:', err)
    return null
  }
}

// ─── Oracle: IBEX threshold ───────────────────────────────────────────────
async function checkIBEXThreshold(threshold) {
  try {
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EIBEX?interval=1d&range=2d',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta
    const price = meta?.regularMarketPrice || meta?.previousClose
    if (!price) return null
    return {
      outcome: price > threshold,
      source: `Yahoo Finance — IBEX 35: ${price.toFixed(2)} puntos. Umbral: ${threshold}.`,
      value: price,
      oracleUrl: 'https://finance.yahoo.com/quote/%5EIBEX/'
    }
  } catch (err) {
    console.error('Error IBEX threshold:', err)
    return null
  }
}

// ─── Oracle: Precio luz ───────────────────────────────────────────────────
async function checkPrecioLuz(threshold = 100) {
  const today = new Date().toISOString().split('T')[0]
  const headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; Forsii/1.0)',
    'Accept': 'application/json',
  }

  // 1. REE apidatos
  try {
    const res = await fetch(
      `https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real?start_date=${today}T00:00&end_date=${today}T23:59&time_trunc=hour&geo_trunc=electric_system&geo_limit=peninsular&geo_ids=8741`,
      { headers }
    )
    if (res.ok) {
      const data = await res.json()
      for (const dataset of (data?.included || [])) {
        const values = dataset?.attributes?.values
        if (values && values.length >= 4) {
          const avg = values.reduce((s, v) => s + v.value, 0) / values.length
          if (avg > 0) {
            return {
              outcome: avg > threshold,
              source: `REE — ${dataset.attributes?.title || 'PVPC'} media ${today}: ${avg.toFixed(2)} EUR/MWh. Umbral: ${threshold} EUR/MWh.`,
              value: avg,
              oracleUrl: 'https://www.ree.es/es/datos/mercados'
            }
          }
        }
      }
    }
  } catch (e) { console.error('REE apidatos error:', e.message) }

  // 2. preciodelaluz.org
  try {
    const res = await fetch('https://api.preciodelaluz.org/v1/prices/avg?zone=PCB', { headers })
    if (res.ok) {
      const data = await res.json()
      const avgPrice = data?.price
      if (avgPrice !== undefined && avgPrice !== null) {
        return {
          outcome: avgPrice > threshold,
          source: `preciodelaluz.org — Precio medio: ${avgPrice.toFixed(2)} EUR/MWh. Umbral: ${threshold} EUR/MWh.`,
          value: avgPrice,
          oracleUrl: 'https://www.preciodelaluz.org'
        }
      }
    }
  } catch (e) { console.error('preciodelaluz error:', e.message) }

  return null
}

// ─── Oracle: Temperatura ─────────────────────────────────────────────────
async function checkTemperatura(threshold = 30) {
  try {
    const ciudades = [
      { name: 'Sevilla', lat: 37.39, lon: -5.98 },
      { name: 'Cordoba', lat: 37.88, lon: -4.77 },
      { name: 'Madrid', lat: 40.42, lon: -3.70 },
      { name: 'Murcia', lat: 37.98, lon: -1.13 },
      { name: 'Zaragoza', lat: 41.65, lon: -0.88 },
      { name: 'Valencia', lat: 39.47, lon: -0.38 },
    ]
    let maxTemp = -Infinity, maxCiudad = ''
    for (const c of ciudades) {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&daily=temperature_2m_max&timezone=Europe/Madrid&past_days=1&forecast_days=1`)
      const data = await res.json()
      const temp = data?.daily?.temperature_2m_max?.[0]
      if (temp !== undefined && temp > maxTemp) { maxTemp = temp; maxCiudad = c.name }
    }
    if (maxTemp === -Infinity) return null
    return {
      outcome: maxTemp > threshold,
      source: `Open-Meteo (AEMET) — Maxima: ${maxTemp.toFixed(1)}°C en ${maxCiudad}. Umbral: ${threshold}°C.`,
      value: maxTemp,
      oracleUrl: 'https://open-meteo.com'
    }
  } catch (err) { return null }
}

// ─── Oracle: Bitcoin price ────────────────────────────────────────────────
async function checkBitcoin(threshold = 100000) {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
      { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const price = data?.bitcoin?.usd
    if (!price) return null
    return {
      outcome: price > threshold,
      source: `CoinGecko — Bitcoin: $${price.toLocaleString('en-US')} USD. Umbral: $${threshold.toLocaleString('en-US')}.`,
      value: price,
      oracleUrl: 'https://www.coingecko.com/en/coins/bitcoin'
    }
  } catch (err) {
    console.error('Error Bitcoin oracle:', err)
    return null
  }
}

// ─── Oracle: Football results ─────────────────────────────────────────────
async function checkFootballResult(teamId, teamName) {
  try {
    const apiKey = process.env.FOOTBALL_DATA_API_KEY
    if (!apiKey) return null
    const res = await fetch(
      `https://api.football-data.org/v4/teams/${teamId}/matches?status=FINISHED&limit=1`,
      { headers: { 'X-Auth-Token': apiKey } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const match = data?.matches?.[0]
    if (!match) return null
    const isHome = match.homeTeam.id === teamId
    const teamScore = isHome ? match.score.fullTime.home : match.score.fullTime.away
    const oppScore = isHome ? match.score.fullTime.away : match.score.fullTime.home
    const opponent = isHome ? match.awayTeam.name : match.homeTeam.name
    const won = teamScore > oppScore
    return {
      outcome: won,
      source: `football-data.org — ${teamName} ${teamScore}-${oppScore} ${opponent} (${match.competition.name}). ${won ? 'Victoria.' : teamScore === oppScore ? 'Empate.' : 'Derrota.'}`,
      value: teamScore,
      oracleUrl: 'https://www.football-data.org'
    }
  } catch (err) { return null }
}

// ─── Oracle: Idealista vivienda ───────────────────────────────────────────
async function checkIdealista() {
  try {
    const res = await fetch('https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    })
    const html = await res.text()
    const priceMatch = html.match(/([\d.]+)\s*€\/m[2²]/i)
    const varMatch = html.match(/([+-])\s*([\d,]+)\s*%\s*(?:Evolución frente|frente a)/i)

    if (priceMatch) {
      const price = parseFloat(priceMatch[1].replace('.', ''))
      const isUp = varMatch ? varMatch[1] === '+' : null
      const variation = varMatch ? parseFloat(varMatch[2].replace(',', '.')) : null

      if (isUp !== null) {
        return {
          outcome: isUp,
          source: `Idealista Sala de Prensa — Precio m2 España: ${priceMatch[1]} €/m2. Variación mensual: ${varMatch[1]}${variation}%.`,
          value: price,
          oracleUrl: 'https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/'
        }
      }
    }
    return null
  } catch (err) {
    console.error('Error Idealista:', err)
    return null
  }
}

// ─── Oracle router ────────────────────────────────────────────────────────
function getOracleForMarket(market) {
  const t = market.title.toLowerCase()

  // IBEX: "cierra en verde" → verde oracle; "> X puntos" → threshold oracle
  if (t.includes('ibex')) {
    const thresholdMatch = t.match(/>\s*([\d.]+)\s*(puntos|pts)?/)
    if (thresholdMatch) {
      const thr = parseFloat(thresholdMatch[1])
      return { fn: () => checkIBEXThreshold(thr), type: 'IBEX' }
    }
    return { fn: checkIBEXVerde, type: 'IBEX' }
  }

  // Precio luz
  if (t.includes('luz') || t.includes('mwh') || t.includes('pvpc')) {
    const m = t.match(/>?\s*([\d]+)\s*(eur|€)?\/?(mwh)?/)
    const thr = m ? parseInt(m[1]) : 100
    return { fn: () => checkPrecioLuz(thr), type: 'LUZ' }
  }

  // Temperatura
  if (t.includes('grados') || t.includes('temperatura') || t.includes('30°') || t.includes('35°')) {
    const m = t.match(/([\d]+)\s*°?c?\s*(grados|°)?/)
    const thr = m ? parseInt(m[1]) : 30
    return { fn: () => checkTemperatura(thr), type: 'TEMP' }
  }

  // Bitcoin
  if (t.includes('bitcoin') || t.includes('btc')) {
    const m = t.match(/([\d.]+)\s*[k$]?\s*(usd|dólares|dolares)?/)
    // Parse threshold: "100.000$" or "100k" etc.
    let thr = 100000
    const numMatch = market.title.match(/\$?([\d.,]+)\s*[kK]?/)
    if (numMatch) {
      const raw = parseFloat(numMatch[1].replace(/\./g, '').replace(',', '.'))
      thr = raw
      // Check if market title has K suffix
      if (market.title.match(/\d+\s*[kK]\b/)) thr = raw * 1000
    }
    return { fn: () => checkBitcoin(thr), type: 'BITCOIN' }
  }

  // Football
  if (t.includes('real madrid') && (t.includes('gana') || t.includes('victoria')))
    return { fn: () => checkFootballResult(86, 'Real Madrid'), type: 'FUTBOL' }
  if ((t.includes('barça') || t.includes('barcelona')) && (t.includes('gana') || t.includes('victoria')))
    return { fn: () => checkFootballResult(81, 'FC Barcelona'), type: 'FUTBOL' }
  if (t.includes('atlético') && t.includes('gana'))
    return { fn: () => checkFootballResult(78, 'Atlético de Madrid'), type: 'FUTBOL' }

  // Vivienda
  if (t.includes('vivienda') || t.includes('idealista'))
    return { fn: checkIdealista, type: 'VIVIENDA' }

  return null
}

// ─── Create recurring daily markets ──────────────────────────────────────
async function createRecurringMarkets() {
  const now = new Date()
  const day = now.getUTCDay()
  if (day === 0 || day === 6) return [{ action: 'SKIP', reason: 'Fin de semana' }]
  const results = []
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
  const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString()

  const { data: existingIbex } = await supabase.from('markets').select('id').ilike('title', '%IBEX%verde%').gte('open_date', todayStart).lt('open_date', todayEnd)
  if (!existingIbex || existingIbex.length === 0) {
    const hoursUntilClose = Math.max(1, Math.ceil((new Date(todayStart).getTime() + 16 * 3600000 - now.getTime()) / 3600000))
    if (hoursUntilClose > 1) {
      const { data, error } = await supabase.rpc('create_market', {
        p_title: '¿El IBEX 35 cierra en verde hoy?',
        p_description: 'El IBEX 35 cierra con variacion positiva respecto a la apertura. Resolucion: Yahoo Finance tras cierre BME 17:35h. Fuente verificable: finance.yahoo.com/quote/%5EIBEX/',
        p_category: 'ECONOMIA', p_market_type: 'DIARIO', p_duration_hours: hoursUntilClose, p_initial_pool: 5000
      })
      results.push(error ? { action: 'ERROR', market: 'IBEX', error: error.message } : { action: 'CREATED', market: 'IBEX diario' })
    }
  } else { results.push({ action: 'EXISTS', market: 'IBEX' }) }

  return results
}

// ─── Main handler ─────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const key = (req.query.key || req.headers["x-admin-key"] || "").trim()
  const expected = (process.env.ADMIN_API_KEY || "").trim()
  if (!expected || key !== expected) return res.status(401).json({ error: "No autorizado" })

  try {
    // Step 1a: auto-approve markets whose 24h review window has passed
    const autoApproved = await autoApproveExpiredReviews()

    // Step 1b: auto-expire pending resolutions that have been waiting > 24h
    const expired = await expireOldPendingResolutions()

    // Prices injected externally (e.g., from GitHub Actions)
    const injectedLuz = req.query.luz ? parseFloat(req.query.luz) : null
    const injectedIbex = req.query.ibex !== undefined ? req.query.ibex === 'true' : null
    const injectedBtc = req.query.btc ? parseFloat(req.query.btc) : null

    const { data: pendingMarkets, error } = await supabase
      .from('markets').select('*').in('status', ['CLOSED', 'ACTIVE']).lt('close_date', new Date().toISOString())
    if (error) return res.status(500).json({ error: error.message })

    const results = []
    for (const market of (pendingMarkets || [])) {
      if (market.resolved_outcome !== null) continue

      // Skip markets that already have a pending resolution awaiting confirmation
      const { data: existingPending } = await supabase
        .from('pending_resolutions')
        .select('id, status, created_at')
        .eq('market_id', market.id)
        .eq('status', 'pending')
        .limit(1)
      if (existingPending?.length > 0) {
        results.push({ id: market.id, title: market.title, status: 'AWAITING_CONFIRMATION', pendingSince: existingPending[0].created_at })
        continue
      }

      const oracle = getOracleForMarket(market)

      // No oracle found — check if market has been expired > 24h and issue refund
      if (!oracle) {
        const closedHoursAgo = (Date.now() - new Date(market.close_date).getTime()) / 3600000
        if (closedHoursAgo > 24) {
          try {
            await supabase.rpc('refund_market', { p_market_id: market.id })
            results.push({ id: market.id, title: market.title, status: 'REFUNDED', reason: 'No oracle available after 24h' })
          } catch (e) {
            results.push({ id: market.id, title: market.title, status: 'NO_ORACLE', closedHoursAgo: closedHoursAgo.toFixed(1) })
          }
        } else {
          results.push({ id: market.id, title: market.title, status: 'NO_ORACLE', closedHoursAgo: closedHoursAgo.toFixed(1) })
        }
        continue
      }

      // Use injected prices if oracle type matches
      let oracleResult = null
      const t = market.title.toLowerCase()
      if (oracle.type === 'LUZ' && injectedLuz !== null && !isNaN(injectedLuz)) {
        const m = t.match(/([\d]+)\s*(eur|€)?\/?(mwh)?/)
        const thr = m ? parseInt(m[1]) : 100
        oracleResult = { outcome: injectedLuz > thr, source: `GitHub Actions / REE — Precio medio luz: ${injectedLuz.toFixed(2)} EUR/MWh. Umbral: ${thr} EUR/MWh.`, value: injectedLuz }
      } else if (oracle.type === 'IBEX' && injectedIbex !== null) {
        oracleResult = { outcome: injectedIbex, source: `GitHub Actions / Yahoo Finance — IBEX cierra ${injectedIbex ? 'en verde' : 'en rojo'}.` }
      } else if (oracle.type === 'BITCOIN' && injectedBtc !== null && !isNaN(injectedBtc)) {
        const numMatch = market.title.match(/\$?([\d.,]+)\s*[kK]?/)
        let thr = 100000
        if (numMatch) {
          const raw = parseFloat(numMatch[1].replace(/\./g, '').replace(',', '.'))
          thr = market.title.match(/\d+\s*[kK]\b/) ? raw * 1000 : raw
        }
        oracleResult = { outcome: injectedBtc > thr, source: `GitHub Actions / CoinGecko — Bitcoin: $${injectedBtc.toLocaleString('en-US')}. Umbral: $${thr.toLocaleString('en-US')}.`, value: injectedBtc }
      } else {
        oracleResult = await oracle.fn()
      }

      // If oracle still unavailable and market has been expired > 24h, refund
      if (!oracleResult) {
        const closedHoursAgo = (Date.now() - new Date(market.close_date).getTime()) / 3600000
        if (closedHoursAgo > 24) {
          try {
            await supabase.rpc('refund_market', { p_market_id: market.id })
            results.push({ id: market.id, title: market.title, status: 'REFUNDED', type: oracle.type, reason: 'Oracle unavailable after 24h' })
          } catch (e) {
            results.push({ id: market.id, title: market.title, status: 'ORACLE_UNAVAILABLE', type: oracle.type, closedHoursAgo: closedHoursAgo.toFixed(1) })
          }
        } else {
          results.push({ id: market.id, title: market.title, status: 'ORACLE_UNAVAILABLE', type: oracle.type })
        }
        continue
      }

      // ── SUPERVISED RESOLUTION: pause and notify admin instead of resolving immediately ──
      const pending = await createPendingResolution(market, oracleResult, oracle.type)
      results.push(pending
        ? { id: market.id, title: market.title, status: 'PENDING_CONFIRMATION', outcome: oracleResult.outcome, oracleType: oracle.type }
        : { id: market.id, title: market.title, status: 'ERROR', error: 'Failed to create pending resolution' }
      )
    }

    // Redistribute winnings in already-RESOLVED markets that still have OPEN trades
    const redistributed = []
    try {
      const { data: resolvedWithOpenTrades } = await supabase
        .from('markets')
        .select('id, title')
        .eq('status', 'RESOLVED')
        .not('resolved_outcome', 'is', null)
      for (const m of (resolvedWithOpenTrades || [])) {
        const { data: openTrades } = await supabase
          .from('trades')
          .select('id')
          .eq('market_id', m.id)
          .eq('status', 'OPEN')
          .limit(1)
        if (openTrades && openTrades.length > 0) {
          try {
            await supabase.rpc('distribute_winnings', { p_market_id: m.id })
            redistributed.push({ id: m.id, title: m.title, status: 'REDISTRIBUTED' })
          } catch (e) { console.error('Error redistributing:', m.id, e) }
        }
      }
    } catch (e) { console.error('Error en redistribución:', e) }

    const recurring = await createRecurringMarkets()
    let expiredOrders = 0
    try {
      const { data: expData } = await supabase.rpc('expire_limit_orders')
      expiredOrders = expData || 0
    } catch (e) { console.error('Error expiring limit orders:', e) }

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      resolved: results.filter(r => r.status === 'RESOLVED').length,
      pending_confirmation: results.filter(r => r.status === 'PENDING_CONFIRMATION').length,
      awaiting_confirmation: results.filter(r => r.status === 'AWAITING_CONFIRMATION').length,
      refunded: results.filter(r => r.status === 'REFUNDED').length,
      auto_approved_reviews: autoApproved.length,
      auto_expired: expired.length,
      pending: results.filter(r => !['RESOLVED', 'REFUNDED', 'PENDING_CONFIRMATION', 'AWAITING_CONFIRMATION'].includes(r.status)).length,
      redistributed: redistributed.length,
      details: results,
      expired_resolutions: expired,
      redistributed_details: redistributed,
      recurring,
      expired_orders: expiredOrders,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
