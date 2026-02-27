import { useEffect, useState } from 'react'
import { getActiveMarkets, getOrCreateUser, createTrade, getUserTrades, getPriceHistory, sellPosition } from '../lib/supabase'
import { previewTrade, previewSellValue, calculatePrices } from '../lib/amm'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [email, setEmail] = useState('')
  const [selectedMarket, setSelectedMarket] = useState(null)
  const [tradeSide, setTradeSide] = useState('YES')
  const [tradeAmount, setTradeAmount] = useState(10)
  const [showTradeModal, setShowTradeModal] = useState(false)
  const [showPortfolio, setShowPortfolio] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [userTrades, setUserTrades] = useState([])
  const [priceHistory, setPriceHistory] = useState([])
  const [tradeImpact, setTradeImpact] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [recentActivity, setRecentActivity] = useState([])
  const [filter, setFilter] = useState('ALL')
  
  const C = {
    bg: '#09090b', card: '#18181b', cardBorder: '#27272a', cardHover: '#7c3aed',
    accent: '#8b5cf6', accentLight: '#a78bfa', accentDark: '#6d28d9',
    yes: '#34d399', yesBg: 'rgba(52,211,153,0.08)', yesBorder: 'rgba(52,211,153,0.18)',
    no: '#f87171', noBg: 'rgba(248,113,113,0.08)', noBorder: 'rgba(248,113,113,0.18)',
    text: '#fafafa', textMuted: '#a1a1aa', textDim: '#71717a',
    surface: '#0f0f12', warning: '#fbbf24',
  }

  function getOracleDescription(market) {
    const t = (market.title || '').toLowerCase()
    if (t.includes('ibex')) return { source: 'Yahoo Finance — IBEX 35', url: 'https://finance.yahoo.com/quote/%5EIBEX/', method: 'Se resuelve SÍ si el IBEX 35 cierra con variación positiva respecto a la apertura en BME. Dato verificable tras las 17:35h.' }
    if (t.includes('luz') || t.includes('mwh')) return { source: 'OMIE / preciodelaluz.org', url: 'https://www.preciodelaluz.org', method: 'Se resuelve SÍ si el precio medio del pool eléctrico diario supera el umbral indicado (€/MWh). Dato publicado por OMIE.' }
    if (t.includes('grados') || t.includes('temperatura') || t.includes('°c')) return { source: 'Open-Meteo (AEMET)', url: 'https://open-meteo.com', method: 'Se resuelve SÍ si la temperatura máxima en alguna capital de provincia española supera el umbral. Fuente: estaciones AEMET vía Open-Meteo.' }
    if (t.includes('trending') || t.includes('sánchez') || t.includes('sanchez') || t.includes('topic')) return { source: 'Google News RSS', url: 'https://news.google.com', method: 'Se resuelve SÍ si el término aparece en 5+ noticias españolas del día. Proxy de tendencias basado en cobertura mediática.' }
    if (t.includes('real madrid') || t.includes('barça') || t.includes('barcelona')) return { source: 'football-data.org', url: 'https://www.football-data.org', method: 'Se resuelve SÍ si el equipo gana su próximo partido oficial. Resultado final tras los 90 minutos (empate = NO).' }
    if (t.includes('ministro')) return { source: 'Google News RSS', url: 'https://news.google.com', method: 'Se resuelve SÍ si se detectan 3+ noticias sobre polémicas ministeriales en medios españoles durante el periodo.' }
    if (t.includes('vivienda') || t.includes('idealista')) return { source: 'INE / Idealista', url: 'https://www.idealista.com/informes/', method: 'Se resuelve al publicarse el dato mensual de Idealista o el trimestral del INE. Compara precio m² mes actual vs anterior.' }
    return { source: 'Fuente verificable', url: '', method: 'Resolución basada en datos oficiales públicos y verificables.' }
  }
  
  useEffect(() => {
    loadMarkets()
    const savedUser = localStorage.getItem('predi_user')
    if (savedUser) {
      const u = JSON.parse(savedUser)
      setUser(u)
      loadUserTrades(u.email)
    }
  }, [])
  
  useEffect(() => {
    if (selectedMarket && tradeAmount > 0) {
      const preview = previewTrade(tradeAmount, tradeSide, selectedMarket.yes_pool, selectedMarket.no_pool)
      setTradeImpact(preview)
    }
  }, [tradeAmount, tradeSide, selectedMarket])
  
  async function loadMarkets() {
    setLoading(true)
    const data = await getActiveMarkets()
    const withPrices = data.map(m => ({
      ...m,
      prices: calculatePrices(parseFloat(m.yes_pool), parseFloat(m.no_pool)),
      isExpired: new Date(m.close_date) < new Date()
    }))
    setMarkets(withPrices)
    setLoading(false)
  }
  
  async function loadUserTrades(email) {
    const data = await getUserTrades(email, true)
    const enriched = data.map(t => {
      const currentPrice = calculatePrices(parseFloat(t.markets.yes_pool), parseFloat(t.markets.no_pool))
      const currentValue = t.status === 'OPEN' ? previewSellValue(t.shares, t.side, parseFloat(t.markets.yes_pool), parseFloat(t.markets.no_pool)) : (t.sold_price || 0)
      const isExpired = new Date(t.markets.close_date) < new Date()
      return { ...t, currentPrice, currentValue, potentialPayout: t.shares, profit: currentValue - t.amount, isExpired }
    })
    setUserTrades(enriched)
  }
  
  async function loadRecentActivity(marketId) {
    const { data, error } = await supabase.from('recent_trades').select('*').eq('market_id', marketId).limit(20)
    if (!error && data) setRecentActivity(data)
  }
  
  async function loadPriceHistory(marketId) {
    const history = await getPriceHistory(marketId, 168)
    setPriceHistory(history)
  }
  
  async function handleLogin(e) {
    e.preventDefault()
    if (!email) return
    const result = await getOrCreateUser(email)
    if (!result.success) { alert(result.error || 'Error al crear usuario'); return }
    setUser(result.user)
    localStorage.setItem('predi_user', JSON.stringify(result.user))
    setShowAuth(false)
    setEmail('')
    loadUserTrades(result.user.email)
  }
  
  function handleLogout() { setUser(null); localStorage.removeItem('predi_user'); setUserTrades([]) }
  
  function openTradeModal(market) {
    if (!user) { setShowAuth(true); return }
    if (market.isExpired) { alert('Este mercado está cerrado — pendiente de resolución.'); return }
    setSelectedMarket(market)
    setShowTradeModal(true)
    loadPriceHistory(market.id)
    loadRecentActivity(market.id)
  }
  
  async function executeTrade() {
    if (!user || !selectedMarket || !tradeImpact || !tradeImpact.valid || processing) return
    setProcessing(true)
    const result = await createTrade(user.email, selectedMarket.id, tradeSide, tradeAmount)
    setProcessing(false)
    if (result.success) {
      setUser({ ...user, balance: result.new_balance })
      localStorage.setItem('predi_user', JSON.stringify({ ...user, balance: result.new_balance }))
      setShowTradeModal(false); setTradeAmount(10); loadUserTrades(user.email); loadMarkets()
      alert(`Posición abierta: ${result.shares.toFixed(1)} contratos ${tradeSide}\nCoste: ${tradeAmount} créditos\nRetorno si aciertas: ${result.shares.toFixed(2)}`)
    } else { alert(result.error) }
  }
  
  async function handleSell(trade) {
    if (trade.isExpired) { alert('Mercado expirado — pendiente resolución. No se puede vender.'); return }
    if (!confirm(`¿Vender ${trade.shares.toFixed(1)} contratos ${trade.side} por ~${trade.currentValue.toFixed(2)} créditos?\n(Fee 2% incluido)`)) return
    const result = await sellPosition(trade.id, user.email)
    if (result.success) {
      const nb = result.new_balance
      setUser({ ...user, balance: nb })
      localStorage.setItem('predi_user', JSON.stringify({ ...user, balance: nb }))
      loadUserTrades(user.email); loadMarkets()
      alert(`Vendido por ${(result.net_payout || result.sell_value || 0).toFixed(2)} créditos (fee: ${(result.fee || 0).toFixed(2)})`)
    } else { alert(result.error) }
  }
  
  function getTimeLeft(closeDate) {
    const diff = new Date(closeDate) - new Date()
    if (diff < 0) return 'Expirado'
    const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000)
    if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  function isExpired(d) { return new Date(d) < new Date() }

  function getTypeInfo(m) {
    const t = m.market_type
    if (t === 'FLASH' || t === 'DIARIO') return { label: '24h', icon: '⚡', color: C.warning }
    if (t === 'SHORT' || t === 'SEMANAL') return { label: '7d', icon: '📊', color: C.accentLight }
    if (t === 'LONG' || t === 'MENSUAL') return { label: 'Mes', icon: '🏛', color: '#a78bfa' }
    return { label: '', icon: '', color: C.textDim }
  }

  const filtered = markets.filter(m => {
    if (filter === 'ALL') return true
    const t = m.market_type
    if (filter === 'DIARIO') return t === 'FLASH' || t === 'DIARIO'
    if (filter === 'SEMANAL') return t === 'SHORT' || t === 'SEMANAL'
    if (filter === 'MENSUAL') return t === 'LONG' || t === 'MENSUAL'
    return true
  })

  const totalInvested = userTrades.filter(t => t.status === 'OPEN').reduce((s, t) => s + t.amount, 0)
  const totalPnL = userTrades.reduce((s, t) => s + (t.profit || 0), 0)
  const winRate = userTrades.filter(t => t.status === 'SOLD').length > 0
    ? (userTrades.filter(t => t.status === 'SOLD' && t.pnl > 0).length / userTrades.filter(t => t.status === 'SOLD').length * 100) : 0

  const S = {
    modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)', zIndex: 50, overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
    closeBtn: { width: 36, height: 36, borderRadius: 10, background: C.surface, border: `1px solid ${C.cardBorder}`, color: '#fff', cursor: 'pointer', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    panel: { background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 24 },
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 14 }}>
      
      {/* ===== HEADER ===== */}
      <header style={{ borderBottom: `1px solid ${C.cardBorder}`, background: `${C.bg}ee`, position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: C.accent, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff' }}>P</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>PrediMarket</div>
              <div style={{ fontSize: 9, color: C.textDim, fontWeight: 500, letterSpacing: '0.08em' }}>BETA</div>
            </div>
          </div>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => { setShowProfile(true); loadUserTrades(user.email) }} style={{ padding: '6px 12px', border: `1px solid ${C.cardBorder}`, borderRadius: 8, background: 'transparent', color: C.text, cursor: 'pointer', fontSize: 13 }}>👤</button>
              <button onClick={() => { setShowPortfolio(true); loadUserTrades(user.email) }} style={{ padding: '6px 12px', border: `1px solid ${C.cardBorder}`, borderRadius: 8, background: 'transparent', color: C.text, cursor: 'pointer', fontSize: 13 }}>
                📊 {userTrades.filter(t => t.status === 'OPEN').length > 0 && <span style={{ marginLeft: 4, background: C.accent, color: '#fff', padding: '1px 6px', borderRadius: 10, fontSize: 11 }}>{userTrades.filter(t => t.status === 'OPEN').length}</span>}
              </button>
              <div style={{ padding: '6px 12px', background: `${C.accent}15`, border: `1px solid ${C.accent}30`, borderRadius: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace' }}>€{user.balance.toFixed(0)}</span>
              </div>
              <button onClick={handleLogout} style={{ color: C.textDim, cursor: 'pointer', background: 'none', border: 'none', fontSize: 16 }}>✕</button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)} style={{ padding: '8px 20px', background: C.accent, borderRadius: 8, fontWeight: 700, fontSize: 14, color: '#fff', border: 'none', cursor: 'pointer' }}>Empezar</button>
          )}
        </div>
      </header>

      {/* ===== HERO ===== */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 16px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, marginBottom: 12, lineHeight: 1.15, letterSpacing: '-0.03em', color: '#fafafa' }}>
          Predice eventos <br />
          <span style={{ color: C.accentLight }}>verificables</span>
        </h2>
        <p style={{ fontSize: 15, color: C.textMuted, marginBottom: 20, maxWidth: 460, margin: '0 auto 20px', lineHeight: 1.5 }}>Mercados sobre indicadores económicos y actualidad española.</p>
        {!user && <button onClick={() => setShowAuth(true)} style={{ padding: '10px 24px', background: C.accent, borderRadius: 8, fontWeight: 600, fontSize: 14, color: '#fff', border: 'none', cursor: 'pointer' }}>Empieza con 1.000 créditos gratis</button>}
      </div>

      {/* ===== FILTERS ===== */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[['ALL','Todos'],['DIARIO','⚡ Diario'],['SEMANAL','📊 Semanal'],['MENSUAL','🏛 Mensual']].map(([f, label]) => {
          const count = f === 'ALL' ? markets.length : markets.filter(m => { const t = m.market_type; if (f === 'DIARIO') return t === 'FLASH' || t === 'DIARIO'; if (f === 'SEMANAL') return t === 'SHORT' || t === 'SEMANAL'; if (f === 'MENSUAL') return t === 'LONG' || t === 'MENSUAL'; return false }).length
          return <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: filter === f ? C.accent : C.card, color: filter === f ? '#fff' : C.textMuted }}>{label} <span style={{ opacity: 0.7, fontSize: 11 }}>{count}</span></button>
        })}
      </div>

      {/* ===== MARKET GRID ===== */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px 80px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: C.textMuted }}>Cargando mercados...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {filtered.map((m) => {
              const exp = m.isExpired
              const ti = getTypeInfo(m)
              const oracle = getOracleDescription(m)
              return (
                <div key={m.id} onClick={() => openTradeModal(m)} style={{ background: C.card, border: `1px solid ${exp ? '#27272a' : C.cardBorder}`, borderRadius: 12, padding: 20, cursor: 'pointer', transition: 'all 0.15s', opacity: exp ? 0.5 : 1 }}
                  onMouseEnter={e => { if (!exp) { e.currentTarget.style.borderColor = C.accent + '60'; e.currentTarget.style.background = '#1f1f23' } }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = exp ? '#27272a' : C.cardBorder; e.currentTarget.style.background = C.card }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', background: C.surface, color: C.textMuted, borderRadius: 6, fontWeight: 600 }}>{m.category}</span>
                      {ti.label && <span style={{ fontSize: 11, padding: '2px 8px', background: `${ti.color}15`, color: ti.color, borderRadius: 6, fontWeight: 600 }}>{ti.icon} {ti.label}</span>}
                    </div>
                    <span style={{ fontSize: 12, color: exp ? C.no : C.warning, fontWeight: 700 }}>{exp ? '🔒 Expirado' : `⏱ ${getTimeLeft(m.close_date)}`}</span>
                  </div>
                  <h4 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, lineHeight: 1.4, minHeight: 42, color: '#fff' }}>{m.title}</h4>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <div style={{ flex: 1, textAlign: 'center', padding: '10px 8px', background: C.yesBg, border: `1px solid ${C.yesBorder}`, borderRadius: 10 }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: C.yes }}>{m.prices.yes}¢</div>
                      <div style={{ fontSize: 11, color: C.yes, fontWeight: 600, opacity: 0.8 }}>SÍ</div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center', padding: '10px 8px', background: C.noBg, border: `1px solid ${C.noBorder}`, borderRadius: 10 }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: C.no }}>{m.prices.no}¢</div>
                      <div style={{ fontSize: 11, color: C.no, fontWeight: 600, opacity: 0.8 }}>NO</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.textDim, marginBottom: 8 }}>
                    <span>Vol: €{(m.total_volume / 1000).toFixed(1)}K</span>
                    <span>{m.active_traders || m.total_traders || 0} traders</span>
                  </div>
                  <div style={{ fontSize: 10, color: C.textDim, textAlign: 'center', marginBottom: 10 }}>📡 {oracle.source}</div>
                  <button style={{ width: '100%', padding: '9px 0', borderRadius: 8, fontWeight: 600, fontSize: 13, border: 'none', cursor: exp ? 'not-allowed' : 'pointer', background: exp ? '#27272a' : C.accent, color: exp ? C.textDim : '#fff', transition: 'all 0.15s' }}>
                    {exp ? '⏱ Pendiente resolución' : 'Predecir'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ===== AUTH MODAL ===== */}
      {showAuth && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ ...S.panel, maxWidth: 400, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>Empezar</h2>
              <button onClick={() => setShowAuth(false)} style={S.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleLogin}>
              <label style={{ display: 'block', fontSize: 13, color: C.textMuted, marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} placeholder="tu@email.com" required />
              <button type="submit" style={{ width: '100%', background: C.accent, color: '#fff', fontWeight: 700, padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 15 }}>Empezar con 1.000 créditos</button>
            </form>
            <div style={{ marginTop: 16, padding: 12, background: `${C.accent}10`, border: `1px solid ${C.accent}20`, borderRadius: 10 }}>
              <p style={{ fontSize: 12, color: C.accentLight, margin: 0 }}>💡 <strong>Créditos virtuales.</strong> Practica sin riesgo.</p>
            </div>
          </div>
        </div>
      )}

      {/* ===== TRADE MODAL ===== */}
      {showTradeModal && selectedMarket && (
        <div style={S.modal}>
          <div style={{ minHeight: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16 }}>
            <div style={{ ...S.panel, maxWidth: 700, width: '100%', margin: '20px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, lineHeight: 1.3 }}>{selectedMarket.title}</h2>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: isExpired(selectedMarket.close_date) ? C.no : C.warning, fontWeight: 600 }}>{isExpired(selectedMarket.close_date) ? '🔒 Expirado' : `⏱ ${getTimeLeft(selectedMarket.close_date)}`}</span>
                    <span style={{ fontSize: 12, color: C.textDim }}>{selectedMarket.category}</span>
                  </div>
                </div>
                <button onClick={() => setShowTradeModal(false)} style={{ ...S.closeBtn, marginLeft: 12 }}>✕</button>
              </div>

              {/* Oracle description */}
              {(() => {
                const oracle = getOracleDescription(selectedMarket)
                return (
                  <div style={{ marginBottom: 16, background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 11, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Oráculo de resolución</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.accentLight, marginBottom: 4 }}>{oracle.source}</div>
                    <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.4, marginBottom: oracle.url ? 6 : 0 }}>{oracle.method}</div>
                    {oracle.url && <a href={oracle.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: C.accent, textDecoration: 'none' }} onClick={e => e.stopPropagation()}>Ver fuente ↗</a>}
                  </div>
                )
              })()}
              
              {/* Chart */}
              {(() => {
                const rawPrices = priceHistory.map(p => parseFloat(p.yes_price))
                const currentPrice = parseFloat(selectedMarket.prices.yes)
                // Always start from 50% baseline + add current price
                const prices = rawPrices.length > 0 ? [50, ...rawPrices, currentPrice] : [50, currentPrice]
                if (prices.length < 2) return null
                const minP = Math.max(0, Math.min(...prices) - 3)
                const maxP = Math.min(100, Math.max(...prices) + 3)
                const range = maxP - minP || 1
                const first = prices[0], last = prices[prices.length - 1]
                const trend = last > first ? C.yes : last < first ? C.no : C.accent
                const firstTime = priceHistory.length > 0 ? priceHistory[0].created_at : selectedMarket.open_date
                const lastTime = priceHistory.length > 0 ? priceHistory[priceHistory.length - 1].created_at : new Date().toISOString()
                return (
                  <div style={{ marginBottom: 16, background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontSize: 12, color: C.textDim }}>Evolución del precio</div>
                      <div style={{ fontSize: 12 }}>
                        <span style={{ color: trend, fontWeight: 700 }}>{last.toFixed(1)}%</span>
                        <span style={{ color: C.textDim }}> SÍ</span>
                        <span style={{ color: C.textDim, marginLeft: 8, fontSize: 11 }}>({last > first ? '+' : ''}{(last - first).toFixed(1)})</span>
                      </div>
                    </div>
                    <div style={{ height: 140, position: 'relative' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, fontSize: 9, color: C.textDim }}>{maxP.toFixed(0)}%</div>
                      <div style={{ position: 'absolute', left: 0, bottom: 0, fontSize: 9, color: C.textDim }}>{minP.toFixed(0)}%</div>
                      {minP < 50 && maxP > 50 && (
                        <div style={{ position: 'absolute', left: 20, right: 0, top: `${((maxP - 50) / range) * 100}%`, borderTop: `1px dashed ${C.cardBorder}`, zIndex: 0 }}>
                          <span style={{ position: 'absolute', left: -18, top: -7, fontSize: 9, color: C.textDim }}>50</span>
                        </div>
                      )}
                      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ paddingLeft: 20 }}>
                        <polygon
                          points={`${0},100 ${prices.map((p, i) => `${(i / Math.max(prices.length - 1, 1)) * 100},${100 - ((p - minP) / range) * 100}`).join(' ')} ${100},100`}
                          fill={`${trend}15`} stroke="none"
                        />
                        <polyline
                          points={prices.map((p, i) => `${(i / Math.max(prices.length - 1, 1)) * 100},${100 - ((p - minP) / range) * 100}`).join(' ')}
                          fill="none" stroke={trend} strokeWidth="2.5" vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.textDim, marginTop: 4, paddingLeft: 20 }}>
                      <span>Inicio (50%)</span>
                      <span>Ahora ({currentPrice.toFixed(1)}%)</span>
                    </div>
                  </div>
                )
              })()}
              
              {!isExpired(selectedMarket.close_date) ? (
                <>
                  {/* YES/NO */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    {['YES','NO'].map(side => (
                      <button key={side} onClick={() => setTradeSide(side)} style={{ padding: '14px 8px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: tradeSide === side ? (side === 'YES' ? C.yes : C.no) : C.surface, color: tradeSide === side ? '#fff' : C.textMuted, boxShadow: tradeSide === side ? `0 4px 16px ${side === 'YES' ? C.yes : C.no}40` : 'none' }}>
                        <div style={{ fontSize: 24, marginBottom: 2 }}>{side === 'YES' ? selectedMarket.prices.yes : selectedMarket.prices.no}¢</div>
                        <div style={{ fontSize: 11 }}>{side === 'YES' ? 'SÍ' : 'NO'}</div>
                      </button>
                    ))}
                  </div>
                  {/* Amount */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Cantidad (créditos)</label>
                    <input type="number" value={tradeAmount} onChange={e => setTradeAmount(Math.max(1, Number(e.target.value)))} style={{ width: '100%', background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 18, fontWeight: 700, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }} min="1" max={user?.balance || 1000} />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 8 }}>
                      {[10, 25, 50, 100].map(v => <button key={v} onClick={() => setTradeAmount(v)} style={{ padding: '6px 0', fontSize: 13, background: C.surface, color: C.textMuted, borderRadius: 8, border: `1px solid ${C.cardBorder}`, cursor: 'pointer', fontWeight: 600 }}>{v}</button>)}
                    </div>
                  </div>
                  {/* Summary */}
                  <div style={{ background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Resumen</div>
                    {tradeImpact && tradeImpact.valid ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 13, color: C.textMuted }}>Contratos</span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{tradeImpact.shares.toFixed(1)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 13, color: C.textMuted }}>Precio medio</span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>€{tradeImpact.avgPrice.toFixed(3)}</span>
                        </div>
                        <div style={{ borderTop: `1px solid ${C.cardBorder}`, paddingTop: 10, marginTop: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, color: C.textMuted }}>Si aciertas</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: C.yes, fontSize: 18 }}>€{tradeImpact.potentialWinnings.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Retorno</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: tradeImpact.potentialProfit > 0 ? C.yes : C.no }}>{tradeImpact.potentialProfit > 0 ? '+' : ''}{tradeImpact.potentialProfit.toFixed(2)}€ ({tradeImpact.roi > 0 ? '+' : ''}{tradeImpact.roi.toFixed(0)}%)</span>
                          </div>
                        </div>
                      </div>
                    ) : <div style={{ fontSize: 13, color: C.no }}>{tradeImpact?.error || 'Calculando...'}</div>}
                  </div>
                  {/* Execute */}
                  <button onClick={executeTrade} disabled={!tradeImpact || !tradeImpact.valid || tradeAmount > (user?.balance || 0) || processing}
                    style={{ width: '100%', padding: '14px 0', borderRadius: 12, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', background: (!tradeImpact || !tradeImpact.valid || tradeAmount > (user?.balance || 0) || processing) ? '#374151' : (tradeSide === 'YES' ? C.yes : C.no), color: (!tradeImpact || !tradeImpact.valid || tradeAmount > (user?.balance || 0) || processing) ? C.textDim : '#fff' }}>
                    {processing ? 'Procesando...' : !tradeImpact ? 'Calculando...' : !tradeImpact.valid ? tradeImpact.error : tradeAmount > (user?.balance || 0) ? 'Saldo insuficiente' : `Predecir ${tradeSide === 'YES' ? 'SÍ' : 'NO'} — ${tradeAmount} créditos`}
                  </button>
                </>
              ) : (
                <div style={{ padding: 20, background: `${C.no}10`, border: `1px solid ${C.no}25`, borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>🔒</div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Mercado cerrado</div>
                  <div style={{ fontSize: 13, color: C.textMuted }}>Pendiente de resolución automática por el oráculo.</div>
                </div>
              )}
              
              {/* Liquidity / Order Book */}
              {selectedMarket && (
                <div style={{ marginTop: 20, background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Liquidez del mercado</div>
                  {/* Pool visualization */}
                  {(() => {
                    const yesPool = parseFloat(selectedMarket.yes_pool)
                    const noPool = parseFloat(selectedMarket.no_pool)
                    const total = yesPool + noPool
                    const yesPct = (yesPool / total * 100).toFixed(1)
                    const noPct = (noPool / total * 100).toFixed(1)
                    return (
                      <div>
                        <div style={{ display: 'flex', gap: 2, marginBottom: 12, height: 8, borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${yesPct}%`, background: C.yes, borderRadius: '4px 0 0 4px', transition: 'width 0.3s' }} />
                          <div style={{ width: `${noPct}%`, background: C.no, borderRadius: '0 4px 4px 0', transition: 'width 0.3s' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div style={{ background: C.yesBg, border: `1px solid ${C.yesBorder}`, borderRadius: 8, padding: 12, textAlign: 'center' }}>
                            <div style={{ fontSize: 10, color: C.yes, marginBottom: 4, fontWeight: 600 }}>POOL SÍ</div>
                            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'monospace', color: C.yes }}>€{yesPool.toFixed(0)}</div>
                            <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{yesPct}% del total</div>
                          </div>
                          <div style={{ background: C.noBg, border: `1px solid ${C.noBorder}`, borderRadius: 8, padding: 12, textAlign: 'center' }}>
                            <div style={{ fontSize: 10, color: C.no, marginBottom: 4, fontWeight: 600 }}>POOL NO</div>
                            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'monospace', color: C.no }}>€{noPool.toFixed(0)}</div>
                            <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{noPct}% del total</div>
                          </div>
                        </div>
                        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.textDim }}>
                          <span>Pool total: €{total.toFixed(0)}</span>
                          <span>Vol: €{parseFloat(selectedMarket.total_volume).toFixed(0)}</span>
                        </div>
                      </div>
                    )
                  })()}
                  {/* Recent trades below */}
                  {recentActivity.length > 0 && (
                    <div style={{ marginTop: 14, borderTop: `1px solid ${C.cardBorder}`, paddingTop: 12 }}>
                      <div style={{ fontSize: 10, color: C.textDim, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Últimas operaciones</div>
                      <div style={{ maxHeight: 140, overflowY: 'auto' }}>
                        {recentActivity.slice(0, 10).map((a, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 11 }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <span style={{ padding: '1px 5px', borderRadius: 3, fontWeight: 700, fontSize: 9, background: a.side === 'YES' ? C.yesBg : C.noBg, color: a.side === 'YES' ? C.yes : C.no }}>{a.side}</span>
                              <span style={{ color: C.textDim }}>{parseFloat(a.amount).toFixed(0)}€</span>
                            </div>
                            <span style={{ color: C.textDim, fontSize: 10 }}>{new Date(a.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== PORTFOLIO MODAL ===== */}
      {showPortfolio && (
        <div style={S.modal}>
          <div style={{ minHeight: '100%', padding: 16 }}>
            <div style={{ ...S.panel, maxWidth: 700, margin: '20px auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>Mis posiciones</h2>
                <button onClick={() => setShowPortfolio(false)} style={S.closeBtn}>✕</button>
              </div>
              {userTrades.filter(t => t.status === 'OPEN').length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim }}>No tienes posiciones abiertas</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {userTrades.filter(t => t.status === 'OPEN').map(trade => (
                    <div key={trade.id} style={{ background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: 16 }}>
                      <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, lineHeight: 1.4 }}>{trade.markets.title}</h3>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 700, background: trade.side === 'YES' ? C.yesBg : C.noBg, color: trade.side === 'YES' ? C.yes : C.no }}>{trade.side} {trade.side === 'YES' ? trade.currentPrice.yes : trade.currentPrice.no}¢</span>
                        <span style={{ fontSize: 11, padding: '2px 8px', background: C.card, color: C.textDim, borderRadius: 6 }}>{trade.shares.toFixed(1)} contratos</span>
                        {trade.isExpired && <span style={{ fontSize: 11, padding: '2px 8px', background: `${C.no}15`, color: C.no, borderRadius: 6, fontWeight: 600 }}>🔒 Expirado</span>}
                      </div>
                      {!trade.isExpired ? (
                        <button onClick={() => handleSell(trade)} style={{ width: '100%', padding: '8px 0', background: C.no, color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', marginBottom: 12 }}>Vender</button>
                      ) : (
                        <div style={{ width: '100%', padding: '8px 0', background: '#374151', color: C.textDim, borderRadius: 8, fontWeight: 600, fontSize: 13, textAlign: 'center', marginBottom: 12 }}>⏱ Pendiente resolución</div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[
                          ['Invertido', `€${trade.amount.toFixed(2)}`, null],
                          ['Valor venta', `€${trade.currentValue.toFixed(2)}`, null],
                          ['Si aciertas', `€${trade.potentialPayout.toFixed(2)}`, C.yes],
                          ['P/L', `${trade.profit > 0 ? '+' : ''}€${trade.profit.toFixed(2)}`, trade.profit > 0 ? C.yes : C.no],
                        ].map(([label, val, col], i) => (
                          <div key={i}>
                            <div style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>{label}</div>
                            <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: col || C.text }}>{val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== PROFILE MODAL ===== */}
      {showProfile && user && (
        <div style={S.modal}>
          <div style={{ minHeight: '100%', padding: 16 }}>
            <div style={{ ...S.panel, maxWidth: 500, margin: '20px auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>Mi perfil</h2>
                <button onClick={() => setShowProfile(false)} style={S.closeBtn}>✕</button>
              </div>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ width: 60, height: 60, borderRadius: 30, background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 12px' }}>👤</div>
                <div style={{ fontSize: 14, color: C.textMuted }}>{user.email}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                {[
                  ['Saldo', `€${user.balance.toFixed(0)}`, null],
                  ['P/L Total', `${totalPnL >= 0 ? '+' : ''}€${totalPnL.toFixed(0)}`, totalPnL >= 0 ? C.yes : C.no],
                  ['Invertido', `€${totalInvested.toFixed(0)}`, null],
                  ['Win Rate', `${winRate.toFixed(0)}%`, C.accentLight],
                ].map(([label, val, col], i) => (
                  <div key={i} style={{ background: C.surface, borderRadius: 12, padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: C.textDim, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'monospace', color: col || '#fff' }}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: C.surface, borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Estadísticas</div>
                {[
                  ['Posiciones abiertas', userTrades.filter(t => t.status === 'OPEN').length],
                  ['Posiciones cerradas', userTrades.filter(t => t.status !== 'OPEN').length],
                  ['Total operaciones', userTrades.length],
                  ['Saldo inicial', '€1.000'],
                  ['Retorno total', `${((user.balance - 1000) / 1000 * 100).toFixed(1)}%`],
                ].map(([label, val], i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 4 ? `1px solid ${C.cardBorder}` : 'none' }}>
                    <span style={{ fontSize: 13, color: C.textMuted }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}