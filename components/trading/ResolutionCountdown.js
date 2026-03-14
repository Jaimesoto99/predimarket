import { useEffect, useState } from 'react'
import { C, getCloseInfo } from '../../lib/theme'

// ─── Component ────────────────────────────────────────────────────────────

export default function ResolutionCountdown({ market, size = 'md' }) {
  const resolveDate = market?.resolution_time || market?.close_date
  const [info, setInfo] = useState(resolveDate ? getCloseInfo(resolveDate) : null)

  // Refresh every minute
  useEffect(() => {
    if (!resolveDate) return
    setInfo(getCloseInfo(resolveDate))
    const interval = setInterval(() => setInfo(getCloseInfo(resolveDate)), 60000)
    return () => clearInterval(interval)
  }, [resolveDate])

  if (!info) return null

  const { dateStr, countdown, isUrgent, isExpired } = info
  const isLg = size === 'lg'

  const color = isExpired ? C.warning : isUrgent ? C.no : C.textMuted
  const bg    = (isExpired || isUrgent) ? `${color}10` : C.surface
  const border = (isExpired || isUrgent) ? `1px solid ${color}30` : `1px solid ${C.cardBorder}`

  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', alignItems: isLg ? 'flex-start' : 'center',
      padding: isLg ? '7px 12px' : '4px 10px',
      borderRadius: 8, background: bg, border,
      gap: 2,
    }}>
      {/* Exact close date */}
      {dateStr && (
        <div style={{
          fontSize: isLg ? 11 : 10,
          color: C.textDim,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.01em',
        }}>
          Cierra: {dateStr}
        </div>
      )}
      {/* Countdown */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <span style={{ fontSize: isLg ? 12 : 10, lineHeight: 1 }}>
          {isExpired ? '🔔' : isUrgent ? '⏰' : '🕐'}
        </span>
        <span style={{
          fontSize: isLg ? 13 : 11,
          fontWeight: (isUrgent || isExpired) ? 700 : 500,
          color,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          letterSpacing: '-0.01em',
        }}>
          {isExpired ? 'Resolviendo...' : isUrgent && countdown === '¡Última hora!' ? '¡Última hora!' : `Quedan ${countdown}`}
        </span>
      </div>
    </div>
  )
}
