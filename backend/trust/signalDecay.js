// ============================================================
// Signal Decay — exponential decay of signal strength over time
//
// decay(t) = e^(-λt)   where λ = ln(2) / half_life
//
// Half-lives by signal type (hours):
//   BREAKING_NEWS   → 2h    (high urgency, fast decay)
//   PRICE_MOVE      → 4h
//   SPORTS_RESULT   → 6h
//   ECONOMIC_DATA   → 12h
//   POLITICAL_VOTE  → 24h
//   MACRO_EVENT     → 48h
//   DEFAULT         → 8h
// ============================================================

// ─── Half-lives by event type (hours) ────────────────────────────────────────

export const HALF_LIVES = {
  BREAKING_NEWS:      2,
  CRYPTO_MOVE:        3,
  PRICE_MOVE:         4,
  ENERGY_PRICE:       4,
  SPORTS_RESULT:      6,
  SPORTS_UPCOMING:    12,
  ECONOMIC_DATA:      12,
  RATE_CHANGE:        18,
  EARNINGS:           18,
  POLITICAL_VOTE:     24,
  POLITICAL_STATEMENT: 24,
  REGULATORY:         36,
  MACRO_EVENT:        48,
}

const DEFAULT_HALF_LIFE = 8  // hours

// ─── Compute decay factor for a signal ───────────────────────────────────────
// Returns value in (0, 1] — 1.0 means fresh, near 0 means stale

export function computeDecayFactor(signal) {
  const eventType  = signal.event_type || signal.signal_type || 'DEFAULT'
  const halfLife   = HALF_LIVES[eventType] || DEFAULT_HALF_LIFE

  const createdAt  = signal.created_at ? new Date(signal.created_at) : new Date()
  const ageHours   = (Date.now() - createdAt.getTime()) / 3600000

  const lambda     = Math.LN2 / halfLife
  const decay      = Math.exp(-lambda * ageHours)

  return Math.max(0.01, Math.min(1.0, decay))
}

// ─── Apply decay to signal strength ──────────────────────────────────────────

export function decayedStrength(signal) {
  const decay = computeDecayFactor(signal)
  return (signal.strength || 0) * decay
}

// ─── Batch compute decay for a list of signals ───────────────────────────────

export function applyDecayBatch(signals) {
  return signals.map(sig => ({
    ...sig,
    decay_factor:    computeDecayFactor(sig),
    decayed_strength: decayedStrength(sig),
  }))
}

// ─── Check if signal is effectively expired by decay ─────────────────────────
// A signal with decayed strength < 0.05 is considered negligible

export function isDecayExpired(signal, minStrength = 0.05) {
  return decayedStrength(signal) < minStrength
}

// ─── Time remaining before signal decays below threshold ─────────────────────
// Returns hours remaining (0 if already expired)

export function timeToDecay(signal, minStrength = 0.05) {
  const eventType  = signal.event_type || 'DEFAULT'
  const halfLife   = HALF_LIVES[eventType] || DEFAULT_HALF_LIFE
  const strength   = signal.strength || 0

  if (strength <= minStrength) return 0

  // Solve: strength * e^(-λt) = minStrength
  // t = -ln(minStrength / strength) / λ
  const lambda = Math.LN2 / halfLife
  const totalLifeHours = -Math.log(minStrength / strength) / lambda

  const createdAt  = signal.created_at ? new Date(signal.created_at) : new Date()
  const ageHours   = (Date.now() - createdAt.getTime()) / 3600000

  return Math.max(0, totalLifeHours - ageHours)
}

// ─── Sort signals by decayed strength (most impactful first) ─────────────────

export function sortByDecayedStrength(signals) {
  return [...signals].sort((a, b) => decayedStrength(b) - decayedStrength(a))
}
