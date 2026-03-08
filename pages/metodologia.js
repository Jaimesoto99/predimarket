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

export default function Metodologia() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Back */}
        <Link href="/" style={{ fontSize: 13, color: C.textDim, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 32 }}>
          ← Volver a mercados
        </Link>

        <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: '-0.04em', marginBottom: 8 }}>
          Metodología
        </h1>
        <p style={{ fontSize: 15, color: C.textMuted, marginBottom: 40, lineHeight: 1.6 }}>
          Cómo funcionan los mercados de predicción y el mecanismo de precios en Predimarket.
        </p>

        <Section title="¿Qué es un mercado de predicción?">
          <P>
            Un mercado de predicción es un mecanismo en el que los participantes compran y venden contratos vinculados al resultado de un evento futuro. El precio de un contrato refleja la probabilidad colectiva de que ese evento ocurra.
          </P>
          <P>
            Si el mercado pregunta "¿Superará el IBEX 35 los 12.000 puntos el viernes?" y el precio de SÍ es 65¢, eso significa que el mercado colectivamente estima una probabilidad del 65% de que ocurra.
          </P>
        </Section>

        <Section title="Mecanismo AMM (Automated Market Maker)">
          <P>
            Predimarket utiliza un <strong style={{ color: C.text }}>Fixed Product Market Maker (FPMM)</strong>, el mismo modelo que usan los exchanges descentralizados. Cada mercado tiene dos pools de liquidez: una para SÍ y otra para NO.
          </P>
          <P>
            La fórmula de precio es simple:
          </P>
          <div style={{
            background: C.surface, border: `1px solid ${C.cardBorder}`,
            borderRadius: 8, padding: '14px 18px', marginBottom: 14,
            fontFamily: 'ui-monospace, monospace', fontSize: 13, color: C.text,
          }}>
            Precio SÍ = Pool NO / (Pool SÍ + Pool NO) × 100¢
          </div>
          <P>
            Cuando un usuario compra contratos SÍ, añade al pool NO y extrae del pool SÍ, lo que sube el precio de SÍ. Cuando compra NO, el precio de SÍ baja. Esto garantiza que SÍ + NO = 100¢ en todo momento.
          </P>
          <P>
            El pool inicial es de 5.000 créditos por cada lado. El máximo por operación es de €500.
          </P>
        </Section>

        <Section title="Probabilidad ajustada por señales">
          <P>
            Además de la probabilidad AMM pura, el sistema incorpora señales externas provenientes de fuentes verificadas (Reuters, Expansión, BOE, etc.) para mostrar una probabilidad ajustada. Esta probabilidad ajustada es <strong style={{ color: C.text }}>solo informativa</strong> — no modifica los pools de liquidez ni los precios de ejecución.
          </P>
          <P>
            El delta máximo por señal es ±25 puntos porcentuales, acotado entre 5% y 95%.
          </P>
        </Section>

        <Section title="Resolución automática">
          <P>
            Cada mercado especifica una fuente de resolución pública verificable (Yahoo Finance, INE, OMIE, football-data.org, etc.). Al cierre del mercado, el oráculo consulta la fuente y determina el resultado.
          </P>
          <P>
            Los participantes con contratos ganadores reciben una recompensa proporcional al pool total. Los perdedores pierden su inversión.
          </P>
        </Section>

        <Section title="Créditos virtuales">
          <P>
            Predimarket opera con créditos virtuales exclusivamente. No hay dinero real involucrado. Los créditos no tienen valor monetario ni pueden canjearse.
          </P>
        </Section>

      </div>
    </div>
  )
}
