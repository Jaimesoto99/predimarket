import { C } from '../../lib/theme'

// ─── Derive duration hours from market ────────────────────────────────────

function getDurationHours(market) {
  // If resolution_time is set, compute from now
  if (market?.resolution_time && market?.created_at) {
    const created = new Date(market.created_at)
    const resolve = new Date(market.resolution_time)
    const hrs     = (resolve - created) / 3600000
    if (hrs > 0) return Math.round(hrs)
  }
  // Fall back to close_date vs created_at
  if (market?.close_date && market?.created_at) {
    const created = new Date(market.created_at)
    const close   = new Date(market.close_date)
    const hrs     = (close - created) / 3600000
    if (hrs > 0) return Math.round(hrs)
  }
  return null
}

// ─── Badge config by duration ─────────────────────────────────────────────

function getBadgeConfig(hours) {
  if (hours <= 6)   return { icon: '⚡', label: `${hours}h`, color: '#EF4444' }
  if (hours <= 12)  return { icon: '⚡', label: '12h',       color: '#F97316' }
  if (hours <= 24)  return { icon: '📅', label: '24h',       color: '#F59E0B' }
  if (hours <= 48)  return { icon: '📅', label: '48h',       color: '#6366F1' }
  if (hours <= 120) {
    const days = Math.round(hours / 24)
    return { icon: '📅', label: `${days}d`,  color: '#6B7280' }
  }
  const days = Math.round(hours / 24)
  return { icon: '📅', label: `${days}d`,    color: '#9CA3AF' }
}

// ─── Component ────────────────────────────────────────────────────────────

export default function MarketDurationBadge({ market }) {
  const hours = getDurationHours(market)
  if (!hours) return null

  const { icon, label, color } = getBadgeConfig(hours)

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 10, fontWeight: 600, letterSpacing: '0.03em',
      padding: '2px 7px', borderRadius: 5,
      color, background: `${color}10`, border: `1px solid ${color}25`,
      whiteSpace: 'nowrap',
    }}>
      {icon} {label}
    </span>
  )
}
