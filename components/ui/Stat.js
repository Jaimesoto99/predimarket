import { C } from '../../lib/theme'
import { fs, fw, mono } from '../../lib/ds'

export default function Stat({ label, value, color, mono: useMono, size = 'sm', style }) {
  const sizes = {
    xs: { label: fs.xs - 1, value: fs.sm },
    sm: { label: fs.xs,     value: fs.base },
    md: { label: fs.sm,     value: fs.md },
    lg: { label: fs.base,   value: fs.xl },
  }
  const sz = sizes[size] || sizes.sm
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, ...style }}>
      <span style={{
        fontSize: sz.label, color: C.textDim,
        fontWeight: fw.semibold, letterSpacing: '0.06em', textTransform: 'uppercase',
        lineHeight: 1,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: sz.value, color: color || C.text,
        fontWeight: fw.semibold, lineHeight: 1.2,
        fontFamily: useMono ? mono : 'inherit',
      }}>
        {value}
      </span>
    </div>
  )
}
