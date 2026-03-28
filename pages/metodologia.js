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
          Cómo funcionan los contratos financieros binarios y el mecanismo de precios en Forsii.
        </p>

        <Section title="¿Qué es un contrato financiero binario?">
          <P>
            Un contrato financiero binario es un instrumento en el que los participantes compran y venden contratos vinculados al resultado de un evento futuro verificable. El precio de un contrato refleja la probabilidad colectiva de que ese evento ocurra.
          </P>
          <P>
            Si el mercado pregunta "¿Superará el IBEX 35 los 12.000 puntos el viernes?" y el precio de SÍ es 65¢, eso significa que el mercado colectivamente estima una probabilidad del 65% de que ocurra.
          </P>
        </Section>

        <Section title="Mecanismo de precios P2P (libro de órdenes)">
          <P>
            Forsii utiliza un <strong style={{ color: C.text }}>libro de órdenes descentralizado</strong> entre pares (P2P). Los usuarios publican órdenes de compra o venta de contratos SÍ/NO a un precio límite; cuando una orden de compra y una de venta se cruzan, se ejecuta la operación y el precio de referencia se actualiza.
          </P>
          <P>
            El precio de un contrato en cada momento refleja el último cruce de órdenes ejecutado:
          </P>
          <div style={{
            background: C.surface, border: `1px solid ${C.cardBorder}`,
            borderRadius: 8, padding: '14px 18px', marginBottom: 14,
            fontFamily: 'ui-monospace, monospace', fontSize: 13, color: C.text,
          }}>
            Precio SÍ = precio de la última orden cruzada (SÍ) · Precio NO = 100¢ − Precio SÍ
          </div>
          <P>
            Cuando hay más demanda de contratos SÍ que oferta, el precio de SÍ sube. Cuando la presión es vendedora, baja. En todo momento SÍ + NO = 100¢, lo que garantiza que los precios son probabilidades implícitas consistentes.
          </P>
          <P>
            El máximo por operación en fase beta es €100.
          </P>
        </Section>

        <Section title="Probabilidad ajustada por señales">
          <P>
            Además de la probabilidad implícita del libro de órdenes, el sistema incorpora señales externas provenientes de fuentes verificadas (Reuters, Expansión, BOE, etc.) para mostrar una probabilidad ajustada. Esta probabilidad ajustada es <strong style={{ color: C.text }}>solo informativa</strong> — no modifica los precios de ejecución ni las órdenes pendientes.
          </P>
          <P>
            El delta máximo por señal es ±25 puntos porcentuales, acotado entre 5% y 95%.
          </P>
        </Section>

        <Section title="Resolución supervisada">
          <P>
            Cada contrato especifica una fuente de resolución pública verificable (Yahoo Finance, INE, REE apidatos, football-data.org, etc.). Al cierre, el oráculo consulta la fuente y determina el resultado automáticamente.
          </P>
          <P>
            El promotor revisa y confirma el resultado antes de ejecutar la liquidación. Solo tras esta supervisión se distribuyen los créditos a los contratos ganadores. Los perdedores pierden su inversión.
          </P>
        </Section>

        <Section title="Créditos virtuales">
          <P>
            Forsii opera con créditos virtuales exclusivamente. No hay dinero real involucrado. Los créditos no tienen valor monetario ni pueden canjearse.
          </P>
        </Section>

      </div>
    </div>
  )
}
