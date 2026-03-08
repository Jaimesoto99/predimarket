// ============================================================
// Market Detector — scans recent signals and articles to find
// opportunities for new prediction markets
//
// Detection strategy:
//   1. Fetch high-strength signals from last 6h
//   2. Group by primary entity name
//   3. Count distinct source coverage (need ≥ 3 trusted sources)
//   4. For each qualifying entity cluster → emit DetectionResult
//
// Returns: Array<DetectionResult>
//   { primaryEntity, entities, articleIds, distinctSources, avgStrength }
// ============================================================

import { createClient } from '@supabase/supabase-js'
import { ENTITY_ROLE_MAP } from './marketTemplates'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Config ───────────────────────────────────────────────────────────────

const DETECTION_WINDOW_HOURS  = 6    // scan articles from last N hours
const MIN_DISTINCT_SOURCES    = 2    // relaxed to 2 (minimum for Phase 3, validator enforces 3)
const MIN_ARTICLE_COUNT       = 2    // need at least 2 articles
const MIN_AVG_SIGNAL_STRENGTH = 0.30 // minimum average signal strength
const HIGH_STRENGTH_THRESHOLD = 0.45 // articles above this are "strong"

// ─── Fetch recent processed articles with entities ────────────────────────

async function fetchRecentArticles(sinceHours) {
  const supabase = getSupabase()
  const since    = new Date(Date.now() - sinceHours * 3600000).toISOString()

  const { data, error } = await supabase
    .from('articles')
    .select('id, title, source_key, source_label, category, credibility, entities, event_type, ingested_at, published_at')
    .eq('processed', true)
    .neq('event_type', 'IRRELEVANT')
    .gte('ingested_at', since)
    .order('ingested_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[marketDetector] fetchArticles error:', error.message)
    return []
  }
  return data || []
}

// ─── Fetch recent signals ─────────────────────────────────────────────────

async function fetchRecentSignals(sinceHours) {
  const supabase = getSupabase()
  const since    = new Date(Date.now() - sinceHours * 3600000).toISOString()

  const { data, error } = await supabase
    .from('signals')
    .select('id, market_id, article_id, direction, strength, signal_type, created_at')
    .eq('is_active', true)
    .gte('created_at', since)
    .gte('strength', MIN_AVG_SIGNAL_STRENGTH)
    .order('strength', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[marketDetector] fetchSignals error:', error.message)
    return []
  }
  return data || []
}

// ─── Extract primary entity from article entities array ───────────────────

function getPrimaryEntities(article) {
  const entities = article.entities || []
  // Prefer financial + sports entities (high-value for markets)
  const priority = ['INDEX','CRYPTO','COMMODITY','RATE','TEAM','DATA_INDICATOR','ENERGY']
  const sorted   = entities
    .filter(e => ENTITY_ROLE_MAP[e.name])   // only entities that map to template roles
    .sort((a, b) => {
      const ai = priority.indexOf(a.type)
      const bi = priority.indexOf(b.type)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
  return sorted.slice(0, 3)  // top 3 entities per article
}

// ─── Cluster articles by entity ───────────────────────────────────────────

function clusterByEntity(articles) {
  const clusters = new Map()  // entityName → { articles, sources, avgCredibility }

  for (const article of articles) {
    const primaryEntities = getPrimaryEntities(article)
    if (!primaryEntities.length) continue

    // Add article to each entity's cluster
    for (const entity of primaryEntities) {
      if (!clusters.has(entity.name)) {
        clusters.set(entity.name, {
          entityName:   entity.name,
          entityType:   entity.type,
          articles:     [],
          sources:      new Set(),
          credibilities:[],
        })
      }
      const c = clusters.get(entity.name)
      c.articles.push(article)
      c.sources.add(article.source_key || '')
      c.credibilities.push(article.credibility || 0.5)
    }
  }

  return clusters
}

// ─── Score a cluster ──────────────────────────────────────────────────────

function scoreCluster(cluster) {
  const { articles, sources, credibilities } = cluster
  const avgCred = credibilities.reduce((a, b) => a + b, 0) / credibilities.length
  const strong  = articles.filter(a => (a.credibility || 0.5) >= HIGH_STRENGTH_THRESHOLD).length
  return {
    articleCount:     articles.length,
    distinctSources:  sources.size,
    avgCredibility:   avgCred,
    strongArticles:   strong,
    qualifies:        articles.length >= MIN_ARTICLE_COUNT
                      && sources.size >= MIN_DISTINCT_SOURCES,
  }
}

// ─── Build co-occurring entities for a cluster ───────────────────────────

function getCoEntities(cluster, allArticles) {
  const coNames  = new Set()
  const articleIds = new Set(cluster.articles.map(a => a.id))

  for (const article of allArticles) {
    if (!articleIds.has(article.id)) continue
    for (const entity of (article.entities || [])) {
      if (entity.name !== cluster.entityName && ENTITY_ROLE_MAP[entity.name]) {
        coNames.add(entity.name)
      }
    }
  }

  return Array.from(coNames)
}

// ─── Main detection function ──────────────────────────────────────────────

export async function detectMarketOpportunities() {
  const [articles, signals] = await Promise.all([
    fetchRecentArticles(DETECTION_WINDOW_HOURS),
    fetchRecentSignals(DETECTION_WINDOW_HOURS),
  ])

  if (!articles.length) return []

  // Build a set of article IDs that have a strong signal
  const signaledArticleIds = new Set(signals.map(s => s.article_id).filter(Boolean))

  // Boost credibility of articles with active signals
  const boosted = articles.map(a => ({
    ...a,
    credibility: signaledArticleIds.has(a.id)
      ? Math.min(1, (a.credibility || 0.5) + 0.15)
      : (a.credibility || 0.5),
  }))

  const clusters = clusterByEntity(boosted)
  const results  = []

  for (const [entityName, cluster] of clusters) {
    const scored = scoreCluster(cluster)
    if (!scored.qualifies) continue

    const coEntities   = getCoEntities(cluster, boosted)
    const allEntities  = [entityName, ...coEntities]
    const articleIds   = cluster.articles.map(a => a.id)
    const articleObjs  = cluster.articles

    results.push({
      primaryEntity:   entityName,
      entityType:      cluster.entityType,
      entities:        allEntities,
      articleIds,
      articles:        articleObjs,
      distinctSources: scored.distinctSources,
      articleCount:    scored.articleCount,
      avgCredibility:  scored.avgCredibility,
      strongArticles:  scored.strongArticles,
    })
  }

  // Sort by article count × credibility (highest-quality detections first)
  results.sort((a, b) =>
    (b.articleCount * b.avgCredibility) - (a.articleCount * a.avgCredibility)
  )

  return results
}
