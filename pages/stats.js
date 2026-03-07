import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { C } from '../lib/theme'
import Footer from '../components/Footer'
import { supabase } from '../lib/supabase'

const NAV = [
  { href: '/', label: 'Mercados' },
  { href: '/demo', label: 'Demo' },
  { href: '/stats', label: 'Stats' },
  { href: '/about', label: 'Nosotros' },
]

function KPI({ label, value, sub, color }) {
  return (
    <div style={{ flex: '1 1 160px', padding: '20px 24px', background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textDim, marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', color: color || C.text, marginBottom: 4, fontFamily: 'ui-monospace, monospace' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.textDim }}>{sub}</div>}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <h2 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', color: C.text, marginBottom: 16, paddingBottom: 10, borderBottom: `1px solid ${C.divider}` }}>
      {children}
    </h2>
  )
}

export default function Stats() {
  const [markets, setMarkets] = useState([])
  const [trades, setTrades] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [{ data: m }, { data: t }, { data: u }] = await Promise.all([
          supabase.from('markets').select('id, title, category, status, yes_pool, no_pool, total_volume, close_date, created_at').order('created_at', { ascending: false }),
          supabase.from('trades').select('id, side, amount, status, created_at, market_id').order('created_at', { ascending: false }),
          supabase.from('user_profiles').select('user_email, display_name, balance, created_at').order('created_at', { ascending: false }),
        ])
        setMarkets(m || [])
        setTrades(t || [])
        setUsers(u || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const activeMarkets = markets.filter(m => m.status === 'ACTIVE')
  const resolvedMarkets = markets.filter(m => m.status === 'RESOLVED')
  const totalVolume = trades.reduce((s, t) => s + (t.amount || 0), 0)
  const openTrades = trades.filter(t => t.status === 'OPEN')
  const closedTrades = trades.filter(t => t.status !== 'OPEN')
  const winRate = closedTrades.length > 0
    ? Math.round((closedTrades.filter(t => t.status === 'WON').length / closedTrades.length) * 100)
    : null

  const byCategory = markets.reduce((acc, m) => {
    acc[m.category] = (acc[m.category] || 0) + 1
    return acc
  }, {})

  const volumeByDay = trades.reduce((acc, t) => {
    const day = t.created_at?.slice(0, 10)
    if (day) acc[day] = (acc[day] || 0) + (t.amount || 0)
    return acc
  }, {})
  const last7Days = Object.entries(volumeByDay)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 7)
    .reverse()

  const maxDayVol = Math.max(...last7Days.map(([, v]) => v), 1)

  return (
    <>
      <Head>
        <title>PrediMarket — Estadísticas de la plataforma</title>
        <meta name="description" content="Dashboard de métricas de PrediMarket: mercados activos, volumen negociado, usuarios registrados y distribución por categoría." />
        <meta property="og:title" content="PrediMarket — Estadísticas" />
        <meta property="og:description" content="Métricas en tiempo real de la plataforma de contratos de predicción PrediMarket." />
        <link rel="canonical" href="https://predimarket.vercel.app/stats" />
      </Head>

      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, -apple-system, sans-serif', fontSize: 14, display: 'flex', flexDirection: 'column' }}>
        <header style={{ borderBottom: `1px solid ${C.divider}`, background: C.bgBackdrop, position: 'sticky', top: 0, zIndex: 40, backdropFilter: 'blur(24px)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <div style={{ width: 26, height: 26, background: C.accent, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>P</div>
              <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em', color: C.text }}>PrediMarket</span>
            </Link>
            <nav style={{ display: 'flex', gap: 2 }}>
              {NAV.map(({ href, label }) => (
                <Link key={href} href={href} style={{ padding: '5px 10px', borderRadius: 5, fontSize: 12, color: href === '/stats' ? C.text : C.textDim, fontWeight: href === '/stats' ? 600 : 400, textDecoration: 'none', background: href === '/stats' ? C.cardBorder : 'transparent' }}>
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px', flex: 1, width: '100%' }}>
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.04em', color: C.text }}>Estadísticas de la plataforma</h1>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: C.yes, background: `${C.yes}15`, border: `1px solid ${C.yes}30`, padding: '2px 8px', borderRadius: 4 }}>LIVE</span>
            </div>
            <p style={{ fontSize: 13, color: C.textDim }}>Métricas en tiempo real de PrediMarket — fase de pruebas, saldos virtuales</p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: C.textDim, fontSize: 13 }}>Cargando métricas...</div>
          ) : (
            <>
              {/* KPIs principales */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
                <KPI label="Mercados activos" value={activeMarkets.length} sub={`${markets.length} total`} color={C.accent} />
                <KPI label="Mercados resueltos" value={resolvedMarkets.length} sub="con resultado final" color={C.yes} />
                <KPI label="Operaciones totales" value={trades.length} sub={`${openTrades.length} abiertas`} />
                <KPI label="Volumen total" value={`€${totalVolume.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`} sub="en contratos" />
                <KPI label="Usuarios" value={users.length} sub="registrados" />
                {winRate !== null && <KPI label="Win rate global" value={`${winRate}%`} sub="operaciones cerradas" />}
              </div>

              {/* Distribución por categoría */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 40 }}>
                <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: '20px 24px' }}>
                  <SectionTitle>Mercados por categoría</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {Object.entries(byCategory).sort(([, a], [, b]) => b - a).map(([cat, count]) => {
                      const pct = Math.round((count / markets.length) * 100)
                      return (
                        <div key={cat}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: C.textMuted }}>{cat}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{count} ({pct}%)</span>
                          </div>
                          <div style={{ height: 4, background: C.surface, borderRadius: 2 }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: C.accent, borderRadius: 2, transition: 'width 0.6s ease' }} />
                          </div>
                        </div>
                      )
                    })}
                    {Object.keys(byCategory).length === 0 && (
                      <div style={{ fontSize: 13, color: C.textDim, padding: '12px 0' }}>Sin datos</div>
                    )}
                  </div>
                </div>

                {/* Volumen últimos 7 días */}
                <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: '20px 24px' }}>
                  <SectionTitle>Volumen diario (últimos 7 días)</SectionTitle>
                  {last7Days.length > 0 ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 100 }}>
                      {last7Days.map(([day, vol]) => {
                        const h = Math.max(Math.round((vol / maxDayVol) * 100), 4)
                        return (
                          <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <div title={`€${vol.toFixed(0)}`} style={{ width: '100%', height: h, background: C.accent, borderRadius: 3, opacity: 0.85 }} />
                            <div style={{ fontSize: 9, color: C.textDim, transform: 'rotate(-30deg)', transformOrigin: 'center', whiteSpace: 'nowrap' }}>
                              {day.slice(5)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: C.textDim, padding: '12px 0' }}>Sin datos de volumen</div>
                  )}
                </div>
              </div>

              {/* Tabla de mercados */}
              <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: '20px 24px', marginBottom: 40, overflowX: 'auto' }}>
                <SectionTitle>Mercados activos</SectionTitle>
                {activeMarkets.length === 0 ? (
                  <div style={{ fontSize: 13, color: C.textDim, padding: '12px 0' }}>No hay mercados activos</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.divider}` }}>
                        {['Mercado', 'Categoría', 'Prob. SÍ', 'Pool SÍ', 'Pool NO', 'Volumen', 'Cierre'].map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.textDim, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeMarkets.map((m, i) => {
                        const yes = m.yes_pool || 5000
                        const no = m.no_pool || 5000
                        const prob = Math.round((no / (yes + no)) * 100)
                        return (
                          <tr key={m.id} style={{ borderBottom: `1px solid ${C.divider}`, background: i % 2 === 0 ? 'transparent' : `${C.surface}40` }}>
                            <td style={{ padding: '10px 10px', color: C.text, maxWidth: 260 }}>
                              <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</span>
                            </td>
                            <td style={{ padding: '10px 10px', whiteSpace: 'nowrap' }}>
                              <span style={{ fontSize: 10, fontWeight: 600, color: C.accent, background: `${C.accent}10`, padding: '2px 6px', borderRadius: 3 }}>{m.category}</span>
                            </td>
                            <td style={{ padding: '10px 10px', fontWeight: 700, color: prob > 50 ? C.yes : C.no, fontFamily: 'ui-monospace, monospace' }}>{prob}%</td>
                            <td style={{ padding: '10px 10px', color: C.textDim, fontFamily: 'ui-monospace, monospace' }}>{yes.toFixed(0)}</td>
                            <td style={{ padding: '10px 10px', color: C.textDim, fontFamily: 'ui-monospace, monospace' }}>{no.toFixed(0)}</td>
                            <td style={{ padding: '10px 10px', color: C.textMuted, fontFamily: 'ui-monospace, monospace' }}>€{(m.total_volume || 0).toFixed(0)}</td>
                            <td style={{ padding: '10px 10px', color: C.textDim, whiteSpace: 'nowrap', fontSize: 11 }}>{m.close_date ? new Date(m.close_date).toLocaleDateString('es-ES') : '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Últimos usuarios */}
              <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: '20px 24px' }}>
                <SectionTitle>Últimos usuarios registrados</SectionTitle>
                {users.length === 0 ? (
                  <div style={{ fontSize: 13, color: C.textDim }}>Sin usuarios registrados</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {users.slice(0, 10).map((u, i) => (
                      <div key={u.user_email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < Math.min(users.length, 10) - 1 ? `1px solid ${C.divider}` : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${C.accent}15`, border: `1px solid ${C.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: C.accent }}>
                            {(u.display_name || u.user_email || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{u.display_name || u.user_email?.split('@')[0]}</div>
                            <div style={{ fontSize: 10, color: C.textDim }}>{u.user_email}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.accentLight, fontFamily: 'ui-monospace, monospace' }}>
                          €{parseFloat(u.balance || 0).toFixed(0)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Nota regulatoria */}
              <div style={{ marginTop: 32, padding: '14px 20px', background: `${C.accent}06`, border: `1px solid ${C.accent}15`, borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.6 }}>
                  <strong style={{ color: C.textMuted }}>Nota para evaluadores CNMV:</strong> Este dashboard muestra métricas de la fase de pruebas de PrediMarket. Todos los saldos son virtuales. No se ha procesado dinero real. La plataforma está pendiente de evaluación regulatoria y no está autorizada como entidad de servicios de inversión.
                </div>
              </div>
            </>
          )}
        </main>

        <Footer />
      </div>
    </>
  )
}
