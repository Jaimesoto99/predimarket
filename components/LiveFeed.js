import { useState, useRef } from 'react'
import { C, getCategoryColor, getCategoryLabel, getCloseInfo } from '../lib/theme'
import useTick from '../hooks/useTick'

// ─── Category filter data ─────────────────────────────────────────────────────

const CATS = [
  { id: 'ALL',        label: 'Todo' },
  { id: 'ECONOMIA',   label: 'Economía' },
  { id: 'TIPOS',      label: 'Tipos' },
  { id: 'ENERGIA',    label: 'Energía' },
  { id: 'DEPORTES',   label: 'Deportes' },
  { id: 'POLITICA',   label: 'Política' },
  { id: 'ACTUALIDAD', label: 'Actualidad' },
  { id: 'TECNOLOGIA', label: 'Tecnología' },
  { id: 'CLIMA',      label: 'Clima' },
]

// ─── Single card ─────────────────────────────────────────────────────────────

function LiveCard({ market, idx, total, onTrade, onOpen }) {
  useTick()

  const yesP       = parseFloat(market.prices?.yes || 50)
  const noP        = parseFloat(market.prices?.no  || 50)
  const catColor   = getCategoryColor(market.category)
  const closeInfo  = getCloseInfo(market.resolution_time || market.close_date)
  const { countdown, isExpired, isUrgent, dateStr } = closeInfo
  const volume     = market.total_volume || 0
  const probColor  = yesP > 60 ? C.yes : yesP < 40 ? C.no : C.warning

  return (
    <div
      style={{
        // ── Snap target ───────────────────────────────────────────────
        height: '100%',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
        // ── Layout ────────────────────────────────────────────────────
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        background: C.card,
        borderBottom: `1px solid ${C.cardBorder}`,
        // ── Top padding so content clears the overlay header ──────────
        paddingTop: 80,
      }}
    >

      {/* ── Scrollable inner content ─────────────────────────────────── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        flexDirection: 'column',
        padding: '0 20px 20px',
        gap: 20,
      }}>

        {/* Category + timer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
            textTransform: 'uppercase', color: catColor,
            background: `${catColor}12`, padding: '3px 8px', borderRadius: 4,
          }}>
            {getCategoryLabel(market.category)}
          </span>
          <div style={{ textAlign: 'right' }}>
            {dateStr && (
              <div style={{ fontSize: 9, color: C.textDim, marginBottom: 1 }}>
                Cierra: {dateStr}
              </div>
            )}
            <div style={{
              fontSize: 11, fontWeight: 600,
              color: isExpired ? C.warning : isUrgent ? C.no : C.textDim,
            }}>
              {isExpired ? 'Resolviendo…' : countdown}
            </div>
          </div>
        </div>

        {/* Title */}
        <p style={{
          fontSize: 22, fontWeight: 700, color: C.text,
          lineHeight: 1.3, margin: 0,
          letterSpacing: '-0.025em',
        }}>
          {market.title}
        </p>

        {/* Probability */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{
              fontSize: 56, fontWeight: 800, letterSpacing: '-0.04em',
              fontVariantNumeric: 'tabular-nums', color: probColor, lineHeight: 1,
            }}>
              {yesP.toFixed(0)}%
            </span>
            <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 500 }}>
              probabilidad SÍ
            </span>
          </div>

          {/* Bar */}
          <div style={{
            height: 6, borderRadius: 6,
            background: C.cardBorder, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 6,
              width: `${yesP}%`, background: probColor,
              transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
            }} />
          </div>

          {/* SÍ / NO + volume */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 6px',
                borderRadius: 3, background: `${C.yes}12`, color: C.yes,
              }}>SÍ</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.yes, fontVariantNumeric: 'tabular-nums' }}>
                {yesP.toFixed(0)}¢
              </span>
            </div>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 6px',
                borderRadius: 3, background: `${C.no}10`, color: C.no,
              }}>NO</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.no, fontVariantNumeric: 'tabular-nums' }}>
                {noP.toFixed(0)}¢
              </span>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: C.textDim, fontVariantNumeric: 'tabular-nums' }}>
              Vol {volume > 1000 ? `€${(volume / 1000).toFixed(1)}K` : `€${volume.toFixed(0)}`}
            </span>
          </div>
        </div>

        {/* Oracle / detail link */}
        {onOpen && !market.placeholder && (
          <button
            onClick={() => onOpen(market)}
            style={{
              alignSelf: 'flex-start',
              padding: '5px 12px', borderRadius: 6,
              border: `1px solid ${C.cardBorder}`,
              background: 'transparent', color: C.textMuted,
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Ver oráculo →
          </button>
        )}

      </div>

      {/* ── CTA buttons (pinned bottom) ───────────────────────────────── */}
      <div style={{
        padding: '14px 20px',
        paddingBottom: 'calc(14px + env(safe-area-inset-bottom))',
        background: C.card,
        borderTop: `1px solid ${C.cardBorder}`,
        flexShrink: 0,
      }}>
        {!market.placeholder && !isExpired ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => onTrade && onTrade(market, 'YES')}
              style={{
                flex: 1, height: 52, borderRadius: 10,
                background: C.yes, border: 'none',
                color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              }}
            >
              Comprar SÍ
            </button>
            <button
              onClick={() => onTrade && onTrade(market, 'NO')}
              style={{
                flex: 1, height: 52, borderRadius: 10,
                background: C.no, border: 'none',
                color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              }}
            >
              Comprar NO
            </button>
          </div>
        ) : (
          <div style={{
            height: 52, display: 'flex', alignItems: 'center',
            justifyContent: 'center', borderRadius: 10,
            background: C.surface, fontSize: 13,
            color: C.textDim, fontWeight: 500,
          }}>
            {isExpired ? 'Mercado en resolución' : 'Próximamente'}
          </div>
        )}

        {/* Card counter */}
        <div style={{
          marginTop: 10,
          display: 'flex', justifyContent: 'center', gap: 4,
        }}>
          {Array.from({ length: Math.min(total, 10) }).map((_, i) => (
            <div key={i} style={{
              width: i === idx ? 16 : 4, height: 4,
              borderRadius: 2,
              background: i === idx ? C.text : C.cardBorder,
              transition: 'width 0.25s ease, background 0.25s ease',
            }} />
          ))}
        </div>
      </div>

    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

export default function LiveFeed({ markets = [], loading, onTrade, onOpen }) {
  const [cat, setCat]         = useState('ALL')
  const snapRef               = useRef(null)
  const [activeIdx, setActiveIdx] = useState(0)

  // Only active, non-placeholder markets
  const active   = markets.filter(m => !m.isExpired && !m.placeholder)
  const filtered = cat === 'ALL' ? active : active.filter(m => m.category === cat)

  // Which categories actually have markets
  const activeCatIds = new Set(active.map(m => m.category).filter(Boolean))
  const visibleCats  = CATS.filter(c => c.id === 'ALL' || activeCatIds.has(c.id))

  // Track current snap index via scroll events
  function handleScroll() {
    if (!snapRef.current) return
    const { scrollTop, clientHeight } = snapRef.current
    const idx = Math.round(scrollTop / clientHeight)
    setActiveIdx(idx)
  }

  if (!loading && filtered.length === 0) return null

  return (
    // ── Outer section: breaks out of app-content horizontal padding ───
    <section
      className="live-section"
      style={{ position: 'relative' }}
    >

      {/* ── Overlay header (label + category filters) ──────────────── */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          zIndex: 10, pointerEvents: 'none',
          padding: '12px 20px 28px',
          background: 'linear-gradient(to bottom, var(--bg) 55%, transparent)',
        }}
      >
        {/* Live label */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
          pointerEvents: 'none',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#ef4444', flexShrink: 0,
            boxShadow: '0 0 0 2px #ef444430',
            animation: 'live-pulse 2s ease-in-out infinite',
          }} />
          <span style={{
            fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', color: C.text,
          }}>
            En directo
          </span>
          <span style={{ fontSize: 11, color: C.textDim }}>
            {filtered.length} mercado{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Category filter pills — pointer-events re-enabled */}
        <div
          className="live-filter-pills"
          style={{
            display: 'flex', gap: 6, overflowX: 'auto',
            flexWrap: 'nowrap', pointerEvents: 'auto',
          }}
        >
          {visibleCats.map(c => {
            const active = cat === c.id
            return (
              <button
                key={c.id}
                onClick={() => { setCat(c.id); setActiveIdx(0); snapRef.current?.scrollTo({ top: 0 }) }}
                style={{
                  flexShrink: 0,
                  height: 28, padding: '0 11px',
                  borderRadius: 14,
                  background: active ? C.text : 'var(--surface)',
                  border: `1px solid ${active ? C.text : C.cardBorder}`,
                  color: active ? C.card : C.textMuted,
                  fontSize: 12, fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Snap scroll container ─────────────────────────────────────── */}
      <div
        ref={snapRef}
        onScroll={handleScroll}
        className="live-snap"
        style={{
          // Fill the section exactly
          height: '100%',
          // Snap engine
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {loading ? (
          // ── Skeleton ─────────────────────────────────────────────────
          <div style={{
            height: '100%', scrollSnapAlign: 'start',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 16, padding: '80px 20px 20px',
            background: C.card,
          }}>
            {[90, 70, 50, 100, 100, 50].map((w, i) => (
              <div key={i} className="skeleton" style={{
                height: i === 2 ? 56 : i === 4 ? 52 : 18,
                width: `${w}%`, borderRadius: 8,
              }} />
            ))}
          </div>
        ) : (
          filtered.map((m, i) => (
            <LiveCard
              key={m.id}
              market={m}
              idx={i}
              total={filtered.length}
              onTrade={onTrade}
              onOpen={onOpen}
            />
          ))
        )}
      </div>

    </section>
  )
}
