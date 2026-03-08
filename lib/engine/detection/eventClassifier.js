// ============================================================
// Event Classifier — maps article entities + text to event types
// Event types define what kind of market signal the article generates
// ============================================================

// ─── Event type definitions ───────────────────────────────────────────────

export const EVENT_TYPES = {
  PRICE_MOVE:       'PRICE_MOVE',        // asset price change
  SPORTS_RESULT:    'SPORTS_RESULT',     // match result
  SPORTS_UPCOMING:  'SPORTS_UPCOMING',   // upcoming match announcement
  POLITICAL_VOTE:   'POLITICAL_VOTE',    // legislative vote or decision
  POLITICAL_STATEMENT: 'POLITICAL_STATEMENT', // statement by official
  ECONOMIC_DATA:    'ECONOMIC_DATA',     // official stat release (IPC, PIB…)
  RATE_CHANGE:      'RATE_CHANGE',       // central bank rate change
  ENERGY_PRICE:     'ENERGY_PRICE',      // electricity/oil price move
  CRYPTO_MOVE:      'CRYPTO_MOVE',       // crypto price move
  REGULATORY:       'REGULATORY',        // new regulation/law
  EARNINGS:         'EARNINGS',          // company earnings/results
  MACRO_EVENT:      'MACRO_EVENT',       // macroeconomic event
  BREAKING_NEWS:    'BREAKING_NEWS',     // urgent/unclassified news
  IRRELEVANT:       'IRRELEVANT',        // not relevant to any market
}

// ─── Classification rules ─────────────────────────────────────────────────
// Each rule: { pattern, event_type, conditions? }

const CLASSIFICATION_RULES = [
  // Sports results (definitive)
  {
    event_type: EVENT_TYPES.SPORTS_RESULT,
    conditions: (entities, text) => {
      const hasTeam = entities.some(e => e.type === 'TEAM')
      const hasResult = /victoria|derrota|gana|pierde|empate|resultado final|3-0|2-1|1-0|0-1|0-2|goles|partido/i.test(text)
      return hasTeam && hasResult
    },
  },

  // Upcoming sports
  {
    event_type: EVENT_TYPES.SPORTS_UPCOMING,
    conditions: (entities, text) => {
      const hasTeam = entities.some(e => e.type === 'TEAM')
      const hasUpcoming = /próximo partido|jugará|enfrentará|disputará|este fin de semana|jornada/i.test(text)
      return hasTeam && hasUpcoming
    },
  },

  // Crypto price moves
  {
    event_type: EVENT_TYPES.CRYPTO_MOVE,
    conditions: (entities, text) => {
      return entities.some(e => e.type === 'CRYPTO')
        && /precio|cotización|cotizacion|sube|baja|récord|record|soporte|resistencia|\$/i.test(text)
    },
  },

  // Energy prices
  {
    event_type: EVENT_TYPES.ENERGY_PRICE,
    conditions: (entities, text) => {
      return entities.some(e => e.type === 'ENERGY')
        || (entities.some(e => e.type === 'COMMODITY' && e.name === 'BRENT'))
    },
  },

  // Rate changes
  {
    event_type: EVENT_TYPES.RATE_CHANGE,
    conditions: (entities, text) => {
      const hasRate = entities.some(e => e.type === 'RATE' || (e.type === 'INSTITUTION' && ['BCE','FED'].includes(e.name)))
      return hasRate && /tipos.*interés|tipos de interés|tipo de interés|baja.*tipos|sube.*tipos|reunión.*monetaria|decisión.*tipos/i.test(text)
    },
  },

  // Official economic data release
  {
    event_type: EVENT_TYPES.ECONOMIC_DATA,
    conditions: (entities, text) => {
      const hasDataEntity = entities.some(e => ['IPC_ES','PIB_ES','EURIBOR'].includes(e.name)
        || (e.type === 'INSTITUTION' && e.name === 'INE'))
      const hasDataVerb = /publica|publicado|dato.*oficial|datos.*de|variación.*del|variacion.*del|según.*ine/i.test(text)
      return hasDataEntity || hasDataVerb
    },
  },

  // Index/stock price moves
  {
    event_type: EVENT_TYPES.PRICE_MOVE,
    conditions: (entities, text) => {
      return entities.some(e => e.type === 'INDEX')
        && /sube|baja|cierra|abre|sesión|puntos|% de|variación/i.test(text)
    },
  },

  // Political votes
  {
    event_type: EVENT_TYPES.POLITICAL_VOTE,
    conditions: (entities, text) => {
      const hasInstitution = entities.some(e => e.type === 'INSTITUTION' && ['GOBIERNO_ES','CONGRESO'].includes(e.name))
      return hasInstitution && /aprueba|rechaza|vota|votación|aprobado|ley|decreto|presupuesto/i.test(text)
    },
  },

  // Regulatory/legislative
  {
    event_type: EVENT_TYPES.REGULATORY,
    conditions: (entities, text) => {
      return /\bboe\b|boletín oficial del estado|real decreto|ley orgánica|proyecto de ley/i.test(text)
    },
  },

  // Breaking news catch-all
  {
    event_type: EVENT_TYPES.BREAKING_NEWS,
    conditions: (entities, text) => {
      return entities.some(e => e.name === 'BREAKING')
    },
  },
]

// ─── Classifier ───────────────────────────────────────────────────────────

export function classifyEvent(article) {
  const text     = [article.title, article.description].filter(Boolean).join(' ')
  const entities = article.entities || []

  for (const rule of CLASSIFICATION_RULES) {
    try {
      if (rule.conditions(entities, text)) {
        return rule.event_type
      }
    } catch {
      // skip
    }
  }

  // Does the article mention any known entity at all?
  const hasRelevantEntity = entities.some(e =>
    ['INDEX','CRYPTO','TEAM','RATE','ENERGY','COMMODITY','INSTITUTION','DATA'].includes(e.type)
  )

  return hasRelevantEntity ? EVENT_TYPES.MACRO_EVENT : EVENT_TYPES.IRRELEVANT
}

// ─── Relevance filter — skip articles not useful for market signals ────────

export function isRelevant(article) {
  const eventType = article.event_type
  return eventType && eventType !== EVENT_TYPES.IRRELEVANT
}

// ─── Map event type to market category ────────────────────────────────────

export function eventTypeToCategory(eventType) {
  const MAP = {
    [EVENT_TYPES.CRYPTO_MOVE]:        'CRIPTO',
    [EVENT_TYPES.SPORTS_RESULT]:      'DEPORTES',
    [EVENT_TYPES.SPORTS_UPCOMING]:    'DEPORTES',
    [EVENT_TYPES.ENERGY_PRICE]:       'ENERGIA',
    [EVENT_TYPES.RATE_CHANGE]:        'ECONOMIA',
    [EVENT_TYPES.ECONOMIC_DATA]:      'ECONOMIA',
    [EVENT_TYPES.PRICE_MOVE]:         'ECONOMIA',
    [EVENT_TYPES.POLITICAL_VOTE]:     'POLITICA',
    [EVENT_TYPES.REGULATORY]:         'POLITICA',
    [EVENT_TYPES.POLITICAL_STATEMENT]:'POLITICA',
    [EVENT_TYPES.MACRO_EVENT]:        'ECONOMIA',
    [EVENT_TYPES.BREAKING_NEWS]:      'ACTUALIDAD',
    [EVENT_TYPES.EARNINGS]:           'ECONOMIA',
  }
  return MAP[eventType] || 'ACTUALIDAD'
}
