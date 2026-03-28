import { createClient } from '@supabase/supabase-js'
import { sendEmail }            from '../../lib/email/sendEmail'
import { buildMarketReviewEmail } from '../../lib/email/reviewTemplate'
import { rateMarket }            from '../../lib/oracle-rating'
import { fetchTrendingNews }     from './admin/trending-spain'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'jaime@forsii.com'

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://forsii.com').replace(/\/$/, '')
}

async function sendReviewEmail(market, rating) {
  try {
    const siteUrl     = getSiteUrl()
    const token       = market.review_token
    const approveUrl  = `${siteUrl}/api/admin/approve-market?token=${token}`
    const withdrawUrl = `${siteUrl}/api/admin/withdraw-market?token=${token}`
    const adminKey    = process.env.ADMIN_API_KEY || ''
    const adminUrl    = `${siteUrl}/admin?key=${adminKey}&market_id=${market.id}`

    const yesPool     = parseFloat(market.yes_pool) || 5000
    const noPool      = parseFloat(market.no_pool)  || 5000
    const probability = yesPool / (yesPool + noPool)

    const result = await sendEmail({
      to:      ADMIN_EMAIL,
      subject: rating
        ? `🆕 [${rating.score}/10] Nuevo mercado pendiente — ${market.title}`
        : `🆕 Nuevo mercado pendiente de revisión — ${market.title}`,
      html:    buildMarketReviewEmail({
        market: {
          id:                market.id,
          title:             market.title,
          description:       market.description || '',
          category:          market.category || '',
          close_date:        market.close_date || null,
          resolution_source: market.resolution_source || null,
        },
        probability,
        approveUrl,
        withdrawUrl,
        adminMarketUrl: adminUrl,
        rating,
      }),
    })

    if (result.success) {
      console.log(`[create-markets] Review email sent for market ${market.id}, resend_id: ${result.id}`)
    } else {
      console.error(`[create-markets] Review email FAILED for market ${market.id}:`, result.error)
    }
    return result
  } catch (err) {
    console.error('[create-markets] sendReviewEmail error:', err.message)
    return { success: false, error: err.message }
  }
}

// ============================================================
// GENERADOR DE MERCADOS — Forsii
// Llama a: /api/create-markets?mode=objective   → mercados curados 100% objetivos
//          /api/create-markets?mode=manual&title=...  → crear 1 mercado manual
//          /api/create-markets?mode=trending     → trending (desactivado, usa objective)
// ============================================================

// ─── Obtener precios actuales para umbrales calibrados ───────────────────
async function fetchCurrentPrices() {
  const prices = { ibex: null, btc: null, brent: null, luz: null }
  try {
    const r = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EIBEX?interval=1d&range=1d', { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const d = await r.json()
    prices.ibex = d?.chart?.result?.[0]?.meta?.regularMarketPrice
  } catch (e) { console.error('IBEX fetch error:', e.message) }
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const d = await r.json()
    prices.btc = d?.bitcoin?.usd
  } catch (e) { console.error('BTC fetch error:', e.message) }
  try {
    const r = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/BZ%3DF?interval=1d&range=1d', { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const d = await r.json()
    prices.brent = d?.chart?.result?.[0]?.meta?.regularMarketPrice
  } catch (e) { console.error('Brent fetch error:', e.message) }
  try {
    const r = await fetch('https://api.preciodelaluz.org/v1/prices/avg?zone=PCB', { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } })
    if (r.ok) {
      const d = await r.json()
      if (d?.price != null) prices.luz = d.price
    }
  } catch (e) { console.error('LUZ fetch error:', e.message) }
  return prices
}

// ─── Mercados objetivos curados ───────────────────────────────────────────
// Cada mercado tiene:
// - Fuente verificable concreta
// - Umbral numérico calibrado con precio actual ±1-2%
// - Fecha de resolución clara
// - Resultado binario 100% objetivo (SÍ o NO)

function getObjectiveMarkets(prices = {}) {
  const now = new Date()
  const nextMonday = new Date(now)
  nextMonday.setDate(now.getDate() + (8 - now.getDay()) % 7 || 7)
  nextMonday.setUTCHours(18, 0, 0, 0)

  const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 18, 0, 0))
  const endOfWeek = new Date(now)
  endOfWeek.setDate(now.getDate() + (5 - now.getDay() + 7) % 7 || 5)
  endOfWeek.setUTCHours(17, 35, 0, 0)

  const hoursToEndOfWeek = Math.max(2, Math.ceil((endOfWeek - now) / 3600000))
  const hoursToEndOfMonth = Math.max(24, Math.ceil((endOfMonth - now) / 3600000))
  const hoursToNextMonday = Math.max(24, Math.ceil((nextMonday - now) / 3600000))

  // Umbrales dinámicos calibrados en ±3-5% del precio actual
  // Probabilidad implícita objetivo: 35-65% (umbral cercano al precio actual)
  const ibexThreshold = prices.ibex
    ? Math.round(prices.ibex * 1.015 / 25) * 25   // +1.5%, múltiplo de 25
    : null
  const btcThreshold = prices.btc
    ? Math.round(prices.btc * 1.02 / 250) * 250   // +2%, múltiplo de $250
    : null
  const brentThreshold = prices.brent
    ? Math.round(prices.brent * 1.015 * 4) / 4    // +1.5%, $0.25 precision
    : null
  // Luz: +3% of current price, rounded to nearest €1
  const luzThresholdDaily  = prices.luz
    ? Math.round(prices.luz * 1.03)                // +3% para mercado diario
    : null
  const luzThresholdWeekly = prices.luz
    ? Math.round(prices.luz * 1.02)                // +2% para media semanal
    : null

  // Gate: skip market if threshold is >10% above or below current price (too one-sided)
  function isWellCalibrated(threshold, current) {
    if (!threshold || !current) return true // no live price, allow through
    const ratio = threshold / current
    return ratio >= 0.92 && ratio <= 1.10
  }

  const markets = []

  // ── ECONOMÍA ──────────────────────────────────────────────────────────
  markets.push({
    title: '¿El IBEX 35 cierra en verde esta semana?',
    description: 'Se resuelve SÍ si el IBEX 35 acumula una variación positiva al cierre del viernes respecto al lunes. Fuente: Yahoo Finance. Resolución: viernes 17:35h.',
    category: 'ECONOMIA', type: 'SEMANAL', hours: hoursToEndOfWeek,
  })

  if (ibexThreshold && isWellCalibrated(ibexThreshold, prices.ibex)) {
    const ibexRounded = ibexThreshold.toLocaleString('es-ES')
    const ibexCurrent = Math.round(prices.ibex).toLocaleString('es-ES')
    markets.push({
      title: `¿El IBEX 35 supera los ${ibexRounded} puntos esta semana?`,
      description: `Se resuelve SÍ si el IBEX 35 cierra por encima de ${ibexRounded} puntos en alguna sesión de esta semana. Cotización actual: ~${ibexCurrent}. Umbral calibrado a +1.5% del precio actual. Fuente: Yahoo Finance (finance.yahoo.com/quote/%5EIBEX/). Dato verificable tras las 17:35h de cada día hábil.`,
      category: 'ECONOMIA', type: 'SEMANAL', hours: hoursToEndOfWeek,
    })
  }

  // Luz markets: use live price if available, otherwise fall back to fixed values
  const luzDaily   = luzThresholdDaily   ?? 90
  const luzWeekly  = luzThresholdWeekly  ?? 88
  const luzCurrent = prices.luz ? `Precio actual: ~${Math.round(prices.luz)} €/MWh. ` : ''
  if (isWellCalibrated(luzWeekly, prices.luz)) {
    markets.push({
      title: `¿El precio medio del PVPC supera ${luzWeekly} €/MWh esta semana?`,
      description: `Se resuelve SÍ si el precio medio del PVPC acumula una media superior a ${luzWeekly} €/MWh esta semana. ${luzCurrent}Umbral calibrado a +2% del precio actual. Fuente: REE apidatos (apidatos.ree.es). Dato oficial.`,
      category: 'ENERGIA', type: 'SEMANAL', hours: hoursToEndOfWeek,
    })
  }
  if (isWellCalibrated(luzDaily, prices.luz)) {
    markets.push({
      title: `¿El precio medio de la luz supera ${luzDaily} €/MWh hoy?`,
      description: `Se resuelve SÍ si el precio medio del pool eléctrico diario supera ${luzDaily} €/MWh hoy. ${luzCurrent}Umbral calibrado a +3% del precio actual. Fuente: OMIE / REE (apidatos.ree.es). Dato oficial publicado diariamente.`,
      category: 'ENERGIA', type: 'DIARIO', hours: 20,
    })
  }

  // ── CRIPTO ────────────────────────────────────────────────────────────
  if (btcThreshold && isWellCalibrated(btcThreshold, prices.btc)) {
    const btcRounded = btcThreshold.toLocaleString('es-ES')
    const btcCurrent = Math.round(prices.btc).toLocaleString('es-ES')
    markets.push({
      title: `¿Bitcoin supera los ${btcRounded}$ esta semana?`,
      description: `Se resuelve SÍ si el precio de Bitcoin (BTC) supera ${btcRounded} USD en algún momento durante esta semana. Precio actual: ~$${btcCurrent}. Umbral calibrado a +2% del precio actual. Fuente: CoinGecko API (api.coingecko.com). Precio spot en tiempo real.`,
      category: 'CRIPTO', type: 'SEMANAL', hours: hoursToEndOfWeek,
    })
  } else {
    // Fallback sin precio en vivo
    markets.push({
      title: '¿Bitcoin sube más de un 3% esta semana?',
      description: 'Se resuelve SÍ si el precio de Bitcoin (BTC/USD) sube más de un 3% de lunes a viernes. Fuente: CoinGecko API. Dato spot público.',
      category: 'CRIPTO', type: 'SEMANAL', hours: hoursToEndOfWeek,
    })
  }

  // ── ECONOMÍA (mensuales) ───────────────────────────────────────────────
  markets.push(
    {
      title: '¿El Euríbor 12M baja del 2,40% este mes?',
      description: 'Se resuelve SÍ si la tasa Euríbor a 12 meses publicada por el BCE cierra por debajo del 2,40% al final del mes en curso. Tasa actual: ~2,41%. Fuente: Banco de España / BCE. Dato oficial mensual.',
      category: 'ECONOMIA', type: 'MENSUAL', hours: hoursToEndOfMonth,
    },
    {
      title: '¿El IPC interanual de España supera el 3% este mes?',
      description: 'Se resuelve SÍ si el dato de IPC interanual publicado por el INE para el mes en curso supera el 3%. Último dato conocido: 2,8%. Fuente: INE (ine.es). Dato oficial mensual.',
      category: 'ECONOMIA', type: 'MENSUAL', hours: hoursToEndOfMonth,
    },
    {
      title: '¿El precio medio de vivienda en España sube en el informe Idealista de este mes?',
      description: 'Se resuelve SÍ si el informe mensual de precios de vivienda de Idealista muestra una variación positiva respecto al mes anterior. Fuente: Idealista Sala de Prensa (idealista.com/sala-de-prensa/informes-precio-vivienda/).',
      category: 'ECONOMIA', type: 'MENSUAL', hours: hoursToEndOfMonth,
    }
  )

  // ── DEPORTES ──────────────────────────────────────────────────────────
  markets.push(
    {
      title: '¿El Real Madrid gana su próximo partido oficial?',
      description: 'Se resuelve SÍ si el Real Madrid obtiene victoria (3 puntos) en su próximo partido oficial (Liga, Champions, Copa). Empate = NO. Fuente: football-data.org API.',
      category: 'DEPORTES', type: 'SEMANAL', hours: hoursToNextMonday,
    },
    {
      title: '¿El FC Barcelona gana su próximo partido oficial?',
      description: 'Se resuelve SÍ si el FC Barcelona obtiene victoria en su próximo partido oficial. Empate = NO. Fuente: football-data.org API.',
      category: 'DEPORTES', type: 'SEMANAL', hours: hoursToNextMonday,
    }
  )

  // ── POLÍTICA ──────────────────────────────────────────────────────────
  markets.push({
    title: '¿El Congreso aprueba algún proyecto de ley esta semana?',
    description: 'Se resuelve SÍ si el Boletín Oficial del Estado (BOE) publica la aprobación de algún proyecto de ley o real decreto-ley durante esta semana. Fuente: BOE (boe.es). Dato verificable y binario.',
    category: 'POLITICA', type: 'SEMANAL', hours: hoursToEndOfWeek,
  })

  // ── SOCIEDAD ──────────────────────────────────────────────────────────
  markets.push(
    {
      title: '¿La gasolina 95 supera los 1,60 €/L esta semana?',
      description: 'Se resuelve SÍ si el precio medio nacional de la gasolina 95 sin plomo supera 1,60 €/litro en algún día de esta semana. Fuente: Geoportal Gasolineras del Ministerio para la Transición Ecológica (geoportalgasolineras.es). Dato oficial diario.',
      category: 'SOCIEDAD', type: 'SEMANAL', hours: hoursToEndOfWeek,
    },
    {
      title: '¿El paro registrado baja en el último dato mensual del SEPE?',
      description: 'Se resuelve SÍ si el informe mensual de paro registrado del SEPE muestra una variación negativa respecto al mes anterior. Fuente: SEPE (sepe.es) — datos mensuales de empleo. Resolución al publicarse el informe del mes en curso.',
      category: 'SOCIEDAD', type: 'MENSUAL', hours: hoursToEndOfMonth,
    },
    {
      title: '¿Se registra temperatura superior a 38°C en alguna capital española esta semana?',
      description: 'Se resuelve SÍ si AEMET registra una temperatura máxima superior a 38°C en alguna capital de provincia española durante esta semana. Fuente: AEMET Open Data (opendata.aemet.es). Dato oficial verificable.',
      category: 'SOCIEDAD', type: 'SEMANAL', hours: hoursToEndOfWeek,
    }
  )

  // ── TRANSPORTE ────────────────────────────────────────────────────────
  markets.push(
    {
      title: '¿Renfe reporta más de 50 trenes con retraso superior a 15 minutos esta semana?',
      description: 'Se resuelve SÍ si el informe semanal de puntualidad de Renfe indica más de 50 servicios con retraso superior a 15 minutos durante esta semana. Fuente: Renfe — estadísticas de puntualidad (renfe.com/es/es/cercanias/informacion/puntualidad.html).',
      category: 'SOCIEDAD', type: 'SEMANAL', hours: hoursToEndOfWeek,
    },
    {
      title: '¿AENA registra más de 200 vuelos cancelados esta semana?',
      description: 'Se resuelve SÍ si el sistema de seguimiento de vuelos de AENA registra más de 200 vuelos cancelados en aeropuertos españoles durante esta semana. Fuente: AENA estadísticas de operaciones (estadisticas.aena.es). Dato público.',
      category: 'SOCIEDAD', type: 'SEMANAL', hours: hoursToEndOfWeek,
    }
  )

  // ── ENERGÍA (Brent) — only create if live price available and well-calibrated ──
  if (brentThreshold && isWellCalibrated(brentThreshold, prices.brent)) {
    const brentCurrent = prices.brent.toFixed(2)
    markets.push({
      title: `¿El Brent supera los ${brentThreshold}$ por barril esta semana?`,
      description: `Se resuelve SÍ si el precio del petróleo Brent supera ${brentThreshold} USD/barril en algún momento durante esta semana. Precio actual: ~$${brentCurrent}. Umbral calibrado a +1.5% del precio actual. Fuente: Yahoo Finance (BZ=F). Dato de mercado verificable.`,
      category: 'ENERGIA', type: 'SEMANAL', hours: hoursToEndOfWeek,
    })
  }

  return markets
}

// ─── Deduplicación por título ─────────────────────────────────────────────
function titlesAreSimilar(a, b) {
  const normalize = s => s.toLowerCase().replace(/[^a-záéíóúüñ0-9]/gi, ' ').replace(/\s+/g, ' ').trim()
  // If either title contains a significant number (>100) that differs between titles → NOT a duplicate
  // This allows new weekly markets with updated thresholds (BTC 68.500 vs 73.000, IBEX 17.100 vs 17.250)
  const parseNums = s => (s.match(/[\d.,]+/g) || [])
    .map(n => parseFloat(n.replace(/\./g, '').replace(',', '.')))
    .filter(n => n > 100)
  const numsA = parseNums(a), numsB = parseNums(b)
  if (numsA.length > 0 && numsB.length > 0) {
    const allMatch = numsA.every(na => numsB.some(nb => Math.abs(na - nb) / Math.max(na, nb) < 0.02))
    if (!allMatch) return false
  }
  const wordsA = normalize(a).split(' ').filter(w => w.length > 3)
  const wordsB = normalize(b)
  const matchCount = wordsA.filter(w => wordsB.includes(w)).length
  return matchCount >= Math.min(4, Math.floor(wordsA.length * 0.5))
}

// ─── Crear mercados objetivos curados ────────────────────────────────────
async function createObjectiveMarkets() {
  const [prices, trendingNews] = await Promise.all([
    fetchCurrentPrices(),
    fetchTrendingNews().catch(() => []),
  ])
  const markets = getObjectiveMarkets(prices)

  // Deduplicate against: all ACTIVE markets + CLOSED markets from the last 36 hours.
  // Using 36h (not 7 days) so weekly markets can be recreated next cycle after closing.
  const recentCutoff = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()
  const { data: existingActive } = await supabase
    .from('markets')
    .select('title')
    .eq('status', 'ACTIVE')
  const { data: existingRecentClosed } = await supabase
    .from('markets')
    .select('title')
    .eq('status', 'CLOSED')
    .gte('close_date', recentCutoff)
  const existingTitles = [
    ...(existingActive || []),
    ...(existingRecentClosed || []),
  ].map(m => m.title)

  const created = []
  const skipped = []

  for (const m of markets) {
    // Check duplicate
    const isDuplicate = existingTitles.some(et => titlesAreSimilar(m.title, et))
    if (isDuplicate) {
      skipped.push({ title: m.title, reason: 'Mercado similar ya existe' })
      continue
    }

    if (m.hours < 1) {
      skipped.push({ title: m.title, reason: 'Tiempo hasta cierre < 1h' })
      continue
    }

    const { data, error } = await supabase.rpc('create_market', {
      p_title: m.title,
      p_description: m.description,
      p_category: m.category,
      p_market_type: m.type,
      p_duration_hours: Math.round(m.hours),
      p_initial_pool: 10000
    })

    if (!error) {
      created.push({ title: m.title, category: m.category, type: m.type, hours: Math.round(m.hours) })
      existingTitles.push(m.title)

      // Fetch the created market to get its review_token and send review email
      const { data: newMarket } = await supabase
        .from('markets')
        .select('id, title, description, category, close_date, review_token, yes_pool, no_pool, resolution_source')
        .eq('title', m.title)
        .eq('status', 'ACTIVE')
        .order('open_date', { ascending: false })
        .limit(1)
        .single()

      if (newMarket) {
        // Rate the market
        const rating = rateMarket(newMarket, trendingNews, { prices })

        // Store rating in DB
        await supabase
          .from('markets')
          .update({ market_rating: rating })
          .eq('id', newMarket.id)

        // Auto-reject if score is too low
        if (rating.score < 4.0) {
          await supabase
            .from('markets')
            .update({ review_status: 'rejected', status: 'HIDDEN' })
            .eq('id', newMarket.id)
          console.log(`[create-markets] Auto-rejected market #${newMarket.id} (score ${rating.score}): ${newMarket.title}`)
          skipped.push({ title: m.title, reason: `Auto-rechazado: puntuación ${rating.score}/10 < 4.0` })
          continue
        }

        await sendReviewEmail(newMarket, rating)
      }
    } else {
      console.error('Error creating market:', m.title, error.message)
      skipped.push({ title: m.title, reason: error.message })
    }
  }

  return { created: created.length, markets: created, skipped: skipped.length, skipped_detail: skipped }
}

// ─── Crear mercado manual ────────────────────────────────────────────────
async function createManualMarket(params) {
  const { title, description, category, type, hours, pool } = params

  if (!title) return { error: 'Falta título' }

  // Check duplicate against active markets only (manual markets can re-create resolved ones)
  const { data: existing } = await supabase
    .from('markets')
    .select('title')
    .eq('status', 'ACTIVE')
  const existingTitles = (existing || []).map(m => m.title)
  const isDuplicate = existingTitles.some(et => titlesAreSimilar(title, et))
  if (isDuplicate) return { error: 'Ya existe un mercado similar activo' }

  const { data, error } = await supabase.rpc('create_market', {
    p_title: title,
    p_description: description || 'Mercado con resolución verificable por fuente pública oficial.',
    p_category: category || 'ACTUALIDAD',
    p_market_type: type || 'SEMANAL',
    p_duration_hours: parseInt(hours) || 168,
    p_initial_pool: parseInt(pool) || 10000
  })

  if (error) return { error: error.message }

  // Fetch created market and send review email
  const marketId = data?.market_id || data?.id
  if (marketId) {
    const { data: newMarket } = await supabase
      .from('markets')
      .select('id, title, description, category, close_date, review_token, yes_pool, no_pool, resolution_source')
      .eq('id', marketId)
      .single()

    if (newMarket) {
      const trendingNews = await fetchTrendingNews().catch(() => [])
      const rating       = rateMarket(newMarket, trendingNews)

      await supabase
        .from('markets')
        .update({ market_rating: rating })
        .eq('id', newMarket.id)

      const emailResult = await sendReviewEmail(newMarket, rating)
      return { success: true, data, email: emailResult, rating: { score: rating.score } }
    }
  }

  return { success: true, data }
}

// ─── Handler principal ────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Auth
  const key = (req.query.key || req.headers["x-admin-key"] || "").trim()
  const expected = (process.env.ADMIN_API_KEY || "").trim()
  if (!expected || key !== expected) return res.status(401).json({ error: "No autorizado" })

  const mode = req.query.mode || 'objective'

  // Modo objetivo: mercados curados 100% verificables
  if (mode === 'objective' || mode === 'trending') {
    const result = await createObjectiveMarkets()
    return res.status(200).json({ mode: 'objective', ...result })
  }

  // Modo manual: crear 1 mercado específico
  if (mode === 'manual') {
    const result = await createManualMarket({
      title: req.query.title || req.body?.title,
      description: req.query.description || req.body?.description,
      category: req.query.category || req.body?.category,
      type: req.query.type || req.body?.type,
      hours: req.query.hours || req.body?.hours,
      pool: req.query.pool || req.body?.pool,
    })
    return res.status(result.error ? 400 : 200).json({ mode: 'manual', ...result })
  }

  // Ver qué mercados se crearían (sin crearlos)
  if (mode === 'preview') {
    const prices = await fetchCurrentPrices()
    const markets = getObjectiveMarkets(prices)
    return res.status(200).json({ mode: 'preview', markets, count: markets.length, prices })
  }

  return res.status(400).json({ error: 'Modo no válido. Usa: objective, manual, preview' })
}
