import { C, getCategoryColor, getCategoryLabel } from '../lib/theme'

const ALL_CATS = ['ECONOMIA', 'POLITICA', 'DEPORTES', 'ENERGIA', 'TECNOLOGIA', 'CRIPTO', 'ACTUALIDAD', 'GEOPOLITICA', 'INTERNACIONAL', 'SOCIEDAD', 'CIENCIA', 'CULTURA', 'CLIMA']

export default function MarketFilters({ filter, setFilter, catFilter, setCatFilter, activeMarkets }) {
  const activeCats    = new Set(activeMarkets.map(m => m.category).filter(Boolean))
  const spainCount    = activeMarkets.filter(m => m.super_category === 'SPAIN').length
  const allCount      = activeMarkets.length

  const timeFilters = [
    { f: 'ALL',     label: 'Todos',   count: allCount },
    { f: 'DIARIO',  label: 'Diario',  count: activeMarkets.filter(m => m.market_type === 'FLASH'  || m.market_type === 'DIARIO').length },
    { f: 'SEMANAL', label: 'Semanal', count: activeMarkets.filter(m => m.market_type === 'SHORT'  || m.market_type === 'SEMANAL').length },
    { f: 'MENSUAL', label: 'Mensual', count: activeMarkets.filter(m => m.market_type === 'LONG'   || m.market_type === 'MENSUAL').length },
  ]

  return (
    <div style={{ padding: '0 0 8px' }}>

      {/* Time filter tabs */}
      <div className="no-scrollbar" style={{
        display: 'flex', overflowX: 'auto',
        borderBottom: `1px solid ${C.cardBorder}`,
        gap: 0,
      }}>
        {timeFilters.map(({ f, label, count }) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            flexShrink: 0,
            padding: '9px 14px', fontSize: 13,
            fontWeight: filter === f ? 600 : 400,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: filter === f ? C.text : C.textMuted,
            borderBottom: `2px solid ${filter === f ? C.accent : 'transparent'}`,
            marginBottom: -1, whiteSpace: 'nowrap',
            transition: 'color 0.12s',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {label}
            {count > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 500, letterSpacing: '0.02em',
                color: filter === f ? C.textMuted : C.textDim,
              }}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="no-scrollbar" style={{
        display: 'flex', gap: 6, overflowX: 'auto',
        padding: '12px 0 0',
      }}>
        <button onClick={() => setCatFilter('ALL')} style={{
          flexShrink: 0, padding: '4px 12px', fontSize: 12,
          fontWeight: catFilter === 'ALL' ? 600 : 400,
          borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap',
          border: `1px solid ${catFilter === 'ALL' ? C.accent : C.cardBorder}`,
          background: catFilter === 'ALL' ? C.accent : 'transparent',
          color: catFilter === 'ALL' ? '#fff' : C.textMuted,
          transition: 'all 0.12s',
        }}>
          Todos
        </button>

        {/* España 🇪🇸 filter */}
        {spainCount > 0 && (
          <button onClick={() => setCatFilter('SPAIN')} style={{
            flexShrink: 0, padding: '4px 12px', fontSize: 12,
            fontWeight: catFilter === 'SPAIN' ? 600 : 400,
            borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap',
            border: `1px solid ${catFilter === 'SPAIN' ? '#c60b1e' : C.cardBorder}`,
            background: catFilter === 'SPAIN' ? '#c60b1e10' : 'transparent',
            color: catFilter === 'SPAIN' ? '#c60b1e' : C.textMuted,
            display: 'flex', alignItems: 'center', gap: 5,
            transition: 'all 0.12s',
          }}>
            <span>🇪🇸</span> España
            <span style={{ fontSize: 10, color: catFilter === 'SPAIN' ? '#c60b1e' : C.textDim }}>{spainCount}</span>
          </button>
        )}

        {ALL_CATS.filter(cat => activeCats.has(cat)).map(cat => {
          const isActive = catFilter === cat
          const catColor = getCategoryColor(cat)
          return (
            <button key={cat} onClick={() => setCatFilter(cat)} style={{
              flexShrink: 0, padding: '4px 12px', fontSize: 12,
              fontWeight: isActive ? 600 : 400,
              borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap',
              border: `1px solid ${isActive ? catColor : C.cardBorder}`,
              background: isActive ? `${catColor}12` : 'transparent',
              color: isActive ? catColor : C.textMuted,
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'all 0.12s',
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                background: isActive ? catColor : C.textDim,
              }} />
              {getCategoryLabel(cat)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
