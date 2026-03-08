import { C } from '../../lib/theme'
import { fs, fw, sp, r, mono } from '../../lib/ds'

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function maskEmail(email) {
  if (!email) return 'Anon'
  const [local] = email.split('@')
  if (local.length <= 3) return local[0] + '**'
  return local.slice(0, 3) + '***'
}

export default function ActivityItem({ activity }) {
  const isBuy = activity.side === 'YES' || (activity.action === 'BUY' && activity.side !== 'NO')
  const isYes = activity.side === 'YES'
  const sideColor = isYes ? C.yes : C.no
  const sideLabel = isYes ? 'SÍ' : 'NO'
  const amount = parseFloat(activity.amount || activity.trade_amount || 0)
  const displayName = activity.display_name || maskEmail(activity.user_email)
  const avatarChar = (displayName[0] || '?').toUpperCase()

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: sp.sm,
      padding: `${sp.sm}px 0`,
      borderBottom: `1px solid ${C.divider}`,
    }}>
      {/* Avatar */}
      <div style={{
        width: 28, height: 28, borderRadius: r.full,
        background: `${sideColor}20`,
        border: `1px solid ${sideColor}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: fs.sm, fontWeight: fw.bold, color: sideColor,
        flexShrink: 0,
      }}>
        {activity.emoji || avatarChar}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: sp.xs }}>
          <span style={{ fontSize: fs.sm, fontWeight: fw.semibold, color: C.text }}>
            {displayName}
          </span>
          <span style={{
            fontSize: fs.xs, fontWeight: fw.semibold,
            color: sideColor,
            background: `${sideColor}15`,
            border: `1px solid ${sideColor}30`,
            borderRadius: r.sm,
            padding: '1px 5px',
          }}>
            {sideLabel}
          </span>
        </div>
        <div style={{
          fontSize: fs.xs, color: C.textDim,
          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
          marginTop: 1,
        }}>
          {activity.market_title || activity.title || '—'}
        </div>
      </div>

      {/* Amount + time */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: 1 }}>
        <span style={{ fontSize: fs.base, fontWeight: fw.semibold, fontFamily: mono, color: C.text }}>
          €{amount.toFixed(0)}
        </span>
        <span style={{ fontSize: fs.xs, color: C.textDim }}>
          {timeAgo(activity.created_at || activity.timestamp)}
        </span>
      </div>
    </div>
  )
}
