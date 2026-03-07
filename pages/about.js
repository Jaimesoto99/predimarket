import Head from 'next/head'
import Link from 'next/link'
import { C } from '../lib/theme'
import Footer from '../components/Footer'

const ORACLES = [
  {
    category: 'ECONOMIA',
    indicator: 'IBEX 35',
    source: 'Yahoo Finance',
    api: 'query1.finance.yahoo.com/v8/finance/chart/%5EIBEX',
    field: 'regularMarketPrice',
    resolution: 'Cierre diario (17:35 CET)',
  },
  {
    category: 'ECONOMIA',
    indicator: 'Euríbor 12M',
    source: 'Banco de España / BCE',
    api: 'sdw-wsrest.ecb.europa.eu/service/data/FM/...',
    field: 'OBS_VALUE',
    resolution: 'Publicación mensual BCE',
  },
  {
    category: 'ECONOMIA',
    indicator: 'IPC España',
    source: 'INE (Instituto Nacional de Estadística)',
    api: 'servicios.ine.es/wstempus/js/ES/DATOS_SERIE/...',
    field: 'Valor',
    resolution: 'Publicación mensual INE',
  },
  {
    category: 'ENERGIA',
    indicator: 'Precio luz PVPC',
    source: 'REE / preciodelaluz.org',
    api: 'api.esios.ree.es/indicators/1001',
    field: 'values[].value',
    resolution: 'Media diaria (€/MWh → €/kWh)',
  },
  {
    category: 'ENERGIA',
    indicator: 'Brent Crude',
    source: 'Yahoo Finance',
    api: 'query1.finance.yahoo.com/v8/finance/chart/BZ%3DF',
    field: 'regularMarketPrice',
    resolution: 'Precio spot en tiempo real',
  },
  {
    category: 'CRIPTO',
    indicator: 'Bitcoin (BTC/EUR)',
    source: 'CoinGecko',
    api: 'api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur',
    field: 'bitcoin.eur',
    resolution: 'Precio spot CoinGecko',
  },
  {
    category: 'DEPORTES',
    indicator: 'Fútbol (LaLiga, Champions)',
    source: 'football-data.org',
    api: 'api.football-data.org/v4/matches/{id}',
    field: 'score.fullTime',
    resolution: 'Resultado final del partido',
  },
  {
    category: 'CLIMA',
    indicator: 'Temperatura (Madrid)',
    source: 'Open-Meteo / AEMET',
    api: 'api.open-meteo.com/v1/forecast?latitude=40.4&longitude=-3.7',
    field: 'daily.temperature_2m_max',
    resolution: 'Temperatura máxima diaria (°C)',
  },
]

const STEPS = [
  {
    n: 1,
    title: 'Se crea el contrato',
    desc: 'Un mercado de predicción se abre sobre un evento futuro verificable: "¿Cerrará el IBEX 35 por encima de 11.500 el viernes?"',
  },
  {
    n: 2,
    title: 'Los usuarios negocian',
    desc: 'Cada usuario compra contratos SÍ o NO. El precio refleja la probabilidad implícita del mercado calculada mediante AMM (Fixed Product Market Maker).',
  },
  {
    n: 3,
    title: 'El oráculo resuelve',
    desc: 'Cuando llega la fecha de cierre, un oráculo consulta la fuente oficial (INE, BCE, Yahoo Finance, REE...) y determina el resultado automáticamente.',
  },
  {
    n: 4,
    title: 'Liquidación automática',
    desc: 'Los contratos del lado ganador (SÍ o NO) se liquidan al precio de resolución. Los fondos se distribuyen proporcionalmente a los ganadores.',
  },
]

function Section({ id, title, children }) {
  return (
    <section id={id} style={{ marginBottom: 64 }}>
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

export default function About() {
  return (
    <>
      <Head>
        <title>PrediMarket — Sobre nosotros</title>
        <meta name="description" content="Qué es PrediMarket, cómo funcionan los contratos de predicción, oráculos públicos y el equipo detrás del proyecto." />
        <meta property="og:title" content="PrediMarket — Sobre nosotros" />
        <meta property="og:description" content="Plataforma de contratos financieros binarios sobre indicadores económicos verificables. Resolución automática por oráculo público." />
        <link rel="canonical" href="https://predimarket.vercel.app/about" />
      </Head>

      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, -apple-system, sans-serif', fontSize: 14, display: 'flex', flexDirection: 'column' }}>
        <header style={{ borderBottom: `1px solid ${C.divider}`, background: `${C.bg}e8`, position: 'sticky', top: 0, zIndex: 40, backdropFilter: 'blur(24px)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <div style={{ width: 26, height: 26, background: C.accent, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>P</div>
              <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em', color: C.text }}>PrediMarket</span>
            </Link>
            <nav style={{ display: 'flex', gap: 2 }}>
              {[{ href: '/', label: 'Mercados' }, { href: '/demo', label: 'Demo' }, { href: '/stats', label: 'Stats' }, { href: '/about', label: 'Nosotros' }].map(({ href, label }) => (
                <Link key={href} href={href} style={{ padding: '5px 10px', borderRadius: 5, fontSize: 12, color: href === '/about' ? C.text : C.textDim, fontWeight: href === '/about' ? 600 : 400, textDecoration: 'none', background: href === '/about' ? C.cardBorder : 'transparent' }}>
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main style={{ maxWidth: 900, margin: '0 auto', padding: '56px 24px', flex: 1, width: '100%' }}>
          <div style={{ marginBottom: 56 }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em', color: C.text, marginBottom: 12 }}>Sobre PrediMarket</h1>
            <p style={{ fontSize: 15, color: C.textMuted, lineHeight: 1.7, maxWidth: 640 }}>
              Plataforma de contratos financieros binarios sobre indicadores económicos verificables. Cada mercado se resuelve automáticamente mediante oráculos que consultan fuentes públicas oficiales.
            </p>
          </div>

          {/* Qué es */}
          <Section id="que-es" title="Qué es PrediMarket">
            <P>PrediMarket es un mercado de predicción financiero donde los usuarios compran y venden contratos binarios sobre eventos verificables: si el IBEX 35 superará un nivel determinado, si el precio de la luz bajará esta semana, si Bitcoin alcanzará cierto precio.</P>
            <P>A diferencia de los mercados de predicción basados en opinión, todos los mercados de PrediMarket se resuelven mediante oráculos automatizados que consultan fuentes públicas oficiales. No hay subjetividad, no hay árbitros: los datos mandan.</P>
            <P>La plataforma opera actualmente en fase de pruebas con saldos virtuales. No se requiere dinero real. El objetivo es demostrar el modelo antes de solicitar autorización regulatoria.</P>

            <div style={{ display: 'flex', gap: 16, marginTop: 24, flexWrap: 'wrap' }}>
              {[
                { label: 'Contratos binarios', desc: 'SÍ o NO sobre un evento verificable' },
                { label: 'AMM automático', desc: 'Precios determinados por el mercado (FPMM)' },
                { label: 'Resolución por oráculo', desc: 'Fuentes públicas oficiales, sin árbitros' },
                { label: 'Fase de pruebas', desc: 'Saldos virtuales, sin dinero real' },
              ].map(({ label, desc }) => (
                <div key={label} style={{ flex: '1 1 180px', padding: '16px 20px', background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.5 }}>{desc}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* Cómo funciona */}
          <Section id="como-funciona" title="Cómo funciona">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {STEPS.map((step, i) => (
                <div key={step.n} style={{ display: 'flex', gap: 20, paddingBottom: 28 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 16, background: `${C.accent}15`, border: `1px solid ${C.accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: C.accent }}>
                      {step.n}
                    </div>
                    {i < STEPS.length - 1 && <div style={{ width: 1, flex: 1, background: C.divider, margin: '6px 0' }} />}
                  </div>
                  <div style={{ paddingTop: 6 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>{step.title}</div>
                    <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 8, padding: '16px 20px', background: `${C.accent}08`, border: `1px solid ${C.accent}20`, borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 4 }}>Mecánica AMM (Fixed Product Market Maker)</div>
              <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6 }}>
                El precio de los contratos SÍ y NO se calcula como: <code style={{ background: C.surface, padding: '1px 6px', borderRadius: 3, fontSize: 11 }}>precio_SÍ = pool_NO / (pool_SÍ + pool_NO)</code>.
                Cada operación mueve los pools y ajusta el precio automáticamente, sin libro de órdenes centralizado.
              </div>
            </div>
          </Section>

          {/* Oráculos */}
          <Section id="oraculos" title="Documentación de oráculos">
            <P>Todos los mercados se resuelven automáticamente. La fuente oficial, el endpoint y el campo concreto que se usa están documentados públicamente para cada tipo de mercado.</P>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.divider}` }}>
                    {['Categoría', 'Indicador', 'Fuente', 'API / Endpoint', 'Campo', 'Resolución'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.textDim, whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ORACLES.map((o, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.divider}`, background: i % 2 === 0 ? 'transparent' : `${C.surface}50` }}>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', color: C.accent, background: `${C.accent}10`, padding: '2px 7px', borderRadius: 4 }}>
                          {o.category}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: C.text, whiteSpace: 'nowrap' }}>{o.indicator}</td>
                      <td style={{ padding: '10px 12px', color: C.textMuted, whiteSpace: 'nowrap' }}>{o.source}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <code style={{ fontSize: 10, color: C.textDim, background: C.surface, padding: '2px 6px', borderRadius: 3, display: 'block', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {o.api}
                        </code>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <code style={{ fontSize: 10, color: C.accentLight, background: `${C.accent}10`, padding: '2px 6px', borderRadius: 3, whiteSpace: 'nowrap' }}>
                          {o.field}
                        </code>
                      </td>
                      <td style={{ padding: '10px 12px', color: C.textDim, fontSize: 11 }}>{o.resolution}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <P style={{ marginTop: 20 }}>Si la fuente de datos no está disponible en la fecha de resolución, el mercado se cancela y todos los participantes reciben un reembolso íntegro. No se resuelve con datos desactualizados.</P>
          </Section>

          {/* Transparencia */}
          <Section id="transparencia" title="Transparencia y reglas públicas">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { title: 'Umbrales verificables', desc: 'Cada mercado incluye el umbral exacto sobre el que se negocia. Los umbrales se fijan al crear el mercado y no se modifican.' },
                { title: 'Fuentes oficiales', desc: 'Todas las fuentes de datos son públicas y accesibles por cualquier usuario. No se usan APIs privadas ni datos de pago exclusivos.' },
                { title: 'Reglas de resolución', desc: 'Las reglas se aplican igual para todos los mercados de la misma categoría. No hay discrecionalidad en la resolución.' },
                { title: 'Código abierto (próximamente)', desc: 'La lógica del AMM, los oráculos y las reglas de resolución se publicarán en GitHub para revisión pública.' },
              ].map(({ title, desc }) => (
                <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px', background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: C.yes, flexShrink: 0, marginTop: 5 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>{title}</div>
                    <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Estado regulatorio */}
          <Section id="estado" title="Estado actual">
            <div style={{ padding: '20px 24px', background: `${C.accent}08`, border: `1px solid ${C.accent}20`, borderRadius: 8, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 8 }}>Fase de pruebas — Saldos virtuales</div>
              <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.7 }}>
                PrediMarket opera actualmente en fase de demostración con saldos virtuales. No se requiere dinero real y no hay pérdidas económicas reales. La plataforma no está autorizada como entidad de servicios de inversión y está pendiente de evaluación regulatoria por la CNMV.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'Límite por usuario', value: '500€ virtuales' },
                { label: 'Límite por operación', value: '100€ virtuales' },
                { label: 'KYC requerido', value: 'No (fase beta)' },
                { label: 'Regulador objetivo', value: 'CNMV (España)' },
              ].map(({ label, value }) => (
                <div key={label} style={{ flex: '1 1 140px', padding: '12px 16px', background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 6 }}>
                  <div style={{ fontSize: 10, color: C.textDim, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{value}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* Equipo */}
          <Section id="equipo" title="Equipo">
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, background: `${C.accent}20`, border: `1px solid ${C.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: C.accent, flexShrink: 0 }}>
                J
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>Jaime de Soto Enrile</div>
                <div style={{ fontSize: 12, color: C.accent, marginBottom: 10 }}>Fundador — Madrid, España</div>
                <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7, maxWidth: 520 }}>
                  Diseño, desarrollo y operación de PrediMarket. Responsable del tratamiento de datos personales conforme al RGPD y la LOPDGDD.
                </div>
                <div style={{ marginTop: 12 }}>
                  <a href="mailto:jaimesotoenrile@gmail.com" style={{ fontSize: 12, color: C.accentLight, textDecoration: 'none' }}>
                    jaimesotoenrile@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </Section>
        </main>

        <Footer />
      </div>
    </>
  )
}
