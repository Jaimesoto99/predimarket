import { C, getCategoryColor, getCategoryLabel, getTimeLeft, getTypeLabel, getOracleDescription } from '../lib/theme'

const LABELS = {
  TRENDING: { text: 'Trending', emoji: '\uD83D\uDD25' },
  HOT:      { text: 'Hot',      emoji: '\u26A1' },
  NEW:      { text: 'Nuevo',    emoji: '\uD83C\uDD95' },
}

function CategoryDot({ cat }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 500,
      letterSpacing: '0.04em', textTransform: 'uppercase',
      border: `1px solid ${C.cardBorder}`, color: C.textDim,
    }}>
      <span style={{ width: 4, height: 4, borderRadius: 2, background: getCategoryColor(cat), display: 'inline-block', flexShrink: 0 }} />
      {getCategoryLabel(cat)}
    </span>
  )
}

export default function MarketCard({ market, index, total, onOpen, label }) {
  const oracle = getOracleDescription(market)
  const isFeatured = index === 0 && total > 2
  const yesP = parseFloat(market.prices?.yes || 50)
  const catColor = getCategoryColor(market.category)
  const timeLeft = getTimeLeft(market.close_date)
  const volume = market.total_volume || 0
  const traders = market.active_traders || market.total_traders || 0
  const marketLabel = label || (market.label)

  const isUrgent = (() => {
    const diff = new Date(market.close_date) - new Date()
    return diff > 0 && diff < 3600000 * 6
  })()

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(market)}
      onKeyDown={e => e.key === 'Enter' && onOpen(market)}
      className="market-card"
      style={{
        background: isFeatured ? C.cardAlt : C.card,
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 12,
        padding: isFeatured ? '22px 22px 20px' : '18px 18px 16px',
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        boxShadow: C.shadow,
        gridColumn: isFeatured ? 'span 2' : undefined,
        position: 'relative', overflow: 'hidden',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = C.cardBorderHover
        e.currentTarget.style.boxShadow = C.shadowHover
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = C.cardBorder
        e.currentTarget.style.boxShadow = C.shadow
      }}>

      {/* Top accent line */}
      {isFeatured && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(to right, ${C.accent}, ${C.accentLight})`,
          opacity: 0.7,
        }} />
      )}

      {/* Category color strip on left for non-featured */}
      {!isFeatured && (
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0, width: 3,
          background: catColor, opacity: 0.5, borderRadius: '12px 0 0 12px',
        }} />
      )}

      {/* Top row: category + label + time */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingLeft: isFeatured ? 0 : 4 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
          <CategoryDot cat={market.category} />
          {marketLabel && LABELS[marketLabel] && (
            <span
              className={marketLabel === 'TRENDING' ? 'label-pulse' : ''}
              style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 700,
                letterSpacing: '0.04em',
                background: marketLabel === 'TRENDING' ? `${C.yes}15`
                          : marketLabel === 'HOT'      ? `${C.warning}18`
                          : `${C.accent}12`,
                color: marketLabel === 'TRENDING' ? C.yes
                     : marketLabel === 'HOT'      ? C.warning
                     : C.accentLight,
                border: `1px solid ${marketLabel === 'TRENDING' ? C.yes+'35'
                               : marketLabel === 'HOT'      ? C.warning+'35'
                               : C.accent+'30'}`,
              }}>
              {LABELS[marketLabel].emoji} {LABELS[marketLabel].text}
            </span>
          )}
        </div>
        <span style={{
          fontSize: 11, color: isUrgent ? C.warning : C.textDim,
          fontWeight: isUrgent ? 600 : 400,
          flexShrink: 0, marginLeft: 8, fontFamily: 'ui-monospace, monospace',
        }}>
          {timeLeft}
        </span>
      </div>

      {/* Title */}
      <p style={{
        fontWeight: 500, fontSize: isFeatured ? 15 : 13,
        marginBottom: isFeatured ? 20 : 16,
        lineHeight: 1.55, color: C.text, flex: 1,
        paddingLeft: isFeatured ? 0 : 4,
      }}>
        {market.title}
      </p>

      {/* Prices */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: isFeatured ? 28 : 20, marginBottom: 12, paddingLeft: isFeatured ? 0 : 4 }}>
        <div>
          <div style={{ fontSize: 9, color: C.textDim, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>SI</div>
          <span style={{ fontSize: isFeatured ? 30 : 24, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: C.yes, lineHeight: 1 }}>
            {market.prices?.yes}c
          </span>
        </div>
        <div>
          <div style={{ fontSize: 9, color: C.textDim, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>NO</div>
          <span style={{ fontSize: isFeatured ? 30 : 24, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: C.no, lineHeight: 1 }}>
            {market.prices?.no}c
          </span>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 9, color: C.textDim, letterSpacing: '0.06em', marginBottom: 3 }}>PROB</div>
          <span style={{ fontSize: isFeatured ? 20 : 16, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: yesP > 50 ? C.yes : C.no, lineHeight: 1 }}>
            {yesP.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Probability bar */}
      <div style={{ marginBottom: 10, paddingLeft: isFeatured ? 0 : 4 }}>
        <div style={{
          height: 5, borderRadius: 5,
          background: `${C.no}22`,
          overflow: 'hidden', position: 'relative',
        }}>
          <div
            className="prob-bar-fill"
            style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: `${yesP}%`,
              background: yesP > 65 ? `linear-gradient(to right, ${C.yes}cc, ${C.yes})`
                        : yesP < 35 ? `linear-gradient(to right, ${C.no}cc, ${C.no})`
                        : `linear-gradient(to right, ${C.yes}88, ${C.yes}cc)`,
              borderRadius: 5,
            }} />
        </div>
      </div>

      {/* Meta: volume + traders + oracle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: isFeatured ? 0 : 4 }}>
        <span style={{ fontSize: 11, color: C.textDim }}>
          €{volume > 1000 ? `${(volume/1000).toFixed(1)}K` : volume.toFixed(0)}
          {traders > 0 && ` · ${traders} traders`}
        </span>
        <span style={{ fontSize: 10, color: C.textDim, maxWidth: 120, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {oracle.source}
        </span>
      </div>
    </div>
  )
}
