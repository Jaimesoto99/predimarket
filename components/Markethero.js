import { C } from '../lib/theme'

export default function MarketHero({ user, onShowAuth }) {
  return (
    <div style={{ padding: '0 0 8px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{
            fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 700,
            letterSpacing: '-0.04em', lineHeight: 1.15, color: C.text, marginBottom: 8,
          }}>
            Mercados de predicción
          </h1>
          <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6, maxWidth: 480 }}>
            Economía, política y deportes — resolución automática por oráculo público.
          </p>
        </div>

        {!user && (
          <button onClick={onShowAuth} style={{
            padding: '10px 20px',
            background: C.accent,
            borderRadius: 10, fontWeight: 600, fontSize: 14, color: '#fff',
            border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            Empezar gratis
          </button>
        )}
      </div>
    </div>
  )
}
