// ─── Admin Panel — Forsii ─────────────────────────────────────────────────────
//
// Access: /admin?key=<ADMIN_API_KEY>
// Shows pending review markets with approve/withdraw actions.
// When ?market_id=X is also present, shows oracle calibration panel for that market.

import { createClient } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'
import Head from 'next/head'

export async function getServerSideProps({ query }) {
  const key      = (query.key || '').trim()
  const expected = (process.env.ADMIN_API_KEY || '').trim()

  if (!expected || key !== expected) {
    return { props: { authorized: false, markets: [], focusedMarket: null, adminKey: '' } }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: markets } = await supabase
    .from('markets')
    .select('id, title, description, category, close_date, open_date, review_status, review_token, yes_pool, no_pool, resolution_source, status, market_rating, market_ficha')
    .eq('review_status', 'pending_review')
    .order('open_date', { ascending: false })

  // Focused market (from email link — may or may not be pending_review)
  let focusedMarket = null
  const focusedId = query.market_id ? parseInt(query.market_id) : null
  if (focusedId) {
    const { data: fm } = await supabase
      .from('markets')
      .select('id, title, description, category, close_date, open_date, review_status, yes_pool, no_pool, resolution_source, market_rating, market_ficha')
      .eq('id', focusedId)
      .single()
    focusedMarket = fm || null
  }

  return {
    props: {
      authorized:    true,
      markets:       markets || [],
      focusedMarket: focusedMarket,
      adminKey:      key,
    },
  }
}

// ─── Rating badge + breakdown (client-side) ───────────────────────────────────

function RatingBadge({ rating }) {
  const [open, setOpen] = useState(false)
  if (!rating) return null

  const score  = rating.score
  const color  = score >= 9 ? '#b45309' : score >= 7 ? '#15803d' : score >= 4 ? '#b45309' : '#dc2626'
  const bg     = score >= 9 ? '#fef3c7' : score >= 7 ? '#dcfce7' : score >= 4 ? '#fffbeb' : '#fee2e2'
  const label  = score >= 9 ? '🥇 Excelente' : score >= 7 ? '✅ Bueno' : score >= 4 ? '⚠️ Aceptable' : '❌ Bajo'

  const bd = rating.breakdown || {}
  const allScores = [
    { name: 'Relevancia noticias', val: bd.NEWS_RELEVANCE       ?? 0 },
    { name: 'Polarización',        val: bd.POLARIZATION         ?? 0 },
    { name: 'Conexión emocional',  val: bd.EMOTIONAL_CONNECTION ?? 0 },
    { name: 'Resolución objetiva', val: bd.OBJECTIVE_RESOLUTION ?? 0 },
    { name: 'Plazo',               val: bd.TIMEFRAME            ?? 0 },
    { name: 'Calibración',         val: bd.CALIBRATION          ?? 0 },
    { name: 'Simplicidad',         val: bd.SIMPLICITY           ?? 0 },
    { name: 'Factor viral',        val: bd.BAR_FACTOR           ?? 0 },
    { name: 'Categoría',           val: bd.CATEGORY_POPULARITY  ?? 0 },
    { name: 'Actualidad',          val: bd.SEASONALITY          ?? 0 },
  ]

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ background: bg, color, padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
          ⭐ {score}/10 — {label}
        </span>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>
          E:{rating.engagement} · Q:{rating.quality} · V:{rating.viral}
        </span>
        <button
          onClick={() => setOpen(o => !o)}
          style={{ fontSize: 11, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
        >
          {open ? 'Ocultar desglose' : 'Ver desglose'}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 10, padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px' }}>
            {allScores.map(s => (
              <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#475569' }}>{s.name}</span>
                <span style={{ fontWeight: 700, color: s.val >= 7 ? '#15803d' : s.val >= 4 ? '#b45309' : '#dc2626' }}>{s.val}</span>
              </div>
            ))}
          </div>
          {(rating.trending_matches || []).length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Titulares coincidentes</p>
              {rating.trending_matches.map((m, i) => (
                <p key={i} style={{ margin: '2px 0', fontSize: 12, color: '#475569' }}>
                  📰 {m.title} <span style={{ color: '#94a3b8' }}>({m.source})</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Ficha Técnica expandable ─────────────────────────────────────────────────

function FichaTecnica({ market }) {
  const [open, setOpen] = useState(false)
  const ficha = market.market_ficha
  if (!ficha && market.review_status !== 'approved') return null

  const rows = ficha ? [
    ['Nombre oficial',     ficha.market_name],
    ['Categoría',          ficha.category],
    ['Subyacente',         ficha.underlying],
    ['Fuente de resolución', ficha.source_agency],
    ['URL fuente',         ficha.resolution_source_url ? <a href={ficha.resolution_source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', fontSize: 12 }}>🔗 {ficha.resolution_source_url}</a> : '—'],
    ['Criterio de resolución', ficha.resolution_criteria],
    ['Vencimiento',        ficha.expiration_date ? new Date(ficha.expiration_date).toLocaleString('es-ES') : '—'],
    ['Liquidación',        ficha.settlement],
    ['Fecha de creación',  ficha.creation_date ? new Date(ficha.creation_date).toLocaleString('es-ES') : '—'],
    ['Puntuación oráculo', ficha.oracle_rating_at_approval != null ? `${ficha.oracle_rating_at_approval}/10` : '—'],
    ['Estado revisión',    ficha.review_status],
    ['Fecha de aprobación', ficha.approval_date ? new Date(ficha.approval_date).toLocaleString('es-ES') : '—'],
    ['Límite de posición', ficha.position_limit || 'Sin límite'],
    ['Participantes excluidos', ficha.prohibited_participants || 'Ninguno'],
  ] : []

  return (
    <div style={{ marginBottom: 16 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ fontSize: 12, color: '#6366f1', background: 'none', border: '1px solid #e0e7ff', borderRadius: 6, cursor: 'pointer', padding: '5px 12px', fontWeight: 600 }}
      >
        {open ? '▲ Ocultar ficha técnica' : '📋 Ver ficha técnica'}
      </button>

      {open && (
        <div style={{ marginTop: 10, padding: '14px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#94a3b8' }}>
            Ficha Técnica — Forsii Market Specification
          </p>
          {ficha ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <tbody>
                {rows.map(([label, val]) => (
                  <tr key={label} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '5px 8px 5px 0', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', width: '40%', verticalAlign: 'top' }}>{label}</td>
                    <td style={{ padding: '5px 0', color: '#1e293b', wordBreak: 'break-word' }}>{val || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
              La ficha se genera automáticamente al aprobar el mercado.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Calibration panel (client-side) ─────────────────────────────────────────

function CalibrationPanel({ market, adminKey }) {
  const [priceData, setPriceData]     = useState(null)
  const [loading, setLoading]         = useState(true)
  const [sliderValue, setSliderValue] = useState(null)
  const [saving, setSaving]           = useState(false)
  const [result, setResult]           = useState(null)

  useEffect(() => {
    setLoading(true)
    setResult(null)
    fetch(`/api/admin/live-price?market_id=${market.id}&key=${adminKey}`)
      .then(r => r.json())
      .then(d => {
        setPriceData(d)
        // Default slider to oracle's proposed threshold, snapped to step
        if (d.threshold != null && d.sliderStep != null) {
          const step    = d.sliderStep
          const snapped = Math.round(d.threshold / step) * step
          setSliderValue(Math.max(d.sliderMin, Math.min(d.sliderMax, snapped)))
        }
      })
      .catch(() => setPriceData(null))
      .finally(() => setLoading(false))
  }, [market.id, adminKey])

  // Live deviation from slider
  const liveDeviation = (priceData?.currentPrice && sliderValue != null)
    ? ((sliderValue - priceData.currentPrice) / priceData.currentPrice * 100).toFixed(1)
    : null
  const liveDevNum    = liveDeviation != null ? parseFloat(liveDeviation) : null
  const liveDevAbs    = liveDevNum    != null ? Math.abs(liveDevNum)       : null
  const liveDevOk     = liveDevAbs    != null && liveDevAbs <= 8
  const liveDevColor  = liveDevAbs == null ? '#94a3b8' : liveDevOk ? '#16a34a' : '#dc2626'

  // Original oracle deviation (for display only)
  const origDev    = priceData?.deviation != null ? parseFloat(priceData.deviation) : null
  const origDevAbs = origDev != null ? Math.abs(origDev) : null
  const origDevOk  = origDevAbs != null && origDevAbs <= 8

  async function handleApproveWithThreshold() {
    setSaving(true)
    setResult(null)
    try {
      const original = priceData?.threshold
      const newThr   = sliderValue
      const changed  = newThr != null && original != null && Math.abs(newThr - original) > 0.01

      if (changed) {
        const upRes = await fetch(`/api/admin/update-market?key=${encodeURIComponent(adminKey)}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
          body:    JSON.stringify({ market_id: market.id, new_threshold: newThr }),
        })
        const upData = await upRes.json()
        if (!upRes.ok) {
          setResult({ ok: false, text: `Error al actualizar umbral: ${upData.error}` })
          setSaving(false)
          return
        }
      }

      const apRes = await fetch(`/api/admin/approve-market?key=${encodeURIComponent(adminKey)}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body:    JSON.stringify({ market_id: market.id }),
      })
      const apData = await apRes.json()
      if (!apRes.ok) {
        setResult({ ok: false, text: `Error al aprobar: ${apData.error}` })
        setSaving(false)
        return
      }

      setResult({
        ok: true,
        text: changed
          ? `✅ Umbral actualizado a ${sliderValue} ${priceData.unit} y mercado aprobado`
          : '✅ Mercado aprobado',
      })
    } catch (err) {
      setResult({ ok: false, text: err.message })
    }
    setSaving(false)
  }

  return (
    <div style={styles.calibBox}>
      <h4 style={styles.calibTitle}>🎯 Calibración del oráculo</h4>

      {loading && <p style={styles.calibMuted}>Obteniendo precio en tiempo real…</p>}

      {!loading && !priceData?.asset && (
        <p style={styles.calibMuted}>Este mercado no tiene un activo reconocido (IBEX, BTC, LUZ, BRENT).</p>
      )}

      {!loading && priceData?.asset && (
        <>
          {/* ── Price info box ── */}
          <div style={styles.calibPriceBox}>
            <div style={styles.calibPriceRow}>
              <span style={styles.calibLabel}>Precio actual según </span>
              {priceData.sourceUrl ? (
                <a href={priceData.sourceUrl} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
                  {priceData.sourceName ?? priceData.asset} ↗
                </a>
              ) : (
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6366f1' }}>{priceData.sourceName ?? priceData.asset}</span>
              )}
              <span style={styles.calibPriceValue}>
                {priceData.currentPrice != null
                  ? `${priceData.currentPriceFormatted} ${priceData.unit}`
                  : <span style={{ color: '#dc2626' }}>No disponible</span>
                }
              </span>
            </div>
            <div style={styles.calibPriceRow}>
              <span style={styles.calibLabel}>Umbral propuesto por el oráculo</span>
              <span style={styles.calibPriceValue}>
                {priceData.thresholdFormatted ?? '—'} {priceData.unit}
              </span>
            </div>
            <div style={styles.calibPriceRow}>
              <span style={styles.calibLabel}>Desviación original</span>
              <span style={{
                ...styles.calibPriceValue,
                color: origDevAbs == null ? '#94a3b8' : origDevOk ? '#16a34a' : '#dc2626',
                fontWeight: 700,
              }}>
                {origDev != null ? `${origDev > 0 ? '+' : ''}${origDev}%` : '—'}
                {origDevAbs != null && (
                  <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 6 }}>
                    {origDevOk ? '✓ bien calibrado' : '⚠ demasiado lejos'}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* ── Interactive slider ── */}
          {priceData.currentPrice != null && sliderValue != null && (
            <div style={styles.calibSliderBox}>
              <div style={styles.calibSliderHeader}>
                <span style={styles.calibLabel}>Ajustar umbral</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                  Rango ±10% del precio actual
                </span>
              </div>

              {/* Large value display */}
              <div style={styles.calibSliderValue}>
                <span style={styles.calibSliderNum}>
                  {sliderValue.toLocaleString('es-ES')}
                </span>
                <span style={styles.calibSliderUnit}> {priceData.unit}</span>
                {liveDeviation != null && (
                  <span style={{
                    marginLeft: 12, fontSize: 14, fontWeight: 700,
                    color: liveDevColor,
                    padding: '2px 10px', borderRadius: 12,
                    background: liveDevOk ? '#dcfce7' : liveDevAbs > 8 ? '#fee2e2' : '#f1f5f9',
                  }}>
                    {liveDevNum > 0 ? '+' : ''}{liveDeviation}%
                    {liveDevOk ? ' ✓' : liveDevAbs > 8 ? ' ⚠' : ''}
                  </span>
                )}
              </div>

              <input
                type="range"
                min={priceData.sliderMin}
                max={priceData.sliderMax}
                step={priceData.sliderStep}
                value={sliderValue}
                onChange={e => setSliderValue(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#6366f1', cursor: 'pointer', margin: '6px 0 4px' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
                <span>{priceData.sliderMin.toLocaleString('es-ES')}</span>
                <span style={{ color: '#6366f1', fontWeight: 600 }}>
                  precio actual: {priceData.currentPriceFormatted}
                </span>
                <span>{priceData.sliderMax.toLocaleString('es-ES')}</span>
              </div>

              {/* Step hint */}
              <p style={{ margin: '8px 0 0', fontSize: 11, color: '#94a3b8' }}>
                Paso: {priceData.sliderStep.toLocaleString('es-ES')} {priceData.unit}
                {sliderValue !== Math.round((priceData.threshold ?? 0) / priceData.sliderStep) * priceData.sliderStep && (
                  <span style={{ marginLeft: 8, color: '#f59e0b', fontWeight: 600 }}>
                    (umbral modificado desde {priceData.thresholdFormatted})
                  </span>
                )}
              </p>
            </div>
          )}

          {/* No price available — manual input fallback */}
          {priceData.currentPrice == null && (
            <div style={{ padding: '12px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, marginTop: 12 }}>
              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: '#92400e' }}>
                ⚠ Precio no disponible automáticamente
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#78350f' }}>
                Consulta el precio manualmente en{' '}
                {priceData.sourceUrl
                  ? <a href={priceData.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>{priceData.sourceName}</a>
                  : 'la fuente oficial'
                }{' '}
                y verifica que el umbral ({priceData.thresholdFormatted} {priceData.unit}) es razonable antes de aprobar.
              </p>
            </div>
          )}

          {result && (
            <p style={{ margin: '12px 0 4px', fontSize: 14, fontWeight: 600, color: result.ok ? '#16a34a' : '#dc2626' }}>
              {result.text}
            </p>
          )}

          <button
            onClick={handleApproveWithThreshold}
            disabled={saving}
            style={styles.calibApproveBtn}
          >
            {saving ? 'Procesando…' : '✅ APROBAR CON UMBRAL'}
          </button>
        </>
      )}
    </div>
  )
}

// ─── Main admin panel ─────────────────────────────────────────────────────────

export default function AdminPanel({ authorized, markets: initialMarkets, focusedMarket, adminKey: adminKeyProp }) {
  const [markets, setMarkets]   = useState(initialMarkets)
  const [loading, setLoading]   = useState({})
  const [messages, setMessages] = useState({})
  // Read key from URL as ground truth — props can be dropped by React internals
  const [adminKey, setAdminKey] = useState(adminKeyProp || '')
  useEffect(() => {
    const urlKey = typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('key') || '')
      : ''
    if (urlKey) setAdminKey(urlKey)
  }, [])

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
      const res = await fetch(`${endpoint}?key=${encodeURIComponent(adminKey)}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body:    JSON.stringify({ market_id: marketId }),
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

  const isFocusedPending = focusedMarket && markets.some(m => m.id === focusedMarket.id)

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

        {/* ── Focused market calibration panel (from email link) ── */}
        {focusedMarket && (
          <section style={{ ...styles.section, marginBottom: 24, borderLeft: '4px solid #6366f1' }}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>
                🔍 Mercado #{focusedMarket.id} — {focusedMarket.review_status === 'pending_review' ? 'Pendiente de revisión' : focusedMarket.review_status}
              </h2>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#0f172a' }}>{focusedMarket.title}</h3>
              <div style={{ marginBottom: 12 }}><RatingBadge rating={focusedMarket.market_rating} /></div>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{focusedMarket.description}</p>
              <FichaTecnica market={focusedMarket} />
              <CalibrationPanel market={focusedMarket} adminKey={adminKey} />
            </div>
          </section>
        )}

        {/* ── Pending review section ── */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Mercados pendientes de revisión</h2>
            {markets.length > 0 && <span style={styles.badge}>{markets.length}</span>}
          </div>

          {markets.length === 0 ? (
            <div style={styles.empty}>
              <p style={{ margin: 0, color: '#64748b' }}>✅ No hay mercados pendientes de revisión.</p>
            </div>
          ) : (
            <div style={styles.marketList}>
              {markets.map(market => (
                <div key={market.id} style={{
                  ...styles.marketCard,
                  ...(focusedMarket?.id === market.id ? { background: '#f5f3ff' } : {}),
                }}>
                  <div style={styles.marketTop}>
                    <div style={styles.marketMeta}>
                      <span style={styles.category}>{market.category}</span>
                      <span style={styles.reviewBadge}>PENDIENTE DE REVISIÓN</span>
                    </div>
                    <span style={styles.marketId}>#{market.id}</span>
                  </div>

                  <h3 style={styles.marketTitle}>{market.title}</h3>
                  <RatingBadge rating={market.market_rating} />
                  <p style={styles.marketDesc}>{market.description}</p>
                  <FichaTecnica market={market} />

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
                    {market.resolution_source && (
                      <div style={styles.detail}>
                        <span style={styles.detailLabel}>Fuente</span>
                        <a href={market.resolution_source} target="_blank" rel="noopener noreferrer" style={styles.link}>
                          🔗 Ver fuente
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Calibration panel for each pending market */}
                  <CalibrationPanel market={market} adminKey={adminKey} />

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
                      {loading[market.id] ? '...' : '✅ APROBAR'}
                    </button>
                    <button
                      onClick={() => handleAction(market.id, 'withdraw')}
                      disabled={loading[market.id]}
                      style={{ ...styles.btn, ...styles.btnWithdraw }}
                    >
                      {loading[market.id] ? '...' : '❌ RETIRAR'}
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
    margin: 0, padding: '32px 16px', background: '#f1f5f9', minHeight: '100vh',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    boxSizing: 'border-box',
  },
  container:    { maxWidth: 900, margin: '0 auto' },
  header:       { marginBottom: 32 },
  title:        { margin: '0 0 4px', fontSize: 28, fontWeight: 800, color: '#0f172a' },
  subtitle:     { margin: 0, fontSize: 14, color: '#64748b' },
  section:      { background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
  sectionHeader:{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 24px', borderBottom: '1px solid #e2e8f0' },
  sectionTitle: { margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' },
  badge:        { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, background: '#f59e0b', color: '#fff', borderRadius: '50%', fontSize: 12, fontWeight: 700 },
  empty:        { padding: '40px 24px', textAlign: 'center' },
  marketList:   { display: 'flex', flexDirection: 'column', gap: 0 },
  marketCard:   { padding: '24px', borderBottom: '1px solid #f1f5f9' },
  marketTop:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  marketMeta:   { display: 'flex', gap: 8, alignItems: 'center' },
  category:     { display: 'inline-block', padding: '2px 8px', background: '#ede9fe', color: '#7c3aed', borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' },
  reviewBadge:  { display: 'inline-block', padding: '2px 8px', background: '#fef3c7', color: '#92400e', borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: '0.03em' },
  marketId:     { fontSize: 12, color: '#94a3b8' },
  marketTitle:  { margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#0f172a', lineHeight: 1.4 },
  marketDesc:   { margin: '0 0 16px', fontSize: 13, color: '#475569', lineHeight: 1.6 },
  details:      { display: 'flex', flexWrap: 'wrap', gap: '12px 24px', marginBottom: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 8 },
  detail:       { display: 'flex', flexDirection: 'column', gap: 2 },
  detailLabel:  { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' },
  detailValue:  { fontSize: 14, fontWeight: 600, color: '#1e293b' },
  link:         { fontSize: 13, color: '#3b82f6', textDecoration: 'none' },
  message:      { margin: '0 0 12px', fontSize: 14, fontWeight: 600 },
  actions:      { display: 'flex', gap: 10, marginTop: 16 },
  btn:          { padding: '10px 20px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em' },
  btnApprove:   { background: '#16a34a', color: '#fff' },
  btnWithdraw:  { background: '#dc2626', color: '#fff' },
  card:         { background: '#fff', borderRadius: 12, padding: '40px 48px', maxWidth: 480, margin: '80px auto', textAlign: 'center', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' },
  h1:           { margin: '0 0 16px', fontSize: 22, color: '#1e293b' },
  muted:        { margin: 0, fontSize: 14, color: '#64748b' },
  // Calibration panel
  calibBox:        { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', marginBottom: 16 },
  calibTitle:      { margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#1e293b' },
  calibMuted:      { margin: 0, fontSize: 13, color: '#94a3b8' },
  calibLabel:      { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' },
  calibPriceBox:   { display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 14 },
  calibPriceRow:   { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  calibPriceValue: { fontSize: 14, fontWeight: 700, color: '#0f172a', marginLeft: 'auto' },
  calibSliderBox:  { padding: '14px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 14 },
  calibSliderHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  calibSliderValue:  { display: 'flex', alignItems: 'baseline', gap: 0, marginBottom: 6 },
  calibSliderNum:    { fontSize: 32, fontWeight: 800, color: '#0f172a', lineHeight: 1 },
  calibSliderUnit:   { fontSize: 14, color: '#94a3b8', fontWeight: 400 },
  calibApproveBtn:   { marginTop: 14, padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
}
