// ============================================================
// Scheduler Jobs — defines all pipeline job implementations
// Jobs run as serverless functions triggered by /api/engine/run
// Each job is atomic, idempotent, and has a defined interval
// ============================================================

import { getActiveSources }       from '../sources/sourceRegistry'
import { fetchAllFeeds }          from '../ingestion/rssFetcher'
import { normalizeArticles }      from '../ingestion/articleNormalizer'
import { enqueueArticles, getUnprocessedArticles, updateArticleDetection, pruneOldArticles }
                                  from '../ingestion/articleQueue'
import { extractEntities }        from '../detection/entityExtractor'
import { classifyEvent }          from '../detection/eventClassifier'
import { matchBatch }             from '../detection/marketMatcher'
import { scoreMatches }           from '../signals/signalScorer'
import { createSignal }           from '../signals/signalCreator'
import { publishSignals, expireSignals }
                                  from '../signals/signalPublisher'
import { snapshotAllActiveMarkets, recordSignalSnapshot }
                                  from '../probability/probabilityUpdater'
import { syncTradeActivity, pruneOldActivity }
                                  from '../activity/activityGenerator'
import { detectMarketOpportunities }
                                  from '../../../backend/markets/marketDetector'
import { buildCandidates }        from '../../../backend/markets/marketCandidateBuilder'
import { validateCandidates }     from '../../../backend/markets/marketValidator'
import { createMarkets }          from '../../../backend/markets/marketCreator'
import { closeExpiredMarkets, archiveOldMarkets, rejectExpiredCandidates, archiveDeadMarkets }
                                  from '../../../backend/markets/marketLifecycle'
import { resolveClosingMarkets }  from '../../../backend/resolution/resolutionEngine'
import { scoreRecentSignals }     from '../../../backend/trust/signalTrustEngine'
import { updateAllMarketTrustScores } from '../../../backend/trust/marketTrustScore'
import { runManipulationDetection }   from '../../../backend/trust/manipulationDetector'
import { runOracleHealthCheck }   from '../../../backend/trust/oracleVerifier'
import { syncSourceRows }         from '../../../backend/trust/sourceScorer'
import { processArticleIntoGraph } from '../../../backend/graph/eventGraph'
import { syncAllMarketEntityLinks } from '../../../backend/graph/marketEntityMapper'
import { computeAllImportanceScores, syncSignalCounts } from '../../../backend/graph/entityImportance'
import { runReasoning }           from '../../../backend/reasoning/reasoningEngine'
import { runCrossMarketPropagation } from '../../../backend/graph/crossMarketSignals'
import { createClient }           from '@supabase/supabase-js'
import {
  computeLMSRPrice,
  computeDynamicSpread,
  computeVolatilityMetrics,
} from '../../amm'
import { getProbabilityHistory }  from '../probability/probabilityHistory'
import { rankMarkets }            from '../intelligence/marketRanker'
import { clusterMarkets }         from '../intelligence/marketClusterer'
import { detectTrends }           from '../intelligence/trendDetector'
import { calibrateMarkets }       from '../intelligence/probabilityCalibrator'
import { analyzeTopics }          from '../intelligence/topicAnalyzer'
import { computePopularityScores, slugify } from '../../watchlist'
import { fetchSpainNews }        from '../spainSignals/spainNewsFetcher'
import { detectSpainTrends }     from '../spainSignals/spainTrendSignals'
import { classifySpainArticles } from '../spainSignals/spainEventDetector'
import { createSpainMarkets }    from '../spainSignals/spainMarketCreator'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Job: INGEST — fetch RSS feeds → enqueue articles ────────────────────

export async function runIngest() {
  const sources = getActiveSources()
  const { items, fetched, errors } = await fetchAllFeeds(sources)

  const normalized = normalizeArticles(items)
  const { inserted, duplicates } = await enqueueArticles(normalized)

  // Prune old processed articles (weekly cleanup)
  await pruneOldArticles()

  return {
    sources_fetched:  fetched,
    sources_errors:   errors.length,
    articles_raw:     items.length,
    articles_normal:  normalized.length,
    articles_new:     inserted,
    articles_dup:     duplicates,
  }
}

// ─── Job: DETECT — extract entities + classify unprocessed articles ───────

export async function runDetect() {
  const articles = await getUnprocessedArticles(60)
  if (!articles.length) return { processed: 0 }

  let processed = 0
  for (const article of articles) {
    const entities   = extractEntities(article)
    const event_type = classifyEvent({ ...article, entities })

    await updateArticleDetection(article.id, { entities, event_type })
    processed++
  }

  return { processed, total: articles.length }
}

// ─── Job: SIGNALS — match articles to markets → score → publish ───────────

export async function runSignals() {
  const supabase = getSupabase()

  // Load active markets
  const { data: markets, error: mErr } = await supabase
    .from('markets')
    .select('id, title, description, category, close_date, yes_pool, no_pool, status')
    .eq('status', 'ACTIVE')
    .gt('close_date', new Date().toISOString())

  if (mErr || !markets?.length) return { signals: 0, matches: 0 }

  // Enrich markets with current prices
  const enriched = markets.map(m => ({
    ...m,
    prices: {
      yes: (parseFloat(m.no_pool) / (parseFloat(m.yes_pool) + parseFloat(m.no_pool))) * 100,
    },
  }))

  // Fetch recent processed articles (last 2h) with entities
  const { data: articles, error: aErr } = await supabase
    .from('articles')
    .select('*')
    .eq('processed', true)
    .neq('event_type', 'IRRELEVANT')
    .gte('ingested_at', new Date(Date.now() - 2 * 3600000).toISOString())
    .order('ingested_at', { ascending: false })
    .limit(100)

  if (aErr || !articles?.length) return { signals: 0, matches: 0 }

  // Match articles to markets
  const matches = matchBatch(articles, enriched)
  if (!matches.length) return { signals: 0, matches: 0 }

  // Score matches
  const scored = scoreMatches(matches)

  // Build signal records
  const signals = scored.map(sm => createSignal(sm.match, sm.strength, sm.probDelta))

  // Publish (skips duplicates)
  const { published, skipped, ids } = await publishSignals(signals)

  // Expire stale signals
  const expired = await expireSignals()

  // Record probability snapshots for affected markets
  let snapshots = 0
  if (ids.length > 0) {
    const { data: pubSignals } = await supabase
      .from('signals')
      .select('id, market_id, markets(id, yes_pool, no_pool)')
      .in('id', ids)

    for (const sig of (pubSignals || [])) {
      if (sig.markets) {
        await recordSignalSnapshot(sig.markets, sig.id)
        snapshots++
      }
    }
  }

  return {
    matches:   matches.length,
    scored:    scored.length,
    published,
    skipped,
    expired,
    snapshots,
  }
}

// ─── Job: PROBABILITY — snapshot all active markets ───────────────────────

export async function runProbability() {
  return snapshotAllActiveMarkets()
}

// ─── Job: ACTIVITY — sync recent trades → activity events ────────────────

export async function runActivity() {
  const [tradeSync] = await Promise.all([
    syncTradeActivity(15),
    pruneOldActivity(),
  ])
  return { synced_trades: tradeSync.synced }
}

// ─── Daily creation budget ────────────────────────────────────────────────
// Target: 2 global markets/day. Creation is spread across three daily windows
// (morning, midday, evening) so markets appear throughout the day.
// Each window allows at most 1 new market. Combined with Spain signals
// (2/day) this yields 3–5 markets/day total.

const CREATION_WINDOWS = [
  { startH: 7,  endH: 10 },   // morning   07:00–10:00
  { startH: 12, endH: 15 },   // midday    12:00–15:00
  { startH: 17, endH: 21 },   // evening   17:00–21:00
]

function isInCreationWindow() {
  const hour = new Date().getUTCHours() + 1  // CET offset (approx)
  return CREATION_WINDOWS.some(w => hour >= w.startH && hour < w.endH)
}

// ─── Job: CREATE_MARKETS — detect opportunities → validate → create ───────

export async function runCreateMarkets() {
  // Only create markets during allowed time windows (spread across the day)
  if (!isInCreationWindow()) {
    return { skipped: true, reason: 'outside_creation_window', detections: 0, created: 0 }
  }

  // Step 1: Detect opportunities from recent articles + signals
  const detections = await detectMarketOpportunities()
  if (!detections.length) {
    return { detections: 0, candidates: 0, approved: 0, created: 0 }
  }

  // Step 2: Build candidates (fill templates + score)
  const { candidates, errors: buildErrors } = await buildCandidates(detections)
  if (!candidates.length) {
    return { detections: detections.length, candidates: 0, approved: 0, created: 0, buildErrors }
  }

  // Step 3: Validate candidates (sources, dedup, oracle, etc.)
  const { approved, rejected } = await validateCandidates(candidates)

  // Step 4: Create validated markets (max 3 per run to avoid spam)
  let createResult = { created: 0, failed: 0, details: [], errors: [] }
  if (approved.length > 0) {
    createResult = await createMarkets(approved, 3)
  }

  // Step 4b: Assign slugs to newly created markets
  if (createResult.details?.length) {
    const supabase = getSupabase()
    for (const m of createResult.details) {
      if (m.marketId && m.question) {
        const slug = slugify(m.question) + '-' + m.marketId.slice(0, 6)
        await supabase.from('markets').update({ slug }).eq('id', m.marketId).catch(() => {})
      }
    }
  }

  // Step 5: Lifecycle maintenance
  const [closedResult, archiveResult, rejectResult, deadResult] = await Promise.all([
    closeExpiredMarkets(),
    archiveOldMarkets(),
    rejectExpiredCandidates(),
    archiveDeadMarkets(),      // Part 6 — remove dead markets with 0 trades after 48h
  ])

  return {
    detections:     detections.length,
    candidates:     candidates.length,
    approved:       approved.length,
    rejected:       rejected.length,
    created:        createResult.created,
    create_failed:  createResult.failed,
    lifecycle: {
      closed:             closedResult.closed,
      archived:           archiveResult.archived,
      expired_candidates: rejectResult.rejected,
      dead_archived:      deadResult.archived,
    },
    build_errors: buildErrors,
    new_markets:  createResult.details,
  }
}

// ─── Job: RESOLVE — resolve CLOSING markets using oracles ─────────────────

export async function runResolve() {
  return resolveClosingMarkets()
}

// ─── Job: TRUST — score signals, update market trust, run detectors ───────

export async function runTrust() {
  // 1. Ensure source rows exist in DB
  const syncResult = await syncSourceRows()

  // 2. Score recent unscored signals with trust metadata
  const signalResult = await scoreRecentSignals({ sinceHours: 6, batchSize: 100 })

  // 3. Run manipulation detection on all active markets
  const manipResult = await runManipulationDetection()

  // 4. Update composite market trust scores
  const trustResult = await updateAllMarketTrustScores()

  // 5. Oracle health check (best-effort, non-blocking)
  let oracleResult = { checked: 0, available: 0 }
  try {
    oracleResult = await runOracleHealthCheck()
  } catch (err) {
    console.error('[trust] oracle health check error:', err.message)
  }

  return {
    sources_synced:   syncResult.synced,
    signals_scored:   signalResult.scored,
    signal_errors:    signalResult.errors,
    markets_checked:  manipResult.checked,
    alerts_created:   manipResult.alerts,
    trust_updated:    trustResult.updated,
    trust_errors:     trustResult.errors,
    oracles_checked:  oracleResult.checked,
    oracles_available: oracleResult.available,
  }
}

// ─── Job: GRAPH — entity graph + reasoning + cross-market propagation ─────

export async function runGraph() {
  const supabase = getSupabase()

  // Step 1: Feed recently processed articles into the event graph
  const since = new Date(Date.now() - 35 * 60000).toISOString()  // last 35 min
  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, entities, event_type, relevance_score, processed')
    .eq('processed', true)
    .neq('event_type', 'IRRELEVANT')
    .gte('ingested_at', since)
    .order('ingested_at', { ascending: false })
    .limit(50)

  let eventsCreated = 0
  for (const article of articles || []) {
    const eventId = await processArticleIntoGraph(article).catch(() => null)
    if (eventId) eventsCreated++
  }

  // Step 2: Sync market-entity links for new markets
  const linkResult = await syncAllMarketEntityLinks()

  // Step 3: Run causal reasoning on pending events
  const reasoningResult = await runReasoning({ limit: 50 })

  // Step 4: Cross-market signal propagation
  const crossResult = await runCrossMarketPropagation({ sinceHours: 1, minStrength: 0.40 })

  // Step 5: Recompute entity importance scores
  const [importanceResult, signalCountResult] = await Promise.all([
    computeAllImportanceScores(),
    syncSignalCounts(),
  ])

  return {
    articles_processed:   (articles || []).length,
    events_created:       eventsCreated,
    markets_linked:       linkResult.synced,
    reasoning_processed:  reasoningResult.processed,
    causal_signals:       reasoningResult.signals_generated,
    cross_market_signals: crossResult.propagated,
    importance_updated:   importanceResult.updated,
  }
}

// ─── Job: AMM_METRICS — compute volatility + LMSR + spread per market ─────

export async function runAMMMetrics() {
  const supabase = getSupabase()

  const { data: markets, error } = await supabase
    .from('markets')
    .select('id, yes_pool, no_pool, status, close_date')
    .eq('status', 'ACTIVE')
    .gt('close_date', new Date().toISOString())

  if (error || !markets?.length) return { updated: 0 }

  let updated = 0
  const rows  = []

  for (const market of markets) {
    try {
      const snapshots  = await getProbabilityHistory(market.id, { hours: 168, limit: 500 })
      const volMets    = computeVolatilityMetrics(snapshots)
      const spread     = computeDynamicSpread(market.yes_pool, market.no_pool)
      const lmsr       = computeLMSRPrice(market.yes_pool, market.no_pool)

      rows.push({
        market_id:  market.id,
        vol_24h:    volMets.vol_24h,
        vol_7d:     volMets.vol_7d,
        vol_all:    volMets.vol_all,
        spread,
        lmsr_yes:   lmsr.yes,
        lmsr_no:    lmsr.no,
        lmsr_b:     lmsr.b,
        computed_at: new Date().toISOString(),
      })

      // Cache on market row for fast API access
      await supabase
        .from('markets')
        .update({ vol_24h: volMets.vol_24h, vol_7d: volMets.vol_7d, spread, lmsr_yes: lmsr.yes, lmsr_no: lmsr.no })
        .eq('id', market.id)

      updated++
    } catch (err) {
      console.error('[runAMMMetrics] market', market.id, err.message)
    }
  }

  // Bulk insert metrics history (best-effort)
  if (rows.length) {
    await supabase.from('amm_metrics').insert(rows).catch(() => {})
  }

  return { updated, total: markets.length }
}

// ─── Job: INTELLIGENCE — rank, cluster, trend, calibrate, topics ──────────

export async function runIntelligence() {
  const [rankResult, clusterResult, trendResult, calibrateResult, topicResult, popularityResult] = await Promise.allSettled([
    rankMarkets(),
    clusterMarkets(),
    detectTrends(),
    calibrateMarkets(),
    analyzeTopics(),
    computePopularityScores(),
  ])

  const unwrap = r => r.status === 'fulfilled' ? r.value : { error: r.reason?.message }

  const result = {
    rank:       unwrap(rankResult),
    cluster:    unwrap(clusterResult),
    trends:     unwrap(trendResult),
    calibrate:  unwrap(calibrateResult),
    topics:     unwrap(topicResult),
    popularity: unwrap(popularityResult),
  }

  console.log('[intelligence]', JSON.stringify({
    ranked:    result.rank?.ranked,
    clustered: result.cluster?.clustered,
    trending:  result.trends?.trending,
    flagged:   result.calibrate?.flagged,
    topics:    result.topics?.topics,
  }))

  return result
}

// ─── Job: SPAIN_SIGNALS — fetch Spanish news, detect trends, create markets ─

export async function runSpainSignals() {
  // Spain signals run in the same windows as global creation, staggered by 30 min.
  // The 20-min interval means this fires frequently; the window gate ensures
  // at most 2 Spain markets per day (one morning, one evening).
  if (!isInCreationWindow()) {
    return { skipped: true, reason: 'outside_creation_window', articles_total: 0, markets_created: 0 }
  }

  // 1. Fetch all Spanish news sources
  const { items: articles, fetched, errors } = await fetchSpainNews()

  // 2. Detect trending keywords (Google Trends + frequency)
  const trends = await detectSpainTrends(articles)

  // 3. Classify articles into Spain event types
  const classified = classifySpainArticles(articles)

  // 4. Sort by credibility × confidence (best articles first)
  const sorted = classified
    .sort((a, b) => ((b.credibility || 0.5) * (b.spain_confidence || 0.5)) - ((a.credibility || 0.5) * (a.spain_confidence || 0.5)))

  // 5. Create up to 2 Spain markets per run
  const createResult = await createSpainMarkets(sorted, 2)

  console.log('[spainSignals] articles:', articles.length,
    '| classified:', classified.length,
    '| trends:', trends.length,
    '| created:', createResult.created,
    '| skipped:', createResult.skipped)

  return {
    sources_fetched: fetched,
    source_errors:   errors,
    articles_total:  articles.length,
    articles_classified: classified.length,
    trends_detected: trends.length,
    top_trends:      trends.slice(0, 5).map(t => t.keyword),
    markets_created: createResult.created,
    markets_skipped: createResult.skipped,
    new_markets:     createResult.details,
  }
}

// ─── Job config map ───────────────────────────────────────────────────────

export const JOBS = {
  ingest: {
    name:            'ingest',
    description:     'Fetch RSS feeds and enqueue articles',
    intervalMinutes: 15,
    fn:              runIngest,
  },
  detect: {
    name:            'detect',
    description:     'Extract entities and classify unprocessed articles',
    intervalMinutes: 15,
    fn:              runDetect,
  },
  signals: {
    name:            'signals',
    description:     'Match articles to markets, score and publish signals',
    intervalMinutes: 30,
    fn:              runSignals,
  },
  probability: {
    name:            'probability',
    description:     'Snapshot probability for all active markets',
    intervalMinutes: 60,
    fn:              runProbability,
  },
  activity: {
    name:            'activity',
    description:     'Sync trades to activity events feed',
    intervalMinutes: 5,
    fn:              runActivity,
  },
  create_markets: {
    name:            'create_markets',
    description:     'Detect opportunities and auto-create prediction markets',
    intervalMinutes: 60,
    fn:              runCreateMarkets,
  },
  resolve: {
    name:            'resolve',
    description:     'Resolve CLOSING markets via oracles',
    intervalMinutes: 30,
    fn:              runResolve,
  },
  trust: {
    name:            'trust',
    description:     'Score signal trust, detect manipulation, update market trust scores',
    intervalMinutes: 60,
    fn:              runTrust,
  },
  graph: {
    name:            'graph',
    description:     'Build entity graph, run causal reasoning, propagate cross-market signals',
    intervalMinutes: 30,
    fn:              runGraph,
  },
  amm_metrics: {
    name:            'amm_metrics',
    description:     'Compute volatility (24h, 7d), dynamic spread, and LMSR supplementary prices',
    intervalMinutes: 60,
    fn:              runAMMMetrics,
  },
  intelligence: {
    name:            'intelligence',
    description:     'Rank markets, cluster topics, detect trends, calibrate probabilities',
    intervalMinutes: 30,
    fn:              runIntelligence,
  },
  spain_signals: {
    name:            'spain_signals',
    description:     'Fetch Spanish news, detect trends, auto-create Spain-focused markets',
    intervalMinutes: 20,
    fn:              runSpainSignals,
  },
}
