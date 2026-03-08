// ============================================================
// Template Engine — fills market templates with entity values
// Produces: question, description, category, oracle_type, duration_hours
// ============================================================

import { TEMPLATE_MAP, ENTITY_ROLE_MAP, findMatchingTemplates } from './marketTemplates'

// ─── Static entity → display value map ────────────────────────────────────

const ENTITY_DISPLAY = {
  IBEX_35:      { INDEX_NAME: 'IBEX 35',   UNIT: 'puntos', ORACLE_SOURCE: 'Yahoo Finance' },
  SP500:        { INDEX_NAME: 'S&P 500',   UNIT: 'puntos', ORACLE_SOURCE: 'Yahoo Finance' },
  NASDAQ:       { INDEX_NAME: 'Nasdaq',    UNIT: 'puntos', ORACLE_SOURCE: 'Yahoo Finance' },
  DAX:          { INDEX_NAME: 'DAX',       UNIT: 'puntos', ORACLE_SOURCE: 'Yahoo Finance' },

  BITCOIN:      { CRYPTO_NAME: 'Bitcoin',  CRYPTO_TICKER: 'BTC', ORACLE_SOURCE: 'CoinGecko API' },
  ETHEREUM:     { CRYPTO_NAME: 'Ethereum', CRYPTO_TICKER: 'ETH', ORACLE_SOURCE: 'CoinGecko API' },

  BRENT:        { COMMODITY_NAME: 'Brent', ORACLE_SOURCE: 'Yahoo Finance (BZ=F)' },
  ORO:          { COMMODITY_NAME: 'Oro',   ORACLE_SOURCE: 'Yahoo Finance (GC=F)' },

  EURIBOR:      { RATE_NAME: 'Euríbor 12M', RATE_DIRECTION: 'baja', ORACLE_SOURCE: 'BCE / Banco de España' },
  IPC_ES:       { INDICATOR_NAME: 'IPC interanual', ORACLE_SOURCE: 'INE — IPC' },
  PIB_ES:       { INDICATOR_NAME: 'PIB trimestral', ORACLE_SOURCE: 'INE — Contabilidad Nacional' },

  LUZ_PVPC:     { ORACLE_SOURCE: 'REE apidatos / OMIE' },

  REAL_MADRID:  { TEAM_NAME: 'Real Madrid',     ORACLE_SOURCE: 'football-data.org' },
  FC_BARCELONA: { TEAM_NAME: 'FC Barcelona',    ORACLE_SOURCE: 'football-data.org' },
  ATLETICO:     { TEAM_NAME: 'Atlético de Madrid', ORACLE_SOURCE: 'football-data.org' },
  SEVILLA_FC:   { TEAM_NAME: 'Sevilla FC',      ORACLE_SOURCE: 'football-data.org' },

  CHAMPIONS:    { COMPETITION_NAME: 'la Champions League', COMPETITION_SUFFIX: ' en la Champions League' },
  LALIGA:       { COMPETITION_NAME: 'La Liga',             COMPETITION_SUFFIX: ' en LaLiga' },
  COPA_REY:     { COMPETITION_NAME: 'la Copa del Rey',     COMPETITION_SUFFIX: ' en la Copa del Rey' },

  CONGRESO:     { INSTITUTION_NAME: 'Congreso de los Diputados', ORACLE_SOURCE: 'BOE' },
  GOBIERNO_ES:  { INSTITUTION_NAME: 'Gobierno de España',        ORACLE_SOURCE: 'BOE' },
}

// ─── Duration resolvers ───────────────────────────────────────────────────

function resolveDurationHours(durationType) {
  const now = new Date()

  if (durationType === 'DAILY') return 20

  if (durationType === 'WEEKLY') {
    const endOfWeek = new Date(now)
    const dayOfWeek = now.getDay()
    const daysToFriday = dayOfWeek <= 5 ? (5 - dayOfWeek) : (5 + 7 - dayOfWeek)
    endOfWeek.setDate(now.getDate() + daysToFriday)
    endOfWeek.setHours(18, 0, 0, 0)
    return Math.max(4, Math.ceil((endOfWeek - now) / 3600000))
  }

  if (durationType === 'MONTHLY') {
    const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 18, 0, 0))
    return Math.max(24, Math.ceil((endOfMonth - now) / 3600000))
  }

  // EVENT — default 10 days
  return 240
}

// ─── Fill a single placeholder value ─────────────────────────────────────

function resolveToken(token, entityValues, liveData) {
  // Direct match in entity values
  if (entityValues[token] !== undefined) return String(entityValues[token])

  // Live data (prices, thresholds)
  if (liveData && liveData[token] !== undefined) return String(liveData[token])

  // Defaults
  const DEFAULTS = {
    THRESHOLD:      '100',
    UNIT:           'puntos',
    CURRENT_PRICE:  '—',
    CURRENT_VALUE:  '—',
    COMPETITION_SUFFIX: '',
    COMPETITION_NAME:   'la competición',
    CANDIDATE_NAME:     'El candidato',
    ELECTION_NAME:      'las elecciones',
    OPPONENT_NAME:      'el rival',
  }
  return DEFAULTS[token] || `{${token}}`
}

// ─── Fill a template string ───────────────────────────────────────────────

function fillString(str, entityValues, liveData = {}) {
  return str.replace(/\{([A-Z_]+)\}/g, (_, token) =>
    resolveToken(token, entityValues, liveData)
  )
}

// ─── Build entity value map from detected entities ────────────────────────

function buildEntityValues(detectedEntities) {
  const values = {}

  for (const entity of detectedEntities) {
    const display = ENTITY_DISPLAY[entity.name]
    if (display) Object.assign(values, display)

    // Add numeric values as THRESHOLD if present
    if (entity.values?.length > 0 && !values.THRESHOLD) {
      const v = entity.values[0]
      // Format: clean number without excessive decimals
      values.THRESHOLD = v > 1000
        ? v.toLocaleString('es-ES')
        : v.toFixed(v % 1 === 0 ? 0 : 2)
    }
  }

  return values
}

// ─── Main fill function ───────────────────────────────────────────────────

export function fillTemplate(templateId, detectedEntities, liveData = {}) {
  const template = TEMPLATE_MAP[templateId]
  if (!template) return null

  const entityValues = buildEntityValues(detectedEntities)

  // Merge live data into entity values (live prices override defaults)
  const merged = { ...entityValues, ...liveData }

  const question    = fillString(template.question,    merged, {})
  const description = fillString(template.description, merged, {})

  // Check for unfilled required placeholders
  const unfilledRequired = (question + description)
    .match(/\{[A-Z_]+\}/g)
    ?.filter(p => template.required.some(r => p.includes(r))) || []

  if (unfilledRequired.length > 0) return null  // can't generate usable question

  return {
    templateId,
    question,
    description,
    category:       template.category,
    oracle_type:    template.oracle_type,
    duration_hours: resolveDurationHours(template.duration_type),
    duration_type:  template.duration_type,
    initial_prob:   template.initial_prob,
    entityValues:   merged,
  }
}

// ─── Auto-select best template for detected entities ─────────────────────

export function selectBestTemplate(detectedEntities) {
  const entityTypes = detectedEntities.map(e => e.type)
  const entityNames = detectedEntities.map(e => e.name)

  const candidates = findMatchingTemplates(entityTypes, entityNames)
  if (!candidates.length) return null

  // Prefer more specific templates (more required entities matched)
  candidates.sort((a, b) => b.required.length - a.required.length)

  for (const template of candidates) {
    const filled = fillTemplate(template.id, detectedEntities)
    if (filled) return filled
  }
  return null
}

// ─── Validate a filled template ───────────────────────────────────────────

export function validateFilledTemplate(filled) {
  if (!filled) return { valid: false, reason: 'No template filled' }

  const { question, description, oracle_type, duration_hours } = filled

  if (!question || question.includes('{')) {
    return { valid: false, reason: 'Unfilled question placeholder' }
  }
  if (question.length < 20 || question.length > 250) {
    return { valid: false, reason: 'Question length out of bounds' }
  }
  if (duration_hours < 1) {
    return { valid: false, reason: 'Duration too short' }
  }
  if (!oracle_type) {
    return { valid: false, reason: 'No oracle type assigned' }
  }

  return { valid: true }
}
