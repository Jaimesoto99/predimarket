import { C } from '../../lib/theme'
import { fs, sp, r, fw } from '../../lib/ds'

export const SIGNAL_TYPES = {
  data:     { color: C.accentLight, icon: '\u25C8', label: 'Datos actualizados' },
  volume:   { color: C.yes,         icon: '\u25B2', label: 'Aumento de volumen' },
  movement: { color: '#f59e0b',     icon: '\u26A1', label: 'Movimiento de precio' },
  news:     { color: '#a78bfa',     icon: '\u25CE', label: 'Noticia detectada' },
  oracle:   { color: '#2dd4bf',     icon: '\u25C6', label: 'Oraculo verificado' },
  source:   { color: '#818cf8',     icon: '\u25A0', label: 'Nueva fuente' },
  alert:    { color: C.no,          icon: '!',      label: 'Alerta' },
  neutral:  { color: C.textDim,     icon: '\u25AA', label: 'Actualizacion' },
}

export default function Signal({ type = 'neutral', text, compact, style }) {
  const sig = SIGNAL_TYPES[type] || SIGNAL_TYPES.neutral

  if (compact) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: sp.xs - 1,
        fontSize: fs.xs, color: sig.color,
        background: `${sig.color}12`,
        border: `1px solid ${sig.color}28`,
        padding: `2px ${sp.sm}px`, borderRadius: r.full,
        fontWeight: fw.medium, whiteSpace: 'nowrap', lineHeight: 1,
        ...style,
      }}>
        <span style={{ fontSize: 8, lineHeight: 1 }}>{sig.icon}</span>
        {text || sig.label}
      </span>
    )
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: sp.sm,
      padding: `${sp.sm}px ${sp.md}px`,
      background: `${sig.color}08`,
      border: `1px solid ${sig.color}20`,
      borderRadius: r.lg,
      ...style,
    }}>
      <span style={{ fontSize: fs.sm, color: sig.color, flexShrink: 0, lineHeight: 1.4 }}>
        {sig.icon}
      </span>
      <span style={{ fontSize: fs.md, color: C.textMuted, lineHeight: 1.5 }}>
        {text || sig.label}
      </span>
    </div>
  )
}
