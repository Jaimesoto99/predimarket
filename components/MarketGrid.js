import { useEffect, useRef, useState } from 'react'
import { C, badge, getOracleDescription } from '../lib/theme'
import MarketCard from './marketcard'

const INITIAL_VISIBLE = 9
const LOAD_MORE_STEP = 6

function SkeletonCard({ wide }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.cardBorder}`,
      borderRadius: 12, padding: '18px 18px 16px',
      gridColumn: wide ? 'span 2' : undefined,
    }}>
      <div className="skeleton" style={{ height: 14, width: '35%', marginBottom: 14 }} />
      <div className="skeleton" style={{ height: 14, width: '90%', marginBottom: 6 }} />
      <div className="skeleton" style={{ height: 14, width: '70%', marginBottom: 20 }} />
      <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
        <div className="skeleton" style={{ height: 30, width: 60 }} />
        <div className="skeleton" style={{ height: 30, width: 60 }} />
      </div>
      <div className="skeleton" style={{ height: 5, width: '100%', borderRadius: 5, marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 12, width: '50%' }} />
    </div>
  )
}

function SectionHeader({ title, count, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: accent || C.textDim }}>
        {title}
      </span>
      {count > 0 && (
        <span style={{
          fontSize: 10, fontWeight: 600, color: accent || C.textDim,
          background: `${accent || C.textDim}12`,
          border: `1px solid ${accent || C.textDim}25`,
          padding: '1px 6px', borderRadius: 10,
        }}>{count}</span>
      )}
      <div style={{ flex: 1, height: 1, background: C.divider }} />
    </div>
  )
}

export default function MarketGrid({
  filtered,
  loading,
  pendingMarkets,
  resolvedMarkets,
  showResolved,
  setShowResolved,
  onOpen,
}) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)
  const sentinelRef = useRef(null)

  // Reset visible count when filter changes
  useEffect(() => { setVisibleCount(INITIAL_VISIBLE) }, [filtered.length])

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setVisibleCount(v => v + LOAD_MORE_STEP)
      }
    }, { threshold: 0.1 })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [])

  // Compute labels for markets
  const sortedByVolume = [...filtered].sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
  const sortedByTraders = [...filtered].sort((a, b) => (b.active_traders || b.total_traders || 0) - (a.active_traders || a.total_traders || 0))
  const now = Date.now()
  const newMarkets = filtered.filter(m => m.created_at && now - new Date(m.created_at).getTime() < 48 * 3600000)

  const labelMap = {}
  sortedByVolume.slice(0, 4).forEach(m => { labelMap[m.id] = 'TRENDING' })
  sortedByTraders.slice(0, 4).forEach(m => { if (!labelMap[m.id]) labelMap[m.id] = 'HOT' })
  newMarkets.forEach(m => { if (!labelMap[m.id]) labelMap[m.id] = 'NEW' })

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px 56px' }}>

      {/* Loading skeletons */}
      {loading ? (
        <div>
          <SectionHeader title="Cargando mercados..." count={0} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {[0,1,2,3,4,5].map(i => <SkeletonCard key={i} wide={i === 0} />)}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '64px 0', color: C.textDim, fontSize: 13,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>&#128202;</div>
          No hay mercados activos en este filtro.
        </div>
      ) : (
        <>
          {/* Section header */}
          <SectionHeader title="Mercados activos" count={filtered.length} accent={C.accent} />

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {visible.map((m, index) => (
              <MarketCard
                key={m.id}
                market={m}
                index={index}
                total={visible.length}
                onOpen={onOpen}
                label={labelMap[m.id]}
              />
            ))}
          </div>

          {/* Infinite scroll sentinel + loader */}
          {hasMore && (
            <div ref={sentinelRef} style={{ textAlign: 'center', padding: '24px 0', color: C.textDim, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                {[0,1,2].map(i => <SkeletonCard key={i} />)}
              </div>
            </div>
          )}
        </>
      )}

      {/* Pending resolution notice */}
      {pendingMarkets.length > 0 && (
        <div style={{
          marginTop: 24, padding: '12px 16px',
          background: `${C.warning}08`, border: `1px solid ${C.warning}20`,
          borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: 3, background: C.warning, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: C.warning, fontWeight: 500 }}>
            {pendingMarkets.length} mercado{pendingMarkets.length > 1 ? 's' : ''} pendiente{pendingMarkets.length > 1 ? 's' : ''} de resolucion por oraculo
          </span>
        </div>
      )}

      {/* Resolved markets section */}
      {resolvedMarkets.length > 0 && (
        <div style={{ marginTop: 48 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <SectionHeader title="Ultimos resultados" count={resolvedMarkets.length} />
            <button
              onClick={() => setShowResolved(!showResolved)}
              style={{
                fontSize: 12, color: C.textDim, background: 'none',
                border: `1px solid ${C.cardBorder}`, borderRadius: 6,
                padding: '4px 12px', cursor: 'pointer', flexShrink: 0, marginLeft: 12,
              }}>
              {showResolved ? 'Ver menos' : 'Ver todos'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(showResolved ? resolvedMarkets : resolvedMarkets.slice(0, 8)).map(m => (
              <div key={m.id} style={{
                background: C.card, border: `1px solid ${C.cardBorder}`,
                borderRadius: 8, padding: '11px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 500, color: C.text,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3,
                  }}>{m.title}</div>
                  <div style={{ fontSize: 11, color: C.textDim }}>
                    {m.resolution_source || getOracleDescription(m).source}
                    {m.close_date && ` · ${new Date(m.close_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: C.textDim, fontFamily: 'ui-monospace, monospace' }}>
                    €{(Math.max(0, (m.total_volume || 0) - 5000) / 1000).toFixed(1)}K
                  </span>
                  <span style={badge(m.resolved_outcome ? C.yes : C.no)}>
                    {m.resolved_outcome ? 'SI' : 'NO'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
