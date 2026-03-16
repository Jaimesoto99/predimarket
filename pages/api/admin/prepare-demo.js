/**
 * /api/admin/prepare-demo?key=ADMIN_KEY
 *
 * Prepara la plataforma para demo regulatoria (CNMV):
 *  - Oculta mercados CRIPTO y meteorológicos triviales
 *  - Crea los 6 mercados financieros curados
 *
 * GET /api/admin/prepare-demo?key=...&mode=hide   → solo ocultar
 * GET /api/admin/prepare-demo?key=...&mode=create → solo crear
 * GET /api/admin/prepare-demo?key=...             → todo (hide + create)
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ─── Cálculo de fechas ────────────────────────────────────────────────────────

function endOfWeekISO() {
  const now = new Date()
  const friday = new Date(now)
  friday.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7 || 7))
  friday.setUTCHours(17, 35, 0, 0)
  return friday.toISOString()
}

function endOfTodayISO() {
  const d = new Date()
  d.setUTCHours(17, 35, 0, 0)
  if (d < new Date()) d.setDate(d.getDate() + 1) // if past 17:35, use tomorrow
  return d.toISOString()
}

function daysFromNowISO(days) {
  return new Date(Date.now() + days * 86400000).toISOString()
}

function hoursFromNow(h) {
  return Math.max(1, Math.round((new Date(endOfWeekISO()) - Date.now()) / 3600000))
}

// ─── 6 mercados regulatorios ──────────────────────────────────────────────────

function getRegulatoryMarkets() {
  const now = new Date()
  const endWeek = endOfWeekISO()
  const hoursWeek = Math.max(2, Math.round((new Date(endWeek) - now) / 3600000))
  const hoursDay  = Math.max(1, Math.round((new Date(endOfTodayISO()) - now) / 3600000))

  return [
    {
      title:       '¿Superará el IPC español el 3% en el dato de marzo del INE?',
      description: 'Se resuelve SÍ si el índice de precios al consumo (IPC) interanual de España publicado por el INE para marzo 2026 supera el 3,0%. Fuente: INE (ine.es/ipc). Publicación prevista: 14 de abril de 2026. Dato oficial y verificable.',
      category:    'ECONOMIA',
      type:        'MENSUAL',
      hours:       720,  // ~30 días hasta publicación INE
    },
    {
      title:       '¿Cerrará el Bono español a 10 años por encima del 3,5% esta semana?',
      description: 'Se resuelve SÍ si el rendimiento del Bono del Estado español a 10 años cierra por encima del 3,50% al cierre de la última sesión de esta semana (viernes 17:35h). Fuente: Banco de España / Bolsa de Madrid. Dato oficial verificable.',
      category:    'TIPOS',
      type:        'SEMANAL',
      hours:       hoursWeek,
    },
    {
      title:       '¿Subirá el BCE los tipos de interés en su próxima reunión?',
      description: 'Se resuelve SÍ si el Consejo de Gobierno del BCE decide subir el tipo de interés de referencia de la facilidad de depósito en su próxima reunión de política monetaria. Resolución el día de la comunicación oficial del BCE. Fuente: ecb.europa.eu.',
      category:    'TIPOS',
      type:        'MENSUAL',
      hours:       1080,  // ~45 días (próxima reunión BCE)
    },
    {
      title:       '¿Cerrará la prima de riesgo España-Alemania por encima de 80pb hoy?',
      description: 'Se resuelve SÍ si el diferencial entre el rendimiento del Bono español a 10 años y el Bund alemán a 10 años supera los 80 puntos básicos al cierre de la sesión de hoy (17:35h CET). Fuente: Investing.com / Banco de España.',
      category:    'TIPOS',
      type:        'DIARIO',
      hours:       hoursDay,
    },
    {
      title:       '¿Superará el precio del Brent los $85/barril esta semana?',
      description: 'Se resuelve SÍ si el precio del petróleo Brent (contrato de futuros ICE, BZ=F) supera 85,00 USD por barril en algún momento durante esta semana. Fuente: Yahoo Finance (finance.yahoo.com/quote/BZ=F). Dato de mercado verificable en tiempo real.',
      category:    'ENERGIA',
      type:        'SEMANAL',
      hours:       hoursWeek,
    },
    {
      title:       '¿Cerrará el IBEX 35 en positivo esta semana?',
      description: 'Se resuelve SÍ si el IBEX 35 acumula una variación positiva al cierre del viernes respecto al precio de apertura del lunes de esta semana. Fuente: Yahoo Finance (finance.yahoo.com/quote/%5EIBEX/). Dato oficial BME, resolución viernes 17:35h.',
      category:    'ECONOMIA',
      type:        'SEMANAL',
      hours:       hoursWeek,
    },
  ]
}

// ─── Ocultar mercados no aptos para demo regulatoria ─────────────────────────

async function hideRestrictedMarkets() {
  const hidden = []
  const errors = []

  const ops = [
    // Crypto por categoría
    { filter: q => q.in('category', ['CRIPTO', 'CRYPTO']),         label: 'CRIPTO (categoría)' },
    // Crypto por título
    { filter: q => q.ilike('title', '%bitcoin%'),                  label: 'Bitcoin' },
    { filter: q => q.ilike('title', '%ethereum%'),                 label: 'Ethereum' },
    { filter: q => q.ilike('title', '%btc%'),                      label: 'BTC (título)' },
    // Meteorológicos triviales
    { filter: q => q.ilike('title', '%temperatura%'),              label: 'Temperatura' },
    { filter: q => q.ilike('title', '%lluvia%'),                   label: 'Lluvia' },
    { filter: q => q.ilike('title', '%38°%'),                      label: 'Temperatura extrema' },
  ]

  for (const op of ops) {
    try {
      const { data, error } = await op.filter(
        supabase.from('markets').update({ status: 'HIDDEN' }).eq('status', 'ACTIVE')
      ).select('id, title')
      if (error) {
        errors.push({ label: op.label, error: error.message })
      } else if (data && data.length > 0) {
        hidden.push(...data.map(m => ({ ...m, reason: op.label })))
      }
    } catch (e) {
      errors.push({ label: op.label, error: e.message })
    }
  }

  return { hidden_count: hidden.length, hidden, errors }
}

// ─── Crear mercados regulatorios ──────────────────────────────────────────────

async function createRegulatoryMarkets() {
  const markets   = getRegulatoryMarkets()
  const created   = []
  const skipped   = []

  // Existing titles to avoid duplicates
  const { data: existing } = await supabase
    .from('markets')
    .select('title')
    .in('status', ['ACTIVE', 'CLOSED'])
  const existingTitles = (existing || []).map(m => m.title.toLowerCase())

  for (const m of markets) {
    // Simple duplicate check
    const isDuplicate = existingTitles.some(t =>
      t.includes(m.title.toLowerCase().slice(0, 30))
    )
    if (isDuplicate) {
      skipped.push({ title: m.title, reason: 'Ya existe un mercado similar' })
      continue
    }

    const { data, error } = await supabase.rpc('create_market', {
      p_title:          m.title,
      p_description:    m.description,
      p_category:       m.category,
      p_market_type:    m.type,
      p_duration_hours: m.hours,
      p_initial_pool:   5000,
    })

    if (error) {
      skipped.push({ title: m.title, reason: error.message })
    } else {
      created.push({ title: m.title, category: m.category, type: m.type, hours: m.hours })
      existingTitles.push(m.title.toLowerCase())
    }
  }

  return { created_count: created.length, created, skipped_count: skipped.length, skipped }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const key      = (req.query.key || req.headers['x-admin-key'] || '').trim()
  const expected = (process.env.ADMIN_API_KEY || '').trim()
  if (!expected || key !== expected) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  const mode = req.query.mode || 'all'
  const result = { mode, timestamp: new Date().toISOString() }

  if (mode === 'hide' || mode === 'all') {
    result.hide = await hideRestrictedMarkets()
  }

  if (mode === 'create' || mode === 'all') {
    result.create = await createRegulatoryMarkets()
  }

  return res.status(200).json(result)
}
