import { C } from '../../lib/theme'
import { fs, r, fw } from '../../lib/ds'

export default function ProgressBar({
  value,        // 0-100
  label,
  height = 5,
  color,
  showLabel = true,
  animate = true,
  style,
}) {
  const pct = Math.max(0, Math.min(100, value || 0))
  const c = color || C.accent

  return (
    <div style={style}>
      {showLabel && label && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginBottom: 5, fontSize: fs.xs, color: C.textDim, fontWeight: fw.medium,
        }}>
          <span>{label}</span>
          <span style={{ fontFamily: 'ui-monospace, monospace', color: C.textMuted }}>{pct.toFixed(0)}%</span>
        </div>
      )}
      <div style={{
        height, background: `${c}18`, borderRadius: r.full, overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: `linear-gradient(to right, ${c}bb, ${c})`,
          borderRadius: r.full,
          transition: animate ? 'width 0.6s cubic-bezier(0.4,0,0.2,1)' : 'none',
        }} />
      </div>
    </div>
  )
}
