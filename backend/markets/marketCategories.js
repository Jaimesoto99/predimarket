// ============================================================
// Market Categories — canonical category definitions
// Internal keys match DB values (POLITICA, ECONOMIA, etc.)
// External labels match user-facing language
// ============================================================

export const CATEGORIES = {
  ECONOMIA: {
    key:          'ECONOMIA',
    label:        'Economía',
    external:     'economy',
    color:        '#818cf8',
    keywords:     ['ibex','bolsa','acciones','euríbor','euribor','ipc','inflación','pib','bono','deuda','fed','bce'],
    oracle_types: ['PRICE_THRESHOLD','PRICE_DIRECTION','DATA_RELEASE','RATE_CHANGE'],
    templates:    ['INDEX_DIRECTION','INDEX_THRESHOLD','RATE_THRESHOLD','ECONOMIC_DATA','CURRENCY_MOVE'],
    importance:   0.85,
  },
  CRIPTO: {
    key:          'CRIPTO',
    label:        'Cripto',
    external:     'crypto',
    color:        '#2dd4bf',
    keywords:     ['bitcoin','btc','ethereum','eth','cripto','blockchain','altcoin','solana','xrp'],
    oracle_types: ['PRICE_THRESHOLD','PRICE_DIRECTION'],
    templates:    ['CRYPTO_THRESHOLD','CRYPTO_DIRECTION','CRYPTO_WEEKLY'],
    importance:   0.80,
  },
  DEPORTES: {
    key:          'DEPORTES',
    label:        'Deportes',
    external:     'sports',
    color:        '#34d399',
    keywords:     ['real madrid','barcelona','atlético','atletico','liga','champions','copa','gol','partido','fútbol'],
    oracle_types: ['SPORTS_RESULT','SPORTS_SEASON'],
    templates:    ['TEAM_NEXT_MATCH','TEAM_SEASON','TEAM_VS_TEAM'],
    importance:   0.75,
  },
  ENERGIA: {
    key:          'ENERGIA',
    label:        'Energía',
    external:     'energy',
    color:        '#fb923c',
    keywords:     ['luz','pvpc','mwh','electricidad','brent','petróleo','petroleo','gas','renovable'],
    oracle_types: ['PRICE_THRESHOLD','PRICE_DIRECTION'],
    templates:    ['ENERGY_DAILY','ENERGY_WEEKLY','OIL_THRESHOLD'],
    importance:   0.80,
  },
  POLITICA: {
    key:          'POLITICA',
    label:        'Política',
    external:     'politics',
    color:        '#fbbf24',
    keywords:     ['gobierno','congreso','senado','elecciones','presidente','partido','ley','decreto','psoe','pp','vox'],
    oracle_types: ['OFFICIAL_RESULT','BOE_PUBLICATION','ELECTORAL_RESULT'],
    templates:    ['LAW_APPROVAL','POLITICAL_VOTE','ELECTION_RESULT'],
    importance:   0.75,
  },
  ACTUALIDAD: {
    key:          'ACTUALIDAD',
    label:        'Actualidad',
    external:     'current_affairs',
    color:        '#a78bfa',
    keywords:     ['noticia','evento','suceso','hecho','último','hoy','semana'],
    oracle_types: ['NEWS_CONFIRMATION','OFFICIAL_STATEMENT'],
    templates:    ['NEWS_EVENT','BREAKING_QUESTION'],
    importance:   0.55,
  },
  GEOPOLITICA: {
    key:          'GEOPOLITICA',
    label:        'Geopolítica',
    external:     'geopolitics',
    color:        '#f472b6',
    keywords:     ['guerra','conflicto','otan','nato','acuerdo','cumbre','sanción','tratado','eeuu','rusia','china'],
    oracle_types: ['NEWS_CONFIRMATION','OFFICIAL_STATEMENT'],
    templates:    ['GEO_EVENT','GEO_AGREEMENT'],
    importance:   0.70,
  },
  TECNOLOGIA: {
    key:          'TECNOLOGIA',
    label:        'Tecnología',
    external:     'tech',
    color:        '#e879f9',
    keywords:     ['nvidia','apple','microsoft','meta','google','amazon','ia','inteligencia artificial','ipo','startups'],
    oracle_types: ['PRICE_THRESHOLD','EARNINGS_RELEASE','NEWS_CONFIRMATION'],
    templates:    ['STOCK_THRESHOLD','EARNINGS_BEAT','IPO_DATE'],
    importance:   0.70,
  },
}

// ─── Lookups ──────────────────────────────────────────────────────────────

export const CATEGORY_KEYS = Object.keys(CATEGORIES)

export function getCategoryByKey(key) {
  return CATEGORIES[key] || null
}

export function getCategoryByExternal(external) {
  return Object.values(CATEGORIES).find(c => c.external === external) || null
}

// Infer category from text using keyword matching
export function inferCategoryFromText(text) {
  const lower = (text || '').toLowerCase()
  let best = { key: 'ACTUALIDAD', score: 0 }

  for (const [key, cat] of Object.entries(CATEGORIES)) {
    const hits = cat.keywords.filter(kw => lower.includes(kw)).length
    const score = hits * cat.importance
    if (score > best.score) {
      best = { key, score }
    }
  }
  return best.key
}

// Oracle types that are deterministically resolvable
export const DETERMINISTIC_ORACLE_TYPES = new Set([
  'PRICE_THRESHOLD',
  'PRICE_DIRECTION',
  'DATA_RELEASE',
  'RATE_CHANGE',
  'SPORTS_RESULT',
  'BOE_PUBLICATION',
  'ELECTORAL_RESULT',
  'EARNINGS_RELEASE',
])

export function isDeterministic(oracle_type) {
  return DETERMINISTIC_ORACLE_TYPES.has(oracle_type)
}
