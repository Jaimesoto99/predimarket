import { C } from '../../lib/theme'

// ─── Formats a signed probability change ──────────────────────────────────

function fmt(val) {
  if (val === null || val === undefined) return null
  const n = parseFloat(val)
  if (isNaN(n)) return null
  return (n > 0 ? '+' : '') + n.toFixed(1) + 'pp'
}

// ─── MarketTrendBadge ─────────────────────────────────────────────────────
// Compact badge showing trend direction + 24h change.
// Use inside MarketCard or anywhere a small indicator is needed.

export default function MarketTrendBadge({ market, size = 'sm' }) {
  const trending   = market?.trending
  const change6h   = parseFloat(market?.prob_change_6h)
  const change24h  = parseFloat(market?.prob_change_24h)
  const hasChange  = !isNaN(change24h) && change24h !== 0

  if (!trending && !hasChange) return null

  const up    = change24h > 0
  const color = up ? C.yes : C.no
  const arrow = up ? '↑' : '↓'

  const textSize = size === 'lg' ? 12 : 10
  const padding  = size === 'lg' ? '3px 8px' : '2px 6px'

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: textSize, fontWeight: 600,
      padding, borderRadius: 4,
      color, background: `${color}12`,
      border: `1px solid ${color}25`,
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap',
      letterSpacing: '0.02em',
    }}>
      {trending && <span style={{ fontSize: textSize - 1 }}>🔥</span>}
      <span>{arrow}{hasChange ? Math.abs(change24h).toFixed(1) + 'pp' : ''}</span>
    </span>
  )
}

// ─── MarketChangePills — shows 6h and 24h changes side by side ────────────

export function MarketChangePills({ market }) {
  const c6  = fmt(market?.prob_change_6h)
  const c24 = fmt(market?.prob_change_24h)
  if (!c6 && !c24) return null

  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
      {c6 && <ChangePill label="6h" value={c6} raw={parseFloat(market.prob_change_6h)} />}
      {c24 && <ChangePill label="24h" value={c24} raw={parseFloat(market.prob_change_24h)} />}
    </div>
  )
}

function ChangePill({ label, value, raw }) {
  const color = raw > 0 ? C.yes : C.no
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
      color, background: `${color}10`, border: `1px solid ${color}20`,
      fontVariantNumeric: 'tabular-nums',
    }}>
      {label}: {value}
    </span>
  )
}
