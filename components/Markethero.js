import { C } from '../lib/theme'

export default function MarketHero({ user, onShowAuth }) {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 16px 20px' }}>
      <h1 style={{
        fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700,
        letterSpacing: '-0.04em', lineHeight: 1.2, marginBottom: 8, color: C.text,
      }}>
        Mercados de prediccion
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6, margin: 0 }}>
          Economia, politica y deportes. Resolucion automatica por oraculo publico.
        </p>
        {!user && (
          <button
            onClick={onShowAuth}
            style={{
              padding: '7px 18px', background: C.accent, borderRadius: 20,
              fontWeight: 600, fontSize: 12, color: '#fff', border: 'none',
              cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
            }}>
            Empezar gratis
          </button>
        )}
      </div>
    </div>
  )
}
