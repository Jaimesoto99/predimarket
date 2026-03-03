import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ============================================================
// GENERADOR DE MERCADOS — PrediMarket
// Llama a: /api/create-markets?mode=objective   → mercados curados 100% objetivos
//          /api/create-markets?mode=manual&title=...  → crear 1 mercado manual
//          /api/create-markets?mode=trending     → trending (desactivado, usa objective)
// ============================================================

// ─── Mercados objetivos curados ───────────────────────────────────────────
// Cada mercado tiene:
// - Fuente verificable concreta
// - Umbral numérico cuando aplica
// - Fecha de resolución clara
// - Resultado binario 100% objetivo (SÍ o NO)

function getObjectiveMarkets() {
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

  return [
    // ── ECONOMÍA ──────────────────────────────────────────────────────────
    {
      title: '¿El IBEX 35 supera los 13.000 puntos esta semana?',
      description: 'Se resuelve SÍ si el IBEX 35 cierra por encima de 13.000 puntos en alguna sesión de esta semana. Fuente: Yahoo Finance (finance.yahoo.com/quote/%5EIBEX/). Dato verificable tras las 17:35h de cada día hábil.',
      category: 'ECONOMIA', type: 'SEMANAL', hours: hoursToEndOfWeek,
    },
    {
      title: '¿El IBEX 35 cierra en verde esta semana?',
      description: 'Se resuelve SÍ si el IBEX 35 acumula una variación positiva al cierre del viernes respecto al lunes. Fuente: Yahoo Finance. Resolución: viernes 17:35h.',
      category: 'ECONOMIA', type: 'SEMANAL', hours: hoursToEndOfWeek,
    },
    {
      title: '¿El precio medio del PVPC supera 80 €/MWh esta semana?',
      description: 'Se resuelve SÍ si el precio medio del PVPC (Precio Voluntario para el Pequeño Consumidor) acumula una media superior a 80 €/MWh durante esta semana. Fuente: REE apidatos (apidatos.ree.es). Dato oficial.',
      category: 'ENERGIA', type: 'SEMANAL', hours: hoursToEndOfWeek,
    },
    {
      title: '¿El precio medio de la luz supera 60 €/MWh hoy?',
      description: 'Se resuelve SÍ si el precio medio del pool eléctrico diario supera 60 €/MWh hoy. Fuente: OMIE / REE (apidatos.ree.es). Dato oficial publicado diariamente.',
      category: 'ENERGIA', type: 'DIARIO', hours: 20,
    },
    {
      title: '¿Bitcoin supera los 100.000$ esta semana?',
      description: 'Se resuelve SÍ si el precio de Bitcoin (BTC) supera los 100.000 USD en algún momento durante esta semana. Fuente: CoinGecko API (api.coingecko.com). Dato de precio spot en tiempo real.',
      category: 'CRIPTO', type: 'SEMANAL', hours: hoursToEndOfWeek,
    },
    {
      title: '¿Bitcoin supera los 90.000$ esta semana?',
      description: 'Se resuelve SÍ si el precio de Bitcoin supera los 90.000 USD durante esta semana. Fuente: CoinGecko API. Umbral: $90.000.',
      category: 'CRIPTO', type: 'SEMANAL', hours: hoursToEndOfWeek,
    },
    {
      title: '¿El Euríbor 12M baja del 2,5% este mes?',
      description: 'Se resuelve SÍ si la tasa Euríbor a 12 meses publicada por el BCE cierra por debajo del 2,5% al final del mes en curso. Fuente: Banco de España / BCE. Dato oficial mensual.',
      category: 'ECONOMIA', type: 'MENSUAL', hours: hoursToEndOfMonth,
    },
    {
      title: '¿El IPC interanual de España supera el 3% este mes?',
      description: 'Se resuelve SÍ si el dato de IPC interanual publicado por el INE para el mes en curso supera el 3%. Fuente: INE (ine.es). Dato oficial mensual.',
      category: 'ECONOMIA', type: 'MENSUAL', hours: hoursToEndOfMonth,
    },
    {
      title: '¿El precio medio de vivienda en España sube en el informe Idealista de este mes?',
      description: 'Se resuelve SÍ si el informe mensual de precios de vivienda de Idealista muestra una variación positiva respecto al mes anterior. Fuente: Idealista Sala de Prensa (idealista.com/sala-de-prensa/informes-precio-vivienda/).',
      category: 'ECONOMIA', type: 'MENSUAL', hours: hoursToEndOfMonth,
    },

    // ── DEPORTES ──────────────────────────────────────────────────────────
    {
      title: '¿El Real Madrid gana su próximo partido oficial?',
      description: 'Se resuelve SÍ si el Real Madrid obtiene victoria (3 puntos) en su próximo partido oficial (Liga, Champions, Copa). Empate = NO. Fuente: football-data.org API.',
      category: 'DEPORTES', type: 'SEMANAL', hours: hoursToNextMonday,
    },
    {
      title: '¿El FC Barcelona gana su próximo partido oficial?',
      description: 'Se resuelve SÍ si el FC Barcelona obtiene victoria en su próximo partido oficial. Empate = NO. Fuente: football-data.org API.',
      category: 'DEPORTES', type: 'SEMANAL', hours: hoursToNextMonday,
    },

    // ── POLÍTICA (hechos verificables, no opiniones) ──────────────────────
    {
      title: '¿El Congreso aprueba algún proyecto de ley esta semana?',
      description: 'Se resuelve SÍ si el Boletín Oficial del Estado (BOE) publica la aprobación de algún proyecto de ley o real decreto-ley durante esta semana. Fuente: BOE (boe.es). Dato verificable y binario.',
      category: 'POLITICA', type: 'SEMANAL', hours: hoursToEndOfWeek,
    },

    // ── ENERGÍA ───────────────────────────────────────────────────────────
    {
      title: '¿El Brent supera los 85$ por barril esta semana?',
      description: 'Se resuelve SÍ si el precio del petróleo Brent supera los 85 USD/barril en algún momento durante esta semana. Fuente: Yahoo Finance (BZ=F). Dato de mercado verificable.',
      category: 'ENERGIA', type: 'SEMANAL', hours: hoursToEndOfWeek,
    },
  ]
}

// ─── Deduplicación por título ─────────────────────────────────────────────
function titlesAreSimilar(a, b) {
  const normalize = s => s.toLowerCase().replace(/[^a-záéíóúüñ0-9]/gi, ' ').replace(/\s+/g, ' ').trim()
  const wordsA = normalize(a).split(' ').filter(w => w.length > 3)
  const wordsB = normalize(b)
  const matchCount = wordsA.filter(w => wordsB.includes(w)).length
  return matchCount >= Math.min(4, Math.floor(wordsA.length * 0.5))
}

// ─── Crear mercados objetivos curados ────────────────────────────────────
async function createObjectiveMarkets() {
  const markets = getObjectiveMarkets()

  // Obtener mercados existentes activos/cerrados para evitar duplicados
  const { data: existing } = await supabase
    .from('markets')
    .select('title')
    .in('status', ['ACTIVE', 'CLOSED'])
  const existingTitles = (existing || []).map(m => m.title)

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
      p_initial_pool: 5000
    })

    if (!error) {
      created.push({ title: m.title, category: m.category, type: m.type, hours: Math.round(m.hours) })
      existingTitles.push(m.title)
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

  // Check duplicate
  const { data: existing } = await supabase
    .from('markets')
    .select('title')
    .in('status', ['ACTIVE', 'CLOSED'])
  const existingTitles = (existing || []).map(m => m.title)
  const isDuplicate = existingTitles.some(et => titlesAreSimilar(title, et))
  if (isDuplicate) return { error: 'Ya existe un mercado similar activo' }

  const { data, error } = await supabase.rpc('create_market', {
    p_title: title,
    p_description: description || 'Mercado con resolución verificable por fuente pública oficial.',
    p_category: category || 'ACTUALIDAD',
    p_market_type: type || 'SEMANAL',
    p_duration_hours: parseInt(hours) || 168,
    p_initial_pool: parseInt(pool) || 5000
  })

  if (error) return { error: error.message }
  return { success: true, data }
}

// ─── Handler principal ────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Auth
  const authKey = req.headers['x-admin-key'] || req.query.key
  if (authKey !== process.env.ADMIN_API_KEY && authKey !== process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20)) {
    return res.status(401).json({ error: 'No autorizado. Añade ?key=TU_KEY o header x-admin-key' })
  }

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
    const markets = getObjectiveMarkets()
    return res.status(200).json({ mode: 'preview', markets, count: markets.length })
  }

  return res.status(400).json({ error: 'Modo no válido. Usa: objective, manual, preview' })
}
