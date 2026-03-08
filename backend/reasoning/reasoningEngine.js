// ============================================================
// Reasoning Engine — applies causal rules to propagate event
// impact across the entity graph and generate derived signals
//
// Pipeline per event:
//   1. matchRules(event)           → applicable causal rules
//   2. getAffectedEntities(rules)  → target entities with effects
//   3. getEntityMarkets(entity)    → affected markets
//   4. publishSignals(derived)     → write to signals table
//   5. markEventProcessed(event)   → flag reasoning_done=true
// ============================================================

import { createClient }        from '@supabase/supabase-js'
import { matchRules, getAffectedEntities } from './causalRules'
import { getPendingEvents, markEventProcessed } from '../graph/eventGraph'
import { getEntityMarkets }    from '../graph/marketEntityMapper'
import { createSignal }        from '../../lib/engine/signals/signalCreator'
import { publishSignals }      from '../../lib/engine/signals/signalPublisher'
import { getPropagationTargets } from '../graph/relationshipGraph'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── Derived signal source key for reasoning-generated signals ────────────────

const REASONING_SOURCE = 'reasoning_engine'

// ─── Build a derived signal from an effect + market ──────────────────────────

function buildDerivedSignal(market, effect, originalEvent) {
  const strength  = Math.min(0.95, effect.strength_multiplier * (originalEvent.impact?.magnitude || 0.5))
  const direction = effect.direction  // BULLISH | BEARISH | NEUTRAL

  // prob_delta: directional push
  const ammProb = market.yes_pool && market.no_pool
    ? (parseFloat(market.no_pool) / (parseFloat(market.yes_pool) + parseFloat(market.no_pool))) * 100
    : 50

  const rawDelta  = strength * 15   // max ±15pp from causal reasoning
  const probDelta = direction === 'BULLISH'  ? rawDelta
    : direction === 'BEARISH'                ? -rawDelta
    : 0

  return createSignal(
    {
      article:     { id: null, source_key: REASONING_SOURCE, title: originalEvent.title, published_at: new Date().toISOString() },
      market:      { id: market.id },
      entities:    {},
      eventType:   originalEvent.event_type,
      direction:   direction === 'BULLISH' ? 'YES' : direction === 'BEARISH' ? 'NO' : null,
      source_key:  REASONING_SOURCE,
      matchScore:  effect.confidence,
    },
    strength,
    probDelta,
    {
      headline:    `[Causal] ${effect.rule_id}: ${effect.rationale}`,
      signal_type: 'CAUSAL',
      metadata: {
        rule_id:        effect.rule_id,
        source_entity:  originalEvent.primary_entity,
        target_entity:  effect.entity,
        confidence:     effect.confidence,
        rationale:      effect.rationale,
        event_id:       originalEvent.id,
      },
    }
  )
}

// ─── Process a single event through the reasoning pipeline ───────────────────

export async function processEvent(event) {
  // 1. Match causal rules
  const rules    = matchRules(event)
  if (!rules.length) {
    await markEventProcessed(event.id)
    return { event_id: event.id, rules: 0, signals: 0 }
  }

  // 2. Collect affected entities + effects
  const effects = getAffectedEntities(rules, event.entity_ids || [])
  if (!effects.length) {
    await markEventProcessed(event.id)
    return { event_id: event.id, rules: rules.length, signals: 0 }
  }

  // 3. Also propagate via graph relationships (relationship-based spreading)
  const graphTargets = await getPropagationTargets(event.entity_ids || [], {
    maxHops: 2,
    minStrength: 0.40,
  })

  // Merge graph-based propagation into effects list
  for (const [entityId, propagation] of Object.entries(graphTargets)) {
    // Only add if not already covered by a causal rule
    const alreadyCovered = effects.some(e => e.entity === entityId)
    if (!alreadyCovered && propagation.strength >= 0.40) {
      const dir = propagation.direction === 'INVERSE'
        ? (event.impact?.direction === 'BULLISH' ? 'BEARISH' : 'BULLISH')
        : (event.impact?.direction || 'NEUTRAL')

      effects.push({
        entity:              entityId,
        direction:           dir,
        strength_multiplier: propagation.strength * 0.60,  // extra damping for graph-only
        confidence:          propagation.strength * 0.70,
        rule_id:             'GRAPH_PROPAGATION',
        rationale:           `Graph path: ${propagation.path.join(' → ')}`,
      })
    }
  }

  // 4. For each effect, find affected markets and build signals
  const allSignals = []

  for (const effect of effects) {
    const markets = await getEntityMarkets(effect.entity, { status: 'ACTIVE' })

    for (const market of markets) {
      const signal = buildDerivedSignal(market, effect, event)
      if (signal) allSignals.push(signal)
    }
  }

  // 5. Publish derived signals
  let published = 0
  if (allSignals.length) {
    const result = await publishSignals(allSignals)
    published = result.published
  }

  // 6. Mark event processed
  await markEventProcessed(event.id)

  return {
    event_id:  event.id,
    rules:     rules.length,
    effects:   effects.length,
    signals:   published,
  }
}

// ─── Run reasoning on all pending events ─────────────────────────────────────

export async function runReasoning({ limit = 50 } = {}) {
  const events = await getPendingEvents({ limit })

  if (!events.length) return { processed: 0, signals_generated: 0 }

  let processed  = 0
  let totalSignals = 0

  for (const event of events) {
    try {
      const result = await processEvent(event)
      processed++
      totalSignals += result.signals || 0
    } catch (err) {
      console.error('[reasoningEngine] processEvent error:', err.message, 'event:', event.id)
      // Don't block — mark as processed anyway to avoid infinite loop
      await markEventProcessed(event.id).catch(() => {})
    }
  }

  return {
    processed,
    signals_generated: totalSignals,
    events_total:      events.length,
  }
}

// ─── Explain reasoning for a market (for transparency UI) ────────────────────

export async function explainMarketReasoning(marketId, { sinceHours = 24 } = {}) {
  const supabase = getSupabase()
  const since    = new Date(Date.now() - sinceHours * 3600000).toISOString()

  // Get causal signals for this market
  const { data: signals } = await supabase
    .from('signals')
    .select('id, strength, direction, metadata, created_at')
    .eq('market_id', marketId)
    .eq('is_active', true)
    .eq('source_key', REASONING_SOURCE)
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  return (signals || []).map(sig => ({
    signal_id:     sig.id,
    direction:     sig.direction,
    strength:      sig.strength,
    rule_id:       sig.metadata?.rule_id,
    source_entity: sig.metadata?.source_entity,
    rationale:     sig.metadata?.rationale,
    confidence:    sig.metadata?.confidence,
    created_at:    sig.created_at,
  }))
}
