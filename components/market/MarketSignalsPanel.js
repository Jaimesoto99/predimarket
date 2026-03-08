import { C } from '../../lib/theme'

const DIRECTION_COLOR = {
  UP:      '#16A34A',
  DOWN:    '#DC2626',
  NEUTRAL: '#6B7280',
}

const DIRECTION_LABEL = {
  UP:      'Alcista',
  DOWN:    'Bajista',
  NEUTRAL: 'Neutro',
}

function StrengthBar({ value }) {
  const pct = Math.round((value || 0) * 100)
  const color = pct > 60 ? '#16A34A' : pct > 35 ? '#F59E0B' : '#9CA3AF'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        flex: 1, height: 3, borderRadius: 3,
        background: 'var(--card-border)', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: 3,
          width: `${pct}%`, background: color,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{
        fontSize: 10, color: C.textDim, fontVariantNumeric: 'tabular-nums',
        flexShrink: 0, fontFamily: 'ui-monospace, monospace',
      }}>
        {(value || 0).toFixed(2)}
      </span>
    </div>
  )
}

export default function MarketSignalsPanel({ signals = [], compact = false }) {
  if (signals.length === 0) {
    return (
      <div style={{
        padding: compact ? '12px 0' : '16px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 12, color: C.textDim }}>Sin señales activas</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 8 : 12 }}>
      {signals.map((sig, i) => {
        const dirColor = DIRECTION_COLOR[sig.direction] || DIRECTION_COLOR.NEUTRAL
        const dirLabel = DIRECTION_LABEL[sig.direction] || 'Neutro'
        const source = sig.source_name || sig.source || 'Fuente desconocida'
        const headline = sig.headline || sig.title || sig.description || ''
        const delta = sig.prob_delta != null
          ? (sig.prob_delta > 0 ? `+${(sig.prob_delta * 100).toFixed(1)}pp` : `${(sig.prob_delta * 100).toFixed(1)}pp`)
          : null

        return (
          <div key={sig.id || i} style={{
            padding: compact ? '10px 12px' : '12px 14px',
            background: 'var(--surface)',
            border: '1px solid var(--card-border)',
            borderRadius: 8,
          }}>
            {/* Source + direction */}
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: 8, marginBottom: 6,
            }}>
              <span style={{
                fontSize: 11, fontWeight: 600, color: C.textMuted,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {source}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {delta && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, fontFamily: 'ui-monospace, monospace',
                    color: sig.prob_delta >= 0 ? '#16A34A' : '#DC2626',
                  }}>
                    {delta}
                  </span>
                )}
                <span style={{
                  fontSize: 9, fontWeight: 600, letterSpacing: '0.06em',
                  textTransform: 'uppercase', color: dirColor,
                  padding: '1px 5px', borderRadius: 3,
                  background: `${dirColor}12`,
                  border: `1px solid ${dirColor}25`,
                }}>
                  {dirLabel}
                </span>
              </div>
            </div>

            {/* Headline */}
            {headline && (
              <p style={{
                fontSize: 12, color: C.text, lineHeight: 1.45,
                margin: '0 0 8px', overflow: 'hidden',
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}>
                {headline}
              </p>
            )}

            {/* Strength bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 9, fontWeight: 600, letterSpacing: '0.07em',
                textTransform: 'uppercase', color: C.textDim, flexShrink: 0,
              }}>
                Fuerza
              </span>
              <StrengthBar value={sig.strength} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
