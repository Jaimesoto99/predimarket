import { C } from '../lib/theme'

export default function MarketHero({ user, onShowAuth }) {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '52px 24px 20px' }}>
      <h1 style={{
        fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700,
        letterSpacing: '-0.04em', lineHeight: 1.2, marginBottom: 8, color: C.text,
      }}>
        Mercados de predicción — España
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6, margin: 0 }}>
          Economía, política y deportes. Resolución automática por oráculo público.
        </p>
        {!user && (
          <button
            onClick={onShowAuth}
            style={{
              padding: '7px 18px', background: C.accent, borderRadius: 6,
              fontWeight: 600, fontSize: 12, color: '#fff', border: 'none',
              cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s ease',
            }}>
            Empezar gratis →
          </button>
        )}
      </div>
    </div>
  )
}
