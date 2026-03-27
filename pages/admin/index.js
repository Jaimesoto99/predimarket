// ─── Admin Panel — Forsii ─────────────────────────────────────────────────────
//
// Access: /admin?key=<ADMIN_API_KEY>
// Shows pending review markets with approve/withdraw actions.

import { createClient } from '@supabase/supabase-js'
import { useState } from 'react'
import Head from 'next/head'

export async function getServerSideProps({ query }) {
  const key      = (query.key || '').trim()
  const expected = (process.env.ADMIN_API_KEY || '').trim()

  if (!expected || key !== expected) {
    return { props: { authorized: false, markets: [], key: '' } }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: markets } = await supabase
    .from('markets')
    .select('id, title, description, category, close_date, open_date, review_status, review_token, yes_pool, no_pool, oracle_type, resolution_source, status')
    .eq('review_status', 'pending_review')
    .order('open_date', { ascending: false })

  return {
    props: {
      authorized: true,
      markets:    markets || [],
      key,
    },
  }
}

export default function AdminPanel({ authorized, markets: initialMarkets, key: adminKey }) {
  const [markets, setMarkets]   = useState(initialMarkets)
  const [loading, setLoading]   = useState({})
  const [messages, setMessages] = useState({})

  if (!authorized) {
    return (
      <div style={styles.page}>
        <Head><title>Acceso denegado — Forsii Admin</title></Head>
        <div style={styles.card}>
          <h1 style={styles.h1}>⛔ Acceso denegado</h1>
          <p style={styles.muted}>Proporciona la clave de administrador en la URL: <code>/admin?key=...</code></p>
        </div>
      </div>
    )
  }

  async function handleAction(marketId, action) {
    setLoading(l => ({ ...l, [marketId]: true }))
    setMessages(m => ({ ...m, [marketId]: null }))

    try {
      const endpoint = action === 'approve' ? '/api/admin/approve-market' : '/api/admin/withdraw-market'
      const res = await fetch(endpoint, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'X-Admin-Key':   adminKey,
        },
        body: JSON.stringify({ market_id: marketId }),
      })
      const data = await res.json()

      if (res.ok) {
        setMarkets(ms => ms.filter(m => m.id !== marketId))
        setMessages(m => ({ ...m, [marketId]: { ok: true, text: action === 'approve' ? '✅ Mercado aprobado' : '❌ Mercado retirado' } }))
      } else {
        setMessages(m => ({ ...m, [marketId]: { ok: false, text: data.error || 'Error desconocido' } }))
      }
    } catch (err) {
      setMessages(m => ({ ...m, [marketId]: { ok: false, text: err.message } }))
    } finally {
      setLoading(l => ({ ...l, [marketId]: false }))
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleString('es-ES', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  function probPercent(market) {
    const yes = parseFloat(market.yes_pool) || 5000
    const no  = parseFloat(market.no_pool)  || 5000
    return Math.round(yes / (yes + no) * 100)
  }

  return (
    <div style={styles.page}>
      <Head>
        <title>Panel de Administración — Forsii</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>🛠 Panel de Administración</h1>
          <p style={styles.subtitle}>Forsii · Gestión de mercados</p>
        </div>

        {/* ── Pending review section ── */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Mercados pendientes de revisión</h2>
            {markets.length > 0 && (
              <span style={styles.badge}>{markets.length}</span>
            )}
          </div>

          {markets.length === 0 ? (
            <div style={styles.empty}>
              <p style={{ margin: 0, color: '#64748b' }}>✅ No hay mercados pendientes de revisión.</p>
            </div>
          ) : (
            <div style={styles.marketList}>
              {markets.map(market => (
                <div key={market.id} style={styles.marketCard}>
                  <div style={styles.marketTop}>
                    <div style={styles.marketMeta}>
                      <span style={styles.category}>{market.category}</span>
                      <span style={styles.reviewBadge}>PENDIENTE DE REVISIÓN</span>
                    </div>
                    <span style={styles.marketId}>#{market.id}</span>
                  </div>

                  <h3 style={styles.marketTitle}>{market.title}</h3>
                  <p style={styles.marketDesc}>{market.description}</p>

                  <div style={styles.details}>
                    <div style={styles.detail}>
                      <span style={styles.detailLabel}>Probabilidad implícita</span>
                      <span style={styles.detailValue}>{probPercent(market)}%</span>
                    </div>
                    <div style={styles.detail}>
                      <span style={styles.detailLabel}>Resolución</span>
                      <span style={styles.detailValue}>{formatDate(market.close_date)}</span>
                    </div>
                    <div style={styles.detail}>
                      <span style={styles.detailLabel}>Creado</span>
                      <span style={styles.detailValue}>{formatDate(market.open_date)}</span>
                    </div>
                    {market.oracle_type && (
                      <div style={styles.detail}>
                        <span style={styles.detailLabel}>Oráculo</span>
                        <span style={styles.detailValue}>{market.oracle_type}</span>
                      </div>
                    )}
                    {market.resolution_source && (
                      <div style={styles.detail}>
                        <span style={styles.detailLabel}>Fuente</span>
                        <a href={market.resolution_source} target="_blank" rel="noopener noreferrer" style={styles.link}>
                          🔗 Ver fuente
                        </a>
                      </div>
                    )}
                  </div>

                  {messages[market.id] && (
                    <p style={{ ...styles.message, color: messages[market.id].ok ? '#16a34a' : '#dc2626' }}>
                      {messages[market.id].text}
                    </p>
                  )}

                  <div style={styles.actions}>
                    <button
                      onClick={() => handleAction(market.id, 'approve')}
                      disabled={loading[market.id]}
                      style={{ ...styles.btn, ...styles.btnApprove }}
                    >
                      {loading[market.id] ? '...' : '✅ APROBAR MERCADO'}
                    </button>
                    <button
                      onClick={() => handleAction(market.id, 'withdraw')}
                      disabled={loading[market.id]}
                      style={{ ...styles.btn, ...styles.btnWithdraw }}
                    >
                      {loading[market.id] ? '...' : '❌ RETIRAR MERCADO'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

const styles = {
  page: {
    margin: 0,
    padding: '32px 16px',
    background: '#f1f5f9',
    minHeight: '100vh',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    boxSizing: 'border-box',
  },
  container: {
    maxWidth: 860,
    margin: '0 auto',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    margin: '0 0 4px',
    fontSize: 28,
    fontWeight: 800,
    color: '#0f172a',
  },
  subtitle: {
    margin: 0,
    fontSize: 14,
    color: '#64748b',
  },
  section: {
    background: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
  },
  sectionTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 700,
    color: '#1e293b',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    background: '#f59e0b',
    color: '#fff',
    borderRadius: '50%',
    fontSize: 12,
    fontWeight: 700,
  },
  empty: {
    padding: '40px 24px',
    textAlign: 'center',
  },
  marketList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  marketCard: {
    padding: '24px',
    borderBottom: '1px solid #f1f5f9',
  },
  marketTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  marketMeta: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  category: {
    display: 'inline-block',
    padding: '2px 8px',
    background: '#ede9fe',
    color: '#7c3aed',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  reviewBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    background: '#fef3c7',
    color: '#92400e',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.03em',
  },
  marketId: {
    fontSize: 12,
    color: '#94a3b8',
  },
  marketTitle: {
    margin: '0 0 8px',
    fontSize: 16,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.4,
  },
  marketDesc: {
    margin: '0 0 16px',
    fontSize: 13,
    color: '#475569',
    lineHeight: 1.6,
  },
  details: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px 24px',
    marginBottom: 16,
    padding: '12px 16px',
    background: '#f8fafc',
    borderRadius: 8,
  },
  detail: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  detailLabel: {
    fontSize: 11,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1e293b',
  },
  link: {
    fontSize: 13,
    color: '#3b82f6',
    textDecoration: 'none',
  },
  message: {
    margin: '0 0 12px',
    fontSize: 14,
    fontWeight: 600,
  },
  actions: {
    display: 'flex',
    gap: 10,
  },
  btn: {
    padding: '10px 20px',
    borderRadius: 8,
    border: 'none',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.02em',
    transition: 'opacity 0.15s',
  },
  btnApprove: {
    background: '#16a34a',
    color: '#fff',
  },
  btnWithdraw: {
    background: '#dc2626',
    color: '#fff',
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '40px 48px',
    maxWidth: 480,
    margin: '80px auto',
    textAlign: 'center',
    boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
  },
  h1: {
    margin: '0 0 16px',
    fontSize: 22,
    color: '#1e293b',
  },
  muted: {
    margin: 0,
    fontSize: 14,
    color: '#64748b',
  },
}
