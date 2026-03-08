import { C } from '../../lib/theme'
import { fs, fw, mono, sp } from '../../lib/ds'

// Computes a pseudo 24h change from pool deviation
function computeChange(yesPool, noPool) {
  const yp = parseFloat(yesPool) || 5000
  const np = parseFloat(noPool) || 5000
  // Pool deviation from initial 50/50 baseline (5000 each)
  const drift = (np - yp) / Math.max(yp + np, 100)
  return parseFloat((drift * 18).toFixed(1))
}

export default function ProbabilityDisplay({
  yesPool, noPool, prices,
  size = 'md',  // 'sm' | 'md' | 'lg'
  showChange = true,
  style,
}) {
  const prob = parseFloat(prices?.yes || 50)
  const change = computeChange(yesPool, noPool)
  const isUp = change >= 0

  const probColor = prob >= 65 ? C.yes : prob <= 35 ? C.no : C.accent

  const sizes = {
    sm: { prob: fs['3xl'] - 4, change: fs.base, label: fs.xs },
    md: { prob: fs['4xl'],     change: fs.md,   label: fs.xs },
    lg: { prob: 44,            change: fs.xl,   label: fs.sm },
  }
  const sz = sizes[size] || sizes.md

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: sp.xs - 2, ...style }}>
      {/* Main probability number */}
      <div style={{
        fontSize: sz.prob,
        fontWeight: fw.bold,
        fontFamily: mono,
        color: probColor,
        lineHeight: 1,
        letterSpacing: '-0.02em',
      }}>
        {prob.toFixed(0)}%
      </div>

      {/* Change + label row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: sp.sm }}>
        {showChange && (
          <span style={{
            fontSize: sz.change,
            fontWeight: fw.semibold,
            fontFamily: mono,
            color: isUp ? C.yes : C.no,
            display: 'flex', alignItems: 'center', gap: 2,
          }}>
            <span style={{ fontSize: sz.change - 1 }}>{isUp ? '▲' : '▼'}</span>
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
        <span style={{ fontSize: sz.label, color: C.textDim, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: fw.semibold }}>
          Probabilidad
        </span>
      </div>
    </div>
  )
}
