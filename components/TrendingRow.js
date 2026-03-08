import { C, getCategoryColor, getTimeLeft } from '../lib/theme'

export default function TrendingRow({ markets, onOpen }) {
  if (!markets || markets.length === 0) return null

  return (
    <div style={{ padding: '0 0 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.textDim }}>
          Tendencia
        </span>
        <span style={{ fontSize: 11, color: C.yes }}>&#128293;</span>
        <div style={{ flex: 1, height: 1, background: C.divider }} />
      </div>

      <div
        className="no-scrollbar snap-x"
        style={{
          display: 'flex', gap: 10, overflowX: 'auto',
          paddingBottom: 4,
          WebkitOverflowScrolling: 'touch',
        }}>
        {markets.map((m, i) => {
          const yesP = parseFloat(m.prices?.yes || 50)
          const noP = 100 - yesP
          const catColor = getCategoryColor(m.category)
          const volume = m.total_volume || 0
          const traders = m.active_traders || m.total_traders || 0
          const timeLeft = getTimeLeft(m.close_date)

          return (
            <div
              key={m.id}
              onClick={() => onOpen(m)}
              className="snap-start no-transition"
              style={{
                flexShrink: 0, width: 200,
                background: C.card, border: `1px solid ${C.cardBorder}`,
                borderRadius: 12, padding: '14px 14px 12px',
                cursor: 'pointer',
                position: 'relative', overflow: 'hidden',
                transition: 'border-color 0.15s, transform 0.15s',
                WebkitTapHighlightColor: 'transparent',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = catColor
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = C.cardBorder
                e.currentTarget.style.transform = 'translateY(0)'
              }}>

              {/* Category color strip */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: catColor, opacity: 0.7,
              }} />

              {/* Rank badge */}
              <div style={{
                position: 'absolute', top: 10, right: 10,
                width: 18, height: 18, borderRadius: 9,
                background: `${catColor}20`, border: `1px solid ${catColor}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, color: catColor,
              }}>
                {i + 1}
              </div>

              {/* Title */}
              <p style={{
                fontSize: 12, fontWeight: 500, color: C.text,
                lineHeight: 1.45, marginBottom: 12, marginTop: 6,
                paddingRight: 20,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {m.title}
              </p>

              {/* YES/NO side by side */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <div style={{
                  flex: 1, padding: '7px 0', textAlign: 'center',
                  background: `${C.yes}10`, border: `1px solid ${C.yes}25`, borderRadius: 7,
                }}>
                  <div style={{ fontSize: 8, color: C.yes, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 2 }}>SI</div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: C.yes, lineHeight: 1 }}>
                    {yesP.toFixed(0)}c
                  </div>
                </div>
                <div style={{
                  flex: 1, padding: '7px 0', textAlign: 'center',
                  background: `${C.no}10`, border: `1px solid ${C.no}25`, borderRadius: 7,
                }}>
                  <div style={{ fontSize: 8, color: C.no, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 2 }}>NO</div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: C.no, lineHeight: 1 }}>
                    {noP.toFixed(0)}c
                  </div>
                </div>
              </div>

              {/* Probability bar */}
              <div style={{ height: 4, borderRadius: 4, background: `${C.no}20`, overflow: 'hidden', marginBottom: 8 }}>
                <div className="prob-bar-fill" style={{
                  width: `${yesP}%`, height: '100%',
                  background: yesP > 50 ? C.yes : C.no, borderRadius: 4,
                }} />
              </div>

              {/* Meta */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.textDim }}>
                <span>
                  {traders > 0 && `${traders} `}
                  €{volume > 1000 ? `${(volume/1000).toFixed(1)}K` : volume.toFixed(0)}
                </span>
                <span style={{ fontFamily: 'ui-monospace, monospace' }}>{timeLeft}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
