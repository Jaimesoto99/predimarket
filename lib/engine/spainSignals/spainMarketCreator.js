// ============================================================
// Spain Market Creator — generates Spain-specific prediction markets
//
// Templates cover all Spain event types with natural Spanish questions.
// Each candidate is validated for deduplication before DB insertion.
//
// All Spain markets include:
//   super_category = 'SPAIN'
//   spain_category = POLITICA_ES | ECONOMIA_ES | DEPORTE_ES | CULTURA_ES | LA_PLAZA
// ============================================================

import { createClient }             from '@supabase/supabase-js'
import { SPAIN_RESOLUTION_SOURCES } from './spainEventDetector'
import { checkRegulatory, logBlocked } from '../regulatoryFilter'
import { MIN_LIQUIDITY_POOL, DEFAULT_INITIAL_PROBABILITY, clampProbability } from '../../amm'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Market templates by Spain event type ────────────────────────────────

const SPAIN_TEMPLATES = {

  POLITICA_ES: [
    {
      id:            'SPAIN_ELECTION',
      question:      '¿Habrá elecciones generales anticipadas en España antes de {DATE}?',
      description:   'Se resuelve SÍ si el BOE publica la convocatoria de elecciones generales antes de la fecha indicada. Fuente: BOE / Congreso de los Diputados. Resolución: consulta BOE el día de cierre.',
      duration_type: 'MEDIUM',
      initial_prob:  [20, 45],
      keywords:      ['elecciones', 'anticipadas', 'convocatoria'],
    },
    {
      id:            'SPAIN_LAW_PASS',
      question:      '¿Publicará el BOE alguna nueva ley o real decreto-ley esta semana?',
      description:   'Se resuelve SÍ si el Boletín Oficial del Estado publica al menos una ley o real decreto-ley durante esta semana. Fuente: boe.es — RSS oficial. Resolución: viernes 23:59h.',
      duration_type: 'MEDIUM',
      initial_prob:  [55, 80],
      keywords:      ['boe', 'ley', 'decreto'],
    },
    {
      id:            'SPAIN_PM_CONFIDENCE',
      question:      '¿Aprobará el Congreso los Presupuestos Generales del Estado en las próximas 48 horas?',
      description:   'Se resuelve SÍ si el Congreso de los Diputados aprueba en votación los PGE en las próximas 48 horas. Fuente: Congreso.es. Resolución: 48 horas desde apertura.',
      duration_type: 'SHORT',
      initial_prob:  [20, 45],
      keywords:      ['congreso', 'presupuestos', 'aprueba'],
    },
  ],

  ECONOMIA_ES: [
    {
      id:            'SPAIN_IBEX_DAILY',
      question:      '¿Cerrará el IBEX 35 en positivo hoy?',
      description:   'Se resuelve SÍ si el IBEX 35 cierra con variación positiva respecto a la apertura de hoy. Fuente: Yahoo Finance / Bolsa de Madrid. Resolución: cierre bursátil a las 17:35h.',
      duration_type: 'DAILY',
      initial_prob:  [40, 60],
      keywords:      ['ibex', 'bolsa', 'hoy'],
    },
    {
      id:            'SPAIN_LIGHT_PRICE',
      question:      '¿Superará el precio medio de la luz los {THRESHOLD} €/MWh hoy?',
      description:   'Se resuelve SÍ si el precio medio del pool eléctrico diario supera {THRESHOLD} €/MWh hoy. Fuente: OMIE / Red Eléctrica de España. Resolución: dato publicado antes de las 21:00h.',
      duration_type: 'DAILY',
      initial_prob:  [30, 70],
      keywords:      ['luz', 'precio', 'mwh'],
    },
    {
      id:            'SPAIN_IPC',
      question:      '¿Publicará el INE un dato de IPC superior al {THRESHOLD}% esta semana?',
      description:   'Se resuelve SÍ si el INE publica un dato de IPC anual superior a {THRESHOLD}% en la publicación de esta semana. Fuente: ine.es. Resolución: día de publicación del INE.',
      duration_type: 'MEDIUM',
      initial_prob:  [30, 60],
      keywords:      ['ipc', 'ine', 'inflacion'],
    },
    {
      id:            'SPAIN_EURIBOR',
      question:      '¿Cerrará el Euríbor por debajo del {THRESHOLD}% hoy?',
      description:   'Se resuelve SÍ si el Euríbor 12M publicado por el Banco de España cierra por debajo de {THRESHOLD}% hoy. Fuente: Banco de España. Resolución: publicación diaria del Banco de España.',
      duration_type: 'DAILY',
      initial_prob:  [35, 65],
      keywords:      ['euribor', 'banco', 'diario'],
    },
  ],

  // DEPORTE_ES — only tournament/season/national team outcomes.
  // Individual match results are blocked by R0_REGULATORY (CNMV).
  DEPORTE_ES: [
    {
      id:            'SPAIN_LALIGA_WINNER',
      question:      '¿Ganará {TEAM} La Liga esta temporada?',
      description:   'Se resuelve SÍ si el equipo indicado es proclamado campeón de La Liga al término de la temporada regular. Fuente: La Liga (laliga.es). Resolución: día de publicación del resultado oficial.',
      duration_type: 'MONTHLY',
      initial_prob:  [20, 60],
      keywords:      ['liga', 'campeon', 'temporada'],
    },
    {
      id:            'SPAIN_SELECCION_TOURNAMENT',
      question:      '¿Llegará la Selección Española a semifinales del torneo en curso?',
      description:   'Se resuelve SÍ si la Selección Española de fútbol alcanza las semifinales del torneo oficial en disputa (Eurocopa, Nations League o Mundial). Fuente: UEFA / FIFA. Resolución: tras el último partido de cuartos.',
      duration_type: 'MEDIUM',
      initial_prob:  [30, 65],
      keywords:      ['seleccion', 'semifinal', 'torneo'],
    },
    {
      id:            'SPAIN_ALCARAZ_GRAND_SLAM',
      question:      '¿Ganará Alcaraz algún Grand Slam en {YEAR}?',
      description:   'Se resuelve SÍ si Carlos Alcaraz gana alguno de los cuatro torneos Grand Slam durante el año indicado. Fuente: ATP (atptour.com). Resolución: tras la final del último Grand Slam del año.',
      duration_type: 'MONTHLY',
      initial_prob:  [35, 65],
      keywords:      ['alcaraz', 'grand slam', 'campeon'],
    },
  ],

  // CULTURA_ES — cultural mainstream events only.
  // Bullfighting is blocked by R0_REGULATORY (CNMV).
  CULTURA_ES: [
    {
      id:            'SPAIN_EUROVISION',
      question:      '¿Ganará España Eurovisión {YEAR}?',
      description:   'Se resuelve SÍ si el representante español obtiene la puntuación más alta en la gran final de Eurovisión. Fuente: EBU / RTVE. Resolución: noche de la gran final.',
      duration_type: 'MEDIUM',
      initial_prob:  [5, 20],
      keywords:      ['eurovision', 'espana', 'gana'],
    },
    {
      id:            'SPAIN_EUROVISION_TOP5',
      question:      '¿Quedará España entre los 5 primeros en Eurovisión {YEAR}?',
      description:   'Se resuelve SÍ si el representante español finaliza en los puestos 1 a 5 en la gran final de Eurovisión. Fuente: EBU. Resolución: noche de la gran final, resultado oficial EBU.',
      duration_type: 'MEDIUM',
      initial_prob:  [15, 35],
      keywords:      ['eurovision', 'top5', 'final'],
    },
    {
      id:            'SPAIN_GOYA',
      question:      '¿Ganará una película española el Goya a Mejor Película este año?',
      description:   'Se resuelve SÍ si la película ganadora del Goya a Mejor Película es de producción española o coproducción mayoritariamente española. Fuente: Academia de Cine de España. Resolución: noche de la ceremonia.',
      duration_type: 'MEDIUM',
      initial_prob:  [60, 85],
      keywords:      ['goya', 'pelicula', 'academia'],
    },
    {
      id:            'SPAIN_MUSIC_CHART',
      question:      '¿Tendrá un artista español una canción en el top 10 de Spotify España hoy?',
      description:   'Se resuelve SÍ si al menos un artista español aparece en el top 10 del chart diario de Spotify España hoy. Fuente: Spotify Charts (charts.spotify.com). Resolución: datos del día a las 23:59h.',
      duration_type: 'DAILY',
      initial_prob:  [40, 70],
      keywords:      ['spotify', 'artista', 'chart'],
    },
  ],

  LA_PLAZA: [
    {
      id:            'SPAIN_STRIKE',
      question:      '¿Se celebrará alguna huelga sectorial convocada en España esta semana?',
      description:   'Se resuelve SÍ si se celebra efectivamente alguna huelga sectorial o general previamente convocada en España durante esta semana. Fuente: medios nacionales verificados (EFE, Reuters España). Resolución: viernes 23:59h.',
      duration_type: 'MEDIUM',
      initial_prob:  [40, 70],
      keywords:      ['huelga', 'convocada', 'sectorial'],
    },
    {
      id:            'SPAIN_WEATHER_EXTREME',
      question:      '¿Emitirá AEMET una alerta naranja o roja por temperatura en España hoy?',
      description:   'Se resuelve SÍ si la Agencia Estatal de Meteorología (AEMET) emite alerta de nivel naranja o rojo por calor, frío o fenómenos adversos en alguna provincia española hoy. Fuente: aemet.es. Resolución: boletín AEMET del día a las 21:00h.',
      duration_type: 'DAILY',
      initial_prob:  [20, 50],
      keywords:      ['aemet', 'alerta', 'temperatura'],
    },
    {
      id:            'SPAIN_VIRAL',
      question:      '¿Estará {TOPIC} entre los 10 temas más buscados en Google España hoy?',
      description:   'Se resuelve SÍ si el tema figura entre los 10 primeros en Google Trends España al cierre del día. Fuente: Google Trends (trends.google.es/trending?geo=ES). Resolución: datos a las 23:59h.',
      duration_type: 'DAILY',
      initial_prob:  [35, 60],
      keywords:      ['tendencia', 'google', 'trending'],
    },
  ],
}

// ─── Build a market candidate from a template + article ──────────────────

// ─── Duration constants ───────────────────────────────────────────────────
// 70% of markets must resolve within ≤48h (ULTRA_FAST / FAST / DAILY / SHORT).
// Only long-horizon events (season champions, annual indicators) use MEDIUM.

export const MARKET_DURATIONS = {
  ULTRA_FAST: 6,    // 6 hours  — intraday price signals, live trending topics
  FAST:       12,   // 12 hours — same-day economic data, early election results
  DAILY:      24,   // 24 hours — DEFAULT: daily economic indicators, news events
  SHORT:      48,   // 48 hours — two-day events, regulatory announcements
  MEDIUM:     120,  // 5 days   — weekly macro indicators, cultural events
  // Longer durations (MONTHLY, SEASON) only used for tournament/season outcomes
  MONTHLY:    720,  // 30 days  — tournament champions, monthly macro data
}

function buildCandidate(template, article, spainCategory) {
  const now  = new Date()
  const resolution = SPAIN_RESOLUTION_SOURCES[spainCategory] || SPAIN_RESOLUTION_SOURCES.LA_PLAZA

  // Map template duration_type → hours using standardised constants
  const DURATION_MAP = {
    ULTRA_FAST: MARKET_DURATIONS.ULTRA_FAST,
    FAST:       MARKET_DURATIONS.FAST,
    DAILY:      MARKET_DURATIONS.DAILY,
    SHORT:      MARKET_DURATIONS.SHORT,
    MEDIUM:     MARKET_DURATIONS.MEDIUM,
    WEEKLY:     MARKET_DURATIONS.MEDIUM,   // legacy alias → 5 days
    MONTHLY:    MARKET_DURATIONS.MONTHLY,
    FLASH:      MARKET_DURATIONS.ULTRA_FAST,
    EVENT:      MARKET_DURATIONS.DAILY,    // default events to 24h
  }
  const duration_hours = DURATION_MAP[template.duration_type] ?? MARKET_DURATIONS.DAILY

  // Simple question fill — use article title keywords as subjects
  const subject = (article.title || '').slice(0, 50)
  const year    = now.getFullYear()
  const dateStr = new Date(now.getTime() + duration_hours * 3600000)
    .toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })

  const question = template.question
    .replace('{TOPIC}',     subject)
    .replace('{TEAM}',      subject)
    .replace('{ARTIST}',    subject)
    .replace('{FILM}',      subject)
    .replace('{TORERO}',    subject)
    .replace('{PLAZA}',     'Las Ventas')
    .replace('{THRESHOLD}', '80')
    .replace('{DATE}',      dateStr)
    .replace('{YEAR}',      year)

  const [pLow, pHigh] = template.initial_prob
  const initial_prob  = (pLow + pHigh) / 2

  const resolveAt = new Date(now.getTime() + duration_hours * 3600000)

  // Derive initial_probability from template range, clamped and normalised to [0,1]
  const initProb = clampProbability(initial_prob / 100)

  return {
    question,
    description:         template.description.replace('{THRESHOLD}', '80').replace('{TEAM}', subject),
    category:            spainCategory === 'DEPORTE_ES' ? 'DEPORTES'
                       : spainCategory === 'POLITICA_ES' ? 'POLITICA'
                       : spainCategory === 'ECONOMIA_ES' ? 'ECONOMIA'
                       : spainCategory === 'CULTURA_ES'  ? 'CULTURA'
                       : 'ACTUALIDAD',
    spain_category:      spainCategory,
    super_category:      'SPAIN',
    oracle_type:         'SPAIN_ORACLE',
    resolution_source:   resolution.source,
    resolution_method:   resolution.method,
    resolution_time:     resolveAt.toISOString(),
    duration_hours,
    initial_prob,
    // Phase 5 — liquidity fields
    initial_probability: initProb,
    current_probability: initProb,
    liquidity_pool:      MIN_LIQUIDITY_POOL,
    template_id:         template.id,
    source_article:      article.link || null,
    relevance_score:     Math.min(1, (article.credibility || 0.7) * 0.8 + 0.2),
  }
}

// ─── Deduplication check ─────────────────────────────────────────────────

async function isDuplicate(supabase, question) {
  const { data } = await supabase
    .from('markets')
    .select('id')
    .ilike('title', `%${question.slice(10, 40)}%`)   // match core fragment
    .in('status', ['ACTIVE', 'CLOSING'])
    .limit(1)

  return (data?.length || 0) > 0
}

// ─── Create a single Spain market via existing RPC ────────────────────────

async function createSpainMarket(supabase, candidate) {
  // R0 — Regulatory compliance (CNMV sandbox)
  const regulatory = checkRegulatory(candidate.question, {
    category:       candidate.category,
    spainEventType: candidate.spain_category,
  })
  if (regulatory.blocked) {
    logBlocked(candidate.question, regulatory)
    return { success: false, skipped: true, reason: `regulatory:${regulatory.reason}` }
  }

  // Dedup check
  const dup = await isDuplicate(supabase, candidate.question)
  if (dup) return { success: false, skipped: true, reason: 'duplicate' }

  const { data, error } = await supabase.rpc('create_market', {
    p_title:          candidate.question,
    p_description:    candidate.description,
    p_category:       candidate.category,
    p_market_type:    candidate.duration_hours <= 24 ? 'DIARIO' : candidate.duration_hours <= 168 ? 'SEMANAL' : 'MENSUAL',
    p_duration_hours: Math.round(candidate.duration_hours),
    p_initial_pool:   5000,
  })

  if (error) return { success: false, error: error.message }

  const marketId = data?.market_id || data?.id

  if (marketId) {
    // Tag with Spain metadata + liquidity fields
    await supabase.from('markets').update({
      spain_category:      candidate.spain_category,
      super_category:      'SPAIN',
      initial_probability: candidate.initial_probability,
      current_probability: candidate.current_probability,
      liquidity_pool:      candidate.liquidity_pool,
    }).eq('id', marketId).catch(() => {})
  }

  console.log('[spainMarketCreator] created:', candidate.question.slice(0, 70))

  return { success: true, marketId, question: candidate.question, spainCategory: candidate.spain_category }
}

// ─── Main: generate Spain markets from classified articles ────────────────

export async function createSpainMarkets(classifiedArticles, maxPerRun = 3) {
  const supabase = getSupabase()

  if (!classifiedArticles?.length) return { created: 0, skipped: 0 }

  const created = []
  const skipped = []
  let attempts  = 0

  for (const article of classifiedArticles) {
    if (created.length >= maxPerRun) break

    // Pre-screen the source article title for regulatory compliance before building
    const articleScreen = checkRegulatory(article.title || '', { category: article.category })
    if (articleScreen.blocked) {
      logBlocked(article.title, articleScreen)
      skipped.push(article.title)
      continue
    }

    const templates = SPAIN_TEMPLATES[article.spain_event_type] || []
    if (!templates.length) continue

    // Pick template with best keyword match
    const template = templates[Math.floor(Math.random() * Math.min(2, templates.length))]

    const candidate = buildCandidate(template, article, article.spain_event_type)
    const result    = await createSpainMarket(supabase, candidate)

    attempts++

    if (result.success) created.push(result)
    else if (result.skipped) skipped.push(candidate.question)
  }

  return { created: created.length, skipped: skipped.length, attempts, details: created }
}
