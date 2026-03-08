import { C, panelStyle, closeBtnStyle, inputStyle } from '../../lib/theme'

export default function AuthModal({ showAuth, setShowAuth, email, setEmail, handleLogin }) {
  if (!showAuth) return null

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.92)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{ ...panelStyle, maxWidth: 400, width: '100%', borderRadius: '16px 16px 0 0' }} className="anim-fade-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.025em' }}>Empezar</h2>
          <button onClick={() => setShowAuth(false)} style={closeBtnStyle}>✕</button>
        </div>
        <form onSubmit={handleLogin}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textDim, marginBottom: 7 }}>
            Email
          </label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            style={{ ...inputStyle, marginBottom: 12 }} placeholder="tu@email.com" required
          />
          <button type="submit" style={{ width: '100%', background: C.accent, color: '#fff', fontWeight: 600, padding: '11px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 14 }}>
            Empezar con 1.000 créditos
          </button>
        </form>
        <p style={{ fontSize: 11, color: C.textDim, marginTop: 14, textAlign: 'center', lineHeight: 1.5 }}>
          Créditos virtuales · Sin riesgo real
        </p>
      </div>
    </div>
  )
}
