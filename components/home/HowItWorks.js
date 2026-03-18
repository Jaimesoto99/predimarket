import { C } from '../../lib/theme'

const steps = [
  {
    n: '01',
    title: 'Eventos verificables',
    body: 'Los mercados representan preguntas sobre eventos futuros con resolución objetiva: precios, resultados deportivos, datos económicos.',
  },
  {
    n: '02',
    title: 'Probabilidad colectiva',
    body: 'Los precios reflejan lo que el conjunto de participantes cree que ocurrirá. SÍ + NO = 100¢ en todo momento.',
  },
  {
    n: '03',
    title: 'Resolución automática',
    body: 'Al cierre, un oráculo consulta la fuente oficial (INE, Yahoo Finance, OMIE…) y distribuye los créditos automáticamente.',
  },
]

export default function HowItWorks() {
  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{
          fontSize: 15, fontWeight: 700, letterSpacing: '-0.025em',
          color: C.text, marginBottom: 4,
        }}>
          ¿Cómo funciona?
        </h2>
        <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.5 }}>
          Tres pasos. Sin intermediarios.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
      }}>
        {steps.map(({ n, title, body }) => (
          <div key={n} style={{
            padding: '18px 20px',
            background: C.card,
            border: `1px solid ${C.cardBorder}`,
            borderRadius: 12,
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 14, right: 16,
              fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em',
              color: C.cardBorder,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}>
              {n}
            </div>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: C.textDim, marginBottom: 14,
            }} />
            <div style={{
              fontSize: 13, fontWeight: 600, color: C.text,
              marginBottom: 8, lineHeight: 1.3,
            }}>
              {title}
            </div>
            <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.65, margin: 0 }}>
              {body}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
