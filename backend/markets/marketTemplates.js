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

// Duration constants (mirrored from marketCreator.js for template use)
export const MARKET_DURATIONS = {
  ULTRA_FAST: 6,
  FAST:       12,
  DAILY:      24,
  SHORT:      48,
  MEDIUM:     120,
  MONTHLY:    720,
}

const ECONOMIA_TEMPLATES = [
  {
    id:                'INDEX_DIRECTION',
    category:          'ECONOMIA',
    oracle_type:       'PRICE_DIRECTION',
    required:          ['INDEX'],
    optional:          [],
    question:          '¿{INDEX_NAME} cierra en positivo hoy?',
    description:       'Se resuelve SÍ si el {INDEX_NAME} cierra con variación positiva respecto a la apertura de hoy. Fuente: {ORACLE_SOURCE}. Resolución: cierre bursátil del día a las 17:35h.',
    resolution_source: '{ORACLE_SOURCE}',
    resolution_method: 'Precio de cierre oficial del índice. Se verifica en {ORACLE_SOURCE} tras las 17:35h del día de cierre.',
    duration_type:     'DAILY',
    initial_prob:      [40, 60],
    min_score:         0.5,
  },
  {
    id:                'INDEX_THRESHOLD',
    category:          'ECONOMIA',
    oracle_type:       'PRICE_THRESHOLD',
    required:          ['INDEX', 'THRESHOLD'],
    optional:          [],
    question:          '¿{INDEX_NAME} supera los {THRESHOLD} {UNIT} en las próximas 48 horas?',
    description:       'Se resuelve SÍ si el {INDEX_NAME} cierra por encima de {THRESHOLD} {UNIT} en alguna sesión en las próximas 48 horas. Cotización actual: ~{CURRENT_PRICE}. Fuente: {ORACLE_SOURCE}. Resolución: 48 horas tras apertura.',
    resolution_source: '{ORACLE_SOURCE}',
    resolution_method: 'Precio de cierre máximo del índice en el período. Se verifica en {ORACLE_SOURCE}.',
    duration_type:     'SHORT',
    initial_prob:      [30, 70],
    min_score:         0.6,
  },
  {
    id:                'RATE_THRESHOLD',
    category:          'ECONOMIA',
    oracle_type:       'RATE_CHANGE',
    required:          ['RATE', 'THRESHOLD'],
    optional:          [],
    question:          '¿El {RATE_NAME} {RATE_DIRECTION} del {THRESHOLD}% esta semana?',
    description:       'Se resuelve SÍ si la tasa {RATE_NAME} publicada por {ORACLE_SOURCE} {RATE_DIRECTION} del {THRESHOLD}% durante esta semana. Fuente oficial. Resolución: viernes 23:59h.',
    resolution_source: '{ORACLE_SOURCE}',
    resolution_method: 'Tipo publicado oficialmente por el banco central o entidad reguladora correspondiente.',
    duration_type:     'MEDIUM',
    initial_prob:      [30, 70],
    min_score:         0.6,
  },
  {
    id:                'ECONOMIC_DATA',
    category:          'ECONOMIA',
    oracle_type:       'DATA_RELEASE',
    required:          ['DATA_INDICATOR', 'THRESHOLD'],
    optional:          [],
    question:          '¿Publicará el {ORACLE_SOURCE} un {INDICATOR_NAME} superior al {THRESHOLD}% esta semana?',
    description:       'Se resuelve SÍ si el organismo oficial publica un dato de {INDICATOR_NAME} superior a {THRESHOLD}% en la publicación de esta semana. Fuente: {ORACLE_SOURCE}. Resolución: día de publicación del dato.',
    resolution_source: '{ORACLE_SOURCE}',
    resolution_method: 'Dato oficial publicado por el organismo estadístico o banco central. Se verifica en la fuente oficial el día de publicación.',
    duration_type:     'MEDIUM',
    initial_prob:      [35, 65],
    min_score:         0.65,
  },
  {
    id:                'STOCK_THRESHOLD',
    category:          'TECNOLOGIA',
    oracle_type:       'PRICE_THRESHOLD',
    required:          ['STOCK', 'THRESHOLD'],
    optional:          [],
    question:          '¿{STOCK_NAME} supera los {THRESHOLD}$ al cierre de hoy?',
    description:       'Se resuelve SÍ si el precio de cierre de {STOCK_NAME} ({STOCK_TICKER}) supera {THRESHOLD} USD al cierre de hoy. Fuente: {ORACLE_SOURCE}. Resolución: cierre de mercado del día.',
    resolution_source: '{ORACLE_SOURCE}',
    resolution_method: 'Precio de cierre oficial de la acción según {ORACLE_SOURCE}. Verificable tras las 22:00h hora española.',
    duration_type:     'DAILY',
    initial_prob:      [30, 70],
    min_score:         0.55,
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
// NOTE: Individual match results (TEAM_NEXT_MATCH, TEAM_VS_TEAM) are blocked
// by R0_REGULATORY (CNMV compliance). Only tournament/season/national-team
// outcomes are permitted.

const DEPORTES_TEMPLATES = [
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
  {
    id:           'NATIONAL_TEAM_TOURNAMENT',
    category:     'DEPORTES',
    oracle_type:  'SPORTS_SEASON',
    required:     ['COMPETITION'],
    optional:     [],
    question:     '¿Llegará la Selección Española a semifinales de {COMPETITION_NAME}?',
    description:  'Se resuelve SÍ si la Selección Española de fútbol alcanza las semifinales de {COMPETITION_NAME}. Fuente: UEFA / FIFA.',
    duration_type: 'MONTHLY',
    initial_prob: [25, 60],
    min_score:    0.60,
  },
]

// ─── ENERGY ───────────────────────────────────────────────────────────────

const ENERGIA_TEMPLATES = [
  {
    id:                'ENERGY_DAILY',
    category:          'ENERGIA',
    oracle_type:       'PRICE_THRESHOLD',
    required:          ['ENERGY', 'THRESHOLD'],
    optional:          [],
    question:          '¿El precio medio de la luz supera {THRESHOLD} €/MWh hoy?',
    description:       'Se resuelve SÍ si el precio medio del pool eléctrico diario supera {THRESHOLD} €/MWh hoy. Fuente: OMIE / Red Eléctrica de España. Dato publicado antes de las 21:00h.',
    resolution_source: 'OMIE / Red Eléctrica de España (ree.es)',
    resolution_method: 'Precio medio aritmético del pool eléctrico diario publicado por OMIE. Verificable en omie.es y datadis.es.',
    duration_type:     'DAILY',
    initial_prob:      [35, 65],
    min_score:         0.55,
  },
  {
    id:                'ENERGY_SHORT',
    category:          'ENERGIA',
    oracle_type:       'PRICE_THRESHOLD',
    required:          ['ENERGY', 'THRESHOLD'],
    optional:          [],
    question:          '¿El precio medio del PVPC supera {THRESHOLD} €/MWh en las próximas 48 horas?',
    description:       'Se resuelve SÍ si el precio medio del PVPC es superior a {THRESHOLD} €/MWh en alguno de los dos próximos días. Fuente: REE. Resolución: 48 horas tras apertura.',
    resolution_source: 'Red Eléctrica de España (ree.es)',
    resolution_method: 'Media aritmética del precio horario PVPC publicado por REE. Dato disponible en apidatos.ree.es.',
    duration_type:     'SHORT',
    initial_prob:      [35, 65],
    min_score:         0.55,
  },
  {
    id:                'OIL_THRESHOLD',
    category:          'ENERGIA',
    oracle_type:       'PRICE_THRESHOLD',
    required:          ['COMMODITY', 'THRESHOLD'],
    optional:          [],
    question:          '¿El Brent supera los {THRESHOLD}$ por barril al cierre de hoy?',
    description:       'Se resuelve SÍ si el precio del petróleo Brent supera {THRESHOLD} USD/barril al cierre de hoy. Precio actual: ~${CURRENT_PRICE}. Fuente: Yahoo Finance (BZ=F). Resolución: cierre del mercado ICE.',
    resolution_source: 'Yahoo Finance — BZ=F (ICE Brent Crude)',
    resolution_method: 'Precio de cierre oficial del contrato de futuros Brent en el ICE. Verificable en finance.yahoo.com/quote/BZ=F.',
    duration_type:     'DAILY',
    initial_prob:      [30, 70],
    min_score:         0.55,
  },
]

// ─── POLITICS ─────────────────────────────────────────────────────────────

const POLITICA_TEMPLATES = [
  {
    id:                'LAW_APPROVAL',
    category:          'POLITICA',
    oracle_type:       'BOE_PUBLICATION',
    required:          ['INSTITUTION'],
    optional:          [],
    question:          '¿Publicará el BOE alguna ley o real decreto-ley esta semana?',
    description:       'Se resuelve SÍ si el Boletín Oficial del Estado publica al menos una ley, real decreto-ley o decreto legislativo durante esta semana. Fuente: boe.es. Resolución: viernes 23:59h.',
    resolution_source: 'BOE — Boletín Oficial del Estado (boe.es)',
    resolution_method: 'Consulta del RSS oficial del BOE (boe.es/rss). Se resuelve SÍ si hay al menos una publicación de rango legal en la semana.',
    duration_type:     'MEDIUM',
    initial_prob:      [55, 80],
    min_score:         0.50,
  },
  {
    id:                'ELECTION_RESULT',
    category:          'POLITICA',
    oracle_type:       'ELECTORAL_RESULT',
    required:          ['ELECTION'],
    optional:          ['CANDIDATE'],
    question:          '¿Obtendrá el partido más votado más del 40% de los votos en {ELECTION_NAME}?',
    description:       'Se resuelve SÍ si el partido con más votos en {ELECTION_NAME} supera el 40% del voto válido según resultados oficiales. Fuente: Ministerio del Interior / organismo electoral correspondiente. Resolución: publicación de resultados oficiales.',
    resolution_source: 'Ministerio del Interior — resultados electorales oficiales (infoelectoral.mir.es)',
    resolution_method: 'Resultado oficial publicado por el organismo electoral. Se verifica el porcentaje del partido más votado en el escrutinio definitivo.',
    duration_type:     'SHORT',
    initial_prob:      [30, 60],
    min_score:         0.70,
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
