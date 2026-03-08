// ============================================================
// Market Scorer — computes a 0-1 relevance score for market candidates
//
// Components:
//   newsVolume       (0-1)  — article count in last 24h
//   sourceQuality    (0-1)  — average credibility of covering sources
//   entityImportance (0-1)  — how significant this entity is
//   novelty          (0-1)  — is this a fresh topic?
//   resolvability    (0-1)  — can we deterministically resolve it?
//   marketability    (0-1)  — probability close to 50/50 = more interesting
//
// Final score = weighted average (0-1)
// ============================================================

import { isDeterministic } from './marketCategories'
import { createClient }    from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Entity importance weights ────────────────────────────────────────────

const ENTITY_IMPORTANCE = {
  // Financial
  IBEX_35:      0.95,
  SP500:        0.90,
  NASDAQ:       0.85,
  DAX:          0.80,
  BITCOIN:      0.90,
  ETHEREUM:     0.80,
  BRENT:        0.85,
  ORO:          0.75,
  EURIBOR:      0.90,
  IPC_ES:       0.90,
  PIB_ES:       0.85,
  LUZ_PVPC:     0.85,
  EURUSD:       0.70,
  // Sports
  REAL_MADRID:  0.90,
  FC_BARCELONA: 0.90,
  ATLETICO:     0.80,
  SEVILLA_FC:   0.70,
  CHAMPIONS:    0.85,
  LALIGA:       0.80,
  // Political
  CONGRESO:     0.75,
  GOBIERNO_ES:  0.80,
  BCE:          0.85,
  FED:          0.80,
  INE:          0.80,
}

const DEFAULT_ENTITY_IMPORTANCE = 0.50

function maxEntityImportance(entityNames) {
  let max = DEFAULT_ENTITY_IMPORTANCE
  for (const name of entityNames) {
    const imp = ENTITY_IMPORTANCE[name] ?? DEFAULT_ENTITY_IMPORTANCE
    if (imp > max) max = imp
  }
  return max
}

// ─── News volume score ────────────────────────────────────────────────────
// Normalize: 1 article = 0.1, 5+ articles = 0.6, 10+ = 1.0

function newsVolumeScore(articleCount) {
  if (articleCount <= 0) return 0
  if (articleCount >= 10) return 1.0
  return Math.min(1, articleCount / 10)
}

// ─── Source quality score ─────────────────────────────────────────────────

function sourceQualityScore(articles) {
  if (!articles?.length) return 0.5
  const avg = articles.reduce((sum, a) => sum + (a.credibility || 0.5), 0) / articles.length
  return avg
}

// ─── Distinct source count ────────────────────────────────────────────────

function countDistinctSources(articles) {
  const sources = new Set(articles.map(a => a.source_key || a.source_label || ''))
  return sources.size
}

// ─── Novelty score ────────────────────────────────────────────────────────
// High novelty = sudden spike in coverage (entity not covered 3 days ago but covered now)

function noveltyScore(recentCount, olderCount) {
  if (olderCount === 0 && recentCount > 0) return 1.0  // totally new topic
  if (olderCount === 0) return 0.5
  const ratio = recentCount / (olderCount + 1)
  return Math.min(1, ratio / 3)  // ratio of 3x spike = score 1.0
}

// ─── Resolvability score ──────────────────────────────────────────────────

function resolvabilityScore(oracle_type) {
  if (!oracle_type) return 0.1
  if (isDeterministic(oracle_type)) return 1.0
  // Semi-deterministic (requires human judgment)
  if (['NEWS_CONFIRMATION','OFFICIAL_STATEMENT'].includes(oracle_type)) return 0.60
  return 0.40
}

// ─── Marketability score ──────────────────────────────────────────────────
// Markets near 50% probability are most interesting for traders

function marketabilityScore(initialProbRange) {
  if (!initialProbRange) return 0.6
  const [low, high] = initialProbRange
  const midpoint = (low + high) / 2
  const distFromFifty = Math.abs(midpoint - 50)
  return Math.max(0.3, 1 - distFromFifty / 50)
}

// ─── Main scorer ──────────────────────────────────────────────────────────

export function scoreCandidate(candidate, coveringArticles, olderArticles = []) {
  const entityNames = Object.keys(candidate.entities || {})

  const components = {
    newsVolume:        newsVolumeScore(coveringArticles.length),
    sourceQuality:     sourceQualityScore(coveringArticles),
    entityImportance:  maxEntityImportance(entityNames),
    novelty:           noveltyScore(coveringArticles.length, olderArticles.length),
    resolvability:     resolvabilityScore(candidate.oracle_type),
    marketability:     marketabilityScore(candidate.initial_prob),
  }

  // Weights must sum to 1.0
  const WEIGHTS = {
    newsVolume:        0.20,
    sourceQuality:     0.20,
    entityImportance:  0.20,
    novelty:           0.15,
    resolvability:     0.15,
    marketability:     0.10,
  }

  const score = Object.entries(components).reduce((sum, [key, value]) => {
    return sum + value * WEIGHTS[key]
  }, 0)

  return {
    score:             parseFloat(score.toFixed(4)),
    components,
    news_volume:       coveringArticles.length,
    source_quality:    components.sourceQuality,
    entity_importance: components.entityImportance,
    novelty_score:     components.novelty,
    distinct_sources:  countDistinctSources(coveringArticles),
  }
}

// ─── Fetch covering articles from DB (last N hours per entity) ────────────

export async function fetchCoveringArticles(entityNames, sinceHours = 24) {
  const supabase = getSupabase()
  const since    = new Date(Date.now() - sinceHours * 3600000).toISOString()

  // Build entity keyword search: articles whose entities array contains these names
  const { data, error } = await supabase
    .from('articles')
    .select('id, source_key, credibility, ingested_at, entities')
    .gte('ingested_at', since)
    .eq('processed', true)

  if (error || !data) return []

  // Filter articles that mention at least one of the entity names
  return data.filter(article => {
    const articleEntities = (article.entities || []).map(e => e.name)
    return entityNames.some(n => articleEntities.includes(n))
  })
}
