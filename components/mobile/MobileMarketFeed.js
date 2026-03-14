import { C, getCategoryColor, getCategoryLabel, getCloseInfo } from '../../lib/theme'
import useTick from '../../hooks/useTick'

const CATEGORIES = [
  { id: 'ALL',        label: 'Todo' },
  { id: 'ECONOMIA',   label: 'Economía' },
  { id: 'DEPORTES',   label: 'Deportes' },
  { id: 'POLITICA',   label: 'Política' },
  { id: 'CRIPTO',     label: 'Cripto' },
  { id: 'ACTUALIDAD', label: 'Actualidad' },
  { id: 'ENERGIA',    label: 'Energía' },
  { id: 'FINANZAS',   label: 'Finanzas' },
  { id: 'TECNOLOGIA', label: 'Tecnología' },
  { id: 'CLIMA',      label: 'Clima' },
]

function MobileCard({ market, onTrade }) {
  useTick()
  const yesP      = parseFloat(market.prices?.yes || 50)
  const noP       = parseFloat(market.prices?.no  || 50)
  const catColor  = getCategoryColor(market.category)
  const closeInfo = getCloseInfo(market.resolution_time || market.close_date)
  const { dateStr, countdown, isUrgent, isExpired } = closeInfo
  const volume    = market.total_volume || 0

  const probColor = yesP > 60 ? C.yes : yesP < 40 ? C.no : C.warning

  return (
    <div className="mobile-snap-item" style={{
      background: C.card,
      borderBottom: `1px solid ${C.cardBorder}`,
      padding: '20px 16px',
      justifyContent: 'space-between',
    }}>
      {/* Top: category + timer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
          textTransform: 'uppercase', color: catColor,
          background: `${catColor}12`, padding: '3px 8px', borderRadius: 4,
        }}>
          {getCategoryLabel(market.category)}
        </span>
        <div style={{ textAlign: 'right' }}>
          {dateStr && (
            <div style={{ fontSize: 9, color: C.textDim, marginBottom: 1 }}>Cierra: {dateStr}</div>
          )}
          <div style={{
            fontSize: 11, fontWeight: 600,
            color: isExpired ? C.warning : isUrgent ? C.no : C.textDim,
          }}>
            {isExpired ? 'Resolviendo...' : countdown}
          </div>
        </div>
      </div>

      {/* Title */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 }}>
        <p style={{
          fontSize: 20, fontWeight: 600, color: C.text,
          lineHeight: 1.35, margin: 0,
          letterSpacing: '-0.02em',
        }}>
          {market.title}
        </p>

        {/* Probability */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{
              fontSize: 48, fontWeight: 700, letterSpacing: '-0.04em',
              fontVariantNumeric: 'tabular-nums', color: probColor, lineHeight: 1,
            }}>
              {yesP.toFixed(0)}%
            </span>
            <span style={{ fontSize: 14, color: C.textMuted, fontWeight: 500 }}>probabilidad SÍ</span>
          </div>

          {/* Prob bar */}
          <div style={{ height: 6, borderRadius: 6, background: C.cardBorder, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 6,
              width: `${yesP}%`,
              background: probColor,
              transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
            }} />
          </div>

          {/* SÍ / NO prices */}
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 7px',
                borderRadius: 4, background: `${C.yes}12`, color: C.yes,
              }}>SÍ</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.yes, fontVariantNumeric: 'tabular-nums' }}>
                {yesP.toFixed(0)}¢
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 7px',
                borderRadius: 4, background: `${C.no}10`, color: C.no,
              }}>NO</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.no, fontVariantNumeric: 'tabular-nums' }}>
                {noP.toFixed(0)}¢
              </span>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: C.textDim, fontVariantNumeric: 'tabular-nums' }}>
              Vol {volume > 1000 ? `€${(volume/1000).toFixed(1)}K` : `€${volume.toFixed(0)}`}
            </span>
          </div>
        </div>
      </div>

      {/* CTA buttons */}
      {!market.placeholder && !isExpired && (
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button
            onClick={() => onTrade(market, 'YES')}
            style={{
              flex: 1, height: 52, borderRadius: 10,
              background: C.yes, border: 'none',
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '-0.01em',
              WebkitTapHighlightColor: 'transparent',
            }}>
            Comprar SÍ
          </button>
          <button
            onClick={() => onTrade(market, 'NO')}
            style={{
              flex: 1, height: 52, borderRadius: 10,
              background: C.no, border: 'none',
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '-0.01em',
              WebkitTapHighlightColor: 'transparent',
            }}>
            Comprar NO
          </button>
        </div>
      )}

      {(market.placeholder || isExpired) && (
        <div style={{
          marginTop: 24, height: 52, display: 'flex', alignItems: 'center',
          justifyContent: 'center',
          background: C.surface, borderRadius: 10,
          fontSize: 13, color: C.textDim, fontWeight: 500,
        }}>
          {isExpired ? 'Mercado en resolución' : 'Próximamente'}
        </div>
      )}

      {/* Swipe hint */}
      <div style={{
        textAlign: 'center', marginTop: 16,
        fontSize: 10, color: C.textDim, letterSpacing: '0.04em',
        opacity: 0.6,
      }}>
        ↓ desliza para ver más
      </div>
    </div>
  )
}

export default function MobileMarketFeed({
  markets,
  loading,
  catFilter,
  setCatFilter,
  onTrade,
}) {
  const activeMarkets = markets.filter(m => !m.isExpired)

  return (
    <>
      {/* Horizontal filter bar */}
      <div className="mobile-filter-bar">
        {CATEGORIES.map(cat => {
          const active = catFilter === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setCatFilter(cat.id)}
              style={{
                flexShrink: 0,
                height: 30, padding: '0 12px',
                borderRadius: 15,
                background: active ? C.text : C.surface,
                border: `1px solid ${active ? C.text : C.cardBorder}`,
                color: active ? C.card : C.textMuted,
                fontSize: 12, fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}>
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Snap scroll container */}
      <div className="mobile-snap-container">
        {loading ? (
          // Skeleton
          <div className="mobile-snap-item" style={{
            background: C.card, padding: '20px 16px', justifyContent: 'center',
            alignItems: 'center', gap: 16,
          }}>
            <div className="skeleton" style={{ height: 20, width: '30%', borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 24, width: '90%', borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 24, width: '75%', borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 52, width: 80, borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 6, width: '100%', borderRadius: 4 }} />
            <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 20 }}>
              <div className="skeleton" style={{ flex: 1, height: 52, borderRadius: 10 }} />
              <div className="skeleton" style={{ flex: 1, height: 52, borderRadius: 10 }} />
            </div>
          </div>
        ) : activeMarkets.length === 0 ? (
          <div className="mobile-snap-item" style={{
            background: C.card, alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ textAlign: 'center', color: C.textDim }}>
              <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.4 }}>○</div>
              <div style={{ fontSize: 14 }}>Sin mercados en este filtro.</div>
            </div>
          </div>
        ) : (
          activeMarkets.map(m => (
            <MobileCard key={m.id} market={m} onTrade={onTrade} />
          ))
        )}
      </div>
    </>
  )
}
