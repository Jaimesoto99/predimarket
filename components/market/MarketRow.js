import { C, getCategoryColor, getCategoryLabel, getTimeLeft, getTypeLabel } from '../../lib/theme'
import { fs, fw, r, sp } from '../../lib/ds'
import ProbabilityDisplay from './ProbabilityDisplay'
import LiquidityBar from './LiquidityBar'
import MarketStats from './MarketStats'
import MarketSignals from './MarketSignals'
import MiniChart from '../ui/MiniChart'
import Badge from '../ui/Badge'

export default function MarketRow({ market, onClick, style }) {
  const catColor = getCategoryColor(market.category)
  const timeLeft = getTimeLeft(market.close_date)
  const isUrgent = (() => {
    const diff = new Date(market.close_date) - new Date()
    return diff > 0 && diff < 6 * 3600000
  })()

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        background: C.card,
        border: `1px solid ${C.cardBorder}`,
        borderRadius: r['2xl'],
        padding: `${sp.lg}px ${sp.lg}px ${sp.md}px`,
        paddingLeft: sp.lg + 10,
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        overflow: 'hidden',
        ...style,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = C.cardBorderHover
        e.currentTarget.style.boxShadow = C.shadowHover
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = C.cardBorder
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Left category color strip */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: 3, background: catColor, borderRadius: `${r['2xl']}px 0 0 ${r['2xl']}px`,
      }} />

      {/* Main content row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: sp.md }}>

        {/* Left: title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Category + time badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: sp.xs, marginBottom: sp.xs, flexWrap: 'wrap' }}>
            <Badge category={market.category} size="xs" />
            <span style={{
              fontSize: fs.xs, color: isUrgent ? C.warning : C.textDim,
              fontWeight: isUrgent ? fw.semibold : fw.normal,
            }}>
              {timeLeft}
            </span>
            {market.market_type && (
              <span style={{ fontSize: fs.xs, color: C.textDim }}>
                · {getTypeLabel(market)}
              </span>
            )}
          </div>

          {/* Title */}
          <div style={{
            fontSize: fs['2xl'],
            fontWeight: fw.semibold,
            color: C.text,
            lineHeight: 1.35,
            letterSpacing: '-0.01em',
            marginBottom: sp.sm,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {market.title}
          </div>

          {/* Stats row */}
          <MarketStats market={market} compact style={{ marginBottom: 0 }} />
        </div>

        {/* Right: probability + chart */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: sp.xs, flexShrink: 0 }}>
          <ProbabilityDisplay
            yesPool={market.yes_pool}
            noPool={market.no_pool}
            prices={market.prices}
            size="md"
            showChange
          />
          <MiniChart
            marketId={market.id}
            currentProb={parseFloat(market.prices?.yes || 50)}
            yesPool={market.yes_pool}
            noPool={market.no_pool}
            width={100}
            height={36}
          />
        </div>
      </div>

      {/* Bottom: liquidity + signals */}
      <div style={{ marginTop: sp.md, display: 'flex', flexDirection: 'column', gap: sp.xs }}>
        <LiquidityBar
          yesPool={market.yes_pool}
          noPool={market.no_pool}
          totalVolume={market.total_volume}
          height={3}
          showLabel={false}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: sp.sm }}>
          <MarketSignals market={market} compact />
          {/* Liquidity % inline */}
          <span style={{ fontSize: fs.xs, color: C.textDim, flexShrink: 0 }}>
            {(() => {
              const yp = parseFloat(market.yes_pool) || 5000
              const np = parseFloat(market.no_pool) || 5000
              const pct = Math.min(100, Math.round(((yp + np - 10000) / 8000) * 100))
              return `Liq. ${pct}%`
            })()}
          </span>
        </div>
      </div>
    </div>
  )
}
