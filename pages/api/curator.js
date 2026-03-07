import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const MINIMUM_MARKETS = 15

// ─── Market templates by category ─────────────────────────────────────────
function getTemplates() {
  const now = new Date()

  const d = (days) => {
    const dt = new Date(now)
    dt.setDate(dt.getDate() + days)
    dt.setUTCHours(18, 0, 0, 0)
    return Math.max(2, Math.ceil((dt - now) / 3600000))
  }

  const endOfWeek = (() => {
    const dt = new Date(now)
    const diff = (5 - dt.getDay() + 7) % 7 || 7
    dt.setDate(dt.getDate() + diff)
    dt.setUTCHours(17, 35, 0, 0)
    return Math.max(4, Math.ceil((dt - now) / 3600000))
  })()

  const endOfMonth = (() => {
    const dt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 18, 0, 0))
    return Math.max(24, Math.ceil((dt - now) / 3600000))
  })()

  return [
    // ── ECONOMIA ──────────────────────────────────────────────────────
    {
      title: 'Cerrara el IBEX 35 en verde esta semana?',
      description: 'Se resuelve SI si el IBEX 35 acumula variacion positiva al cierre del viernes respecto al lunes. Fuente: Yahoo Finance. Resolucion: viernes 17:35h.',
      category: 'ECONOMIA', type: 'SEMANAL', hours: endOfWeek,
    },
    {
      title: 'El Euribor 12M cerrara por debajo del 2.3% este mes?',
      description: 'Se resuelve SI si la tasa Euribor a 12 meses publicada por el BCE cierra por debajo del 2.3% al final del mes en curso. Fuente: BCE.',
      category: 'ECONOMIA', type: 'MENSUAL', hours: endOfMonth,
    },
    {
      title: 'El IPC interanual de Espana supera el 3% este mes?',
      description: 'Se resuelve SI si el dato de IPC interanual publicado por el INE para el mes en curso supera el 3%. Fuente: INE.',
      category: 'ECONOMIA', type: 'MENSUAL', hours: endOfMonth,
    },
    {
      title: 'El precio medio de vivienda en Espana subira en el informe Idealista de este mes?',
      description: 'Se resuelve SI si el informe mensual de Idealista muestra variacion positiva respecto al mes anterior. Fuente: Idealista.',
      category: 'ECONOMIA', type: 'MENSUAL', hours: endOfMonth,
    },
    {
      title: 'El S&P 500 cerrara esta semana por encima del nivel del lunes?',
      description: 'Se resuelve SI si el indice S&P 500 cierra el viernes por encima de su valor del lunes. Fuente: Yahoo Finance.',
      category: 'ECONOMIA', type: 'SEMANAL', hours: endOfWeek,
    },
    {
      title: 'La tasa de paro en Espana bajara en la proxima EPA?',
      description: 'Se resuelve SI si la EPA del INE muestra una tasa de paro inferior a la del trimestre anterior. Fuente: INE.',
      category: 'ECONOMIA', type: 'MENSUAL', hours: endOfMonth,
    },

    // ── CRIPTO ────────────────────────────────────────────────────────
    {
      title: 'Bitcoin subira mas de un 5% esta semana?',
      description: 'Se resuelve SI si el precio de BTC/USD sube mas de un 5% de lunes a viernes. Fuente: CoinGecko API.',
      category: 'CRIPTO', type: 'SEMANAL', hours: endOfWeek,
    },
    {
      title: 'Ethereum supera los 3.500 dolares esta semana?',
      description: 'Se resuelve SI si ETH/USD supera 3.500$ en alguna sesion de esta semana. Fuente: CoinGecko.',
      category: 'CRIPTO', type: 'SEMANAL', hours: endOfWeek,
    },
    {
      title: 'Bitcoin alcanzara los 100.000 dolares antes de julio de 2026?',
      description: 'Se resuelve SI si el precio de Bitcoin (BTC/USD) supera 100.000$ en algun momento antes del 1 de julio de 2026. Fuente: CoinGecko.',
      category: 'CRIPTO', type: 'MENSUAL', hours: d(60),
    },
    {
      title: 'La dominancia de Bitcoin superara el 55% esta semana?',
      description: 'Se resuelve SI si la dominancia de Bitcoin sobre el mercado cripto total supera el 55% segun CoinGecko.',
      category: 'CRIPTO', type: 'SEMANAL', hours: endOfWeek,
    },

    // ── ENERGIA ───────────────────────────────────────────────────────
    {
      title: 'El precio medio del PVPC superara 80 euros/MWh esta semana?',
      description: 'Se resuelve SI si el precio medio del PVPC acumula una media superior a 80 EUR/MWh esta semana. Fuente: REE apidatos.',
      category: 'ENERGIA', type: 'SEMANAL', hours: endOfWeek,
    },
    {
      title: 'El Brent subira mas de un 3% esta semana?',
      description: 'Se resuelve SI si el precio del petroleo Brent sube mas de un 3% de lunes a viernes. Fuente: Yahoo Finance (BZ=F).',
      category: 'ENERGIA', type: 'SEMANAL', hours: endOfWeek,
    },
    {
      title: 'El precio de la luz superara 100 euros/MWh algun dia esta semana?',
      description: 'Se resuelve SI si el precio horario del mercado electrico supera 100 EUR/MWh en algun momento esta semana. Fuente: OMIE.',
      category: 'ENERGIA', type: 'SEMANAL', hours: endOfWeek,
    },

    // ── DEPORTES ──────────────────────────────────────────────────────
    {
      title: 'El Real Madrid ganara su proximo partido oficial?',
      description: 'Se resuelve SI si el Real Madrid obtiene victoria en su proximo partido oficial (Liga, Champions, Copa). Empate = NO. Fuente: football-data.org.',
      category: 'DEPORTES', type: 'SEMANAL', hours: d(7),
    },
    {
      title: 'El FC Barcelona ganara su proximo partido oficial?',
      description: 'Se resuelve SI si el FC Barcelona obtiene victoria en su proximo partido oficial. Empate = NO. Fuente: football-data.org.',
      category: 'DEPORTES', type: 'SEMANAL', hours: d(7),
    },
    {
      title: 'El Atletico de Madrid ganara su proximo partido de LaLiga?',
      description: 'Se resuelve SI si el Atletico de Madrid consigue los 3 puntos en su siguiente partido de LaLiga. Empate = NO. Fuente: football-data.org.',
      category: 'DEPORTES', type: 'SEMANAL', hours: d(7),
    },
    {
      title: 'Habra algun resultado sorpresa (upsets) en Champions League esta semana?',
      description: 'Se resuelve SI si un equipo clasificado fuera de los puestos de cabeza elimina o derrota a un favorito claro. Fuente: UEFA.',
      category: 'DEPORTES', type: 'SEMANAL', hours: endOfWeek,
    },

    // ── POLITICA ──────────────────────────────────────────────────────
    {
      title: 'El Congreso aprobara algun proyecto de ley esta semana?',
      description: 'Se resuelve SI si el BOE publica la aprobacion de algun proyecto de ley o real decreto-ley esta semana. Fuente: BOE.',
      category: 'POLITICA', type: 'SEMANAL', hours: endOfWeek,
    },
    {
      title: 'El Gobierno espanol aprobara los Presupuestos Generales del Estado antes de julio?',
      description: 'Se resuelve SI si el Congreso aprueba los PGE antes del 1 de julio de 2026. Fuente: BOE / Congreso de los Diputados.',
      category: 'POLITICA', type: 'MENSUAL', hours: d(90),
    },
    {
      title: 'Habra elecciones generales anticipadas en Espana en 2026?',
      description: 'Se resuelve SI si se convocan elecciones generales anticipadas antes del 31 de diciembre de 2026. Fuente: BOE.',
      category: 'POLITICA', type: 'MENSUAL', hours: d(180),
    },

    // ── ACTUALIDAD ────────────────────────────────────────────────────
    {
      title: 'La Fed recortara tipos de interes en su proxima reunion de junio?',
      description: 'Se resuelve SI si la Reserva Federal reduce el tipo de los fondos federales en su reunion de junio de 2026. Fuente: Fed comunicado oficial.',
      category: 'ACTUALIDAD', type: 'MENSUAL', hours: d(90),
    },
    {
      title: 'El BCE bajara tipos en su proxima reunion?',
      description: 'Se resuelve SI si el Banco Central Europeo reduce sus tipos de referencia en su siguiente reunion de politica monetaria. Fuente: BCE.',
      category: 'ACTUALIDAD', type: 'MENSUAL', hours: d(45),
    },

    // ── GEOPOLITICA ───────────────────────────────────────────────────
    {
      title: 'Se firmara algun acuerdo de paz o armisticio en Ucrania antes de julio de 2026?',
      description: 'Se resuelve SI si se anuncia oficialmente un acuerdo de cese al fuego o paz entre Ucrania y Rusia antes del 1 de julio de 2026. Fuente: Reuters / AP.',
      category: 'GEOPOLITICA', type: 'MENSUAL', hours: d(90),
    },
    {
      title: 'Los aranceles de EEUU a la UE seguiran vigentes en julio de 2026?',
      description: 'Se resuelve SI si los aranceles especiales impuestos por EEUU a productos europeos siguen en vigor el 1 de julio de 2026. Fuente: Reuters / Bloomberg.',
      category: 'GEOPOLITICA', type: 'MENSUAL', hours: d(90),
    },

    // ── CLIMA ─────────────────────────────────────────────────────────
    {
      title: 'Se superaran los 35 grados en Madrid alguna vez esta semana?',
      description: 'Se resuelve SI si la temperatura maxima en Madrid supera 35 grados Celsius en algun dia de la semana actual. Fuente: AEMET / Open-Meteo.',
      category: 'CLIMA', type: 'SEMANAL', hours: endOfWeek,
    },

    // ── TECNOLOGIA ────────────────────────────────────────────────────
    {
      title: 'Nvidia supera resultados trimestrales esperados en su proximo earnings?',
      description: 'Se resuelve SI si Nvidia reporta beneficios por accion (EPS) superiores al consenso de analistas en su proximo informe trimestral. Fuente: Bloomberg / Reuters.',
      category: 'ACTUALIDAD', type: 'MENSUAL', hours: d(60),
    },
    {
      title: 'Apple anunciara un nuevo modelo de iPhone antes de octubre de 2026?',
      description: 'Se resuelve SI si Apple hace un anuncio oficial de un nuevo modelo de iPhone antes del 1 de octubre de 2026. Fuente: Apple newsroom.',
      category: 'ACTUALIDAD', type: 'MENSUAL', hours: d(180),
    },
  ]
}

// ─── Deduplication ────────────────────────────────────────────────────────
function titlesAreSimilar(a, b) {
  const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/gi, ' ').replace(/\s+/g, ' ').trim()
  const wordsA = normalize(a).split(' ').filter(w => w.length > 3)
  const wordsB = normalize(b)
  const matchCount = wordsA.filter(w => wordsB.includes(w)).length
  return matchCount >= Math.min(4, Math.floor(wordsA.length * 0.55))
}

// ─── Main curator logic ───────────────────────────────────────────────────
async function runCurator() {
  const now = new Date().toISOString()

  // Count active non-expired markets
  const { data: activeMarkets, error: countErr } = await supabase
    .from('markets')
    .select('id, title, category')
    .eq('status', 'ACTIVE')
    .gt('close_date', now)

  if (countErr) return { error: countErr.message }

  const activeCount = (activeMarkets || []).length

  if (activeCount >= MINIMUM_MARKETS) {
    return { status: 'ok', activeCount, needed: 0, created: 0 }
  }

  const needed = MINIMUM_MARKETS - activeCount

  // Get all existing market titles (active + closed) for dedup
  const { data: existingAll } = await supabase
    .from('markets')
    .select('title')
    .in('status', ['ACTIVE', 'CLOSED'])

  const existingTitles = (existingAll || []).map(m => m.title)
  const templates = getTemplates()

  // Shuffle templates for variety
  const shuffled = [...templates].sort(() => Math.random() - 0.5)

  const created = []
  const skipped = []

  for (const tmpl of shuffled) {
    if (created.length >= needed) break
    if (tmpl.hours < 2) { skipped.push({ title: tmpl.title, reason: 'hours < 2' }); continue }

    const isDup = existingTitles.some(et => titlesAreSimilar(tmpl.title, et))
    if (isDup) { skipped.push({ title: tmpl.title, reason: 'duplicate' }); continue }

    const { data, error } = await supabase.rpc('create_market', {
      p_title: tmpl.title,
      p_description: tmpl.description,
      p_category: tmpl.category,
      p_market_type: tmpl.type,
      p_duration_hours: Math.round(tmpl.hours),
      p_initial_pool: 5000,
    })

    if (!error) {
      created.push({ title: tmpl.title, category: tmpl.category })
      existingTitles.push(tmpl.title)
    } else {
      skipped.push({ title: tmpl.title, reason: error.message })
    }
  }

  return {
    status: 'filled',
    activeBefore: activeCount,
    activeAfter: activeCount + created.length,
    needed,
    created: created.length,
    createdMarkets: created,
    skipped: skipped.length,
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const key = (req.query.key || req.headers['x-admin-key'] || '').trim()
  const expected = (process.env.ADMIN_API_KEY || '').trim()
  if (!expected || key !== expected) return res.status(401).json({ error: 'No autorizado' })

  try {
    const result = await runCurator()
    return res.status(200).json(result)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
