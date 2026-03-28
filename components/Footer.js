import Link from 'next/link'
import { C } from '../lib/theme'

const linkStyle = {
  fontSize: 12, color: C.textDim, textDecoration: 'none',
  transition: 'color 0.15s',
}

export default function Footer() {
  return (
    <footer style={{
      borderTop: `1px solid ${C.divider}`,
      background: C.bg,
      padding: '32px 24px 24px',
      marginTop: 'auto',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24, marginBottom: 24 }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 22, height: 22, background: C.accent, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>P</div>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.02em' }}>Forsii</span>
            </div>
            <p style={{ fontSize: 12, color: C.textDim, maxWidth: 340, lineHeight: 1.7, margin: 0 }}>
              Plataforma de contratos financieros binarios sobre indicadores económicos verificables. Resolución automática por oráculo público.
            </p>
          </div>

          {/* Links */}
          <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textDim, marginBottom: 10 }}>Plataforma</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link href="/" style={linkStyle}>Mercados</Link>
                <Link href="/demo" style={linkStyle}>Cómo funciona</Link>
                <Link href="/stats" style={linkStyle}>Estadísticas</Link>
                <Link href="/about" style={linkStyle}>Sobre nosotros</Link>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textDim, marginBottom: 10 }}>Transparencia</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link href="/metodologia" style={linkStyle}>Metodología</Link>
                <Link href="/reglas" style={linkStyle}>Reglas de resolución</Link>
                <Link href="/disclaimer" style={linkStyle}>Aviso legal</Link>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textDim, marginBottom: 10 }}>Legal</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link href="/legal" style={linkStyle}>Términos y Condiciones</Link>
                <Link href="/legal#privacidad" style={linkStyle}>Política de Privacidad</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ borderTop: `1px solid ${C.divider}`, paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 11, color: C.textDim }}>© 2026 Forsii — Plataforma de contratos financieros binarios</span>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: C.textDim }}>
              Forsii no está autorizada como entidad de servicios de inversión. Fase de pruebas con créditos virtuales. Sandbox CNMV 11ª cohorte (pendiente de evaluación).
            </span>
            <a href="mailto:jaime@forsii.com" style={{ fontSize: 11, color: C.textDim, textDecoration: 'none' }}>
              jaime@forsii.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
