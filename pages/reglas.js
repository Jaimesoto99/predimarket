import Link from 'next/link'
import { C } from '../lib/theme'

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 36 }}>
    <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12, letterSpacing: '-0.02em' }}>{title}</h2>
    {children}
  </div>
)

const P = ({ children }) => (
  <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.75, marginBottom: 12 }}>{children}</p>
)

const Rule = ({ n, children }) => (
  <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
    <span style={{
      flexShrink: 0, width: 24, height: 24, borderRadius: 6,
      background: C.surface, border: `1px solid ${C.cardBorder}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700, color: C.textDim,
    }}>{n}</span>
    <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.7, margin: 0 }}>{children}</p>
  </div>
)

export default function Reglas() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>

        <Link href="/" style={{ fontSize: 13, color: C.textDim, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 32 }}>
          ← Volver a mercados
        </Link>

        <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: '-0.04em', marginBottom: 8 }}>
          Reglas de resolución
        </h1>
        <p style={{ fontSize: 15, color: C.textMuted, marginBottom: 40, lineHeight: 1.6 }}>
          Proceso de resolución de mercados, fuentes utilizadas y casos especiales.
        </p>

        <Section title="Estados de un mercado">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
            {[
              { s: 'ABIERTO', desc: 'Mercado en curso. Se puede operar.', color: '#16A34A' },
              { s: 'CERRADO', desc: 'Periodo de operación terminado. Pendiente de resolución.', color: '#F59E0B' },
              { s: 'RESOLVIENDO', desc: 'El oráculo está consultando la fuente de datos.', color: '#6366F1' },
              { s: 'RESUELTO', desc: 'Resultado definitivo. Ganancias distribuidas.', color: '#6B7280' },
            ].map(({ s, desc, color }) => (
              <div key={s} style={{ padding: '12px 14px', background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color, marginBottom: 6 }}>{s}</div>
                <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Proceso de resolución">
          <Rule n="1">Al expirar la fecha de cierre, el mercado pasa a estado CERRADO automáticamente.</Rule>
          <Rule n="2">El oráculo consulta la fuente oficial especificada en el mercado (Yahoo Finance, INE, OMIE, etc.).</Rule>
          <Rule n="3">Si el dato confirma la condición del mercado (ej. IBEX {'>'} 12.000), el resultado es SÍ. En caso contrario, NO.</Rule>
          <Rule n="4">Se ejecuta la distribución de ganancias: los contratos ganadores reciben una recompensa proporcional al pool total.</Rule>
          <Rule n="5">Los créditos se acreditan en el saldo de los usuarios ganadores.</Rule>
        </Section>

        <Section title="Fuentes de resolución utilizadas">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['IBEX 35, S&P 500, Nasdaq, Brent', 'Yahoo Finance'],
              ['Bitcoin, Ethereum y otras criptomonedas', 'CoinGecko'],
              ['Precio de la electricidad (PVPC)', 'OMIE / Red Eléctrica de España'],
              ['IPC, datos macroeconómicos España', 'INE (Instituto Nacional de Estadística)'],
              ['Euribor', 'BCE / Banco de España'],
              ['Resultados de fútbol', 'football-data.org'],
              ['Meteorología', 'AEMET / Open-Meteo'],
              ['Vivienda', 'Ministerio de Transportes / Idealista'],
              ['Política y legislación', 'BOE (Boletín Oficial del Estado)'],
            ].map(([cat, src]) => (
              <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.divider}` }}>
                <span style={{ fontSize: 13, color: C.text }}>{cat}</span>
                <span style={{ fontSize: 12, color: C.textDim, fontWeight: 500 }}>{src}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Casos especiales y disputas">
          <P>
            <strong style={{ color: C.text }}>Dato no disponible:</strong> Si la fuente no publica el dato en las 48 horas posteriores al cierre, el mercado puede resolverse como VOID (nulo) y los créditos se devuelven a los participantes.
          </P>
          <P>
            <strong style={{ color: C.text }}>Fuente caída o incorrecta:</strong> Si la fuente primaria no está disponible, se recurre a una fuente secundaria verificada. En caso de discrepancia, prevalece la fuente con mayor autoridad regulatoria.
          </P>
          <P>
            <strong style={{ color: C.text }}>Resolución manual:</strong> En circunstancias excepcionales documentadas, el equipo puede resolver un mercado manualmente citando la fuente oficial utilizada.
          </P>
          <P>
            <strong style={{ color: C.text }}>Suspensión de mercado:</strong> Predimarket se reserva el derecho de suspender un mercado ante evidencia de manipulación o datos claramente erróneos.
          </P>
        </Section>

      </div>
    </div>
  )
}
