// ============================================================
// Entity Extractor — keyword/regex-based entity recognition
// Optimized for Spanish financial, sports, political content
// Returns: Array<{ type, name, value?, confidence }>
// ============================================================

// ─── Entity definitions ───────────────────────────────────────────────────

const FINANCIAL_ENTITIES = [
  { name: 'IBEX_35',   type: 'INDEX',    patterns: [/ibex\s*35/i, /ibex/i, /bolsa española/i] },
  { name: 'SP500',     type: 'INDEX',    patterns: [/s&p\s*500/i, /s&p500/i, /s&p\s*5[0o0]/i] },
  { name: 'NASDAQ',    type: 'INDEX',    patterns: [/nasdaq/i] },
  { name: 'DAX',       type: 'INDEX',    patterns: [/\bdax\b/i] },
  { name: 'BITCOIN',   type: 'CRYPTO',   patterns: [/bitcoin/i, /\bbtc\b/i] },
  { name: 'ETHEREUM',  type: 'CRYPTO',   patterns: [/ethereum/i, /\beth\b/i] },
  { name: 'BRENT',     type: 'COMMODITY',patterns: [/brent/i, /petróleo brent/i, /petroleo brent/i] },
  { name: 'ORO',       type: 'COMMODITY',patterns: [/precio del oro/i, /onza de oro/i, /\boro\b.*precio/i] },
  { name: 'EURIBOR',   type: 'RATE',     patterns: [/eu[rí]ibor/i, /euribor/i] },
  { name: 'IPC_ES',    type: 'DATA',     patterns: [/\bipc\b.*españa/i, /inflación.*españa/i, /inflacion.*españa/i, /índice.*precios.*consumo/i] },
  { name: 'PIB_ES',    type: 'DATA',     patterns: [/\bpib\b.*españa/i, /producto interior bruto/i] },
  { name: 'LUZ_PVPC',  type: 'ENERGY',   patterns: [/pvpc/i, /precio.*luz/i, /tarifa.*luz/i, /precio.*electricidad/i, /pool.*eléctrico/i, /mwh/i] },
  { name: 'EURUSD',    type: 'FOREX',    patterns: [/euro.*dólar/i, /eur\/usd/i, /eurusd/i] },
]

const SPORTS_ENTITIES = [
  { name: 'REAL_MADRID',   type: 'TEAM', patterns: [/real madrid/i] },
  { name: 'FC_BARCELONA',  type: 'TEAM', patterns: [/f\.?c\.?\s*barcelona/i, /\bbarça\b/i, /\bbarca\b/i] },
  { name: 'ATLETICO',      type: 'TEAM', patterns: [/atlético de madrid/i, /atletico de madrid/i, /\batleti\b/i] },
  { name: 'SEVILLA_FC',    type: 'TEAM', patterns: [/sevilla f\.?c/i, /\bsevilla\b.*fútbol/i] },
  { name: 'CHAMPIONS',     type: 'COMPETITION', patterns: [/champions league/i, /liga de campeones/i] },
  { name: 'LALIGA',        type: 'COMPETITION', patterns: [/la liga/i, /laliga/i, /liga española/i] },
  { name: 'COPA_REY',      type: 'COMPETITION', patterns: [/copa del rey/i, /copa.*rey/i] },
]

const POLITICAL_ENTITIES = [
  { name: 'GOBIERNO_ES',   type: 'INSTITUTION', patterns: [/gobierno.*españa/i, /gobierno español/i, /consejo de ministros/i] },
  { name: 'CONGRESO',      type: 'INSTITUTION', patterns: [/congreso.*diputados/i, /congreso español/i] },
  { name: 'BCE',           type: 'INSTITUTION', patterns: [/banco central europeo/i, /\bbce\b/i, /\becb\b/i, /european central bank/i] },
  { name: 'FED',           type: 'INSTITUTION', patterns: [/reserva federal/i, /\bfed\b.*tipos/i, /federal reserve/i, /\bfomc\b/i] },
  { name: 'INE',           type: 'INSTITUTION', patterns: [/\bine\b.*datos/i, /instituto nacional.*estadística/i] },
  { name: 'SANCHEZ',       type: 'PERSON',      patterns: [/pedro sánchez/i, /pedro sanchez/i] },
  // International institutions
  { name: 'IMF',           type: 'INSTITUTION', patterns: [/\bimf\b/i, /international monetary fund/i, /fondo monetario internacional/i] },
  { name: 'EU_COMMISSION', type: 'INSTITUTION', patterns: [/european commission/i, /comisión europea/i, /comision europea/i] },
  { name: 'NATO',          type: 'INSTITUTION', patterns: [/\bnato\b/i, /\botan\b/i, /north atlantic treaty/i] },
  { name: 'US_ELECTION',   type: 'EVENT',       patterns: [/us election/i, /presidential election/i, /elecciones.*estados unidos/i] },
  { name: 'UK_POLITICS',   type: 'INSTITUTION', patterns: [/\buk\s+government/i, /prime minister.*uk/i, /downing street/i] },
  // International financial
  { name: 'GOLD',          type: 'COMMODITY',   patterns: [/gold price/i, /gold.*ounce/i, /\bxau\b/i] },
  { name: 'OIL_WTI',       type: 'COMMODITY',   patterns: [/wti crude/i, /crude oil/i, /oil price/i] },
  { name: 'SP500_EN',      type: 'INDEX',       patterns: [/s&p\s*500/i, /s&p500/i, /\bspx\b/i] },
  { name: 'NASDAQ_EN',     type: 'INDEX',       patterns: [/nasdaq.*composite/i, /\bqqq\b/i] },
  { name: 'DOW',           type: 'INDEX',       patterns: [/dow jones/i, /\bdjia\b/i] },
  { name: 'INTEREST_RATE', type: 'RATE',        patterns: [/interest rate/i, /rate cut/i, /rate hike/i, /tipos de interés/i, /tipos.*bce/i, /bce.*tipos/i] },
  { name: 'INFLATION_EU',  type: 'DATA',        patterns: [/eurozone inflation/i, /eu inflation/i, /inflación.*zona euro/i, /euro area inflation/i] },
]

const ALL_ENTITIES = [...FINANCIAL_ENTITIES, ...SPORTS_ENTITIES, ...POLITICAL_ENTITIES]

// ─── Number/value extraction ──────────────────────────────────────────────

function extractNumbers(text) {
  const numbers = []
  // Match: 17.100,50 | 67,500 | $68,000 | 2.5% | €120/MWh
  const re = /(?:\$|€)?\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)\s*(?:%|€\/mwh|usd|€|pts?|puntos)?/gi
  let m
  while ((m = re.exec(text)) !== null) {
    const raw = m[1].replace(/\./g, '').replace(',', '.')
    const val = parseFloat(raw)
    if (!isNaN(val) && val > 0) numbers.push(val)
  }
  return numbers
}

// ─── Sentiment hints ──────────────────────────────────────────────────────

const BULLISH_WORDS = [
  'sube', 'subida', 'alza', 'récord', 'record', 'máximo', 'maximo', 'gana',
  'victoria', 'supera', 'superar', 'crece', 'crecimiento', 'aumenta', 'aumento',
  'rebota', 'repunta', 'avanza', 'positivo', 'verde', 'aprueba', 'aprobado',
  'pump', 'rally', 'surge', 'rises', 'gains', 'bullish',
]
const BEARISH_WORDS = [
  'baja', 'bajada', 'caída', 'caida', 'mínimo', 'minimo', 'pierde', 'derrota',
  'cae', 'cede', 'retrocede', 'negativo', 'rojo', 'crisis', 'recesión', 'recesion',
  'rechaza', 'rechazado', 'derrumba', 'desplome', 'dump', 'crash', 'falls', 'drops', 'bearish',
]
const NEUTRAL_WORDS = ['mantiene', 'estable', 'plano', 'sin cambios', 'lateral']

function detectSentiment(text) {
  const lower = text.toLowerCase()
  const bullish = BULLISH_WORDS.filter(w => lower.includes(w)).length
  const bearish = BEARISH_WORDS.filter(w => lower.includes(w)).length
  if (bullish > bearish + 1) return 'BULLISH'
  if (bearish > bullish + 1) return 'BEARISH'
  return 'NEUTRAL'
}

// ─── Urgency/breaking detection ───────────────────────────────────────────

const URGENCY_PATTERNS = [
  /\bbreaking\b/i, /\baltima hora\b/i, /\búltima hora\b/i,
  /urgente/i, /en directo/i, /ahora mismo/i, /acaba de/i,
  /acaba confirmar/i, /dato oficial/i,
]

function detectUrgency(text) {
  return URGENCY_PATTERNS.some(re => re.test(text))
}

// ─── Main extractor ───────────────────────────────────────────────────────

export function extractEntities(article) {
  const text = [article.title, article.description, article.raw_text]
    .filter(Boolean)
    .join(' ')

  const entities   = []
  const matchedNames = new Set()

  for (const entity of ALL_ENTITIES) {
    const matched = entity.patterns.some(re => re.test(text))
    if (matched && !matchedNames.has(entity.name)) {
      matchedNames.add(entity.name)
      entities.push({
        name:       entity.name,
        type:       entity.type,
        confidence: 0.9,
      })
    }
  }

  // Attach extracted numeric values to relevant financial entities
  const numbers = extractNumbers(text)
  if (numbers.length > 0) {
    for (const entity of entities) {
      if (['INDEX','CRYPTO','COMMODITY','RATE','ENERGY'].includes(entity.type)) {
        entity.values = numbers.slice(0, 3)
      }
    }
  }

  // Add sentiment + urgency as meta-entities
  const sentiment = detectSentiment(text)
  if (sentiment !== 'NEUTRAL') {
    entities.push({ name: sentiment, type: 'SENTIMENT', confidence: 0.75 })
  }
  if (detectUrgency(text)) {
    entities.push({ name: 'BREAKING', type: 'URGENCY', confidence: 0.8 })
  }

  return entities
}

// ─── Helper: does article mention an entity by name? ─────────────────────

export function mentionsEntity(article, entityName) {
  return (article.entities || []).some(e => e.name === entityName)
}

export function getEntityNames(article) {
  return (article.entities || []).map(e => e.name)
}

export function getSentiment(article) {
  const s = (article.entities || []).find(e => e.type === 'SENTIMENT')
  return s ? s.name : 'NEUTRAL'
}

export function isBreaking(article) {
  return (article.entities || []).some(e => e.name === 'BREAKING')
}
