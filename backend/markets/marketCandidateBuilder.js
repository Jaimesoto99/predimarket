// ============================================================
// Market Candidate Builder — converts detection results into
// candidate market records ready for validation + scoring
//
// For each DetectionResult:
//   1. Select best matching template
//   2. Fetch live prices (if entity is financial)
//   3. Fill template with entity values + live data
//   4. Build candidate record
// ============================================================

import { selectBestTemplate, fillTemplate, validateFilledTemplate }
  from './templateEngine'
import { ENTITY_ROLE_MAP } from './marketTemplates'
import { scoreCandidate, fetchCoveringArticles } from './marketScorer'

// ─── Live price fetchers ──────────────────────────────────────────────────

async function fetchLivePrices(entityName) {
  const prices = {}
  try {
    if (['IBEX_35'].includes(entityName)) {
      const r = await fetch(
        'https://query1.finance.yahoo.com/v8/finance/chart/%5EIBEX?interval=1d&range=1d',
        { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) }
      )
      const d = await r.json()
      const p = d?.chart?.result?.[0]?.meta?.regularMarketPrice
      if (p) {
        prices.CURRENT_PRICE = Math.round(p).toLocaleString('es-ES')
        prices.THRESHOLD     = (Math.round(p * 1.008 / 25) * 25).toLocaleString('es-ES')
      }
    }

    if (['BITCOIN'].includes(entityName)) {
      const r = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
        { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) }
      )
      const d = await r.json()
      const p = d?.bitcoin?.usd
      if (p) {
        prices.CURRENT_PRICE = Math.round(p).toLocaleString('en-US')
        prices.THRESHOLD     = (Math.round(p * 1.015 / 500) * 500).toLocaleString('en-US')
      }
    }

    if (['ETHEREUM'].includes(entityName)) {
      const r = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
        { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) }
      )
      const d = await r.json()
      const p = d?.ethereum?.usd
      if (p) {
        prices.CURRENT_PRICE = Math.round(p).toLocaleString('en-US')
        prices.THRESHOLD     = (Math.round(p * 1.02 / 10) * 10).toLocaleString('en-US')
      }
    }

    if (['BRENT'].includes(entityName)) {
      const r = await fetch(
        'https://query1.finance.yahoo.com/v8/finance/chart/BZ%3DF?interval=1d&range=1d',
        { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) }
      )
      const d = await r.json()
      const p = d?.chart?.result?.[0]?.meta?.regularMarketPrice
      if (p) {
        prices.CURRENT_PRICE = p.toFixed(2)
        prices.THRESHOLD     = (Math.round(p * 1.01 * 4) / 4).toFixed(2)
      }
    }
  } catch {
    // Live prices are optional — templates have fallbacks
  }
  return prices
}

// ─── Build entity object from detection result ────────────────────────────

function buildEntityObject(detection) {
  const obj = {}
  for (const entityName of detection.entities) {
    const role = ENTITY_ROLE_MAP[entityName]
    if (role) obj[entityName] = role
  }
  return obj
}

// ─── Build virtual article entity list for template selection ─────────────

function buildEntityList(detection) {
  // Create a minimal entity object list that templateEngine understands
  return detection.entities.map(name => ({
    name,
    type: ENTITY_ROLE_MAP[name] || 'UNKNOWN',
    confidence: 0.9,
    values: [],  // live prices added separately as liveData
  }))
}

// ─── Build a single candidate ─────────────────────────────────────────────

export async function buildCandidate(detection) {
  const entityList   = buildEntityList(detection)
  const primaryEntity = detection.primaryEntity

  // Fetch live prices for financial entities
  const liveData = await fetchLivePrices(primaryEntity)

  // Fill the best matching template
  const filled = selectBestTemplate(entityList)
  if (!filled) return null

  // Override with live price data
  const filledWithLive = fillTemplate(filled.templateId, entityList, liveData)
  if (!filledWithLive) return null

  const validation = validateFilledTemplate(filledWithLive)
  if (!validation.valid) return null

  // Fetch covering articles for scoring
  const [coveringArticles, olderArticles] = await Promise.all([
    fetchCoveringArticles(detection.entities, 24),
    fetchCoveringArticles(detection.entities, 72).then(all =>
      all.filter(a => new Date(a.ingested_at) < new Date(Date.now() - 24 * 3600000))
    ),
  ])

  const entityObj = buildEntityObject(detection)

  // Score the candidate
  const scored = scoreCandidate(
    { ...filledWithLive, entities: entityObj },
    coveringArticles,
    olderArticles,
  )

  // Candidate expiry: auto-reject if not acted on within 2x duration
  const expiresAt = new Date(
    Date.now() + filledWithLive.duration_hours * 2 * 3600000
  ).toISOString()

  return {
    template_id:       filledWithLive.templateId,
    category:          filledWithLive.category,
    question:          filledWithLive.question,
    description:       filledWithLive.description,
    oracle_type:       filledWithLive.oracle_type,
    duration_hours:    filledWithLive.duration_hours,
    entities:          entityObj,
    source_articles:   detection.articleIds,
    relevance_score:   scored.score,
    news_volume:       scored.news_volume,
    source_quality:    scored.source_quality,
    entity_importance: scored.entity_importance,
    novelty_score:     scored.novelty_score,
    initial_prob:      filledWithLive.initial_prob,
    status:            'PENDING',
    expires_at:        expiresAt,
    // Internal — not persisted to DB but used during pipeline
    _detection:        detection,
    _scoring:          scored,
  }
}

// ─── Build candidates from multiple detections ────────────────────────────

export async function buildCandidates(detections) {
  const results   = []
  const errors    = []

  for (const detection of detections) {
    try {
      const candidate = await buildCandidate(detection)
      if (candidate) results.push(candidate)
    } catch (err) {
      errors.push({ entity: detection.primaryEntity, error: err.message })
    }
  }

  // Sort by relevance score descending
  results.sort((a, b) => b.relevance_score - a.relevance_score)

  return { candidates: results, errors }
}
