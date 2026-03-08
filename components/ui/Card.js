import { C } from '../../lib/theme'
import { sp, r } from '../../lib/ds'

export default function Card({
  children, variant = 'default', padding, onClick, style, className,
}) {
  const variants = {
    default:  { background: C.card,    border: `1px solid ${C.cardBorder}`, boxShadow: C.shadow },
    elevated: { background: C.cardAlt, border: `1px solid ${C.cardBorder}`, boxShadow: C.shadow },
    flat:     { background: C.card,    border: 'none', boxShadow: 'none' },
    ghost:    { background: 'transparent', border: 'none', boxShadow: 'none' },
    outline:  { background: 'transparent', border: `1px solid ${C.cardBorder}`, boxShadow: 'none' },
  }
  const v = variants[variant] || variants.default
  const p = padding ?? sp.lg
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        ...v,
        borderRadius: r['2xl'],
        padding: typeof p === 'number' ? p : p,
        ...style,
      }}>
      {children}
    </div>
  )
}
