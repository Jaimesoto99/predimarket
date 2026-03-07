import Head from 'next/head'
import Link from 'next/link'
import { C } from '../lib/theme'
import Footer from '../components/Footer'

function Section({ id, title, children }) {
  return (
    <section id={id} style={{ marginBottom: 56 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: C.text, marginBottom: 24, paddingBottom: 12, borderBottom: `1px solid ${C.divider}` }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function P({ children }) {
  return <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.8, marginBottom: 14 }}>{children}</p>
}

function H3({ children }) {
  return <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 8, marginTop: 20 }}>{children}</h3>
}

function Item({ children }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
      <div style={{ width: 4, height: 4, borderRadius: 2, background: C.accent, flexShrink: 0, marginTop: 7 }} />
      <span style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7 }}>{children}</span>
    </div>
  )
}

export default function Legal() {
  const updated = '7 de marzo de 2026'

  return (
    <>
      <Head>
        <title>PrediMarket — Términos y Condiciones</title>
        <meta name="description" content="Términos y Condiciones de uso y Política de Privacidad de PrediMarket, plataforma de contratos financieros binarios." />
        <meta property="og:title" content="PrediMarket — Términos y Condiciones" />
        <meta property="og:description" content="Términos de uso y política de privacidad de PrediMarket." />
        <link rel="canonical" href="https://predimarket.vercel.app/legal" />
      </Head>

      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, -apple-system, sans-serif', fontSize: 14, display: 'flex', flexDirection: 'column' }}>
        {/* Simple header */}
        <header style={{ borderBottom: `1px solid ${C.divider}`, background: `${C.bg}e8`, position: 'sticky', top: 0, zIndex: 40, backdropFilter: 'blur(24px)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <div style={{ width: 26, height: 26, background: C.accent, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>P</div>
              <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em', color: C.text }}>PrediMarket</span>
            </Link>
            <Link href="/" style={{ fontSize: 12, color: C.textDim, textDecoration: 'none' }}>← Volver a mercados</Link>
          </div>
        </header>

        <main style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px', flex: 1, width: '100%' }}>
          <div style={{ marginBottom: 48 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', color: C.text, marginBottom: 8 }}>Términos legales</h1>
            <p style={{ fontSize: 13, color: C.textDim }}>Última actualización: {updated}</p>
          </div>

          {/* Quick nav */}
          <div style={{ padding: '16px 20px', background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, marginBottom: 48, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <a href="#terminos" style={{ fontSize: 12, color: C.accentLight, textDecoration: 'none' }}>Términos y Condiciones</a>
            <a href="#privacidad" style={{ fontSize: 12, color: C.accentLight, textDecoration: 'none' }}>Política de Privacidad</a>
          </div>

          {/* ── SECCIÓN 1: T&C ── */}
          <Section id="terminos" title="Términos y Condiciones de Uso">
            <H3>1. Naturaleza de la plataforma</H3>
            <P>PrediMarket es una plataforma tecnológica de negociación de contratos financieros binarios. Los contratos se resuelven automáticamente mediante oráculos que consultan fuentes públicas oficiales (INE, BCE, BME, OMIE, CoinGecko, football-data.org y otras APIs verificables).</P>
            <P>PrediMarket actúa exclusivamente como intermediario tecnológico. PrediMarket NO emite opiniones, recomendaciones de inversión, ni garantiza resultados. El usuario es el único responsable de sus decisiones operativas.</P>

            <H3>2. Riesgo</H3>
            <Item>El usuario acepta que puede perder el 100% del importe invertido en cada contrato.</Item>
            <Item>Cada contrato tiene un subyacente verificable, una fuente oficial de resolución y una fecha de liquidación predeterminada.</Item>
            <Item>La resolución depende de la disponibilidad de los oráculos externos. Si la fuente no está disponible, PrediMarket se reserva el derecho de cancelar el mercado y reembolsar a todos los participantes íntegramente.</Item>

            <H3>3. Requisitos de acceso</H3>
            <Item>Edad mínima: 18 años.</Item>
            <Item>Para operar con fondos reales será necesaria la verificación de identidad (KYC) conforme a la Ley 10/2010 de prevención del blanqueo de capitales.</Item>
            <Item>Durante la fase de pruebas: máximo 500€ por usuario, máximo 100€ por operación.</Item>

            <H3>4. Situación regulatoria</H3>
            <P>PrediMarket no está autorizada actualmente como entidad de servicios de inversión. La plataforma opera en fase de pruebas bajo evaluación regulatoria. No se garantiza la continuidad del servicio.</P>
            <P>Jurisdicción: legislación española. Cualquier disputa se resolverá ante los tribunales competentes del domicilio social.</P>

            <H3>5. Modificaciones</H3>
            <P>PrediMarket se reserva el derecho de modificar estos términos con 15 días de preaviso. El uso continuado de la plataforma implica la aceptación de los nuevos términos.</P>
          </Section>

          {/* ── SECCIÓN 2: PRIVACIDAD ── */}
          <Section id="privacidad" title="Política de Privacidad">
            <H3>Responsable del tratamiento</H3>
            <P><strong style={{ color: C.text }}>Jaime de Soto Enrile</strong> — jaimesotoenrile@gmail.com</P>

            <H3>Datos recogidos</H3>
            <Item>Nombre y apellidos</Item>
            <Item>Dirección de email</Item>
            <Item>Documento de identidad (DNI/NIE) — solo cuando se implemente KYC completo</Item>
            <Item>Historial de operaciones (mercados, importes, resultados)</Item>
            <Item>Datos de sesión y preferencias de uso</Item>

            <H3>Base jurídica del tratamiento</H3>
            <Item>Ejecución del contrato de uso de la plataforma.</Item>
            <Item>Consentimiento explícito del usuario al registrarse.</Item>
            <Item>Cumplimiento de obligaciones legales (Ley 10/2010 PBC/FT).</Item>

            <H3>Finalidad</H3>
            <Item>Operativa de la plataforma: registro, autenticación, ejecución y liquidación de contratos.</Item>
            <Item>Cumplimiento normativo: prevención del blanqueo de capitales y financiación del terrorismo.</Item>
            <Item>Comunicaciones del servicio: actualizaciones sobre mercados y resoluciones.</Item>

            <H3>Almacenamiento y seguridad</H3>
            <P>Los datos se almacenan en <strong style={{ color: C.text }}>Supabase (PostgreSQL)</strong>, cifrado AES-256, con servidores ubicados en la Unión Europea (Frankfurt, Alemania). Las comunicaciones están protegidas mediante TLS 1.3.</P>

            <H3>Plazos de conservación</H3>
            <Item>Datos de operaciones: 10 años (Ley 10/2010 PBC/FT).</Item>
            <Item>Datos de cuenta: hasta solicitud de baja más 6 meses.</Item>
            <Item>Logs de acceso: 12 meses.</Item>

            <H3>Compartición de datos</H3>
            <P>No se comparten datos con terceros salvo por obligación legal o requerimiento de autoridad competente. No se realizan transferencias internacionales fuera del EEE.</P>

            <H3>Tus derechos</H3>
            <P>Conforme al RGPD y la LOPDGDD tienes derecho a: acceso, rectificación, supresión, portabilidad, oposición y limitación del tratamiento. Para ejercerlos: <a href="mailto:jaimesotoenrile@gmail.com" style={{ color: C.accentLight }}>jaimesotoenrile@gmail.com</a></P>
            <P>Puedes presentar reclamación ante la Agencia Española de Protección de Datos (aepd.es).</P>

            <H3>Cookies</H3>
            <P>Únicamente se utilizan cookies funcionales necesarias para el funcionamiento de la plataforma (sesión, preferencias). No se utilizan cookies de seguimiento ni publicidad.</P>
          </Section>
        </main>

        <Footer />
      </div>
    </>
  )
}
