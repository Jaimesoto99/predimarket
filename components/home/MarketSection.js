import { C, getCategoryColor, getTimeLeft } from '../../lib/theme'
import useTick from '../../hooks/useTick'

// ─── Mini card for horizontal scroll sections ─────────────────────────────

function MiniCard({ market, onOpen, onTrade }) {
  useTick()
  const yesP      = parseFloat(market.prices?.yes || 50)
  const catColor  = getCategoryColor(market.category)
  const timeLeft  = getTimeLeft(market.resolution_time || market.close_date)
  const probColor = yesP > 60 ? C.yes : yesP < 40 ? C.no : C.warning
  const traders   = market.trader_count ?? market.active_traders ?? market.total_traders ?? 0

  function stopAndOpen(e, side) {
    e.stopPropagation()
    if (onTrade) onTrade(market, side)
    else onOpen(market)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(market)}
      onKeyDown={e => e.key === 'Enter' && onOpen(market)}
      className="no-transition"
      style={{
        flexShrink: 0, width: 214,
        background: C.card, border: `1px solid ${C.cardBorder}`,
        borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
        position: 'relative',
        outline: 'none', WebkitTapHighlightColor: 'transparent',
        transition: 'border-color 0.15s',
        display: 'flex', flexDirection: 'column',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = catColor }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.cardBorder }}
    >
      {/* Category top strip */}
      <div style={{
        height: 3, flexShrink: 0,
        background: catColor, opacity: 0.75,
      }} />

      {/* Card body */}
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Time left */}
        <div style={{
          fontSize: 9, fontWeight: 600, color: C.textDim,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          marginBottom: 7, fontVariantNumeric: 'tabular-nums',
        }}>
          {timeLeft}
        </div>

        {/* Question */}
        <p style={{
          fontSize: 12, fontWeight: 500, color: C.text,
          lineHeight: 1.45, marginBottom: 10, flex: 1,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', minHeight: 52,
        }}>
          {market.title}
        </p>

        {/* Probability */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 6 }}>
          <span style={{
            fontSize: 22, fontWeight: 800, color: probColor,
            letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums', lineHeight: 1,
          }}>
            {yesP.toFixed(0)}%
          </span>
          <span style={{ fontSize: 10, color: C.textDim }}>SÍ</span>
        </div>

        {/* Prob bar */}
        <div style={{ height: 3, borderRadius: 3, background: `${C.no}18`, overflow: 'hidden', marginBottom: 10 }}>
          <div className="prob-bar-fill" style={{
            width: `${yesP}%`, height: '100%',
            background: probColor, borderRadius: 3,
          }} />
        </div>

        {/* Meta row: traders + volume */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.textDim, marginBottom: 10 }}>
          <span>
            {traders > 0 ? `👥 ${traders}` : '—'}
          </span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            €{(market.total_volume || 0) > 1000
              ? `${((market.total_volume || 0) / 1000).toFixed(1)}K`
              : (market.total_volume || 0).toFixed(0)}
          </span>
        </div>

        {/* CTA buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <button
            onClick={e => stopAndOpen(e, 'YES')}
            style={{
              padding: '6px 0', fontSize: 11, fontWeight: 700,
              borderRadius: 7, border: `1px solid ${C.yes}40`,
              background: `${C.yes}12`, color: C.yes,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${C.yes}22` }}
            onMouseLeave={e => { e.currentTarget.style.background = `${C.yes}12` }}
          >
            SÍ ↑
          </button>
          <button
            onClick={e => stopAndOpen(e, 'NO')}
            style={{
              padding: '6px 0', fontSize: 11, fontWeight: 700,
              borderRadius: 7, border: `1px solid ${C.no}40`,
              background: `${C.no}12`, color: C.no,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${C.no}22` }}
            onMouseLeave={e => { e.currentTarget.style.background = `${C.no}12` }}
          >
            NO ↓
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────

export default function MarketSection({ icon, title, markets, onOpen, onTrade }) {
  if (!markets || markets.length === 0) return null

  return (
    <section style={{ marginBottom: 32 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text, letterSpacing: '-0.01em' }}>
          {title}
        </span>
        <span style={{
          fontSize: 10, color: C.textDim,
          background: C.surface, border: `1px solid ${C.cardBorder}`,
          padding: '1px 6px', borderRadius: 10, fontWeight: 500,
        }}>
          {markets.length}
        </span>
        <div style={{ flex: 1, height: 1, background: C.divider }} />
      </div>

      {/* Horizontal scroll row */}
      <div
        className="no-scrollbar"
        style={{
          display: 'flex', gap: 10, overflowX: 'auto',
          paddingBottom: 4,
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: 'x mandatory',
        }}
      >
        {markets.map(m => (
          <div key={m.id} style={{ scrollSnapAlign: 'start' }}>
            <MiniCard market={m} onOpen={onOpen} onTrade={onTrade} />
          </div>
        ))}
      </div>
    </section>
  )
}
