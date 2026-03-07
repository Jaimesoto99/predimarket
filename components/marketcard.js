import { C, badge, neutralBadge, getCategoryColor, getCategoryLabel, getTimeLeft, getTypeLabel, getOracleDescription } from '../lib/theme'

function catBadge(cat) {
  return (
    <span style={{
      fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 500,
      letterSpacing: '0.05em', textTransform: 'uppercase',
      border: `1px solid ${C.cardBorder}`, color: C.textDim, background: 'transparent',
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      <span style={{
        width: 4, height: 4, borderRadius: 2,
        background: getCategoryColor(cat), display: 'inline-block', flexShrink: 0,
      }} />
      {getCategoryLabel(cat)}
    </span>
  )
}

export default function MarketCard({ market, index, total, onOpen }) {
  const oracle = getOracleDescription(market)
  const isFeatured = index === 0 && total > 1
  const yesP = parseFloat(market.prices?.yes || 50)

  return (
    <div
      onClick={() => onOpen(market)}
      style={{
        background: isFeatured ? C.cardAlt : C.card,
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 10,
        padding: isFeatured ? '28px 28px 24px' : '20px 20px 18px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex', flexDirection: 'column',
        boxShadow: C.shadow,
        gridColumn: isFeatured ? 'span 2' : undefined,
        position: 'relative', overflow: 'hidden',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = C.cardBorderHover
        e.currentTarget.style.boxShadow = C.shadowHover
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = C.cardBorder
        e.currentTarget.style.boxShadow = C.shadow
        e.currentTarget.style.transform = 'translateY(0)'
      }}>

      {/* Featured accent line */}
      {isFeatured && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(to right, ${C.accent}, ${C.accentLight})`, opacity: 0.6,
        }} />
      )}

      {/* Top: category badge + type + time */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: isFeatured ? 16 : 12,
      }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {catBadge(market.category)}
          <span style={neutralBadge()}>{getTypeLabel(market)}</span>
          {isFeatured && (
            <span style={{ ...neutralBadge(), color: C.accentLight, borderColor: `${C.accent}40` }}>
              Destacado
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: C.textDim, fontWeight: 400, flexShrink: 0, marginLeft: 8 }}>
          {getTimeLeft(market.close_date)}
        </span>
      </div>

      {/* Title */}
      <p style={{
        fontWeight: 500,
        fontSize: isFeatured ? 16 : 14,
        marginBottom: isFeatured ? 24 : 18,
        lineHeight: 1.5, color: C.text, flex: 1,
        letterSpacing: isFeatured ? '-0.01em' : 0,
      }}>{market.title}</p>

      {/* Prices */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: isFeatured ? 32 : 20, marginBottom: 14 }}>
        <div>
          <div style={{
            fontSize: 10, color: C.textDim, fontWeight: 600,
            letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4,
          }}>SÍ</div>
          <span style={{
            fontSize: isFeatured ? 32 : 26, fontWeight: 700,
            fontFamily: 'ui-monospace, monospace', color: C.yes, lineHeight: 1,
          }}>{market.prices?.yes}¢</span>
        </div>
        <div>
          <div style={{
            fontSize: 10, color: C.textDim, fontWeight: 600,
            letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4,
          }}>NO</div>
          <span style={{
            fontSize: isFeatured ? 32 : 26, fontWeight: 700,
            fontFamily: 'ui-monospace, monospace', color: C.no, lineHeight: 1,
          }}>{market.prices?.no}¢</span>
        </div>
      </div>

      {/* Probability bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          height: 4, borderRadius: 4,
          background: `linear-gradient(to right, ${C.yes}30, ${C.no}30)`,
          overflow: 'hidden', position: 'relative',
        }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${yesP}%`,
            background: `linear-gradient(to right, ${C.yes}, ${C.yes}88)`,
            borderRadius: 4, transition: 'width 0.4s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: C.textDim }}>
          <span>SÍ {yesP.toFixed(0)}%</span>
          <span>NO {(100 - yesP).toFixed(0)}%</span>
        </div>
      </div>

      {/* Meta row: volume + traders + oracle source */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: C.textDim }}>
          €{((market.total_volume || 0) / 1000).toFixed(1)}K vol · {market.active_traders || market.total_traders || 0} traders
        </span>
        <span style={{ fontSize: 10, color: C.textDim }}>{oracle.source}</span>
      </div>

      <button style={{
        width: '100%', padding: '8px 0', borderRadius: 7, fontWeight: 600, fontSize: 12,
        border: `1px solid ${C.cardBorder}`, cursor: 'pointer',
        background: 'transparent', color: C.textMuted,
        letterSpacing: '0.01em', transition: 'all 0.2s ease',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.background = C.accent
          e.currentTarget.style.color = '#fff'
          e.currentTarget.style.borderColor = C.accent
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = C.textMuted
          e.currentTarget.style.borderColor = C.cardBorder
        }}>
        Predecir →
      </button>
    </div>
  )
}
