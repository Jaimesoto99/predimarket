import { C, getCategoryColor, getCategoryLabel } from '../../lib/theme'
import { fs, sp, r, fw } from '../../lib/ds'

export default function Badge({
  children, color, category, variant = 'subtle', size = 'sm', dot, style,
}) {
  const c = color || (category ? getCategoryColor(category) : C.textDim)
  const label = children ?? (category ? getCategoryLabel(category) : null)

  const sizes = {
    xs: { fontSize: fs.xs - 1, padding: `1px ${sp.xs}px`,     borderRadius: r.sm },
    sm: { fontSize: fs.xs,     padding: `2px ${sp.xs + 2}px`, borderRadius: r.md },
    md: { fontSize: fs.sm,     padding: `${sp.xs}px ${sp.md}px`, borderRadius: r.md },
  }

  const variants = {
    subtle:  { background: `${c}14`, color: c, border: `1px solid ${c}30` },
    solid:   { background: c,        color: '#fff', border: 'none' },
    outline: { background: 'transparent', color: c, border: `1px solid ${c}55` },
  }

  return (
    <span style={{
      ...sizes[size] || sizes.sm,
      ...variants[variant] || variants.subtle,
      fontWeight: fw.semibold,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      display: 'inline-flex', alignItems: 'center', gap: sp.xs - 1,
      lineHeight: 1, whiteSpace: 'nowrap', flexShrink: 0,
      ...style,
    }}>
      {(dot || category) && (
        <span style={{
          width: 4, height: 4, borderRadius: r.full,
          background: c, display: 'inline-block', flexShrink: 0,
        }} />
      )}
      {label}
    </span>
  )
}
