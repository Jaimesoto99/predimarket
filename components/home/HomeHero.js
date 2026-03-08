import { C } from '../../lib/theme'

export default function HomeHero({ marketCount, totalVolume, totalTraders }) {
  return (
    <>
      {/* Homepage explanation banner */}
      <div style={{
        marginBottom: 24, padding: '14px 18px',
        background: `${C.accent}06`, border: `1px solid ${C.cardBorder}`,
        borderRadius: 10,
      }}>
        <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: C.text, fontWeight: 600 }}>Predimarket</strong> es un mercado de predicciones donde los precios reflejan la probabilidad colectiva de que ocurra un evento futuro.
          {' '}<a href="/metodologia" style={{ color: C.accentLight, textDecoration: 'underline', textUnderlineOffset: 2 }}>Ver metodología</a>
        </p>
      </div>

      {/* Page heading + market stats */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: C.text, marginBottom: 6, lineHeight: 1.2 }}>
          Mercados activos
        </h1>
        <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5, marginBottom: 16 }}>
          Economía, política y deportes — resolución automática por oráculo público.
        </p>
        <div style={{ display: 'flex', gap: 24 }}>
          {[
            ['Mercados activos', marketCount],
            ['Volumen 24h', `€${totalVolume > 1000 ? (totalVolume / 1000).toFixed(1) + 'K' : totalVolume.toFixed(0)}`],
            ['Traders', totalTraders > 0 ? totalTraders : '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textDim, marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: 'ui-monospace, monospace' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
