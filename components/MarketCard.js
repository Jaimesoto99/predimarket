import { useState } from 'react'
import { C, getCategoryColor, getCategoryLabel, getCloseInfo, getTypeLabel, getOracleDescription } from '../lib/theme'
import useTick from '../hooks/useTick'

function ProbBar({ pct }) {
  const color = pct > 60 ? C.yes : pct < 40 ? C.no : C.warning
  return (
    <div style={{ height: 3, borderRadius: 3, background: 'var(--card-border)', overflow: 'hidden', width: 72 }}>
      <div className="prob-bar-fill" style={{
        height: '100%', borderRadius: 3,
        width: `${pct}%`,
        background: color,
      }} />
    </div>
  )
}

export default function MarketCard({ market, onOpen, label, user, isWatching, onToggleWatch }) {
  useTick()  // re-render every minute so countdown stays live
  const [heartBusy, setHeartBusy] = useState(false)
  const watching = isWatching ? isWatching(market.id) : false

  async function handleHeart(e) {
    e.stopPropagation()
    if (!user || heartBusy) return
    setHeartBusy(true)
    await onToggleWatch?.(market.id)
    setHeartBusy(false)
  }

  const yesP      = parseFloat(market.prices?.yes || 50)
  const catColor  = getCategoryColor(market.category)
  const closeInfo = getCloseInfo(market.resolution_time || market.close_date)
  const oracle    = getOracleDescription(market)
  const volume    = market.total_volume || 0
  const liquidity = Math.min(
    parseFloat(market.yes_pool) || 5000,
    parseFloat(market.no_pool)  || 5000,
  )

  const { dateStr, countdown, isUrgent, isExpired } = closeInfo
  const probColor = yesP > 60 ? C.yes : yesP < 40 ? C.no : C.warning

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(market)}
      onKeyDown={e => e.key === 'Enter' && onOpen(market)}
      className="market-row"
      style={{
        display: 'flex', alignItems: 'stretch',
        background: C.card,
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 12,
        cursor: 'pointer', overflow: 'hidden',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.12s',
        position: 'relative',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = C.cardBorderHover
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = C.cardBorder
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'translateY(0)'
      }}>

      {/* Category strip */}
      <div className="market-cat-strip" style={{
        width: 3, flexShrink: 0,
        background: catColor, opacity: 0.7,
      }} />

      {/* Main content */}
      <div className="market-content" style={{
        flex: 1, minWidth: 0,
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 16,
        flexWrap: 'nowrap',
      }}>

        {/* Left: meta + title */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Header: CATEGORY · TYPE · TIME */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: catColor,
            }}>
              {getCategoryLabel(market.category)}
            </span>
            <span style={{ fontSize: 10, color: C.textDim }}>·</span>
            <span style={{
              fontSize: 10, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase',
              color: C.textDim,
            }}>
              {getTypeLabel(market)}
            </span>
            {label && (
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                padding: '1px 5px', borderRadius: 3, marginLeft: 2,
                color: label === 'TRENDING' ? C.yes : label === 'HOT' ? C.warning : C.accentLight,
                background: label === 'TRENDING' ? `${C.yes}12` : label === 'HOT' ? `${C.warning}12` : `${C.accent}12`,
              }}>
                {label === 'TRENDING' ? 'Trending' : label === 'HOT' ? 'Hot' : 'Nuevo'}
              </span>
            )}
            <div style={{ marginLeft: 'auto', flexShrink: 0, textAlign: 'right' }}>
              {dateStr && (
                <div style={{ fontSize: 9, color: C.textDim, fontVariantNumeric: 'tabular-nums', marginBottom: 1 }}>
                  Cierra: {dateStr}
                </div>
              )}
              <div style={{
                fontSize: 10, fontVariantNumeric: 'tabular-nums',
                color: isExpired ? C.warning : isUrgent ? C.no : C.textDim,
                fontWeight: (isExpired || isUrgent) ? 700 : 400,
              }}>
                {countdown}
              </div>
            </div>
          </div>

          <p style={{
            fontSize: 13, fontWeight: 500, color: C.text,
            lineHeight: 1.45, margin: 0,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {market.title}
          </p>

          {/* Metrics row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 7, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: C.textDim, fontVariantNumeric: 'tabular-nums' }}>
              Vol {volume > 1000 ? `€${(volume / 1000).toFixed(1)}K` : `€${volume.toFixed(0)}`}
            </span>
            <span style={{ width: 2, height: 2, borderRadius: 1, background: C.divider, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: C.textDim, fontVariantNumeric: 'tabular-nums' }}>
              Liq {liquidity > 1000 ? `€${(liquidity / 1000).toFixed(1)}K` : `€${liquidity.toFixed(0)}`}
            </span>
            <span style={{ width: 2, height: 2, borderRadius: 1, background: C.divider, flexShrink: 0 }} />
            <span style={{
              fontSize: 10, color: C.textDim,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              <span style={{ fontWeight: 500 }}>Res.: </span>
              {oracle.source}
            </span>
            {user && (
              <button
                onClick={handleHeart}
                title={watching ? 'Quitar de watchlist' : 'Guardar en watchlist'}
                style={{
                  marginLeft: 'auto', flexShrink: 0,
                  width: 24, height: 24, borderRadius: 6, padding: 0,
                  background: watching ? `${C.no}12` : 'transparent',
                  border: `1px solid ${watching ? `${C.no}30` : C.cardBorder}`,
                  cursor: heartBusy ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: watching ? C.no : C.textDim,
                  transition: 'all 0.15s',
                }}
              >
                {watching ? '♥' : '♡'}
              </button>
            )}
          </div>
        </div>

        {/* Right: probability */}
        <div className="market-prob" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, minWidth: 64 }}>
          <div style={{
            fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em',
            fontVariantNumeric: 'tabular-nums',
            color: probColor, lineHeight: 1,
          }}>
            {yesP.toFixed(0)}%
          </div>
          <ProbBar pct={yesP} />
          <div style={{ display: 'flex', gap: 4 }}>
            <span style={{ fontSize: 10, color: C.textDim, fontWeight: 500 }}>SÍ</span>
            <span style={{ fontSize: 10, color: C.yes, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{parseFloat(market.prices?.yes || 50).toFixed(0)}¢</span>
          </div>
        </div>
      </div>

    </div>
  )
}
