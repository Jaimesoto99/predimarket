// ============================================================
// Market Recommender — suggests relevant markets based on
// entity graph, user positions, and market activity
//
// Recommendation sources (blended):
//   1. ENTITY_RELATED  — markets sharing entities with user's positions
//   2. GRAPH_NEIGHBOR  — markets connected via entity relationships
//   3. TRENDING        — markets with recent high-importance events
//   4. CATEGORY_MATCH  — same category as user's active positions
//
// Each candidate gets a relevance score (0-1) and a reason label.
// ============================================================

import { createClient }           from '@supabase/supabase-js'
import { getMarketEntities,
         getMarketsForEntities }  from '../graph/marketEntityMapper'
import { getPropagationTargets }  from '../graph/relationshipGraph'
import { getTopEntities }         from '../graph/entityRegistry'
import { getTrendingEntities }    from '../graph/entityImportance'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Fetch user's open positions ──────────────────────────────────────────────

async function getUserPositionMarkets(userEmail) {
  const supabase = getSupabase()

  const { data: trades } = await supabase
    .from('trades')
    .select('market_id, side, amount')
    .eq('email', userEmail)
    .eq('status', 'OPEN')
    .order('amount', { ascending: false })
    .limit(20)

  return trades || []
}

// ─── Recommendation: entity-related markets ───────────────────────────────────

async function recommendByEntityRelation(positionMarketIds) {
  if (!positionMarketIds.length) return []

  // Get all entities linked to user's positions
  const entitySets = await Promise.all(
    positionMarketIds.map(id => getMarketEntities(id))
  )
  const entityIds = [...new Set(entitySets.flat().map(e => e.id))]
  if (!entityIds.length) return []

  // Find markets related to those entities (excluding already-held)
  const relatedMarkets = await getMarketsForEntities(entityIds, { status: 'ACTIVE' })

  return relatedMarkets
    .filter(m => !positionMarketIds.includes(m.id))
    .map(m => ({
      market_id: m.id,
      market:    m,
      score:     0.75,
      reason:    'ENTITY_RELATED',
      reason_label: 'Related to your positions',
    }))
}

// ─── Recommendation: graph neighbor markets ───────────────────────────────────

async function recommendByGraphNeighbor(positionMarketIds) {
  if (!positionMarketIds.length) return []

  const entitySets = await Promise.all(
    positionMarketIds.map(id => getMarketEntities(id))
  )
  const entityIds = [...new Set(entitySets.flat().map(e => e.id))]
  if (!entityIds.length) return []

  // BFS expand via relationship graph
  const neighbors = await getPropagationTargets(entityIds, { maxHops: 2, minStrength: 0.40 })
  const neighborEntityIds = Object.keys(neighbors)

  if (!neighborEntityIds.length) return []

  const markets = await getMarketsForEntities(neighborEntityIds, { status: 'ACTIVE' })

  return markets
    .filter(m => !positionMarketIds.includes(m.id))
    .map(m => {
      // Find max propagation strength for this market's entities
      const mEntityIds   = []  // will be enriched below
      const pathStrength = neighborEntityIds.reduce((max, eid) => {
        return Math.max(max, neighbors[eid]?.strength || 0)
      }, 0)

      return {
        market_id:    m.id,
        market:       m,
        score:        0.50 + pathStrength * 0.35,
        reason:       'GRAPH_NEIGHBOR',
        reason_label: 'Connected via entity relationships',
      }
    })
}

// ─── Recommendation: trending entity markets ──────────────────────────────────

async function recommendTrending(excludeMarketIds) {
  const trending = await getTrendingEntities({ limit: 8 })
  if (!trending.length) return []

  const trendingIds = trending.map(e => e.id)
  const markets     = await getMarketsForEntities(trendingIds, { status: 'ACTIVE' })

  return markets
    .filter(m => !excludeMarketIds.includes(m.id))
    .map((m, i) => ({
      market_id:    m.id,
      market:       m,
      score:        0.80 - i * 0.05,
      reason:       'TRENDING',
      reason_label: 'Trending entity',
    }))
}

// ─── Recommendation: category match ──────────────────────────────────────────

async function recommendByCategory(positionMarketIds) {
  if (!positionMarketIds.length) return []

  const supabase = getSupabase()

  // Get categories from user positions
  const { data: posMarkets } = await supabase
    .from('markets')
    .select('category')
    .in('id', positionMarketIds)

  const categories = [...new Set((posMarkets || []).map(m => m.category))]
  if (!categories.length) return []

  const { data: catMarkets } = await supabase
    .from('markets')
    .select('id, title, status, close_date, category, oracle_type, yes_pool, no_pool')
    .in('category', categories)
    .eq('status', 'ACTIVE')
    .gt('close_date', new Date().toISOString())
    .not('id', 'in', `(${positionMarketIds.join(',')})`)
    .order('close_date', { ascending: true })
    .limit(10)

  return (catMarkets || []).map(m => ({
    market_id:    m.id,
    market:       m,
    score:        0.55,
    reason:       'CATEGORY_MATCH',
    reason_label: `More ${m.category} markets`,
  }))
}

// ─── Deduplicate and rank candidates ─────────────────────────────────────────

function rankCandidates(candidates) {
  const seen    = new Map()

  for (const c of candidates) {
    const existing = seen.get(c.market_id)
    if (!existing || existing.score < c.score) {
      seen.set(c.market_id, c)
    }
  }

  return [...seen.values()]
    .sort((a, b) => b.score - a.score)
}

// ─── Main recommendation function ────────────────────────────────────────────

export async function getRecommendations(userEmail, { limit = 10 } = {}) {
  const positions        = await getUserPositionMarkets(userEmail)
  const positionMarketIds = [...new Set(positions.map(t => t.market_id))]

  // Run all recommendation strategies in parallel
  const [entityRecs, graphRecs, trendingRecs, categoryRecs] = await Promise.all([
    recommendByEntityRelation(positionMarketIds),
    recommendByGraphNeighbor(positionMarketIds),
    recommendTrending(positionMarketIds),
    recommendByCategory(positionMarketIds),
  ])

  const all    = [...entityRecs, ...graphRecs, ...trendingRecs, ...categoryRecs]
  const ranked = rankCandidates(all).slice(0, limit)

  return {
    recommendations: ranked,
    count:           ranked.length,
    based_on_positions: positionMarketIds.length,
  }
}

// ─── Recommendations for anonymous users (no position context) ───────────────

export async function getAnonymousRecommendations({ limit = 10, category = null } = {}) {
  const supabase = getSupabase()

  // Get trending entities
  const trending   = await getTrendingEntities({ limit: 6 })
  const trendingIds = trending.map(e => e.id)

  let markets
  if (trendingIds.length) {
    markets = await getMarketsForEntities(trendingIds, { status: 'ACTIVE' })
  }

  // Fallback: top markets by liquidity
  if (!markets?.length) {
    let q = supabase
      .from('markets')
      .select('id, title, status, close_date, category, oracle_type, yes_pool, no_pool')
      .eq('status', 'ACTIVE')
      .gt('close_date', new Date().toISOString())
      .order('yes_pool', { ascending: false })
      .limit(limit)

    if (category) q = q.eq('category', category)

    const { data } = await q
    markets = data || []
  }

  if (category) {
    markets = markets.filter(m => m.category === category)
  }

  return {
    recommendations: markets.slice(0, limit).map(m => ({
      market_id: m.id,
      market:    m,
      score:     0.60,
      reason:    'TRENDING',
      reason_label: 'Popular market',
    })),
    count: Math.min(markets.length, limit),
    based_on_positions: 0,
  }
}

// ─── Related markets for a specific market ────────────────────────────────────

export async function getRelatedMarkets(marketId, { limit = 6 } = {}) {
  // Get entities for this market
  const entities  = await getMarketEntities(marketId)
  const entityIds = entities.map(e => e.id)

  if (!entityIds.length) return []

  // Graph neighbors
  const neighbors  = await getPropagationTargets(entityIds, { maxHops: 2, minStrength: 0.40 })
  const allEntities = [...entityIds, ...Object.keys(neighbors)]

  const relatedMarkets = await getMarketsForEntities(allEntities, { status: 'ACTIVE' })

  return relatedMarkets
    .filter(m => m.id !== marketId)
    .slice(0, limit)
    .map(m => ({
      ...m,
      relation: entityIds.some(e => Object.keys(neighbors).includes(e))
        ? 'GRAPH_NEIGHBOR'
        : 'ENTITY_RELATED',
    }))
}
