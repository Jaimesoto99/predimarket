import { useState } from 'react'
import { C, getCategoryColor, getCategoryLabel, getCloseInfo } from '../lib/theme'
import useTick from '../hooks/useTick'

// ─── Category pills ───────────────────────────────────────────────────────────

const CATS = [
  { id: 'ALL',        label: 'Todo' },
  { id: 'ECONOMIA',   label: 'Economía' },
  { id: 'TIPOS',      label: 'Tipos' },
  { id: 'ENERGIA',    label: 'Energía' },
  { id: 'DEPORTES',   label: 'Deportes' },
  { id: 'POLITICA',   label: 'Política' },
  { id: 'ACTUALIDAD', label: 'Actualidad' },
  { id: 'TECNOLOGIA', label: 'Tecnología' },
]

// ─── Vertical short card (9:16, 180×320px) ───────────────────────────────────

function ShortCard({ market, onTrade, onOpen }) {
  useTick()

  const yesP      = parseFloat(market.prices?.yes || 50)
  const noP       = parseFloat(market.prices?.no  || 50)
  const catColor  = getCategoryColor(market.category)
  const { countdown, isExpired, isUrgent } = getCloseInfo(
    market.resolution_time || market.close_date
  )
  const probColor = yesP > 60 ? C.yes : yesP < 40 ? C.no : C.warning

  return (
    <div
      onClick={() => !market.placeholder && onOpen && onOpen(market)}
      style={{
        // ── Dimensions: ~9:16 ratio ───────────────────────────────────
        width:     180,
        height:    320,
        flexShrink: 0,
        // ── Appearance ───────────────────────────────────────────────
        borderRadius: 12,
        background:   C.card,
        border:       `1px solid ${C.cardBorder}`,
        overflow:     'hidden',
        cursor:       market.placeholder ? 'default' : 'pointer',
        display:      'flex',
        flexDirection:'column',
        transition:   'border-color 0.12s ease, transform 0.12s ease',
        WebkitTapHighlightColor: 'transparent',
        userSelect:   'none',
      }}
      onMouseEnter={e => {
        if (!market.placeholder) {
          e.currentTarget.style.borderColor = C.cardBorderHover
          e.currentTarget.style.transform   = 'translateY(-2px)'
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = C.cardBorder
        e.currentTarget.style.transform   = 'translateY(0)'
      }}
    >
      {/* ── Top gradient area: category + timer ─────────────────────── */}
      <div style={{
        padding:    '10px 10px 8px',
        flexShrink: 0,
        background: `linear-gradient(135deg, ${catColor}18 0%, transparent 100%)`,
        borderBottom: `1px solid ${C.cardBorder}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.07em',
            textTransform: 'uppercase', color: catColor,
            background: `${catColor}15`, padding: '2px 6px', borderRadius: 3,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            maxWidth: 90,
          }}>
            {getCategoryLabel(market.category)}
          </span>
          <span style={{
            fontSize: 9, fontWeight: 500,
            color: isExpired ? C.warning : isUrgent ? C.no : C.textDim,
            flexShrink: 0,
          }}>
            {isExpired ? '⏱' : countdown?.split(' ').slice(0, 2).join(' ')}
          </span>
        </div>
      </div>

      {/* ── Title ───────────────────────────────────────────────────── */}
      <div style={{
        flex:    1,
        padding: '10px 10px 6px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 0,
      }}>
        <p style={{
          fontSize:   12,
          fontWeight: 600,
          color:      C.text,
          lineHeight: 1.4,
          margin:     0,
          letterSpacing: '-0.01em',
          // clamp to 4 lines
          display:           '-webkit-box',
          WebkitLineClamp:   4,
          WebkitBoxOrient:   'vertical',
          overflow:          'hidden',
        }}>
          {market.title}
        </p>

        {/* ── Probability ─────────────────────────────────────────── */}
        <div style={{ marginTop: 8 }}>
          <div style={{
            fontSize: 32, fontWeight: 800,
            letterSpacing: '-0.04em',
            fontVariantNumeric: 'tabular-nums',
            color: probColor, lineHeight: 1,
            marginBottom: 6,
          }}>
            {yesP.toFixed(0)}%
          </div>

          {/* Bar */}
          <div style={{
            height: 4, borderRadius: 4,
            background: C.cardBorder, overflow: 'hidden',
            marginBottom: 5,
          }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: `${yesP}%`, background: probColor,
              transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
            }} />
          </div>

          {/* SÍ / NO labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 9, color: C.yes, fontWeight: 600 }}>
              SÍ {yesP.toFixed(0)}¢
            </span>
            <span style={{ fontSize: 9, color: C.no, fontWeight: 600 }}>
              NO {noP.toFixed(0)}¢
            </span>
          </div>
        </div>
      </div>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      {!market.placeholder && !isExpired && (
        <div style={{ padding: '0 8px 10px', flexShrink: 0, display: 'flex', gap: 5 }}>
          <button
            onClick={e => { e.stopPropagation(); onTrade && onTrade(market, 'YES') }}
            style={{
              flex: 1, height: 28, borderRadius: 6,
              background: C.yes, border: 'none',
              color: '#fff', fontSize: 10, fontWeight: 700,
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            }}
          >
            SÍ
          </button>
          <button
            onClick={e => { e.stopPropagation(); onTrade && onTrade(market, 'NO') }}
            style={{
              flex: 1, height: 28, borderRadius: 6,
              background: C.no, border: 'none',
              color: '#fff', fontSize: 10, fontWeight: 700,
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            }}
          >
            NO
          </button>
        </div>
      )}
      {(market.placeholder || isExpired) && (
        <div style={{
          margin: '0 8px 10px', height: 28, borderRadius: 6,
          background: C.surface, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, color: C.textDim, fontWeight: 500,
        }}>
          {isExpired ? 'Resolviendo' : 'Próximamente'}
        </div>
      )}
    </div>
  )
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{
      width: 180, height: 320, flexShrink: 0,
      borderRadius: 12, overflow: 'hidden',
      background: C.card, border: `1px solid ${C.cardBorder}`,
      display: 'flex', flexDirection: 'column',
      padding: 10, gap: 8,
    }}>
      <div className="skeleton" style={{ height: 18, width: '60%', borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 14, width: '95%', borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 14, width: '80%', borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 14, width: '70%', borderRadius: 4 }} />
      <div style={{ flex: 1 }} />
      <div className="skeleton" style={{ height: 36, width: '50%', borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 4,  width: '100%', borderRadius: 4 }} />
      <div style={{ display: 'flex', gap: 5 }}>
        <div className="skeleton" style={{ flex: 1, height: 28, borderRadius: 6 }} />
        <div className="skeleton" style={{ flex: 1, height: 28, borderRadius: 6 }} />
      </div>
    </div>
  )
}

// ─── Discover section ─────────────────────────────────────────────────────────

export default function LiveFeed({ markets = [], loading, onTrade, onOpen }) {
  const [cat, setCat] = useState('ALL')

  const CNMV_CATS = new Set(['ECONOMIA', 'TIPOS', 'ENERGIA'])
  const active   = markets.filter(m => !m.isExpired && !m.placeholder && CNMV_CATS.has(m.category))
  const filtered = cat === 'ALL' ? active : active.filter(m => m.category === cat)

  const activeCatIds = new Set(active.map(m => m.category).filter(Boolean))
  const visibleCats  = CATS.filter(c => c.id === 'ALL' || activeCatIds.has(c.id))

  // Don't render if no markets and not loading
  if (!loading && active.length === 0) return null

  return (
    <section style={{ marginBottom: 32 }}>

      {/* ── Section header ─────────────────────────────────────────── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   14,
        flexWrap:       'wrap',
        gap:            10,
      }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{
            fontSize: 16, fontWeight: 700,
            letterSpacing: '-0.025em',
            color: C.text, margin: 0,
          }}>
            Discover
          </h2>
          {!loading && (
            <span style={{
              fontSize: 11, color: C.textDim,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {filtered.length} mercado{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Category pills */}
        <div
          className="discover-pills"
          style={{
            display:    'flex',
            gap:        6,
            overflowX:  'auto',
            flexWrap:   'nowrap',
            flexShrink: 1,
            minWidth:   0,
          }}
        >
          {visibleCats.map(c => {
            const isActive = cat === c.id
            return (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                style={{
                  flexShrink:  0,
                  height:      26,
                  padding:     '0 10px',
                  borderRadius: 13,
                  background:  isActive ? C.text : C.surface,
                  border:      `1px solid ${isActive ? C.text : C.cardBorder}`,
                  color:       isActive ? C.card : C.textMuted,
                  fontSize:    11,
                  fontWeight:  isActive ? 600 : 400,
                  cursor:      'pointer',
                  whiteSpace:  'nowrap',
                  WebkitTapHighlightColor: 'transparent',
                  transition:  'all 0.12s',
                }}
              >
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Horizontal scroll row ──────────────────────────────────── */}
      <div
        className="discover-row"
        style={{
          display:    'flex',
          gap:        12,
          overflowX:  'scroll',
          overflowY:  'visible',
          paddingBottom: 4,  // room for shadow/hover lift
        }}
      >
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : filtered.length === 0 ? (
          <div style={{
            height: 320, display: 'flex', alignItems: 'center',
            color: C.textDim, fontSize: 13,
          }}>
            Sin mercados en esta categoría.
          </div>
        ) : (
          filtered.map(m => (
            <ShortCard
              key={m.id}
              market={m}
              onTrade={onTrade}
              onOpen={onOpen}
            />
          ))
        )}
      </div>

    </section>
  )
}
