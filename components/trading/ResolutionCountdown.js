import { useEffect, useState } from 'react'
import { C } from '../../lib/theme'

// ─── Compute human-readable resolution label ──────────────────────────────

function getResolutionLabel(resolveDate) {
  const now      = new Date()
  const target   = new Date(resolveDate)
  const diffMs   = target - now

  if (diffMs <= 0) return { text: 'Resuelto', urgent: false, color: C.textDim }

  const diffMins = Math.floor(diffMs / 60000)
  const diffHrs  = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  // Under 60 minutes
  if (diffMins < 60) {
    return {
      text:   `Resuelve en ${diffMins}m`,
      urgent: true,
      color:  C.no,
    }
  }

  // Under 6 hours — show hours + minutes
  if (diffHrs < 6) {
    const mins = diffMins % 60
    return {
      text:   `Resuelve en ${diffHrs}h ${mins}m`,
      urgent: true,
      color:  C.warning,
    }
  }

  // Same calendar day — show "hoy a las HH:MM"
  const isSameDay = target.toDateString() === now.toDateString()
  if (isSameDay) {
    const hh = target.getHours().toString().padStart(2, '0')
    const mm = target.getMinutes().toString().padStart(2, '0')
    return {
      text:   `Resuelve hoy a las ${hh}:${mm}`,
      urgent: false,
      color:  C.textMuted,
    }
  }

  // Tomorrow
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  if (target.toDateString() === tomorrow.toDateString()) {
    const hh = target.getHours().toString().padStart(2, '0')
    const mm = target.getMinutes().toString().padStart(2, '0')
    return {
      text:   `Resuelve mañana a las ${hh}:${mm}`,
      urgent: false,
      color:  C.textMuted,
    }
  }

  // Within 5 days — show N days
  if (diffDays < 5) {
    return {
      text:   `Resuelve en ${diffDays}d`,
      urgent: false,
      color:  C.textDim,
    }
  }

  // Further — show date
  const dateStr = target.toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
  return {
    text:   `Resuelve el ${dateStr}`,
    urgent: false,
    color:  C.textDim,
  }
}

// ─── Component ────────────────────────────────────────────────────────────

export default function ResolutionCountdown({ market, size = 'md' }) {
  // Prefer resolution_time if present, fall back to close_date
  const resolveDate = market?.resolution_time || market?.close_date
  const [label, setLabel] = useState(resolveDate ? getResolutionLabel(resolveDate) : null)

  // Refresh every minute
  useEffect(() => {
    if (!resolveDate) return
    setLabel(getResolutionLabel(resolveDate))
    const interval = setInterval(() => setLabel(getResolutionLabel(resolveDate)), 60000)
    return () => clearInterval(interval)
  }, [resolveDate])

  if (!label) return null

  const isLg = size === 'lg'

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: isLg ? '5px 10px' : '3px 8px',
      borderRadius: 6,
      background: label.urgent ? `${label.color}10` : C.surface,
      border: `1px solid ${label.urgent ? `${label.color}30` : C.cardBorder}`,
    }}>
      {/* Clock icon */}
      <span style={{ fontSize: isLg ? 12 : 10, lineHeight: 1 }}>
        {label.urgent ? '⏰' : '🕐'}
      </span>
      <span style={{
        fontSize: isLg ? 13 : 11,
        fontWeight: label.urgent ? 700 : 500,
        color: label.color,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        letterSpacing: '-0.01em',
      }}>
        {label.text}
      </span>
    </div>
  )
}
