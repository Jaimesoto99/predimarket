// ============================================================
// Causal Rules — defines how events propagate across entities
//
// Each rule specifies:
//   trigger:  { entity?, event_type?, direction? }
//   effects:  [{ entity, direction, strength_multiplier, confidence }]
//   rationale: human-readable explanation
//
// Rules are matched against graph events and used by the
// reasoning engine to generate derivative signals.
// ============================================================

// ─── Rule set ─────────────────────────────────────────────────────────────────

export const CAUSAL_RULES = [

  // ── Monetary policy ─────────────────────────────────────────────────────────
  {
    id: 'FED_RATE_HIKE',
    trigger: { entity: 'FED', event_type: 'RATE_CHANGE', direction: 'BULLISH' },
    effects: [
      { entity: 'SP500',    direction: 'BEARISH', strength_multiplier: 0.75, confidence: 0.80 },
      { entity: 'NASDAQ',   direction: 'BEARISH', strength_multiplier: 0.80, confidence: 0.80 },
      { entity: 'BITCOIN',  direction: 'BEARISH', strength_multiplier: 0.55, confidence: 0.65 },
      { entity: 'ETHEREUM', direction: 'BEARISH', strength_multiplier: 0.50, confidence: 0.65 },
      { entity: 'ORO',      direction: 'BEARISH', strength_multiplier: 0.45, confidence: 0.60 },
      { entity: 'EURIBOR',  direction: 'BULLISH', strength_multiplier: 0.90, confidence: 0.85 },
    ],
    rationale: 'Rate hikes raise discount rates, pressure risk assets, push up Euribor',
  },

  {
    id: 'FED_RATE_CUT',
    trigger: { entity: 'FED', event_type: 'RATE_CHANGE', direction: 'BEARISH' },
    effects: [
      { entity: 'SP500',    direction: 'BULLISH', strength_multiplier: 0.70, confidence: 0.75 },
      { entity: 'NASDAQ',   direction: 'BULLISH', strength_multiplier: 0.75, confidence: 0.75 },
      { entity: 'BITCOIN',  direction: 'BULLISH', strength_multiplier: 0.60, confidence: 0.65 },
      { entity: 'ETHEREUM', direction: 'BULLISH', strength_multiplier: 0.55, confidence: 0.65 },
      { entity: 'EURIBOR',  direction: 'BEARISH', strength_multiplier: 0.85, confidence: 0.85 },
    ],
    rationale: 'Rate cuts inject liquidity, boost risk appetite',
  },

  {
    id: 'BCE_RATE_HIKE',
    trigger: { entity: 'BCE', event_type: 'RATE_CHANGE', direction: 'BULLISH' },
    effects: [
      { entity: 'IBEX_35',  direction: 'BEARISH', strength_multiplier: 0.70, confidence: 0.78 },
      { entity: 'EURIBOR',  direction: 'BULLISH', strength_multiplier: 0.95, confidence: 0.90 },
      { entity: 'BRENT',    direction: 'BEARISH', strength_multiplier: 0.30, confidence: 0.50 },
    ],
    rationale: 'ECB hike tightens euro area credit, weighs on equities',
  },

  // ── Oil / energy ─────────────────────────────────────────────────────────────
  {
    id: 'OPEC_SUPPLY_CUT',
    trigger: { entity: 'OPEC', event_type: 'MACRO_EVENT', direction: 'BULLISH' },
    effects: [
      { entity: 'BRENT',    direction: 'BULLISH', strength_multiplier: 0.90, confidence: 0.85 },
      { entity: 'LUZ_PVPC', direction: 'BULLISH', strength_multiplier: 0.65, confidence: 0.70 },
      { entity: 'SP500',    direction: 'BEARISH', strength_multiplier: 0.25, confidence: 0.55 },
      { entity: 'IBEX_35',  direction: 'BEARISH', strength_multiplier: 0.20, confidence: 0.50 },
    ],
    rationale: 'Supply cut raises oil prices → energy inflation → equity drag',
  },

  {
    id: 'OPEC_SUPPLY_BOOST',
    trigger: { entity: 'OPEC', event_type: 'MACRO_EVENT', direction: 'BEARISH' },
    effects: [
      { entity: 'BRENT',    direction: 'BEARISH', strength_multiplier: 0.85, confidence: 0.82 },
      { entity: 'LUZ_PVPC', direction: 'BEARISH', strength_multiplier: 0.60, confidence: 0.68 },
      { entity: 'SP500',    direction: 'BULLISH', strength_multiplier: 0.20, confidence: 0.50 },
    ],
    rationale: 'Supply increase lowers oil prices, eases energy costs',
  },

  // ── Crypto contagion ─────────────────────────────────────────────────────────
  {
    id: 'BITCOIN_CRASH',
    trigger: { entity: 'BITCOIN', event_type: 'CRYPTO_MOVE', direction: 'BEARISH' },
    effects: [
      { entity: 'ETHEREUM', direction: 'BEARISH', strength_multiplier: 0.85, confidence: 0.88 },
      { entity: 'NASDAQ',   direction: 'BEARISH', strength_multiplier: 0.30, confidence: 0.52 },
    ],
    rationale: 'BTC drop triggers altcoin sell-off and broad risk-off in tech',
  },

  {
    id: 'BITCOIN_SURGE',
    trigger: { entity: 'BITCOIN', event_type: 'CRYPTO_MOVE', direction: 'BULLISH' },
    effects: [
      { entity: 'ETHEREUM', direction: 'BULLISH', strength_multiplier: 0.80, confidence: 0.85 },
    ],
    rationale: 'BTC rally typically lifts alt-coins',
  },

  // ── Regulation ────────────────────────────────────────────────────────────────
  {
    id: 'SEC_CRYPTO_CRACKDOWN',
    trigger: { entity: 'SEC', event_type: 'REGULATORY', direction: 'BEARISH' },
    effects: [
      { entity: 'BITCOIN',  direction: 'BEARISH', strength_multiplier: 0.70, confidence: 0.72 },
      { entity: 'ETHEREUM', direction: 'BEARISH', strength_multiplier: 0.65, confidence: 0.70 },
    ],
    rationale: 'SEC enforcement actions reduce institutional crypto demand',
  },

  {
    id: 'SEC_ETF_APPROVAL',
    trigger: { entity: 'SEC', event_type: 'REGULATORY', direction: 'BULLISH' },
    effects: [
      { entity: 'BITCOIN',  direction: 'BULLISH', strength_multiplier: 0.80, confidence: 0.78 },
      { entity: 'ETHEREUM', direction: 'BULLISH', strength_multiplier: 0.70, confidence: 0.72 },
    ],
    rationale: 'ETF approval opens institutional inflows to crypto',
  },

  // ── Inflation data ────────────────────────────────────────────────────────────
  {
    id: 'HIGH_INFLATION_DATA',
    trigger: { entity: 'IPC_ES', event_type: 'ECONOMIC_DATA', direction: 'BULLISH' },
    effects: [
      { entity: 'EURIBOR',  direction: 'BULLISH', strength_multiplier: 0.70, confidence: 0.72 },
      { entity: 'IBEX_35',  direction: 'BEARISH', strength_multiplier: 0.40, confidence: 0.60 },
      { entity: 'BCE',      direction: 'BULLISH', strength_multiplier: 0.60, confidence: 0.65 },
    ],
    rationale: 'High inflation signals BCE will raise rates',
  },

  // ── Equity contagion ──────────────────────────────────────────────────────────
  {
    id: 'SP500_CRASH',
    trigger: { entity: 'SP500', event_type: 'PRICE_MOVE', direction: 'BEARISH' },
    effects: [
      { entity: 'IBEX_35',  direction: 'BEARISH', strength_multiplier: 0.70, confidence: 0.75 },
      { entity: 'NASDAQ',   direction: 'BEARISH', strength_multiplier: 0.85, confidence: 0.88 },
      { entity: 'BITCOIN',  direction: 'BEARISH', strength_multiplier: 0.40, confidence: 0.58 },
    ],
    rationale: 'US equity sell-off triggers global risk-off',
  },

  {
    id: 'SP500_RALLY',
    trigger: { entity: 'SP500', event_type: 'PRICE_MOVE', direction: 'BULLISH' },
    effects: [
      { entity: 'IBEX_35',  direction: 'BULLISH', strength_multiplier: 0.65, confidence: 0.72 },
      { entity: 'NASDAQ',   direction: 'BULLISH', strength_multiplier: 0.82, confidence: 0.85 },
    ],
    rationale: 'US equity rally spreads to global markets',
  },

  // ── Political ─────────────────────────────────────────────────────────────────
  {
    id: 'SPANISH_POLITICAL_CRISIS',
    trigger: { entity: 'CONGRESO', event_type: 'POLITICAL_VOTE', direction: 'BEARISH' },
    effects: [
      { entity: 'IBEX_35',  direction: 'BEARISH', strength_multiplier: 0.55, confidence: 0.65 },
      { entity: 'SPAIN',    direction: 'BEARISH', strength_multiplier: 0.50, confidence: 0.62 },
    ],
    rationale: 'Political instability weighs on Spanish risk premium',
  },
]

// ─── Index rules by trigger entity for fast lookup ───────────────────────────

const RULES_BY_ENTITY = {}
for (const rule of CAUSAL_RULES) {
  const key = rule.trigger.entity
  if (key) {
    if (!RULES_BY_ENTITY[key]) RULES_BY_ENTITY[key] = []
    RULES_BY_ENTITY[key].push(rule)
  }
}

// ─── Match rules for an event ─────────────────────────────────────────────────

export function matchRules(event) {
  const matches = []

  for (const entityId of event.entity_ids || []) {
    const rules = RULES_BY_ENTITY[entityId] || []

    for (const rule of rules) {
      const t = rule.trigger

      // Match event_type
      if (t.event_type && t.event_type !== event.event_type) continue

      // Match direction (if rule specifies one)
      if (t.direction) {
        const eventDirection = event.impact?.direction || 'NEUTRAL'
        if (t.direction !== eventDirection) continue
      }

      matches.push(rule)
    }
  }

  return matches
}

// ─── Get all affected entities from matching rules ────────────────────────────

export function getAffectedEntities(rules, sourceEntityIds) {
  const affected = []
  for (const rule of rules) {
    for (const effect of rule.effects) {
      if (!sourceEntityIds.includes(effect.entity)) {
        affected.push({
          ...effect,
          rule_id: rule.id,
          rationale: rule.rationale,
        })
      }
    }
  }
  return affected
}
