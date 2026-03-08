import { C } from '../../lib/theme'
import { fs, fw, r, sp, mono } from '../../lib/ds'

// Liquidity depth: how much real volume above the initial 10k virtual pool
function computeLiquidity(yesPool, noPool) {
  const yp = parseFloat(yesPool) || 5000
  const np = parseFloat(noPool) || 5000
  const total = yp + np
  const real = Math.max(0, total - 10000)
  return Math.min(100, Math.round((real / 8000) * 100))
}

export default function LiquidityBar({
  yesPool,
  noPool,
  totalVolume,
  height = 4,
  showLabel = true,
  style,
}) {
  const pct = computeLiquidity(yesPool, noPool)
  const vol = parseFloat(totalVolume) || 0
  const volLabel = vol > 1000 ? `€${(vol / 1000).toFixed(1)}K` : `€${vol.toFixed(0)}`

  // Color: green >70%, blue 40-70%, amber <40%
  const barColor = pct >= 70 ? C.yes : pct >= 40 ? C.accent : C.warning

  return (
    <div style={{ ...style }}>
      {showLabel && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: sp.xs - 1, gap: sp.sm,
        }}>
          <span style={{ fontSize: fs.xs, color: C.textDim, fontWeight: fw.medium }}>
            Liquidez
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: sp.sm }}>
            <span style={{ fontSize: fs.xs, color: barColor, fontWeight: fw.semibold, fontFamily: mono }}>
              {pct}%
            </span>
            <span style={{ fontSize: fs.xs, color: C.textDim, fontFamily: mono }}>
              {volLabel} vol
            </span>
          </div>
        </div>
      )}
      {/* Track */}
      <div style={{
        height, background: `${barColor}16`, borderRadius: r.full, overflow: 'hidden',
      }}>
        {/* Fill */}
        <div style={{
          width: `${pct}%`, height: '100%',
          background: `linear-gradient(to right, ${barColor}80, ${barColor})`,
          borderRadius: r.full,
          transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  )
}
