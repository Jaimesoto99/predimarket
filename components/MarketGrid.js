import { useEffect, useRef, useState } from 'react'
import { C, badge, getCategoryColor, getCategoryLabel, getTypeLabel, getTimeLeft, getOracleDescription } from '../lib/theme'
import MarketCard from './MarketCard'

const INITIAL_VISIBLE = 12
const LOAD_MORE_STEP  = 8

function PlaceholderCard({ market }) {
  const catColor = getCategoryColor(market.category)
  const yesP = parseFloat(market.prices?.yes || 50)

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      background: C.card, border: `1px solid ${C.cardBorder}`,
      borderRadius: 12, overflow: 'hidden', opacity: 0.55,
      cursor: 'default',
    }}>
      {/* Category strip */}
      <div style={{ width: 3, flexShrink: 0, background: catColor, opacity: 0.5 }} />

      <div style={{ flex: 1, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'nowrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: catColor }}>
              {getCategoryLabel(market.category)}
            </span>
            <span style={{ fontSize: 10, color: C.textDim }}>·</span>
            <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.textDim }}>
              {getTypeLabel(market)}
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '1px 5px', borderRadius: 3, marginLeft: 2, color: C.textDim, background: C.surface, border: `1px solid ${C.cardBorder}` }}>
              Próximamente
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: C.textDim, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              {getTimeLeft(market.close_date)}
            </span>
          </div>
          <p style={{ fontSize: 13, fontWeight: 500, color: C.textMuted, lineHeight: 1.45, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {market.title}
          </p>
        </div>

        {/* Probability display */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, minWidth: 56, opacity: 0.6 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.textMuted, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {yesP.toFixed(0)}%
          </div>
          <div style={{ height: 3, width: 56, borderRadius: 3, background: C.cardBorder, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${yesP}%`, background: C.textDim, borderRadius: 3 }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      background: C.card, border: `1px solid ${C.cardBorder}`,
      borderRadius: 12, padding: '14px 16px', overflow: 'hidden',
    }}>
      <div style={{ width: 3, alignSelf: 'stretch', flexShrink: 0 }}>
        <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 0 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="skeleton" style={{ height: 10, width: '20%', marginBottom: 8, borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 13, width: '85%', marginBottom: 5, borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 13, width: '60%', marginBottom: 10, borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 10, width: '30%', borderRadius: 4 }} />
      </div>
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        <div className="skeleton" style={{ height: 24, width: 48, borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 3, width: 72, borderRadius: 3 }} />
      </div>
    </div>
  )
}

function SectionLabel({ children, count, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
          color: C.textDim,
        }}>
          {children}
        </span>
        {count != null && (
          <span style={{
            fontSize: 10, color: C.textDim, fontWeight: 500,
            background: `${C.cardBorder}`,
            padding: '1px 6px', borderRadius: 10,
          }}>
            {count}
          </span>
        )}
      </div>
      {action}
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
  const [loadingTooLong, setLoadingTooLong] = useState(false)
  const sentinelRef = useRef(null)

  // 10s fallback: show error if still loading after 10 seconds
  useEffect(() => {
    if (!loading) { setLoadingTooLong(false); return }
    const t = setTimeout(() => setLoadingTooLong(true), 10000)
    return () => clearTimeout(t)
  }, [loading])

  useEffect(() => { setVisibleCount(INITIAL_VISIBLE) }, [filtered.length])

  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setVisibleCount(v => v + LOAD_MORE_STEP)
    }, { threshold: 0.1 })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [])

  const realFiltered     = filtered.filter(m => !m.placeholder)
  const sortedByVolume   = [...realFiltered].sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
  const sortedByTraders  = [...realFiltered].sort((a, b) => (b.active_traders || 0) - (a.active_traders || 0))
  const now = Date.now()
  const newMarkets = realFiltered.filter(m => m.created_at && now - new Date(m.created_at).getTime() < 48 * 3600000)

  const labelMap = {}
  sortedByVolume.slice(0, 3).forEach(m => { labelMap[m.id] = 'TRENDING' })
  sortedByTraders.slice(0, 3).forEach(m => { if (!labelMap[m.id]) labelMap[m.id] = 'HOT' })
  newMarkets.forEach(m => { if (!labelMap[m.id]) labelMap[m.id] = 'NEW' })

  // Sort: markets with activity first, 0-volume at end
  const sortedFiltered = [
    ...filtered.filter(m => m.placeholder || (m.total_volume || 0) > 0 || (m.active_traders || 0) > 0),
    ...filtered.filter(m => !m.placeholder && (m.total_volume || 0) === 0 && (m.active_traders || 0) === 0),
  ]

  const visible = sortedFiltered.slice(0, visibleCount)
  const hasMore = visibleCount < sortedFiltered.length

  return (
    <div style={{ padding: '0 0 48px' }}>

      {/* Loading */}
      {loading ? (
        loadingTooLong ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 14, color: C.textDim, marginBottom: 16 }}>
              No se pudieron cargar los mercados.
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                fontSize: 13, fontWeight: 600,
                background: C.text, color: C.card,
                border: 'none', borderRadius: 8,
                padding: '10px 20px', cursor: 'pointer',
              }}>
              Recarga la página
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionLabel>Cargando mercados...</SectionLabel>
            {[0,1,2,3,4,5].map(i => <SkeletonRow key={i} />)}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: C.textDim }}>
          <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.4 }}>○</div>
          <div style={{ fontSize: 14 }}>Sin mercados en este filtro.</div>
        </div>
      ) : (
        <>
          <SectionLabel count={realFiltered.length}>Mercados activos</SectionLabel>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {visible.map(m => (
              m.placeholder
                ? <PlaceholderCard key={m.id} market={m} />
                : <MarketCard key={m.id} market={m} onOpen={onOpen} label={labelMap[m.id]} />
            ))}
          </div>

          {hasMore && (
            <div ref={sentinelRef} style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[0,1,2].map(i => <SkeletonRow key={i} />)}
            </div>
          )}
        </>
      )}

      {/* Pending resolution */}
      {pendingMarkets.length > 0 && (
        <div style={{
          marginTop: 20, padding: '10px 16px',
          background: `${C.warning}08`, border: `1px solid ${C.warning}20`,
          borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: 3, background: C.warning, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: C.warning, fontWeight: 500 }}>
            {pendingMarkets.length} mercado{pendingMarkets.length > 1 ? 's' : ''} pendiente{pendingMarkets.length > 1 ? 's' : ''} de resolución por oráculo
          </span>
        </div>
      )}

      {/* Resolved markets */}
      {resolvedMarkets.length > 0 && (
        <div style={{ marginTop: 48 }}>
          <SectionLabel
            count={resolvedMarkets.length}
            action={
              <button
                onClick={() => setShowResolved(!showResolved)}
                style={{
                  fontSize: 12, color: C.textMuted, background: 'none',
                  border: `1px solid ${C.cardBorder}`, borderRadius: 6,
                  padding: '3px 10px', cursor: 'pointer',
                }}>
                {showResolved ? 'Menos' : 'Ver todos'}
              </button>
            }
          >
            Últimos resultados
          </SectionLabel>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {(showResolved ? resolvedMarkets : resolvedMarkets.slice(0, 8)).map(m => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 0',
                borderBottom: `1px solid ${C.divider}`,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 500, color: C.text,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    marginBottom: 2,
                  }}>{m.title}</div>
                  <div style={{ fontSize: 11, color: C.textDim }}>
                    {m.resolution_source || getOracleDescription(m).source}
                    {m.close_date && ` · ${new Date(m.close_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`}
                  </div>
                </div>
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: C.textDim, fontVariantNumeric: 'tabular-nums' }}>
                    €{((m.total_volume || 0) / 1000).toFixed(1)}K
                  </span>
                  <span style={badge(m.resolved_outcome ? C.yes : C.no)}>
                    {m.resolved_outcome ? 'SÍ' : 'NO'}
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
