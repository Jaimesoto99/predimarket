import { C, getCategoryColor, getCategoryLabel, getTimeLeft, getTypeLabel, isExpiredDate } from '../../lib/theme'

export default function MarketHeader({ market, onClose }) {
  const expired  = isExpiredDate(market.close_date)
  const catColor = getCategoryColor(market.category)

  return (
    <div style={{ padding: '24px 28px 0', borderBottom: `1px solid ${C.cardBorder}` }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: catColor,
          }}>
            {getCategoryLabel(market.category)}
          </span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.textDim, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: C.textDim }}>{getTypeLabel(market)}</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.textDim, flexShrink: 0 }} />
          <span style={{
            fontSize: 11,
            color: expired ? C.no : C.textDim,
            fontWeight: expired ? 600 : 400,
          }}>
            {expired ? 'Cerrado' : `Cierra en ${getTimeLeft(market.close_date)}`}
          </span>
        </div>
        <button onClick={onClose} style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'transparent', border: `1px solid ${C.cardBorder}`,
          color: C.textDim, cursor: 'pointer', fontSize: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>✕</button>
      </div>

      {/* Title */}
      <h2 style={{
        fontSize: 17, fontWeight: 700, lineHeight: 1.35, letterSpacing: '-0.025em',
        color: C.text, marginBottom: 6,
      }}>
        {market.title}
      </h2>

      {/* Credibility line */}
      <p style={{ fontSize: 11, color: C.textDim, marginBottom: 16, lineHeight: 1.5 }}>
        Este mercado se resolverá automáticamente según la fuente indicada.{' '}
        <a href="/metodologia" style={{ color: C.textDim, textDecoration: 'underline', textUnderlineOffset: 2 }}>
          Ver metodología
        </a>
      </p>

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
