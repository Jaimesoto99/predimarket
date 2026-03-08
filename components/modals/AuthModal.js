import { useState } from 'react'
import { C, panelStyle, closeBtnStyle, inputStyle } from '../../lib/theme'
import { signIn, signUp, getOrCreateUser } from '../../lib/supabase'

export default function AuthModal({ showAuth, setShowAuth, handleLogin }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!showAuth) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Email y contraseña requeridos'); return }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }

    setLoading(true)
    let result
    if (mode === 'login') {
      result = await signIn(email, password)
    } else {
      result = await signUp(email, password)
    }
    setLoading(false)

    if (!result.success) {
      setError(result.error || 'Error de autenticación')
      return
    }

    // Sync with our users table after auth
    const userResult = await getOrCreateUser(email)
    if (userResult.success && handleLogin) {
      handleLogin(userResult.user)
    }
    setShowAuth(false)
    setEmail('')
    setPassword('')
    setError('')
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.92)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{ ...panelStyle, maxWidth: 400, width: '100%', borderRadius: '16px 16px 0 0' }} className="anim-fade-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.025em' }}>
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </h2>
          <button onClick={() => { setShowAuth(false); setError('') }} style={closeBtnStyle}>✕</button>
        </div>

        {/* Mode toggle */}
        <div style={{
          display: 'flex', background: 'var(--surface)', borderRadius: 8,
          padding: 3, marginBottom: 20,
        }}>
          {[['login', 'Entrar'], ['register', 'Crear cuenta']].map(([m, label]) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 6, border: 'none',
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
                fontFamily: 'inherit',
                background: mode === m ? C.card : 'transparent',
                color: mode === m ? C.text : C.textMuted,
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >{label}</button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textDim, marginBottom: 7 }}>
            Email
          </label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            style={{ ...inputStyle, marginBottom: 12 }} placeholder="tu@email.com" required
          />

          <label style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textDim, marginBottom: 7 }}>
            Contraseña {mode === 'register' && <span style={{ fontWeight: 400, textTransform: 'none' }}>(mín. 8 caracteres)</span>}
          </label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            style={{ ...inputStyle, marginBottom: 16 }}
            placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : '••••••••'}
            minLength={8} required
          />

          {error && (
            <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 12, padding: '8px 10px', background: '#ef444410', borderRadius: 6 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', background: loading ? C.textDim : C.accent,
              color: '#fff', fontWeight: 600, padding: '11px 0',
              borderRadius: 7, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14, fontFamily: 'inherit',
            }}
          >
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta gratis'}
          </button>
        </form>

        {mode === 'register' && (
          <p style={{ fontSize: 11, color: C.textDim, marginTop: 14, textAlign: 'center', lineHeight: 1.5 }}>
            Créditos virtuales · Sin riesgo real
          </p>
        )}
      </div>
    </div>
  )
}
