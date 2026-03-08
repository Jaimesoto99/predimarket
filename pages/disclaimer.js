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

export default function Disclaimer() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>

        <Link href="/" style={{ fontSize: 13, color: C.textDim, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 32 }}>
          ← Volver a mercados
        </Link>

        {/* Warning banner */}
        <div style={{
          padding: '14px 18px', marginBottom: 36,
          background: '#FEF3C720', border: '1px solid #F59E0B30',
          borderRadius: 10,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#F59E0B', marginBottom: 6 }}>
            Aviso importante
          </div>
          <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.65, margin: 0 }}>
            Predimarket opera exclusivamente con créditos virtuales. No hay dinero real. Esta plataforma no constituye un servicio de inversión regulado.
          </p>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: '-0.04em', marginBottom: 8 }}>
          Aviso legal
        </h1>
        <p style={{ fontSize: 15, color: C.textMuted, marginBottom: 40, lineHeight: 1.6 }}>
          Información legal sobre la naturaleza de la plataforma y sus limitaciones.
        </p>

        <Section title="Naturaleza de la plataforma">
          <P>
            Predimarket es una plataforma de mercados de predicción que opera con créditos virtuales sin valor monetario real. Los precios reflejan la probabilidad colectiva agregada de los participantes sobre la ocurrencia de eventos futuros.
          </P>
          <P>
            Los resultados de los mercados no representan asesoramiento financiero, de inversión, legal, fiscal ni de ningún otro tipo. Predimarket no es una entidad autorizada como servicio de inversión según la normativa MiFID II o cualquier otra regulación aplicable.
          </P>
        </Section>

        <Section title="Carácter de las predicciones">
          <P>
            Los mercados representan predicciones agregadas de una comunidad de usuarios, no pronósticos profesionales. La probabilidad que muestra un mercado puede diferir significativamente de la probabilidad real de que ocurra un evento.
          </P>
          <P>
            Predimarket no garantiza la exactitud, completitud o actualidad de los precios mostrados. Los mercados pueden verse afectados por baja liquidez, comportamientos especulativos u otros factores que distorsionen los precios.
          </P>
        </Section>

        <Section title="Resolución y oráculos">
          <P>
            La resolución de los mercados depende de fuentes externas de datos (Yahoo Finance, INE, OMIE, etc.). Predimarket no controla estas fuentes y no puede garantizar su disponibilidad, precisión o continuidad.
          </P>
          <P>
            En caso de datos incorrectos, no disponibles o disputados, Predimarket se reserva el derecho de resolver los mercados de forma alternativa según su mejor criterio, incluyendo la posibilidad de declarar el mercado nulo y devolver los créditos.
          </P>
        </Section>

        <Section title="Créditos virtuales">
          <P>
            Los créditos de Predimarket son unidades virtuales sin valor económico. No pueden transferirse, canjearse por dinero real ni utilizarse fuera de la plataforma. La pérdida de créditos no supone ningún perjuicio económico real.
          </P>
        </Section>

        <Section title="Limitación de responsabilidad">
          <P>
            Predimarket no asume ninguna responsabilidad por decisiones tomadas a partir de la información disponible en la plataforma. El uso de Predimarket implica la aceptación de que los mercados de predicción tienen un componente especulativo inherente.
          </P>
          <P>
            La plataforma se encuentra en fase de pruebas. Pueden producirse interrupciones del servicio, pérdida de datos o cambios en las reglas sin previo aviso.
          </P>
        </Section>

        <Section title="Contacto">
          <P>
            Para cualquier consulta legal o de cumplimiento:{' '}
            <a href="mailto:jaimesotoenrile@gmail.com" style={{ color: C.accentLight, textDecoration: 'underline' }}>
              jaimesotoenrile@gmail.com
            </a>
          </P>
        </Section>

        <div style={{ fontSize: 12, color: C.textDim, borderTop: `1px solid ${C.divider}`, paddingTop: 20 }}>
          Última actualización: marzo 2026 · Predimarket — Fase de pruebas
        </div>

      </div>
    </div>
  )
}
