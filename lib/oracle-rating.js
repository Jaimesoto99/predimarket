// ─── Oracle Rating System ────────────────────────────────────────────────────
//
// Rates a market from 1–10 based on:
//   - Engagement (40%): news relevance, polarization, emotional connection
//   - Quality    (35%): objective resolution, timeframe, calibration
//   - Viral      (25%): simplicity, bar factor, category popularity, seasonality
//
// Usage:
//   import { rateMarket } from '@/lib/oracle-rating'
//   const result = rateMarket(market, trendingNews, { prices })

// ─── Stop words (shared with trending-spain) ─────────────────────────────────

const STOP_WORDS = new Set([
  'el','la','los','las','un','una','unos','unas','de','del','al','en','es','se',
  'que','por','con','para','como','más','este','esta','su','sus','pero','ya','muy',
  'si','ha','han','sin','sobre','hasta','desde','lo','le','les','entre','durante',
  'tras','ante','bajo','bien','ser','estar','hay','haber','también','puede','cuando',
  'donde','porque','aunque','antes','después','sobre','cómo','qué','cuál','dónde',
  'cuándo','quién','cuáles','cuanto','cuanta','solo','cada','otro','otra',
])

function extractKeywords(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w))
}

// ─── Score helpers ────────────────────────────────────────────────────────────

const POLARIZING_TERMS = [
  'eleccion','elecciones','huelga','inmigracion','inmigrant','derbi','inflacion',
  'vivienda','alquiler','pensiones','cataluna','independencia','pobreza',
  'corrupcion','juicio','manifestacion','protesta','referendum','crisis',
  'sancion','deuda','desahucio','violencia','ataque','escandalo','condena',
  'represalia','cierre','quiebra','despido','erte',
]

function getPolarizationScore(normalizedText) {
  const matches = POLARIZING_TERMS.filter(t => normalizedText.includes(t)).length
  return Math.min(10, Math.round(matches * 2.5 + 2))
}

function getEmotionalConnectionScore(normalizedText, category) {
  // Personal finance: highest daily-life impact
  const financeTerms = ['hipoteca','gasolina','alquiler','salario','sueldo','euribor',
    'ipc','inflacion','supermercado','factura','pension','subsidio','vivienda','luz','precio']
  if (financeTerms.some(t => normalizedText.includes(t))) return 10

  // Sports: very high engagement
  const sportsTerms = ['madrid','barcelona','barça','barca','futbol','liga','champions',
    'partido','atletico','sevilla','formula','tenis','baloncesto','ciclismo']
  if (category === 'DEPORTES' || sportsTerms.some(t => normalizedText.includes(t))) return 9

  // Employment
  const employmentTerms = ['empleo','desempleo','trabajo','sepe','paro','erte',
    'trabajador','laboral','sindicato','despido']
  if (employmentTerms.some(t => normalizedText.includes(t))) return 8

  // Politics
  if (category === 'POLITICA') return 7
  const politicsTerms = ['congreso','gobierno','sanchez','feijoo','presidente',
    'ministro','partido','eleccion','psoe','podemos','sumar','vox']
  if (politicsTerms.some(t => normalizedText.includes(t))) return 7

  // Energy — hits people's bills
  if (category === 'ENERGIA') return 7

  // Crypto: speculative interest
  if (category === 'CRIPTO') return 6

  // International / macro
  const intlTerms = ['eeuu','trump','biden','rusia','china','ucrania','reserva federal']
  if (intlTerms.some(t => normalizedText.includes(t))) return 4

  return 3
}

function getObjectiveResolutionScore(resolutionSource) {
  if (!resolutionSource) return 3
  const official = [
    'ine.es','boe.es','sepe.es','ree.es','aemet.es','bce.eu','apidatos.ree',
    'opendata.aemet','football-data','coingecko','yahoo finance','idealista',
    'geoportalgasolineras','renfe','aena','banco de espana','banco de españa',
  ]
  const s = resolutionSource.toLowerCase()
  if (official.some(o => s.includes(o))) return 10
  return 8
}

function getTimeframeScore(closeDateStr) {
  if (!closeDateStr) return 5
  const days = (new Date(closeDateStr) - Date.now()) / (1000 * 60 * 60 * 24)
  if (days < 0)  return 1
  if (days <= 1) return 7
  if (days <= 7) return 10
  if (days <= 14) return 6
  return 3
}

function getCalibrationScore(deviation) {
  if (deviation == null) return 7  // non-threshold market, neutral
  const abs = Math.abs(parseFloat(deviation))
  if (abs <= 3)  return 10
  if (abs <= 5)  return 8
  if (abs <= 10) return 5
  return 2
}

function getSimplicityScore(title) {
  const words = title.replace(/[¿?!¡]/g, '').trim().split(/\s+/).length
  if (words <= 7)  return 10
  if (words <= 10) return 8
  if (words <= 14) return 6
  if (words <= 18) return 4
  return 2
}

const BAR_TERMS = [
  'real madrid','barcelona','barça','barca','temperatura','record','récord',
  'victoria','derrota','crisis','drama','historico','histórico','maximo','máximo',
  'minimo','mínimo','quiebra','gol','campeon','campeón','titulo','título',
  'huelga','escandalo','escándalo','récord','caida','subida','maximos',
]

function getBarFactorScore(normalizedText, category) {
  const matches = BAR_TERMS.filter(t => normalizedText.includes(t)).length
  if (matches >= 2) return 10
  if (matches === 1) return 8
  const catFallback = {
    DEPORTES: 9, SOCIEDAD: 7, POLITICA: 7, ECONOMIA: 5,
    ENERGIA: 5, CRIPTO: 7, TECNOLOGIA: 5, MACRO: 3,
  }
  return catFallback[category] || 5
}

function getCategoryPopularityScore(category) {
  const scores = {
    DEPORTES: 10, SOCIEDAD: 9, POLITICA: 8, ECONOMIA: 7,
    ENERGIA: 7, CRIPTO: 7, TECNOLOGIA: 6, MACRO: 5, ACTUALIDAD: 6,
  }
  return scores[category] || 4
}

// ─── Threshold extraction (same logic as live-price.js) ──────────────────────

function extractThresholdFromTitle(title) {
  const m1 = title.match(/(?:encima\s+de|superar[áa]?\s+(?:los?\s+)?|supera\s+(?:los?\s+)?)([\d.,]+)/i)
  if (m1) return parseFloat(m1[1].replace(/\./g, '').replace(',', '.'))
  const m2 = title.match(/\$\s*([\d.,]+)/) || title.match(/([\d.,]+)\s*€/)
  if (m2) return parseFloat(m2[1].replace(/\./g, '').replace(',', '.'))
  return null
}

function detectAssetPrice(title, prices = {}) {
  const t = title.toLowerCase()
  if (t.includes('ibex'))                              return prices.ibex
  if (t.includes('bitcoin') || t.includes('btc'))      return prices.btc
  if (t.includes('brent'))                             return prices.brent
  if (t.includes('luz') || t.includes('pvpc') || t.includes('mwh')) return prices.luz
  return null
}

function computeCalibrationDeviation(market, prices = {}) {
  const threshold = extractThresholdFromTitle(market.title || '')
  if (!threshold) return null
  const currentPrice = detectAssetPrice(market.title, prices)
  if (!currentPrice) return null
  return ((threshold - currentPrice) / currentPrice * 100).toFixed(1)
}

// ─── Main rating function ─────────────────────────────────────────────────────

/**
 * Rate a market on a 1-10 scale.
 *
 * @param {object} market  - { title, description, category, close_date, resolution_source }
 * @param {Array}  trending - array of { title, source, keywords } from fetchTrendingNews()
 * @param {object} options  - optional { prices: { ibex, btc, brent, luz } }
 * @returns {{ score, breakdown, engagement, quality, viral, trending_matches, rated_at }}
 */
export function rateMarket(market, trending = [], options = {}) {
  const { prices = {} } = options

  const fullText       = ((market.title || '') + ' ' + (market.description || '')).toLowerCase()
  const normalizedText = fullText.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const marketKeywords = extractKeywords(market.title || '')
  const category       = market.category || 'OTHER'

  // ─── Engagement ──────────────────────────────────────────────────────────

  const matchingHeadlines = trending.filter(h =>
    Array.isArray(h.keywords) && h.keywords.some(k => marketKeywords.includes(k))
  )

  const NEWS_RELEVANCE       = Math.min(10, Math.round(matchingHeadlines.length * 2.5))
  const POLARIZATION         = getPolarizationScore(normalizedText)
  const EMOTIONAL_CONNECTION = getEmotionalConnectionScore(normalizedText, category)

  // ─── Quality ─────────────────────────────────────────────────────────────

  const OBJECTIVE_RESOLUTION = getObjectiveResolutionScore(market.resolution_source)
  const TIMEFRAME            = getTimeframeScore(market.close_date)

  // Calibration: use precomputed deviation or compute from prices
  const deviation  = computeCalibrationDeviation(market, prices)
  const CALIBRATION = getCalibrationScore(deviation)

  // ─── Viral ───────────────────────────────────────────────────────────────

  const SIMPLICITY          = getSimplicityScore(market.title || '')
  const BAR_FACTOR          = getBarFactorScore(normalizedText, category)
  const CATEGORY_POPULARITY = getCategoryPopularityScore(category)
  const SEASONALITY         = Math.min(10, Math.round(matchingHeadlines.length * 3))

  // ─── Aggregation ─────────────────────────────────────────────────────────

  const engagement = (NEWS_RELEVANCE + POLARIZATION + EMOTIONAL_CONNECTION) / 3
  const quality    = (OBJECTIVE_RESOLUTION + TIMEFRAME + CALIBRATION) / 3
  const viral      = (SIMPLICITY + BAR_FACTOR + CATEGORY_POPULARITY + SEASONALITY) / 4

  const raw   = engagement * 0.40 + quality * 0.35 + viral * 0.25
  const score = Math.round(raw * 10) / 10

  return {
    score,
    engagement:       Math.round(engagement * 10) / 10,
    quality:          Math.round(quality   * 10) / 10,
    viral:            Math.round(viral     * 10) / 10,
    breakdown: {
      NEWS_RELEVANCE,
      POLARIZATION,
      EMOTIONAL_CONNECTION,
      OBJECTIVE_RESOLUTION,
      TIMEFRAME,
      CALIBRATION,
      SIMPLICITY,
      BAR_FACTOR,
      CATEGORY_POPULARITY,
      SEASONALITY,
    },
    trending_matches: matchingHeadlines.slice(0, 3).map(h => ({
      title:  h.title,
      source: h.source,
    })),
    rated_at: new Date().toISOString(),
  }
}

// ─── Badge helper (used by email + admin panel) ───────────────────────────────

export function ratingBadge(score) {
  if (score >= 9)   return { color: '#b45309', bg: '#fef3c7', label: '🥇 Excelente' }
  if (score >= 7)   return { color: '#15803d', bg: '#dcfce7', label: '✅ Bueno' }
  if (score >= 4)   return { color: '#b45309', bg: '#fffbeb', label: '⚠️ Aceptable' }
  return              { color: '#dc2626', bg: '#fee2e2', label: '❌ Bajo' }
}
