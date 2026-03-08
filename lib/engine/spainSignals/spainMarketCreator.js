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
      description:   'Se resuelve SÍ si se convoca un proceso electoral general antes de la fecha indicada. Fuente: BOE / Congreso.',
      duration_type: 'MONTHLY',
      initial_prob:  [20, 45],
      keywords:      ['elecciones', 'anticipadas', 'convocatoria'],
    },
    {
      id:            'SPAIN_LAW_PASS',
      question:      '¿Aprobará el Congreso {TOPIC} antes de {DATE}?',
      description:   'Se resuelve SÍ si el Congreso de los Diputados aprueba definitivamente la medida indicada. Fuente: Congreso / BOE.',
      duration_type: 'MONTHLY',
      initial_prob:  [25, 55],
      keywords:      ['congreso', 'ley', 'aprueba'],
    },
    {
      id:            'SPAIN_PM_CONFIDENCE',
      question:      '¿Superará Sánchez la próxima votación de confianza?',
      description:   'Se resuelve SÍ si el presidente supera la moción de confianza o presupuestos en el Congreso. Fuente: Congreso.',
      duration_type: 'WEEKLY',
      initial_prob:  [40, 65],
      keywords:      ['sanchez', 'confianza', 'mocion'],
    },
  ],

  ECONOMIA_ES: [
    {
      id:            'SPAIN_IBEX_WEEKLY',
      question:      '¿Cerrará el IBEX 35 en verde esta semana?',
      description:   'Se resuelve SÍ si el IBEX 35 acumula una variación positiva al cierre del viernes. Fuente: Yahoo Finance.',
      duration_type: 'WEEKLY',
      initial_prob:  [40, 60],
      keywords:      ['ibex', 'bolsa', 'semana'],
    },
    {
      id:            'SPAIN_LIGHT_PRICE',
      question:      '¿Superará el precio de la luz los {THRESHOLD} €/MWh esta semana?',
      description:   'Se resuelve SÍ si el precio medio del pool eléctrico peninsular supera el umbral esta semana. Fuente: REE / OMIE.',
      duration_type: 'WEEKLY',
      initial_prob:  [30, 70],
      keywords:      ['luz', 'precio', 'mwh'],
    },
    {
      id:            'SPAIN_IPC',
      question:      '¿Superará la inflación en España el {THRESHOLD}% este mes?',
      description:   'Se resuelve SÍ según el dato de IPC publicado por el INE. Fuente oficial.',
      duration_type: 'MONTHLY',
      initial_prob:  [30, 60],
      keywords:      ['ipc', 'inflacion', 'ine'],
    },
    {
      id:            'SPAIN_EURIBOR',
      question:      '¿Bajará el Euríbor por debajo del {THRESHOLD}% este trimestre?',
      description:   'Se resuelve SÍ si el Euríbor 12M publicado por el Banco de España cae por debajo del umbral. Fuente: BCE.',
      duration_type: 'MONTHLY',
      initial_prob:  [35, 65],
      keywords:      ['euribor', 'baja', 'banco'],
    },
  ],

  // DEPORTE_ES — only tournament/season/national team outcomes.
  // Individual match results are blocked by R0_REGULATORY (CNMV).
  DEPORTE_ES: [
    {
      id:            'SPAIN_LALIGA_WINNER',
      question:      '¿Ganará {TEAM} La Liga esta temporada?',
      description:   'Se resuelve SÍ si el equipo indicado gana el título de La Liga al final de la temporada. Fuente: La Liga.',
      duration_type: 'MONTHLY',
      initial_prob:  [20, 60],
      keywords:      ['liga', 'campeon', 'temporada'],
    },
    {
      id:            'SPAIN_SELECCION_TOURNAMENT',
      question:      '¿Llegará la Selección Española a semifinales del torneo en curso?',
      description:   'Se resuelve SÍ si la Selección Española de fútbol alcanza las semifinales del torneo oficial en disputa (Eurocopa, Nations League o Mundial). Fuente: UEFA / FIFA.',
      duration_type: 'MONTHLY',
      initial_prob:  [30, 65],
      keywords:      ['seleccion', 'semifinal', 'torneo'],
    },
    {
      id:            'SPAIN_ALCARAZ_GRAND_SLAM',
      question:      '¿Ganará Alcaraz algún Grand Slam en {YEAR}?',
      description:   'Se resuelve SÍ si Carlos Alcaraz gana alguno de los cuatro torneos Grand Slam durante el año indicado. Fuente: ATP.',
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
      description:   'Se resuelve SÍ si el representante español gana el festival de Eurovisión. Fuente: EBU / RTVE.',
      duration_type: 'MONTHLY',
      initial_prob:  [5, 20],
      keywords:      ['eurovision', 'espana', 'gana'],
    },
    {
      id:            'SPAIN_EUROVISION_TOP5',
      question:      '¿Quedará España entre los 5 primeros en Eurovisión {YEAR}?',
      description:   'Se resuelve SÍ si el representante español finaliza entre los 5 primeros puestos en el festival de Eurovisión. Fuente: EBU.',
      duration_type: 'MONTHLY',
      initial_prob:  [15, 35],
      keywords:      ['eurovision', 'top5', 'final'],
    },
    {
      id:            'SPAIN_GOYA',
      question:      '¿Ganará una película española el Goya a Mejor Película este año?',
      description:   'Se resuelve SÍ si la película ganadora del Goya a Mejor Película es de producción española. Fuente: Academia de Cine de España.',
      duration_type: 'MONTHLY',
      initial_prob:  [60, 85],
      keywords:      ['goya', 'pelicula', 'academia'],
    },
    {
      id:            'SPAIN_MUSIC_CHART',
      question:      '¿Tendrá un artista español una canción en el top 10 global de Spotify esta semana?',
      description:   'Se resuelve SÍ si al menos un artista español aparece en el top 10 del chart global de Spotify en algún día de esta semana. Fuente: Spotify Charts.',
      duration_type: 'WEEKLY',
      initial_prob:  [30, 55],
      keywords:      ['spotify', 'artista', 'chart'],
    },
  ],

  LA_PLAZA: [
    {
      id:            'SPAIN_STRIKE',
      question:      '¿Habrá huelga general en España antes de {DATE}?',
      description:   'Se resuelve SÍ si se convoca y celebra una huelga general en España antes de la fecha indicada. Fuente: Medios nacionales.',
      duration_type: 'MONTHLY',
      initial_prob:  [10, 30],
      keywords:      ['huelga', 'general', 'convocada'],
    },
    {
      id:            'SPAIN_WEATHER_EXTREME',
      question:      '¿Superarán las temperaturas los {THRESHOLD}°C en España esta semana?',
      description:   'Se resuelve SÍ si la AEMET registra temperaturas superiores al umbral en alguna estación meteorológica española. Fuente: AEMET.',
      duration_type: 'WEEKLY',
      initial_prob:  [30, 60],
      keywords:      ['temperatura', 'calor', 'aemet'],
    },
    {
      id:            'SPAIN_VIRAL',
      question:      '¿Seguirá siendo {TOPIC} tendencia en España esta semana?',
      description:   'Se resuelve SÍ si el tema permanece entre los 10 primeros en Google Trends España durante 3 días seguidos. Fuente: Google Trends.',
      duration_type: 'WEEKLY',
      initial_prob:  [40, 65],
      keywords:      ['tendencia', 'viral', 'trending'],
    },
  ],
}

// ─── Build a market candidate from a template + article ──────────────────

function buildCandidate(template, article, spainCategory) {
  const now  = new Date()
  const resolution = SPAIN_RESOLUTION_SOURCES[spainCategory] || SPAIN_RESOLUTION_SOURCES.LA_PLAZA

  // Duration in hours
  const DURATION = {
    WEEKLY:  7  * 24,
    MONTHLY: 30 * 24,
    FLASH:   6,
    DAILY:   24,
  }
  const duration_hours = DURATION[template.duration_type] || 168

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

  return {
    question,
    description:     template.description.replace('{THRESHOLD}', '80').replace('{TEAM}', subject),
    category:        spainCategory === 'DEPORTE_ES' ? 'DEPORTES'
                   : spainCategory === 'POLITICA_ES' ? 'POLITICA'
                   : spainCategory === 'ECONOMIA_ES' ? 'ECONOMIA'
                   : spainCategory === 'CULTURA_ES'  ? 'CULTURA'
                   : 'ACTUALIDAD',
    spain_category:  spainCategory,
    super_category:  'SPAIN',
    oracle_type:     'SPAIN_ORACLE',
    resolution_source: resolution.source,
    resolution_method: resolution.method,
    duration_hours,
    initial_prob,
    template_id:     template.id,
    source_article:  article.link || null,
    relevance_score: Math.min(1, (article.credibility || 0.7) * 0.8 + 0.2),
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
    // Tag with Spain metadata
    await supabase.from('markets').update({
      spain_category: candidate.spain_category,
      super_category: 'SPAIN',
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
