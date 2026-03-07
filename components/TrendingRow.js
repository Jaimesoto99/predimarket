import { C, getCategoryColor } from '../lib/theme'

export default function TrendingRow({ markets, onOpen }) {
  if (!markets || markets.length === 0) return null

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 24px' }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: C.textDim, marginBottom: 10 }}>
        Tendencia
      </div>
      <div style={{
        display: 'flex', gap: 10, overflowX: 'auto',
        paddingBottom: 4,
        scrollbarWidth: 'none', msOverflowStyle: 'none',
      }}>
        {markets.map(m => {
          const yesP = parseFloat(m.prices?.yes || 50)
          const volume = (m.total_volume || 0)
          const traders = m.active_traders || m.total_traders || 0
          const catColor = getCategoryColor(m.category)
          return (
            <div
              key={m.id}
              onClick={() => onOpen(m)}
              style={{
                flexShrink: 0, width: 180,
                background: C.card, border: `1px solid ${C.cardBorder}`,
                borderRadius: 9, padding: '14px 14px 12px',
                cursor: 'pointer', transition: 'all 0.15s ease',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = C.cardBorderHover
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = C.cardBorder
                e.currentTarget.style.transform = 'translateY(0)'
              }}>
              {/* Category color strip */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: catColor, opacity: 0.6,
              }} />

              {/* Title */}
              <p style={{
                fontSize: 12, fontWeight: 500, color: C.text,
                lineHeight: 1.4, marginBottom: 10,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>{m.title}</p>

              {/* YES price large */}
              <div style={{ marginBottom: 6 }}>
                <span style={{
                  fontSize: 26, fontWeight: 700,
                  fontFamily: 'ui-monospace, monospace', color: C.yes, lineHeight: 1,
                }}>{yesP.toFixed(0)}¢</span>
                <span style={{ fontSize: 10, color: C.textDim, marginLeft: 4 }}>SÍ</span>
              </div>

              {/* Volume bar */}
              <div style={{
                height: 3, borderRadius: 2,
                background: `linear-gradient(to right, ${C.yes}30, ${C.no}30)`,
                overflow: 'hidden', marginBottom: 8,
              }}>
                <div style={{
                  width: `${yesP}%`, height: '100%',
                  background: C.yes, borderRadius: 2,
                }} />
              </div>

              {/* Meta */}
              <div style={{ fontSize: 10, color: C.textDim }}>
                {traders > 0 && <span>{traders} traders · </span>}
                €{volume > 1000 ? `${(volume / 1000).toFixed(1)}K` : volume.toFixed(0)} vol
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
