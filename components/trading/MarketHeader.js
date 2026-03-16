import { useState, useEffect } from 'react'
import { C, getCategoryColor, getCategoryLabel, getTypeLabel, isExpiredDate } from '../../lib/theme'
import { followMarket, unfollowMarket } from '../../lib/watchlist'
import ResolutionCountdown from './ResolutionCountdown'
import MarketDurationBadge from './MarketDurationBadge'

export default function MarketHeader({ market, onClose, user, isWatching, onToggleWatch }) {
  const expired  = isExpiredDate(market.close_date)
  const catColor = getCategoryColor(market.category)

  const [localUser, setLocalUser] = useState(null)
  const [watching, setWatching] = useState(false)
  const [heartBusy, setHeartBusy] = useState(false)

  // Sync local state from parent when modal opens or isWatching changes
  useEffect(() => {
    if (isWatching !== undefined) setWatching(isWatching)
  }, [isWatching])

  useEffect(() => {
    if (user) return
    try {
      const saved = localStorage.getItem('predi_user')
      if (saved) setLocalUser(JSON.parse(saved))
    } catch {}
  }, [user])

  const effectiveUser = user || localUser

  async function handleHeart(e) {
    e.stopPropagation()
    if (heartBusy || !effectiveUser) return
    const willWatch = !watching
    setWatching(willWatch)   // instant visual flip
    setHeartBusy(true)
    if (willWatch) {
      await followMarket(effectiveUser.email, market.id)
    } else {
      await unfollowMarket(effectiveUser.email, market.id)
    }
    setHeartBusy(false)
  }

  return (
    <div style={{ padding: '24px 28px 0', borderBottom: `1px solid ${C.cardBorder}` }}>
      {/* Top bar: category + close button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: catColor,
          }}>
            {getCategoryLabel(market.category)}
          </span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.textDim, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: C.textDim }}>{getTypeLabel(market)}</span>
          <MarketDurationBadge market={market} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button
            onClick={handleHeart}
            title={!effectiveUser ? 'Inicia sesión para guardar' : watching ? 'Quitar de watchlist' : 'Guardar en watchlist'}
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: watching ? `${C.no}12` : 'transparent',
              border: `1px solid ${watching ? `${C.no}40` : C.cardBorder}`,
              color: watching ? C.no : C.textDim,
              cursor: effectiveUser ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, opacity: heartBusy ? 0.5 : 1,
            }}
          >
            {watching ? '♥' : '♡'}
          </button>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'transparent', border: `1px solid ${C.cardBorder}`,
            color: C.textDim, cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>
      </div>

      {/* Title */}
      <h2 style={{
        fontSize: 17, fontWeight: 700, lineHeight: 1.35, letterSpacing: '-0.025em',
        color: C.text, marginBottom: 10,
      }}>
        {market.title}
      </h2>

      {/* Resolution countdown — prominent, always visible */}
      <div style={{ marginBottom: 14 }}>
        {expired ? (
          <span style={{
            fontSize: 12, fontWeight: 600, color: C.no,
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            ⏹ Mercado cerrado — pendiente de resolución
          </span>
        ) : (
          <ResolutionCountdown market={market} size="lg" />
        )}
      </div>

      {/* Probability stats strip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 24, paddingBottom: 20,
        flexWrap: 'wrap',
      }}>
        {/* YES prob */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textDim, marginBottom: 4 }}>SÍ</div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', color: C.yes, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {market.prices?.yes}¢
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textDim, marginBottom: 4 }}>NO</div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', color: C.no, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {market.prices?.no}¢
          </div>
        </div>

        {/* Prob bar */}
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: C.yes, fontWeight: 600 }}>SÍ {market.prices?.yes}%</span>
            <span style={{ fontSize: 10, color: C.no, fontWeight: 600 }}>NO {market.prices?.no}%</span>
          </div>
          <div style={{ height: 5, borderRadius: 5, background: `${C.no}20`, overflow: 'hidden' }}>
            <div className="prob-bar-fill" style={{
              height: '100%', borderRadius: 5,
              width: `${market.prices?.yes || 50}%`,
              background: `linear-gradient(to right, ${C.yes}aa, ${C.yes})`,
            }} />
          </div>
        </div>

        {/* Volume */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textDim, marginBottom: 4 }}>Volumen</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
            €{((market.total_volume || 0) / 1000).toFixed(1)}K
          </div>
        </div>
      </div>
    </div>
  )
}
