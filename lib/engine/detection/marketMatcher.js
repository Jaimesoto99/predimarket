// ============================================================
// Market Matcher — maps detected article events to active markets
// Returns: Array<{ market, article, confidence, direction }>
// ============================================================

// ─── Keyword sets per entity → market title keywords ─────────────────────

// These define which article entities should match which market title keywords
const ENTITY_MARKET_KEYWORDS = {
  IBEX_35:      ['ibex', 'ibex 35'],
  BITCOIN:      ['bitcoin', 'btc'],
  ETHEREUM:     ['ethereum', 'eth'],
  BRENT:        ['brent', 'petróleo', 'petroleo', 'barril'],
  LUZ_PVPC:     ['luz', 'pvpc', 'mwh', 'electricidad', 'pool eléctrico'],
  EURIBOR:      ['euríbor', 'euribor'],
  IPC_ES:       ['ipc', 'inflación', 'inflacion'],
  PIB_ES:       ['pib', 'crecimiento económico', 'crecimiento economico'],
  SP500:        ['s&p', 's&p 500', 'sp500'],
  NASDAQ:       ['nasdaq'],
  ORO:          ['oro', 'gold'],
  EURUSD:       ['euro', 'eurusd'],
  REAL_MADRID:  ['real madrid', 'madrid'],
  FC_BARCELONA: ['barcelona', 'barça', 'barca'],
  ATLETICO:     ['atlético', 'atletico', 'atleti'],
  SEVILLA_FC:   ['sevilla'],
  CHAMPIONS:    ['champions'],
  LALIGA:       ['liga', 'laliga'],
  COPA_REY:     ['copa del rey', 'copa rey'],
  CONGRESO:     ['congreso', 'parlamento', 'ley', 'decreto'],
  GOBIERNO_ES:  ['gobierno', 'consejo de ministros'],
}

// ─── Normalize text for comparison ───────────────────────────────────────

function norm(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // strip accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Score: how well does an article match a given market? ───────────────

function scoreMatch(article, market) {
  const articleEntities = (article.entities || []).map(e => e.name)
  const marketTitle     = norm(market.title)
  const marketDesc      = norm(market.description || '')
  const marketText      = marketTitle + ' ' + marketDesc

  let score = 0
  let direction = 'NEUTRAL'

  // 1. Entity keyword overlap
  for (const entityName of articleEntities) {
    const keywords = ENTITY_MARKET_KEYWORDS[entityName] || []
    for (const kw of keywords) {
      if (marketText.includes(norm(kw))) {
        score += 0.4
        break  // one match per entity is enough
      }
    }
  }

  if (score === 0) return { score: 0, direction: 'NEUTRAL' }

  // 2. Category alignment
  if (article.category === market.category) score += 0.2

  // 3. Sentiment → direction
  const sentiment = articleEntities.find(n => ['BULLISH','BEARISH'].includes(n))
  if (sentiment === 'BULLISH') direction = 'YES'
  if (sentiment === 'BEARISH') direction = 'NO'

  // 4. Boost for breaking/urgency
  if (articleEntities.includes('BREAKING')) score += 0.15

  // 5. Official data → strong match
  if (article.event_type === 'ECONOMIC_DATA' || article.event_type === 'SPORTS_RESULT') {
    score += 0.2
  }

  // 6. Credibility boost from source
  const credibility = article.credibility || 0.5
  score *= (0.7 + credibility * 0.3)  // scale: 0.7-1.0 multiplier

  return { score: Math.min(1, score), direction }
}

// ─── Main matcher ─────────────────────────────────────────────────────────

const MIN_MATCH_SCORE = 0.35

export function matchArticleToMarkets(article, activeMarkets) {
  const matches = []

  for (const market of activeMarkets) {
    // Skip markets that expire in less than 1 hour (too late to act on)
    const expiresIn = new Date(market.close_date) - new Date()
    if (expiresIn < 3600000) continue

    const { score, direction } = scoreMatch(article, market)
    if (score >= MIN_MATCH_SCORE) {
      matches.push({
        market,
        article,
        score,
        direction,
        confidence: Math.round(score * 100),
      })
    }
  }

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score)
}

// ─── Batch matching: many articles vs many markets ────────────────────────

export function matchBatch(articles, activeMarkets) {
  const allMatches = []

  for (const article of articles) {
    const matches = matchArticleToMarkets(article, activeMarkets)
    allMatches.push(...matches)
  }

  // Deduplicate: keep highest-score match per (article_id, market_id) pair
  const seen = new Map()
  for (const match of allMatches) {
    const key = `${match.article.id}__${match.market.id}`
    if (!seen.has(key) || seen.get(key).score < match.score) {
      seen.set(key, match)
    }
  }

  return Array.from(seen.values()).sort((a, b) => b.score - a.score)
}
