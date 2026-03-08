import { C } from '../../lib/theme'
import { sp, fs, r, fw } from '../../lib/ds'

const VARIANTS = {
  primary:   { background: C.accent,             color: '#fff',       border: 'none' },
  secondary: { background: 'transparent',        color: C.textMuted,  border: `1px solid ${C.cardBorder}` },
  ghost:     { background: 'transparent',        color: C.textDim,    border: 'none' },
  danger:    { background: 'transparent',        color: C.no,         border: `1px solid ${C.no}35` },
  yes:       { background: `${C.yes}14`,         color: C.yes,        border: `1px solid ${C.yes}30` },
  no:        { background: `${C.no}10`,          color: C.no,         border: `1px solid ${C.no}28` },
  accent:    { background: `${C.accent}14`,      color: C.accentLight, border: `1px solid ${C.accent}30` },
}

const SIZES = {
  xs: { padding: `${sp.xs - 1}px ${sp.sm}px`,   fontSize: fs.xs,   borderRadius: r.md },
  sm: { padding: `${sp.xs}px ${sp.md}px`,        fontSize: fs.sm,   borderRadius: r.md },
  md: { padding: `${sp.sm}px ${sp.lg}px`,        fontSize: fs.md,   borderRadius: r.lg },
  lg: { padding: `${sp.md}px ${sp.xl}px`,        fontSize: fs.lg,   borderRadius: r.xl },
}

export default function Button({
  children, variant = 'primary', size = 'md',
  onClick, disabled, style, fullWidth, type = 'button',
}) {
  const v = VARIANTS[variant] || VARIANTS.primary
  const s = SIZES[size] || SIZES.md
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...v, ...s,
        fontWeight: fw.semibold,
        fontFamily: 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        width: fullWidth ? '100%' : undefined,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: sp.xs, whiteSpace: 'nowrap', lineHeight: 1,
        transition: 'opacity 0.15s, background-color 0.15s',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
