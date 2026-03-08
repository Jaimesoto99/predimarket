import { C } from '../../lib/theme'

export default function HomeHero({ marketCount, totalVolume, totalTraders }) {
  return (
    <div style={{ marginBottom: 32 }}>

      {/* Headline */}
      <h1 style={{
        fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em',
        color: C.text, marginBottom: 6, lineHeight: 1.2,
      }}>
        Mercados de predicción
      </h1>
      <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6, marginBottom: 20, maxWidth: 520 }}>
        Los precios reflejan la probabilidad colectiva de que ocurra un evento futuro.
        Resolución automática por oráculo público.{' '}
        <a href="/metodologia" style={{
          color: C.accentLight, textDecoration: 'underline', textUnderlineOffset: 3,
        }}>
          Ver metodología
        </a>
      </p>

      {/* Platform stats */}
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
        {[
          { label: 'Mercados activos', value: marketCount || '—' },
          {
            label: 'Volumen 24h',
            value: totalVolume > 1000
              ? `€${(totalVolume / 1000).toFixed(1)}K`
              : `€${Number(totalVolume).toFixed(0)}`,
          },
          { label: 'Participantes', value: totalTraders > 0 ? totalTraders : '—' },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{
              fontSize: 9, fontWeight: 600, letterSpacing: '0.09em',
              textTransform: 'uppercase', color: C.textDim, marginBottom: 4,
            }}>
              {label}
            </div>
            <div style={{
              fontSize: 18, fontWeight: 700, color: C.text,
              fontFamily: 'ui-monospace, monospace',
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
