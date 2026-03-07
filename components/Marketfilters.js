import { C, getCategoryColor, getCategoryLabel } from '../lib/theme'

const ALL_CATS = ['ECONOMIA', 'POLITICA', 'DEPORTES', 'ENERGIA', 'CRIPTO', 'ACTUALIDAD', 'GEOPOLITICA', 'CLIMA']
const availableCategories = ['ALL', ...ALL_CATS]

export default function MarketFilters({ filter, setFilter, catFilter, setCatFilter, activeMarkets }) {
  const activeCats = new Set(activeMarkets.map(m => m.category).filter(Boolean))

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
      {/* Time filter tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.cardBorder}` }}>
        {[
          ['ALL', 'Todos', activeMarkets.length],
          ['DIARIO', 'Diario', activeMarkets.filter(m => m.market_type === 'FLASH' || m.market_type === 'DIARIO').length],
          ['SEMANAL', 'Semanal', activeMarkets.filter(m => m.market_type === 'SHORT' || m.market_type === 'SEMANAL').length],
          ['MENSUAL', 'Mensual', activeMarkets.filter(m => m.market_type === 'LONG' || m.market_type === 'MENSUAL').length],
        ].map(([f, label, count]) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '9px 16px', fontSize: 13, fontWeight: filter === f ? 600 : 400,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: filter === f ? C.text : C.textDim,
            borderBottom: `2px solid ${filter === f ? C.accent : 'transparent'}`,
            marginBottom: -1, transition: 'color 0.15s',
          }}>
            {label}
            {count > 0 && (
              <span style={{ marginLeft: 5, fontSize: 10, color: C.textDim, fontWeight: 400 }}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Category filter pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '12px 0 20px' }}>
        {availableCategories.map(cat => {
          const isActive = catFilter === cat
          const hasMarkets = cat === 'ALL' || activeCats.has(cat)
          return (
            <button
              key={cat}
              onClick={() => hasMarkets && setCatFilter(cat)}
              style={{
                padding: '5px 13px', fontSize: 12, fontWeight: isActive ? 600 : 400,
                letterSpacing: '0.01em', borderRadius: 20, transition: 'all 0.2s ease',
                cursor: hasMarkets ? 'pointer' : 'default',
                border: `1px solid ${isActive ? C.accent : hasMarkets ? C.cardBorder : C.divider}`,
                background: isActive ? C.accent : 'transparent',
                color: isActive ? '#fff' : hasMarkets ? C.textMuted : C.textDim,
                opacity: hasMarkets ? 1 : 0.4,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
              {cat !== 'ALL' && (
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: isActive ? 'rgba(255,255,255,0.7)' : getCategoryColor(cat),
                  display: 'inline-block', flexShrink: 0,
                }} />
              )}
              {cat === 'ALL' ? 'Todos' : getCategoryLabel(cat)}
              {cat !== 'ALL' && hasMarkets && (
                <span style={{ fontSize: 10, opacity: 0.6, fontWeight: 400 }}>
                  {activeMarkets.filter(m => m.category === cat).length}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
