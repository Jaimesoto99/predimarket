// ============================================================
// Cross-Market Signals — propagate signals across related markets
//
// When a signal fires on market A (entity: BITCOIN), find all
// markets related via entity graph and generate derivative
// signals with damped strength.
//
// Damping model:
//   propagated_strength = original × relationship_strength × HOP_DAMPING
//   HOP_DAMPING = 0.70 per hop
// ============================================================

import { createClient }        from '@supabase/supabase-js'
import { getMarketEntities }   from './marketEntityMapper'
import { getPropagationTargets } from './relationshipGraph'
import { getMarketsForEntities } from './marketEntityMapper'
import { createSignal }        from '../../lib/engine/signals/signalCreator'
import { publishSignals }      from '../../lib/engine/signals/signalPublisher'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

const HOP_DAMPING        = 0.70   // strength multiplier per relationship hop
const MIN_SIGNAL_STRENGTH = 0.15  // below this, don't propagate

// ─── Propagate a single signal to related markets ────────────────────────────

export async function propagateSignal(signal, sourceMarket) {
  // 1. Get entities linked to the source market
  const sourceEntities = await getMarketEntities(sourceMarket.id)
  const entityIds      = sourceEntities.map(e => e.id)

  if (!entityIds.length) return { propagated: 0 }

  // 2. Find reachable entities via graph (max 2 hops)
  const targets = await getPropagationTargets(entityIds, {
    maxHops:     2,
    minStrength: 0.35,
  })

  if (!Object.keys(targets).length) return { propagated: 0 }

  // 3. Find markets connected to target entities (excluding source market)
  const targetEntityIds  = Object.keys(targets)
  const targetMarkets    = await getMarketsForEntities(targetEntityIds, { status: 'ACTIVE' })
  const relatedMarkets   = targetMarkets.filter(m => m.id !== sourceMarket.id)

  if (!relatedMarkets.length) return { propagated: 0 }

  // 4. Build derived signals
  const derivedSignals = []

  for (const targetMarket of relatedMarkets) {
    // Find which entity links this market to the propagation path
    const linkedEntities = await getMarketEntities(targetMarket.id)
    const linkingEntity  = linkedEntities.find(e => targets[e.id])

    if (!linkingEntity) continue

    const propagation = targets[linkingEntity.id]
    const dampedStrength = signal.strength * propagation.strength * HOP_DAMPING

    if (dampedStrength < MIN_SIGNAL_STRENGTH) continue

    // Determine direction based on relationship direction
    let direction = signal.direction || 'YES'
    if (propagation.direction === 'INVERSE') {
      direction = direction === 'YES' ? 'NO' : 'YES'
    }

    const probDelta  = direction === 'YES'
      ? dampedStrength  * 10
      : -dampedStrength * 10

    const derived = createSignal(
      {
        article:    { id: signal.article_id, source_key: 'cross_market', title: signal.headline || '' },
        market:     { id: targetMarket.id },
        eventType:  signal.event_type || 'MACRO_EVENT',
        direction,
        source_key: 'cross_market',
        matchScore: propagation.strength,
      },
      dampedStrength,
      probDelta,
      {
        headline:    `[Cross-market] ${sourceMarket.title} → ${targetMarket.title}`,
        signal_type: 'CROSS_MARKET',
        metadata: {
          source_market_id:    sourceMarket.id,
          source_signal_id:    signal.id,
          path:                propagation.path,
          relationship_type:   propagation.relationship_type,
          original_strength:   signal.strength,
          propagated_strength: dampedStrength,
          damping_factor:      HOP_DAMPING,
          linking_entity:      linkingEntity.id,
        },
      }
    )

    if (derived) derivedSignals.push(derived)
  }

  if (!derivedSignals.length) return { propagated: 0 }

  // 5. Publish cross-market signals
  const { published } = await publishSignals(derivedSignals)

  // 6. Log cross-market signal records
  const supabase = getSupabase()
  const logRows  = derivedSignals.map(s => ({
    source_signal_id:    signal.id,
    source_market_id:    sourceMarket.id,
    target_market_id:    s.market_id,
    propagation_path:    s.metadata?.path || [],
    relationship_type:   s.metadata?.relationship_type || null,
    original_strength:   signal.strength,
    propagated_strength: s.strength,
    damping_factor:      HOP_DAMPING,
    direction:           s.direction,
  }))

  await supabase
    .from('cross_market_signals')
    .insert(logRows)
    .then(({ error }) => {
      if (error) console.error('[crossMarketSignals] log error:', error.message)
    })

  return { propagated: published, candidates: derivedSignals.length }
}

// ─── Run cross-market propagation for recent high-strength signals ────────────

export async function runCrossMarketPropagation({ sinceHours = 1, minStrength = 0.40 } = {}) {
  const supabase = getSupabase()
  const since    = new Date(Date.now() - sinceHours * 3600000).toISOString()

  // Fetch recently published strong signals (non-cross-market origin)
  const { data: signals } = await supabase
    .from('signals')
    .select('id, market_id, source_key, strength, direction, event_type, headline, article_id, created_at')
    .eq('is_active', true)
    .gte('strength', minStrength)
    .gte('created_at', since)
    .not('source_key', 'in', '("cross_market","reasoning_engine")')
    .order('strength', { ascending: false })
    .limit(30)

  if (!signals?.length) return { processed: 0, propagated: 0 }

  // Fetch source markets
  const marketIds = [...new Set(signals.map(s => s.market_id))]
  const { data: markets } = await supabase
    .from('markets')
    .select('id, title, status')
    .in('id', marketIds)
    .eq('status', 'ACTIVE')

  const marketMap = Object.fromEntries((markets || []).map(m => [m.id, m]))

  let processed  = 0
  let totalProp  = 0

  for (const signal of signals) {
    const market = marketMap[signal.market_id]
    if (!market) continue

    try {
      const result = await propagateSignal(signal, market)
      totalProp += result.propagated || 0
      processed++
    } catch (err) {
      console.error('[crossMarketSignals] propagateSignal error:', err.message)
    }
  }

  return { processed, propagated: totalProp }
}

// ─── Get cross-market signals for a specific target market ───────────────────

export async function getCrossMarketSignals(targetMarketId, { sinceHours = 24 } = {}) {
  const supabase = getSupabase()
  const since    = new Date(Date.now() - sinceHours * 3600000).toISOString()

  const { data } = await supabase
    .from('cross_market_signals')
    .select(`
      id, propagation_path, relationship_type,
      original_strength, propagated_strength, direction, created_at,
      source_market:source_market_id(id, title, category)
    `)
    .eq('target_market_id', targetMarketId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  return data || []
}
