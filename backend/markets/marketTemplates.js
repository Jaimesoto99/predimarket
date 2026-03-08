// ============================================================
// Market Templates — parameterized market question templates
//
// Each template defines:
//   id              — unique identifier
//   category        — DB category key
//   oracle_type     — how this market resolves
//   required        — entity names that MUST be present
//   optional        — entity names that improve quality
//   question        — template string with {PLACEHOLDER} tokens
//   description     — template string for market description
//   duration_type   — DAILY | WEEKLY | MONTHLY | EVENT
//   initial_prob    — [min, max] range for starting probability
//   min_score       — minimum relevance score to use this template
// ============================================================

// ─── ECONOMY / FINANCE ────────────────────────────────────────────────────

const ECONOMIA_TEMPLATES = [
  {
    id:           'INDEX_DIRECTION',
    category:     'ECONOMIA',
    oracle_type:  'PRICE_DIRECTION',
    required:     ['INDEX'],
    optional:     [],
    question:     '¿{INDEX_NAME} cierra en verde esta semana?',
    description:  'Se resuelve SÍ si el {INDEX_NAME} acumula una variación positiva al cierre del viernes respecto al lunes. Fuente: {ORACLE_SOURCE}. Resolución: viernes 17:35h.',
    duration_type: 'WEEKLY',
    initial_prob: [40, 60],
    min_score:    0.5,
  },
  {
    id:           'INDEX_THRESHOLD',
    category:     'ECONOMIA',
    oracle_type:  'PRICE_THRESHOLD',
    required:     ['INDEX', 'THRESHOLD'],
    optional:     [],
    question:     '¿{INDEX_NAME} supera los {THRESHOLD} {UNIT} esta semana?',
    description:  'Se resuelve SÍ si el {INDEX_NAME} cierra por encima de {THRESHOLD} {UNIT} en alguna sesión de esta semana. Cotización actual: ~{CURRENT_PRICE}. Fuente: {ORACLE_SOURCE}.',
    duration_type: 'WEEKLY',
    initial_prob: [30, 70],
    min_score:    0.6,
  },
  {
    id:           'RATE_THRESHOLD',
    category:     'ECONOMIA',
    oracle_type:  'RATE_CHANGE',
    required:     ['RATE', 'THRESHOLD'],
    optional:     [],
    question:     '¿El {RATE_NAME} {RATE_DIRECTION} del {THRESHOLD}% este mes?',
    description:  'Se resuelve SÍ si la tasa {RATE_NAME} publicada por {ORACLE_SOURCE} {RATE_DIRECTION} del {THRESHOLD}% al final del mes. Fuente oficial.',
    duration_type: 'MONTHLY',
    initial_prob: [30, 70],
    min_score:    0.6,
  },
  {
    id:           'ECONOMIC_DATA',
    category:     'ECONOMIA',
    oracle_type:  'DATA_RELEASE',
    required:     ['DATA_INDICATOR', 'THRESHOLD'],
    optional:     [],
    question:     '¿El {INDICATOR_NAME} de España supera el {THRESHOLD}% este mes?',
    description:  'Se resuelve SÍ según el dato de {INDICATOR_NAME} publicado por {ORACLE_SOURCE} para el mes en curso. Último dato: ~{CURRENT_VALUE}%. Fuente oficial.',
    duration_type: 'MONTHLY',
    initial_prob: [35, 65],
    min_score:    0.65,
  },
  {
    id:           'STOCK_THRESHOLD',
    category:     'TECNOLOGIA',
    oracle_type:  'PRICE_THRESHOLD',
    required:     ['STOCK', 'THRESHOLD'],
    optional:     [],
    question:     '¿{STOCK_NAME} supera los {THRESHOLD}$ esta semana?',
    description:  'Se resuelve SÍ si el precio de cierre de {STOCK_NAME} ({STOCK_TICKER}) supera {THRESHOLD} USD en alguna sesión de esta semana. Fuente: {ORACLE_SOURCE}.',
    duration_type: 'WEEKLY',
    initial_prob: [30, 70],
    min_score:    0.55,
  },
]

// ─── CRYPTO ───────────────────────────────────────────────────────────────

const CRIPTO_TEMPLATES = [
  {
    id:           'CRYPTO_THRESHOLD',
    category:     'CRIPTO',
    oracle_type:  'PRICE_THRESHOLD',
    required:     ['CRYPTO', 'THRESHOLD'],
    optional:     [],
    question:     '¿{CRYPTO_NAME} supera los {THRESHOLD}$ esta semana?',
    description:  'Se resuelve SÍ si el precio de {CRYPTO_NAME} ({CRYPTO_TICKER}) supera {THRESHOLD} USD en algún momento durante esta semana. Precio actual: ~${CURRENT_PRICE}. Fuente: {ORACLE_SOURCE}.',
    duration_type: 'WEEKLY',
    initial_prob: [30, 70],
    min_score:    0.5,
  },
  {
    id:           'CRYPTO_DIRECTION',
    category:     'CRIPTO',
    oracle_type:  'PRICE_DIRECTION',
    required:     ['CRYPTO'],
    optional:     [],
    question:     '¿{CRYPTO_NAME} sube más de un {THRESHOLD}% esta semana?',
    description:  'Se resuelve SÍ si el precio de {CRYPTO_NAME} ({CRYPTO_TICKER}) sube más de un {THRESHOLD}% de lunes a viernes. Fuente: {ORACLE_SOURCE}.',
    duration_type: 'WEEKLY',
    initial_prob: [30, 50],
    min_score:    0.5,
  },
]

// ─── SPORTS ───────────────────────────────────────────────────────────────

const DEPORTES_TEMPLATES = [
  {
    id:           'TEAM_NEXT_MATCH',
    category:     'DEPORTES',
    oracle_type:  'SPORTS_RESULT',
    required:     ['TEAM'],
    optional:     ['COMPETITION'],
    question:     '¿{TEAM_NAME} gana su próximo partido oficial?',
    description:  'Se resuelve SÍ si {TEAM_NAME} obtiene victoria (3 puntos) en su próximo partido oficial{COMPETITION_SUFFIX}. Empate = NO. Fuente: {ORACLE_SOURCE}.',
    duration_type: 'EVENT',
    initial_prob: [40, 65],
    min_score:    0.5,
  },
  {
    id:           'TEAM_VS_TEAM',
    category:     'DEPORTES',
    oracle_type:  'SPORTS_RESULT',
    required:     ['TEAM', 'OPPONENT'],
    optional:     ['COMPETITION'],
    question:     '¿{TEAM_NAME} vence a {OPPONENT_NAME}?',
    description:  'Se resuelve SÍ si {TEAM_NAME} gana el partido frente a {OPPONENT_NAME}{COMPETITION_SUFFIX}. Empate = NO. Fuente: {ORACLE_SOURCE}.',
    duration_type: 'EVENT',
    initial_prob: [35, 65],
    min_score:    0.65,
  },
  {
    id:           'TEAM_SEASON',
    category:     'DEPORTES',
    oracle_type:  'SPORTS_SEASON',
    required:     ['TEAM', 'COMPETITION'],
    optional:     [],
    question:     '¿{TEAM_NAME} gana {COMPETITION_NAME} esta temporada?',
    description:  'Se resuelve SÍ si {TEAM_NAME} se proclama campeón de {COMPETITION_NAME} al final de la temporada. Fuente: {ORACLE_SOURCE}.',
    duration_type: 'MONTHLY',
    initial_prob: [10, 50],
    min_score:    0.60,
  },
]

// ─── ENERGY ───────────────────────────────────────────────────────────────

const ENERGIA_TEMPLATES = [
  {
    id:           'ENERGY_DAILY',
    category:     'ENERGIA',
    oracle_type:  'PRICE_THRESHOLD',
    required:     ['ENERGY', 'THRESHOLD'],
    optional:     [],
    question:     '¿El precio medio de la luz supera {THRESHOLD} €/MWh hoy?',
    description:  'Se resuelve SÍ si el precio medio del pool eléctrico diario supera {THRESHOLD} €/MWh hoy. Fuente: {ORACLE_SOURCE}. Dato oficial publicado diariamente.',
    duration_type: 'DAILY',
    initial_prob: [35, 65],
    min_score:    0.55,
  },
  {
    id:           'ENERGY_WEEKLY',
    category:     'ENERGIA',
    oracle_type:  'PRICE_THRESHOLD',
    required:     ['ENERGY', 'THRESHOLD'],
    optional:     [],
    question:     '¿El precio medio del PVPC supera {THRESHOLD} €/MWh esta semana?',
    description:  'Se resuelve SÍ si el precio medio del PVPC acumula una media superior a {THRESHOLD} €/MWh durante esta semana. Fuente: {ORACLE_SOURCE}.',
    duration_type: 'WEEKLY',
    initial_prob: [35, 65],
    min_score:    0.55,
  },
  {
    id:           'OIL_THRESHOLD',
    category:     'ENERGIA',
    oracle_type:  'PRICE_THRESHOLD',
    required:     ['COMMODITY', 'THRESHOLD'],
    optional:     [],
    question:     '¿El Brent supera los {THRESHOLD}$ por barril esta semana?',
    description:  'Se resuelve SÍ si el precio del petróleo Brent supera {THRESHOLD} USD/barril en algún momento durante esta semana. Precio actual: ~${CURRENT_PRICE}. Fuente: {ORACLE_SOURCE}.',
    duration_type: 'WEEKLY',
    initial_prob: [30, 70],
    min_score:    0.55,
  },
]

// ─── POLITICS ─────────────────────────────────────────────────────────────

const POLITICA_TEMPLATES = [
  {
    id:           'LAW_APPROVAL',
    category:     'POLITICA',
    oracle_type:  'BOE_PUBLICATION',
    required:     ['INSTITUTION'],
    optional:     [],
    question:     '¿El Congreso aprueba algún proyecto de ley esta semana?',
    description:  'Se resuelve SÍ si el BOE publica la aprobación de algún proyecto de ley o real decreto-ley durante esta semana. Fuente: {ORACLE_SOURCE}.',
    duration_type: 'WEEKLY',
    initial_prob: [45, 75],
    min_score:    0.50,
  },
  {
    id:           'ELECTION_RESULT',
    category:     'POLITICA',
    oracle_type:  'ELECTORAL_RESULT',
    required:     ['ELECTION'],
    optional:     ['CANDIDATE'],
    question:     '¿{CANDIDATE_NAME} gana {ELECTION_NAME}?',
    description:  'Se resuelve SÍ si {CANDIDATE_NAME} obtiene el mayor número de votos en {ELECTION_NAME}. Fuente: {ORACLE_SOURCE}.',
    duration_type: 'EVENT',
    initial_prob: [25, 75],
    min_score:    0.70,
  },
]

// ─── All templates registry ───────────────────────────────────────────────

export const TEMPLATES = [
  ...ECONOMIA_TEMPLATES,
  ...CRIPTO_TEMPLATES,
  ...DEPORTES_TEMPLATES,
  ...ENERGIA_TEMPLATES,
  ...POLITICA_TEMPLATES,
]

export const TEMPLATE_MAP = Object.fromEntries(TEMPLATES.map(t => [t.id, t]))

// Find templates that match a set of entity types
export function findMatchingTemplates(entityTypes, entityNames = []) {
  return TEMPLATES.filter(t => {
    // Check all required entity roles are satisfiable
    return t.required.every(role => {
      return entityTypes.includes(role)
        || entityNames.some(n => ENTITY_ROLE_MAP[n] === role)
    })
  })
}

// Maps entity names (from entityExtractor) to template roles
export const ENTITY_ROLE_MAP = {
  IBEX_35:      'INDEX',
  SP500:        'INDEX',
  NASDAQ:       'INDEX',
  DAX:          'INDEX',
  BITCOIN:      'CRYPTO',
  ETHEREUM:     'CRYPTO',
  BRENT:        'COMMODITY',
  ORO:          'COMMODITY',
  EURIBOR:      'RATE',
  IPC_ES:       'DATA_INDICATOR',
  PIB_ES:       'DATA_INDICATOR',
  LUZ_PVPC:     'ENERGY',
  REAL_MADRID:  'TEAM',
  FC_BARCELONA: 'TEAM',
  ATLETICO:     'TEAM',
  SEVILLA_FC:   'TEAM',
  CHAMPIONS:    'COMPETITION',
  LALIGA:       'COMPETITION',
  COPA_REY:     'COMPETITION',
  CONGRESO:     'INSTITUTION',
  GOBIERNO_ES:  'INSTITUTION',
}
