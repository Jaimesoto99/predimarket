import { C, getCategoryColor, getCategoryLabel } from '../lib/theme'

const ALL_CATS = ['ECONOMIA', 'POLITICA', 'DEPORTES', 'ENERGIA', 'CRIPTO', 'ACTUALIDAD', 'GEOPOLITICA', 'CLIMA', 'TECNOLOGIA']

export default function MarketFilters({ filter, setFilter, catFilter, setCatFilter, activeMarkets }) {
  const activeCats = new Set(activeMarkets.map(m => m.category).filter(Boolean))
  const allCount = activeMarkets.length

  const timeFilters = [
    { f: 'ALL',     label: 'Todos',    count: allCount },
    { f: 'DIARIO',  label: 'Diario',   count: activeMarkets.filter(m => m.market_type === 'FLASH' || m.market_type === 'DIARIO').length },
    { f: 'SEMANAL', label: 'Semanal',  count: activeMarkets.filter(m => m.market_type === 'SHORT' || m.market_type === 'SEMANAL').length },
    { f: 'MENSUAL', label: 'Mensual',  count: activeMarkets.filter(m => m.market_type === 'LONG'  || m.market_type === 'MENSUAL').length },
  ]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>

      {/* Time filter — horizontal scroll tabs */}
      <div
        className="no-scrollbar"
        style={{ display: 'flex', overflowX: 'auto', borderBottom: `1px solid ${C.cardBorder}` }}>
        {timeFilters.map(({ f, label, count }) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            flexShrink: 0,
            padding: '10px 14px', fontSize: 13, fontWeight: filter === f ? 600 : 400,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: filter === f ? C.text : C.textMuted,
            borderBottom: `2px solid ${filter === f ? C.accent : 'transparent'}`,
            marginBottom: -1, whiteSpace: 'nowrap',
            transition: 'color 0.15s',
          }}>
            {label}
            {count > 0 && (
              <span style={{
                marginLeft: 5, fontSize: 10, fontWeight: 400,
                color: filter === f ? C.textMuted : C.textDim,
              }}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Category pills — horizontal scroll */}
      <div
        className="no-scrollbar"
        style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '12px 0 16px' }}>

        {/* ALL pill */}
        <button
          onClick={() => setCatFilter('ALL')}
          style={{
            flexShrink: 0, padding: '5px 14px', fontSize: 12, fontWeight: catFilter === 'ALL' ? 600 : 400,
            borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
            border: `1px solid ${catFilter === 'ALL' ? C.accent : C.cardBorder}`,
            background: catFilter === 'ALL' ? C.accent : 'transparent',
            color: catFilter === 'ALL' ? '#fff' : C.textMuted,
          }}>
          Todos
          <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>{allCount}</span>
        </button>

        {ALL_CATS.filter(cat => activeCats.has(cat)).map(cat => {
          const isActive = catFilter === cat
          const catColor = getCategoryColor(cat)
          const catCount = activeMarkets.filter(m => m.category === cat).length
          return (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              style={{
                flexShrink: 0, padding: '5px 13px', fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
                border: `1px solid ${isActive ? catColor : C.cardBorder}`,
                background: isActive ? `${catColor}18` : 'transparent',
                color: isActive ? catColor : C.textMuted,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                background: isActive ? catColor : C.textDim,
              }} />
              {getCategoryLabel(cat)}
              <span style={{ fontSize: 10, opacity: 0.65, fontWeight: 400 }}>{catCount}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
