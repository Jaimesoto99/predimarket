import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { C } from '../lib/theme'
import Footer from '../components/Footer'

const NAV = [
  { href: '/', label: 'Mercados' },
  { href: '/demo', label: 'Demo' },
  { href: '/stats', label: 'Stats' },
  { href: '/about', label: 'Nosotros' },
]

const STEPS = [
  {
    n: 1,
    title: 'Elige un mercado',
    tag: 'SELECCIÓN',
    desc: 'Explora los mercados disponibles. Cada mercado tiene una pregunta binaria sobre un evento verificable: precio de un activo, resultado de un partido, dato macroeconómico.',
    example: {
      label: 'Ejemplo de mercado',
      title: '¿Cerrará el IBEX 35 por encima de 11.500 el viernes?',
      meta: 'Cierre: viernes 3 abr 2026 · Oráculo: Yahoo Finance',
      prob: 62,
      volume: '€2.340',
      traders: 18,
    },
    tip: 'Busca mercados con volumen alto — tienen precios más eficientes y mayor liquidez.',
  },
  {
    n: 2,
    title: 'Analiza la probabilidad',
    tag: 'ANÁLISIS',
    desc: 'El precio de un contrato SÍ refleja la probabilidad implícita que el mercado asigna al evento. Si el precio SÍ es €0,62, el mercado estima un 62% de probabilidad de que ocurra.',
    formula: {
      label: 'Descubrimiento de precio P2P',
      eq: 'precio = última orden cruzada (comprador ↔ vendedor)',
      explain: 'El precio refleja el último cruce entre una orden de compra y una de venta. A más compradores de SÍ, el precio de SÍ sube. El mercado agrega la información colectiva de todos los participantes.',
    },
    tip: 'Si crees que la probabilidad real es mayor al precio actual, comprar SÍ tiene valor esperado positivo.',
  },
  {
    n: 3,
    title: 'Decide tu posición',
    tag: 'DECISIÓN',
    desc: 'Compra contratos SÍ si crees que el evento va a ocurrir, o contratos NO si crees que no ocurrirá. Cada contrato vale €1 si ganas, €0 si pierdes.',
    priceExamples: [
      { side: 'SÍ', price: 0.62, color: C.yes, returns: 'Ganas €0,38 por contrato (+61%)' },
      { side: 'NO', price: 0.38, color: C.no, returns: 'Ganas €0,62 por contrato (+163%)' },
    ],
    tip: 'Puedes vender tus contratos antes del cierre del mercado para realizar ganancias o limitar pérdidas.',
  },
  {
    n: 4,
    title: 'Ejecuta la operación',
    tag: 'EJECUCIÓN',
    desc: 'Introduce el importe que quieres invertir. Puedes usar orden de mercado (ejecución inmediata al precio actual) o orden límite (solo ejecuta si el precio baja al nivel que tú marcas).',
    orderTypes: [
      { type: 'Orden Mercado', desc: 'Cruza inmediatamente contra las órdenes disponibles en el libro. El precio de ejecución puede variar ligeramente en operaciones grandes.' },
      { type: 'Orden Límite', desc: 'Se ejecuta solo si el precio llega a tu nivel. Útil para entrar en retrocesos.' },
    ],
    tip: 'El máximo por operación en fase beta es €100. Usa importes pequeños para entender el mecanismo.',
  },
  {
    n: 5,
    title: 'Gestiona tu posición',
    tag: 'GESTIÓN',
    desc: 'Desde "Posiciones" puedes ver tus contratos abiertos, el valor actual de cada uno y el P/L en tiempo real. Puedes vender en cualquier momento antes del cierre.',
    positionExample: {
      market: 'IBEX 35 > 11.500 (viernes)',
      side: 'SÍ',
      shares: 16.1,
      buyPrice: 0.62,
      currentPrice: 0.71,
      pnl: '+€1,45',
      pct: '+14,7%',
    },
    tip: 'Vender a tiempo puede ser tan importante como elegir bien la posición inicial.',
  },
  {
    n: 6,
    title: 'Oráculo y resolución',
    tag: 'RESOLUCIÓN',
    desc: 'Al cierre del mercado, un oráculo automatizado consulta la fuente oficial (Yahoo Finance para IBEX, INE para IPC, REE apidatos para luz...) y determina el resultado. El promotor revisa y confirma el resultado antes de ejecutar la liquidación.',
    resolution: {
      oracle: 'Yahoo Finance',
      value: 'IBEX 35: 11.647,30',
      outcome: 'SÍ — El IBEX cerró por encima de 11.500',
      color: C.yes,
    },
    tip: 'Si la fuente de datos no está disponible, el mercado se cancela y todos los fondos se reembolsan.',
  },
  {
    n: 7,
    title: 'Liquidación automática',
    tag: 'LIQUIDACIÓN',
    desc: 'Los contratos ganadores se liquidan a €1,00 por contrato. Los perdedores a €0. Los fondos se añaden a tu saldo automáticamente en segundos.',
    liquidation: {
      shares: 16.1,
      price: 1.0,
      gross: '€16,10',
      invested: '€10,00',
      profit: '+€6,10',
      pct: '+61%',
    },
    tip: 'El historial completo de cada resolución (fuente, valor, timestamp) queda registrado en el sistema de auditoría de Forsii.',
  },
]

function StepDot({ n, active, done }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 14, flexShrink: 0,
      background: done ? C.yes : active ? C.accent : C.surface,
      border: `1px solid ${done ? C.yes : active ? C.accent : C.cardBorder}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700,
      color: done || active ? '#fff' : C.textDim,
      transition: 'all 0.3s',
      cursor: 'pointer',
    }}>
      {done ? '✓' : n}
    </div>
  )
}

function Tag({ children }) {
  return (
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: C.accent, background: `${C.accent}12`, border: `1px solid ${C.accent}25`, padding: '2px 8px', borderRadius: 4 }}>
      {children}
    </span>
  )
}

export default function Demo() {
  const [step, setStep] = useState(1)
  const current = STEPS[step - 1]
  const isLast = step === STEPS.length

  return (
    <>
      <Head>
        <title>Forsii — Demo interactiva</title>
        <meta name="description" content="Aprende a operar en Forsii con esta guía interactiva paso a paso: desde elegir un mercado hasta la liquidación automática por oráculo." />
        <meta property="og:title" content="Forsii — Demo interactiva" />
        <meta property="og:description" content="Guía paso a paso de cómo funcionan los contratos financieros binarios en Forsii." />
        <link rel="canonical" href="https://forsii.com/demo" />
      </Head>

      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, -apple-system, sans-serif', fontSize: 14, display: 'flex', flexDirection: 'column' }}>
        <header style={{ borderBottom: `1px solid ${C.divider}`, background: C.bgBackdrop, position: 'sticky', top: 0, zIndex: 40, backdropFilter: 'blur(24px)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <div style={{ width: 26, height: 26, background: C.accent, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>P</div>
              <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em', color: C.text }}>Forsii</span>
            </Link>
            <nav style={{ display: 'flex', gap: 2 }}>
              {NAV.map(({ href, label }) => (
                <Link key={href} href={href} style={{ padding: '5px 10px', borderRadius: 5, fontSize: 12, color: href === '/demo' ? C.text : C.textDim, fontWeight: href === '/demo' ? 600 : 400, textDecoration: 'none', background: href === '/demo' ? C.cardBorder : 'transparent' }}>
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px', flex: 1, width: '100%' }}>
          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', color: C.text, marginBottom: 8 }}>Cómo operar en Forsii</h1>
            <p style={{ fontSize: 13, color: C.textDim, maxWidth: 560 }}>Guía interactiva del ciclo completo de un contrato financiero binario, desde la selección del mercado hasta la liquidación.</p>
          </div>

          {/* Step navigator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40, overflowX: 'auto', paddingBottom: 4 }}>
            {STEPS.map((s, i) => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
                <div onClick={() => setStep(s.n)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '4px 2px' }}>
                  <StepDot n={s.n} active={step === s.n} done={step > s.n} />
                  <span style={{ fontSize: 11, fontWeight: step === s.n ? 600 : 400, color: step === s.n ? C.text : C.textDim, whiteSpace: 'nowrap', display: 'none' }}>
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 24, height: 1, background: step > s.n ? C.yes : C.divider, margin: '0 4px', flexShrink: 0, transition: 'background 0.3s' }} />
                )}
              </div>
            ))}
            <div style={{ marginLeft: 16, fontSize: 11, color: C.textDim, whiteSpace: 'nowrap' }}>Paso {step} de {STEPS.length}</div>
          </div>

          {/* Step content */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
            {/* Left: explanation */}
            <div>
              <div style={{ display: 'flex', align: 'center', gap: 10, marginBottom: 16 }}>
                <Tag>{current.tag}</Tag>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: C.text, marginBottom: 14 }}>
                {current.n}. {current.title}
              </h2>
              <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.8, marginBottom: 24 }}>{current.desc}</p>

              {/* Tip */}
              <div style={{ padding: '12px 16px', background: `${C.accent}08`, border: `1px solid ${C.accent}20`, borderRadius: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: C.accent, marginBottom: 4 }}>CONSEJO</div>
                <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6 }}>{current.tip}</div>
              </div>

              {/* Navigation */}
              <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
                {step > 1 && (
                  <button onClick={() => setStep(s => s - 1)} style={{ flex: 1, padding: '11px 0', borderRadius: 7, border: `1px solid ${C.cardBorder}`, background: 'transparent', color: C.textDim, fontSize: 13, cursor: 'pointer' }}>
                    ← Anterior
                  </button>
                )}
                {!isLast ? (
                  <button onClick={() => setStep(s => s + 1)} style={{ flex: 2, padding: '11px 0', borderRadius: 7, border: 'none', background: C.accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Siguiente →
                  </button>
                ) : (
                  <Link href="/" style={{ flex: 2, padding: '11px 0', borderRadius: 7, border: 'none', background: C.yes, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', textAlign: 'center', display: 'block' }}>
                    Ir a los mercados →
                  </Link>
                )}
              </div>
            </div>

            {/* Right: visual example */}
            <div>
              {/* Step 1: market card example */}
              {current.example && (
                <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: '20px 22px' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: C.textDim, marginBottom: 10 }}>EJEMPLO DE MERCADO</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.5, marginBottom: 12 }}>{current.example.title}</div>
                  <div style={{ fontSize: 11, color: C.textDim, marginBottom: 16 }}>{current.example.meta}</div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                    <div style={{ flex: 1, padding: '12px 0', textAlign: 'center', background: `${C.yes}10`, border: `1px solid ${C.yes}25`, borderRadius: 8 }}>
                      <div style={{ fontSize: 10, color: C.yes, fontWeight: 600, marginBottom: 4 }}>SÍ</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: C.yes, fontFamily: 'ui-monospace, monospace' }}>{current.example.prob}¢</div>
                    </div>
                    <div style={{ flex: 1, padding: '12px 0', textAlign: 'center', background: `${C.no}10`, border: `1px solid ${C.no}25`, borderRadius: 8 }}>
                      <div style={{ fontSize: 10, color: C.no, fontWeight: 600, marginBottom: 4 }}>NO</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: C.no, fontFamily: 'ui-monospace, monospace' }}>{100 - current.example.prob}¢</div>
                    </div>
                  </div>
                  <div style={{ height: 6, background: C.surface, borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
                    <div style={{ width: `${current.example.prob}%`, height: '100%', background: `linear-gradient(to right, ${C.yes}, ${C.yes}aa)`, borderRadius: 3 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.textDim }}>
                    <span>Vol. {current.example.volume}</span>
                    <span>{current.example.traders} traders</span>
                  </div>
                </div>
              )}

              {/* Step 2: formula */}
              {current.formula && (
                <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: '20px 22px' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: C.textDim, marginBottom: 16 }}>{current.formula.label}</div>
                  <div style={{ background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: '16px 20px', marginBottom: 16, textAlign: 'center' }}>
                    <code style={{ fontSize: 13, color: C.accentLight, fontFamily: 'ui-monospace, monospace' }}>{current.formula.eq}</code>
                  </div>
                  <p style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6, margin: 0 }}>{current.formula.explain}</p>
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { label: 'Órdenes SÍ a 62¢ vs órdenes NO a 38¢', result: 'precio SÍ = 62%' },
                      { label: 'Nueva compra SÍ a 63¢ se cruza', result: 'precio SÍ sube a ~63%' },
                    ].map(({ label, result }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: `${C.accent}08`, borderRadius: 6 }}>
                        <span style={{ fontSize: 11, color: C.textDim }}>{label}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.accent }}>{result}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: price examples */}
              {current.priceExamples && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {current.priceExamples.map(({ side, price, color, returns }) => (
                    <div key={side} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: '20px 22px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}12`, border: `1px solid ${color}25`, padding: '2px 8px', borderRadius: 4 }}>Contrato {side}</span>
                        </div>
                        <span style={{ fontSize: 24, fontWeight: 700, color, fontFamily: 'ui-monospace, monospace' }}>€{price.toFixed(2)}</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.textDim }}>Por cada €1 invertido a este precio:</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color, marginTop: 4 }}>{returns}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 4: order types */}
              {current.orderTypes && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {current.orderTypes.map(({ type, desc }) => (
                    <div key={type} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: '18px 20px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 }}>{type}</div>
                      <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6 }}>{desc}</div>
                    </div>
                  ))}
                  <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: '18px 20px' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: C.textDim, marginBottom: 12 }}>SIMULACIÓN DE ORDEN</div>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                      <button style={{ flex: 1, padding: '8px 0', background: `${C.yes}15`, border: `1px solid ${C.yes}30`, borderRadius: 6, color: C.yes, fontSize: 12, fontWeight: 700, cursor: 'default' }}>SÍ</button>
                      <button style={{ flex: 1, padding: '8px 0', background: 'transparent', border: `1px solid ${C.cardBorder}`, borderRadius: 6, color: C.textDim, fontSize: 12, cursor: 'default' }}>NO</button>
                    </div>
                    <div style={{ background: C.surface, borderRadius: 6, padding: '10px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: C.textDim }}>Importe</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>€10,00</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.textDim, padding: '0 2px' }}>
                      <span>Contratos aprox.</span>
                      <span style={{ color: C.text }}>~16,1 SÍ</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: position example */}
              {current.positionExample && (
                <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: '20px 22px' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: C.textDim, marginBottom: 16 }}>TU POSICIÓN</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>{current.positionExample.market}</div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
                    {[
                      { label: 'Lado', value: current.positionExample.side, color: C.yes },
                      { label: 'Contratos', value: current.positionExample.shares.toFixed(1) },
                      { label: 'Precio compra', value: `€${current.positionExample.buyPrice.toFixed(2)}` },
                      { label: 'Precio actual', value: `€${current.positionExample.currentPrice.toFixed(2)}` },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, color: C.textDim, marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: color || C.text }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 16, padding: '12px 16px', background: `${C.yes}08`, border: `1px solid ${C.yes}25`, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: C.textDim }}>P/L no realizado</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: C.yes }}>{current.positionExample.pnl} ({current.positionExample.pct})</span>
                  </div>
                </div>
              )}

              {/* Step 6: resolution */}
              {current.resolution && (
                <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: '20px 22px' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: C.textDim, marginBottom: 16 }}>RESOLUCIÓN POR ORÁCULO</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Fuente', value: current.resolution.oracle },
                      { label: 'Dato obtenido', value: current.resolution.value },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: C.surface, borderRadius: 6 }}>
                        <span style={{ fontSize: 12, color: C.textDim }}>{label}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: 'ui-monospace, monospace' }}>{value}</span>
                      </div>
                    ))}
                    <div style={{ padding: '14px 16px', background: `${current.resolution.color}10`, border: `1px solid ${current.resolution.color}30`, borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: current.resolution.color }}>{current.resolution.outcome}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 7: liquidation */}
              {current.liquidation && (
                <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: '20px 22px' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: C.textDim, marginBottom: 16 }}>LIQUIDACIÓN FINAL</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {[
                      { label: 'Contratos ganadores', value: `${current.liquidation.shares} SÍ` },
                      { label: 'Precio de liquidación', value: `€${current.liquidation.price.toFixed(2)}` },
                      { label: 'Importe bruto', value: current.liquidation.gross },
                      { label: 'Invertido', value: current.liquidation.invested },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.divider}` }}>
                        <span style={{ fontSize: 12, color: C.textDim }}>{label}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: 'ui-monospace, monospace' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '16px', background: `${C.yes}10`, border: `1px solid ${C.yes}30`, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.yes }}>Beneficio neto</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: C.yes, fontFamily: 'ui-monospace, monospace' }}>{current.liquidation.profit}</div>
                      <div style={{ fontSize: 11, color: C.yes }}>{current.liquidation.pct}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* All steps overview */}
          <div style={{ marginTop: 56, paddingTop: 32, borderTop: `1px solid ${C.divider}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 20 }}>Resumen del proceso completo</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {STEPS.map(s => (
                <div
                  key={s.n}
                  onClick={() => setStep(s.n)}
                  style={{ padding: '14px 16px', background: step === s.n ? `${C.accent}10` : C.card, border: `1px solid ${step === s.n ? C.accent : C.cardBorder}`, borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: step === s.n ? C.accent : C.textDim, marginBottom: 4 }}>Paso {s.n}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: step === s.n ? C.text : C.textMuted }}>{s.title}</div>
                </div>
              ))}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  )
}
