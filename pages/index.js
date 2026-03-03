import { useEffect, useState } from 'react'
import { getActiveMarkets, getResolvedMarkets, getOrCreateUser, createTrade, getUserTrades, getPriceHistory, sellPosition } from '../lib/supabase'
import { previewTrade, previewSellValue, calculatePrices } from '../lib/amm'
import { supabase } from '../lib/supabase'
import { getLeaderboard } from '../lib/leaderboard'

export default function Home() {
  // ─── State ───────────────────────────────────────────────────────────────
  const [markets, setMarkets] = useState([])
  const [resolvedMarkets, setResolvedMarkets] = useState([])
  const [showResolved, setShowResolved] = useState(false)
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
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [userTrades, setUserTrades] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [priceHistory, setPriceHistory] = useState([])
  const [tradeImpact, setTradeImpact] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [recentActivity, setRecentActivity] = useState([])
  const [filter, setFilter] = useState('ALL')
  const [catFilter, setCatFilter] = useState('ALL')
  const [tradeHistoryFilter, setTradeHistoryFilter] = useState('ALL')
  const [orderBook, setOrderBook] = useState([])
  const [userOrders, setUserOrders] = useState([])
  const [orderMode, setOrderMode] = useState('MARKET')
  const [limitPrice, setLimitPrice] = useState(0.40)

  // ─── Design tokens ───────────────────────────────────────────────────────
  const C = {
    bg: '#08080a',
    card: '#101012',
    cardBorder: '#1e1e22',
    cardBorderHover: '#2e2e34',
    accent: '#7c3aed',
    accentLight: '#a78bfa',
    yes: '#10b981',
    no: '#ef4444',
    text: '#f4f4f5',
    textMuted: '#a1a1aa',
    textDim: '#52525b',
    surface: '#0c0c0e',
    warning: '#d97706',
    divider: '#18181b',
  }

  // ─── Style helpers ───────────────────────────────────────────────────────
  const modal = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
    backdropFilter: 'blur(20px)', zIndex: 50, overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
  }
  const panel = {
    background: C.card, border: `1px solid ${C.cardBorder}`,
    borderRadius: 12, padding: 24,
  }
  const closeBtn = {
    width: 28, height: 28, borderRadius: 6, background: 'transparent',
    border: `1px solid ${C.cardBorder}`, color: C.textDim, cursor: 'pointer',
    fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  }
  const inputStyle = {
    width: '100%', background: C.surface, border: `1px solid ${C.cardBorder}`,
    borderRadius: 7, padding: '10px 14px', color: C.text, fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
  }

  // Status badge — colored (YES/NO/WON/LOST/etc)
  function badge(color) {
    return {
      fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 600,
      letterSpacing: '0.06em', textTransform: 'uppercase',
      border: `1px solid ${color}35`, color: color, background: `${color}0c`,
      display: 'inline-block',
    }
  }

  // Neutral badge — for type labels, time labels
  function neutralBadge() {
    return {
      fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 400,
      letterSpacing: '0.05em', textTransform: 'uppercase',
      border: `1px solid ${C.cardBorder}`, color: C.textDim, background: 'transparent',
      display: 'inline-block',
    }
  }

  // Category badge — gray with colored dot
  function catBadge(cat) {
    return (
      <span key={cat} style={{
        fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 500,
        letterSpacing: '0.05em', textTransform: 'uppercase',
        border: `1px solid ${C.cardBorder}`, color: C.textDim, background: 'transparent',
        display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>
        <span style={{ width: 4, height: 4, borderRadius: 2, background: getCategoryColor(cat), display: 'inline-block', flexShrink: 0 }} />
        {getCategoryLabel(cat)}
      </span>
    )
  }

  function sectionLabel(text) {
    return (
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: C.textDim, marginBottom: 10 }}>
        {text}
      </div>
    )
  }

  // ─── Oracle descriptions ─────────────────────────────────────────────────
  function getOracleDescription(market) {
    const t = (market.title || '').toLowerCase()
    if (t.includes('ibex')) return { source: 'Yahoo Finance — IBEX 35', url: 'https://finance.yahoo.com/quote/%5EIBEX/', method: 'Se resuelve SÍ si el IBEX 35 supera el umbral o cierra en verde según dato de BME. Verificable tras las 17:35h.' }
    if (t.includes('luz') || t.includes('mwh') || t.includes('pvpc')) return { source: 'OMIE / REE apidatos', url: 'https://www.preciodelaluz.org', method: 'Se resuelve SÍ si el precio medio del pool eléctrico diario supera el umbral indicado (€/MWh). Fuente: REE.' }
    if (t.includes('bitcoin') || t.includes('btc')) return { source: 'CoinGecko API', url: 'https://www.coingecko.com', method: 'Se resuelve SÍ si el precio de Bitcoin supera el umbral indicado en USD a la fecha de cierre. Fuente: CoinGecko.' }
    if (t.includes('euríbor') || t.includes('euribor')) return { source: 'BCE / Banco de España', url: 'https://www.bde.es', method: 'Se resuelve SÍ según el tipo Euríbor 12M publicado por el BCE al cierre del período indicado.' }
    if (t.includes('grados') || t.includes('temperatura') || t.includes('°c')) return { source: 'Open-Meteo (AEMET)', url: 'https://open-meteo.com', method: 'Se resuelve SÍ si la temperatura máxima en alguna capital de provincia española supera el umbral.' }
    if (t.includes('real madrid') || t.includes('barça') || t.includes('barcelona') || t.includes('atlético')) return { source: 'football-data.org', url: 'https://www.football-data.org', method: 'Se resuelve SÍ si el equipo gana su próximo partido oficial. Empate = NO.' }
    if (t.includes('vivienda') || t.includes('idealista')) return { source: 'Idealista / INE', url: 'https://www.idealista.com/informes/', method: 'Se resuelve al publicarse el dato mensual de Idealista o el trimestral del INE.' }
    if (t.includes('ipc') || t.includes('inflación') || t.includes('inflacion')) return { source: 'INE — IPC', url: 'https://www.ine.es', method: 'Se resuelve SÍ según el dato de variación del IPC publicado por el INE para el período indicado.' }
    if (t.includes('paro') || t.includes('desempleo') || t.includes('epa')) return { source: 'INE — EPA', url: 'https://www.ine.es', method: 'Se resuelve SÍ según la tasa de paro publicada por el INE en la Encuesta de Población Activa (EPA).' }
    return { source: 'Fuente verificable', url: '', method: 'Resolución basada en datos oficiales públicos y verificables.' }
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────
  useEffect(() => {
    loadMarkets()
    loadResolvedMarkets()
    const savedUser = localStorage.getItem('predi_user')
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser)
        setUser(u)
        loadUserTrades(u.email)
      } catch (e) { localStorage.removeItem('predi_user') }
    }
  }, [])

  useEffect(() => {
    if (selectedMarket && tradeAmount > 0) {
      const preview = previewTrade(tradeAmount, tradeSide, selectedMarket.yes_pool, selectedMarket.no_pool)
      setTradeImpact(preview)
    }
  }, [tradeAmount, tradeSide, selectedMarket])

  // ─── Data loaders ────────────────────────────────────────────────────────
  async function loadMarkets() {
    setLoading(true)
    const data = await getActiveMarkets()
    setMarkets(data.map(m => ({
      ...m,
      prices: calculatePrices(parseFloat(m.yes_pool), parseFloat(m.no_pool)),
      isExpired: new Date(m.close_date) < new Date(),
    })))
    setLoading(false)
  }

  async function loadResolvedMarkets() {
    const data = await getResolvedMarkets(10)
    setResolvedMarkets(data)
  }

  async function loadLeaderboard() {
    const data = await getLeaderboard(50)
    setLeaderboard(data)
  }

  async function loadUserTrades(email) {
    const data = await getUserTrades(email, true)
    setUserTrades(data.map(t => {
      const currentPrice = calculatePrices(parseFloat(t.markets.yes_pool), parseFloat(t.markets.no_pool))
      const currentValue = t.status === 'OPEN'
        ? previewSellValue(t.shares, t.side, parseFloat(t.markets.yes_pool), parseFloat(t.markets.no_pool))
        : (t.sold_price || 0)
      const isExpired = new Date(t.markets.close_date) < new Date()
      return { ...t, currentPrice, currentValue, potentialPayout: t.shares, profit: currentValue - t.amount, isExpired }
    }))
  }

  async function loadRecentActivity(marketId) {
    const { data, error } = await supabase.from('recent_trades').select('*').eq('market_id', marketId).limit(20)
    if (!error && data) setRecentActivity(data)
  }

  async function loadOrderBook(marketId) {
    const { data } = await supabase.from('order_book').select('*').eq('market_id', marketId)
    if (data) setOrderBook(data)
    if (user) {
      const { data: orders } = await supabase.from('limit_orders').select('*').eq('market_id', marketId).eq('user_email', user.email).eq('status', 'PENDING')
      if (orders) setUserOrders(orders)
    }
  }

  async function loadPriceHistory(marketId) {
    const history = await getPriceHistory(marketId, 168)
    setPriceHistory(history)
  }

  // ─── Auth ────────────────────────────────────────────────────────────────
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

  function handleLogout() {
    setUser(null)
    localStorage.removeItem('predi_user')
    setUserTrades([])
  }

  // ─── Trade handlers ──────────────────────────────────────────────────────
  function openTradeModal(market) {
    if (!user) { setShowAuth(true); return }
    setSelectedMarket(market)
    setShowTradeModal(true)
    setOrderMode('MARKET')
    loadPriceHistory(market.id)
    loadRecentActivity(market.id)
    loadOrderBook(market.id)
  }

  async function executeTrade() {
    if (!user || !selectedMarket || !tradeImpact || !tradeImpact.valid || processing) return
    setProcessing(true)
    const result = await createTrade(user.email, selectedMarket.id, tradeSide, tradeAmount)
    setProcessing(false)
    if (result.success) {
      const newUser = { ...user, balance: result.new_balance }
      setUser(newUser)
      localStorage.setItem('predi_user', JSON.stringify(newUser))
      setShowTradeModal(false)
      setTradeAmount(10)
      loadUserTrades(user.email)
      loadMarkets()
    } else {
      alert(result.error)
    }
  }

  async function placeLimitOrder() {
    if (!user || !selectedMarket || processing) return
    setProcessing(true)
    const { data, error } = await supabase.rpc('place_limit_order', {
      p_email: user.email, p_market_id: selectedMarket.id,
      p_side: tradeSide, p_amount: tradeAmount, p_target_price: limitPrice,
    })
    setProcessing(false)
    if (error) { alert(error.message); return }
    if (data && !data.success) { alert(data.error); return }
    const newUser = { ...user, balance: data.new_balance }
    setUser(newUser)
    localStorage.setItem('predi_user', JSON.stringify(newUser))
    loadOrderBook(selectedMarket.id)
    loadUserTrades(user.email)
  }

  async function cancelOrder(orderId) {
    const { data, error } = await supabase.rpc('cancel_limit_order', { p_order_id: orderId, p_email: user.email })
    if (error) { alert(error.message); return }
    if (data && !data.success) { alert(data.error); return }
    const newUser = { ...user, balance: data.new_balance }
    setUser(newUser)
    localStorage.setItem('predi_user', JSON.stringify(newUser))
    loadOrderBook(selectedMarket.id)
  }

  async function handleSell(trade) {
    if (trade.isExpired) { alert('Mercado expirado — pendiente de resolución.'); return }
    if (!confirm(`¿Vender ${trade.shares.toFixed(1)} contratos ${trade.side} por ~€${trade.currentValue.toFixed(2)}? (Fee 2% incluido)`)) return
    const result = await sellPosition(trade.id, user.email)
    if (result.success) {
      const newUser = { ...user, balance: result.new_balance }
      setUser(newUser)
      localStorage.setItem('predi_user', JSON.stringify(newUser))
      loadUserTrades(user.email)
      loadMarkets()
    } else {
      alert(result.error)
    }
  }

  // ─── Utilities ───────────────────────────────────────────────────────────
  function getTimeLeft(closeDate) {
    const diff = new Date(closeDate) - new Date()
    if (diff < 0) return 'Expirado'
    const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000)
    if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  function isExpired(d) { return new Date(d) < new Date() }

  function getCategoryColor(cat) {
    const map = {
      ECONOMIA: '#818cf8', POLITICA: '#fbbf24', DEPORTES: '#34d399',
      ENERGIA: '#fb923c', CLIMA: '#38bdf8', ACTUALIDAD: '#a78bfa',
      CRIPTO: '#2dd4bf', GEOPOLITICA: '#f472b6',
    }
    return map[cat] || C.textDim
  }

  function getCategoryLabel(cat) {
    const map = {
      ECONOMIA: 'Economía', POLITICA: 'Política', DEPORTES: 'Deportes',
      ENERGIA: 'Energía', CLIMA: 'Clima', ACTUALIDAD: 'Actualidad',
      CRIPTO: 'Cripto', GEOPOLITICA: 'Geopolítica',
    }
    return map[cat] || cat
  }

  function getTypeLabel(m) {
    const t = m.market_type
    if (t === 'FLASH' || t === 'DIARIO') return 'Diario'
    if (t === 'SHORT' || t === 'SEMANAL') return 'Semanal'
    if (t === 'LONG' || t === 'MENSUAL') return 'Mensual'
    return t || ''
  }

  function getTradeStatusLabel(status) {
    const map = { OPEN: 'Abierto', WON: 'Ganado', LOST: 'Perdido', SOLD: 'Vendido' }
    return map[status] || status
  }

  function getTradeStatusColor(status) {
    if (status === 'WON') return C.yes
    if (status === 'LOST') return C.no
    if (status === 'SOLD') return C.accentLight
    return C.textDim
  }

  // ─── Computed ────────────────────────────────────────────────────────────
  const activeMarkets = markets.filter(m => !m.isExpired)
  const pendingMarkets = markets.filter(m => m.isExpired)

  const filtered = activeMarkets.filter(m => {
    if (filter !== 'ALL') {
      const t = m.market_type
      if (filter === 'DIARIO' && t !== 'FLASH' && t !== 'DIARIO') return false
      if (filter === 'SEMANAL' && t !== 'SHORT' && t !== 'SEMANAL') return false
      if (filter === 'MENSUAL' && t !== 'LONG' && t !== 'MENSUAL') return false
    }
    if (catFilter !== 'ALL' && m.category !== catFilter) return false
    return true
  })

  const availableCategories = ['ALL', ...new Set(activeMarkets.map(m => m.category).filter(Boolean))]

  const openTrades = userTrades.filter(t => t.status === 'OPEN')
  const realizedTrades = userTrades.filter(t => t.status === 'WON' || t.status === 'LOST' || t.status === 'SOLD')
  const wonTrades = userTrades.filter(t => t.status === 'WON')
  const lostTrades = userTrades.filter(t => t.status === 'LOST')
  const soldTrades = userTrades.filter(t => t.status === 'SOLD')
  const realizedPnL = realizedTrades.reduce((s, t) => s + (t.pnl || 0), 0)
  const totalInvested = openTrades.reduce((s, t) => s + t.amount, 0)
  const winRate = (wonTrades.length + lostTrades.length) > 0
    ? (wonTrades.length / (wonTrades.length + lostTrades.length) * 100) : 0

  const catBreakdown = {}
  userTrades.forEach(t => {
    const cat = t.markets?.category || 'OTRO'
    if (!catBreakdown[cat]) catBreakdown[cat] = { count: 0, pnl: 0, won: 0, lost: 0 }
    catBreakdown[cat].count++
    catBreakdown[cat].pnl += (t.pnl || 0)
    if (t.status === 'WON') catBreakdown[cat].won++
    if (t.status === 'LOST') catBreakdown[cat].lost++
  })

  const filteredHistory = userTrades.filter(t => {
    if (tradeHistoryFilter === 'ALL') return true
    return t.status === tradeHistoryFilter
  })

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 14, lineHeight: 1.5 }}>

      {/* ── HEADER ── */}
      <header style={{ borderBottom: `1px solid ${C.cardBorder}`, background: `${C.bg}f0`, position: 'sticky', top: 0, zIndex: 40, backdropFilter: 'blur(20px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 26, height: 26, background: C.accent, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>P</div>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em' }}>PrediMarket</span>
            <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', color: C.textDim, border: `1px solid ${C.cardBorder}`, padding: '1px 5px', borderRadius: 3 }}>BETA</span>
          </div>

          {/* Nav right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {user ? (
              <>
                <button
                  onClick={() => { setShowLeaderboard(true); loadLeaderboard() }}
                  style={{ padding: '5px 12px', borderRadius: 6, background: 'transparent', border: `1px solid ${C.cardBorder}`, color: C.textDim, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                  Ranking
                </button>
                <button
                  onClick={() => { setShowPortfolio(true); loadUserTrades(user.email) }}
                  style={{ padding: '5px 12px', borderRadius: 6, background: 'transparent', border: `1px solid ${C.cardBorder}`, color: C.textDim, cursor: 'pointer', fontSize: 12, fontWeight: 500, position: 'relative' }}>
                  Posiciones
                  {openTrades.length > 0 && (
                    <span style={{ position: 'absolute', top: -5, right: -5, width: 14, height: 14, background: C.accent, borderRadius: 7, fontSize: 8, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {openTrades.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => { setShowProfile(true); loadUserTrades(user.email) }}
                  style={{ padding: '5px 12px', borderRadius: 6, background: 'transparent', border: `1px solid ${C.cardBorder}`, color: C.textDim, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                  Perfil
                </button>
                <div style={{ padding: '5px 12px', background: `${C.accent}0a`, border: `1px solid ${C.accent}20`, borderRadius: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: C.accentLight }}>€{parseFloat(user.balance).toFixed(0)}</span>
                </div>
                <button onClick={handleLogout} style={{ padding: '5px 8px', borderRadius: 6, background: 'transparent', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>✕</button>
              </>
            ) : (
              <button onClick={() => setShowAuth(true)} style={{ padding: '7px 16px', background: C.accent, borderRadius: 6, fontWeight: 600, fontSize: 13, color: '#fff', border: 'none', cursor: 'pointer' }}>
                Empezar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px 28px' }}>
        <h1 style={{ fontSize: 'clamp(20px, 3.5vw, 32px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 10, color: C.text }}>
          Mercados de predicción<br />
          <span style={{ color: C.accentLight, fontWeight: 600 }}>verificables</span>
        </h1>
        <p style={{ fontSize: 13, color: C.textMuted, maxWidth: 400, lineHeight: 1.65, marginBottom: 0 }}>
          Apuesta sobre indicadores económicos y actualidad española. Resolución automática por oráculo público.
        </p>
        {!user && (
          <button onClick={() => setShowAuth(true)} style={{ marginTop: 20, padding: '9px 20px', background: C.accent, borderRadius: 7, fontWeight: 600, fontSize: 13, color: '#fff', border: 'none', cursor: 'pointer' }}>
            Empezar con 1.000 créditos
          </button>
        )}
      </div>

      {/* ── FILTER TABS ── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        {/* Time filter */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.cardBorder}` }}>
          {[
            ['ALL', 'Todos', activeMarkets.length],
            ['DIARIO', 'Diario', activeMarkets.filter(m => m.market_type === 'FLASH' || m.market_type === 'DIARIO').length],
            ['SEMANAL', 'Semanal', activeMarkets.filter(m => m.market_type === 'SHORT' || m.market_type === 'SEMANAL').length],
            ['MENSUAL', 'Mensual', activeMarkets.filter(m => m.market_type === 'LONG' || m.market_type === 'MENSUAL').length],
          ].map(([f, label, count]) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '9px 16px', fontSize: 13, fontWeight: filter === f ? 600 : 400,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: filter === f ? C.text : C.textDim,
              borderBottom: `2px solid ${filter === f ? C.accent : 'transparent'}`,
              marginBottom: -1, transition: 'color 0.15s',
            }}>
              {label}
              {count > 0 && <span style={{ marginLeft: 5, fontSize: 10, color: C.textDim, fontWeight: 400 }}>{count}</span>}
            </button>
          ))}
        </div>

        {/* Category filter pills */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', padding: '10px 0 18px' }}>
          {availableCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              style={{
                padding: '4px 11px', fontSize: 11, fontWeight: catFilter === cat ? 600 : 400,
                letterSpacing: '0.03em', borderRadius: 20, cursor: 'pointer', transition: 'all 0.12s',
                border: `1px solid ${catFilter === cat ? C.cardBorderHover : C.cardBorder}`,
                background: catFilter === cat ? C.card : 'transparent',
                color: catFilter === cat ? C.text : C.textDim,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
              {cat !== 'ALL' && <span style={{ width: 5, height: 5, borderRadius: 3, background: getCategoryColor(cat), display: 'inline-block', flexShrink: 0 }} />}
              {cat === 'ALL' ? 'Todas' : getCategoryLabel(cat)}
            </button>
          ))}
        </div>
      </div>

      {/* ── MARKET GRID ── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 56px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: C.textDim, fontSize: 13 }}>Cargando mercados...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: C.textDim, fontSize: 13 }}>No hay mercados activos en este filtro.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
            {filtered.map(m => {
              const oracle = getOracleDescription(m)
              return (
                <div
                  key={m.id}
                  onClick={() => openTradeModal(m)}
                  style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: 18, cursor: 'pointer', transition: 'border-color 0.12s', display: 'flex', flexDirection: 'column' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.cardBorderHover}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.cardBorder}>

                  {/* Top: category badge + type + time */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                      {catBadge(m.category)}
                      <span style={neutralBadge()}>{getTypeLabel(m)}</span>
                    </div>
                    <span style={{ fontSize: 11, color: C.textDim, fontWeight: 400, flexShrink: 0, marginLeft: 8 }}>{getTimeLeft(m.close_date)}</span>
                  </div>

                  {/* Title */}
                  <p style={{ fontWeight: 500, fontSize: 14, marginBottom: 16, lineHeight: 1.5, color: C.text, flex: 1 }}>{m.title}</p>

                  {/* Prices — clean text rows, no colored boxes */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                      <span style={{ fontSize: 10, color: C.textDim, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>SÍ</span>
                      <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: C.yes, lineHeight: 1 }}>{m.prices.yes}¢</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                      <span style={{ fontSize: 10, color: C.textDim, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>NO</span>
                      <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: C.no, lineHeight: 1 }}>{m.prices.no}¢</span>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: 44, height: 2, borderRadius: 2, overflow: 'hidden', background: `${C.no}30` }}>
                        <div style={{ width: `${m.prices.yes}%`, height: '100%', background: C.yes, opacity: 0.7 }} />
                      </div>
                    </div>
                  </div>

                  {/* Meta row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }}>
                    <span style={{ fontSize: 11, color: C.textDim }}>€{((m.total_volume || 0) / 1000).toFixed(1)}K · {m.active_traders || m.total_traders || 0} traders</span>
                    <span style={{ fontSize: 10, color: C.textDim }}>{oracle.source}</span>
                  </div>

                  <button
                    style={{ width: '100%', padding: '7px 0', borderRadius: 6, fontWeight: 500, fontSize: 12, border: `1px solid ${C.cardBorder}`, cursor: 'pointer', background: 'transparent', color: C.textMuted, letterSpacing: '0.01em', transition: 'all 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.accent; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = C.accent }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textMuted; e.currentTarget.style.borderColor = C.cardBorder }}>
                    Predecir
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Pending resolution notice */}
        {pendingMarkets.length > 0 && (
          <div style={{ marginTop: 20, padding: '11px 16px', background: `${C.warning}07`, border: `1px solid ${C.warning}18`, borderRadius: 7, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 5, height: 5, borderRadius: 3, background: C.warning, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: C.warning, fontWeight: 500 }}>
              {pendingMarkets.length} mercado{pendingMarkets.length > 1 ? 's' : ''} pendiente{pendingMarkets.length > 1 ? 's' : ''} de resolución por el oráculo
            </span>
          </div>
        )}

        {/* ── RESOLVED MARKETS ── */}
        {resolvedMarkets.length > 0 && (
          <div style={{ marginTop: 56 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: C.textDim, marginBottom: 5 }}>Historial</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>Mercados resueltos</div>
              </div>
              <button
                onClick={() => setShowResolved(!showResolved)}
                style={{ fontSize: 12, color: C.textDim, background: 'none', border: `1px solid ${C.cardBorder}`, borderRadius: 5, padding: '4px 11px', cursor: 'pointer' }}>
                {showResolved ? 'Ver menos' : 'Ver todos'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(showResolved ? resolvedMarkets : resolvedMarkets.slice(0, 4)).map(m => (
                <div key={m.id} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>{m.title}</div>
                    <div style={{ fontSize: 11, color: C.textDim }}>
                      {m.resolution_source || getOracleDescription(m).source}
                      {m.close_date && ` · ${new Date(m.close_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: C.textDim, fontFamily: 'ui-monospace, monospace' }}>€{(((m.total_volume || 0) - 5000) / 1000).toFixed(1)}K</span>
                    <span style={badge(m.resolved_outcome ? C.yes : C.no)}>
                      {m.resolved_outcome ? 'SÍ' : 'NO'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── AUTH MODAL ── */}
      {showAuth && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ ...panel, maxWidth: 360, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.025em' }}>Empezar</h2>
              <button onClick={() => setShowAuth(false)} style={closeBtn}>✕</button>
            </div>
            <form onSubmit={handleLogin}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textDim, marginBottom: 7 }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                style={{ ...inputStyle, marginBottom: 12 }} placeholder="tu@email.com" required />
              <button type="submit" style={{ width: '100%', background: C.accent, color: '#fff', fontWeight: 600, padding: '11px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 14 }}>
                Empezar con 1.000 créditos
              </button>
            </form>
            <p style={{ fontSize: 11, color: C.textDim, marginTop: 14, textAlign: 'center', lineHeight: 1.5 }}>Créditos virtuales · Sin riesgo real</p>
          </div>
        </div>
      )}

      {/* ── TRADE MODAL ── */}
      {showTradeModal && selectedMarket && (
        <div style={modal}>
          <div style={{ minHeight: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px' }}>
            <div style={{ ...panel, maxWidth: 660, width: '100%' }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
                    {catBadge(selectedMarket.category)}
                    <span style={neutralBadge()}>{getTypeLabel(selectedMarket)}</span>
                    <span style={{ fontSize: 11, color: isExpired(selectedMarket.close_date) ? C.no : C.textDim, fontWeight: 400 }}>
                      {isExpired(selectedMarket.close_date) ? 'Expirado' : getTimeLeft(selectedMarket.close_date)}
                    </span>
                  </div>
                  <h2 style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.4, letterSpacing: '-0.02em', color: C.text }}>{selectedMarket.title}</h2>
                </div>
                <button onClick={() => setShowTradeModal(false)} style={closeBtn}>✕</button>
              </div>

              {/* Oracle */}
              {(() => {
                const oracle = getOracleDescription(selectedMarket)
                return (
                  <div style={{ marginBottom: 16, padding: '12px 14px', background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8 }}>
                    {sectionLabel('Oráculo de resolución')}
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.accentLight, marginBottom: 4 }}>{oracle.source}</div>
                    <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.55 }}>{oracle.method}</div>
                    {oracle.url && (
                      <a href={oracle.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'inline-block', marginTop: 7, fontSize: 11, color: C.accent, textDecoration: 'none' }}>
                        Ver fuente ↗
                      </a>
                    )}
                  </div>
                )
              })()}

              {/* Price chart */}
              {(() => {
                const rawPrices = priceHistory.map(p => parseFloat(p.yes_price))
                const currentPrice = parseFloat(selectedMarket.prices.yes)
                const prices = rawPrices.length > 0 ? [50, ...rawPrices, currentPrice] : [50, currentPrice]
                if (prices.length < 2) return null
                const minP = Math.max(0, Math.min(...prices) - 3)
                const maxP = Math.min(100, Math.max(...prices) + 3)
                const range = maxP - minP || 1
                const first = prices[0], last = prices[prices.length - 1]
                const trend = last > first ? C.yes : last < first ? C.no : C.accent
                return (
                  <div style={{ marginBottom: 16, padding: '14px 16px', background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      {sectionLabel('Precio SÍ')}
                      <div style={{ fontSize: 12, display: 'flex', gap: 8, alignItems: 'baseline' }}>
                        <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: trend }}>{last.toFixed(1)}%</span>
                        <span style={{ color: C.textDim, fontSize: 11 }}>{last > first ? '+' : ''}{(last - first).toFixed(1)} pts</span>
                      </div>
                    </div>
                    <div style={{ height: 80, position: 'relative' }}>
                      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <polygon
                          points={`0,100 ${prices.map((p, i) => `${(i / Math.max(prices.length - 1, 1)) * 100},${100 - ((p - minP) / range) * 100}`).join(' ')} 100,100`}
                          fill={`${trend}08`} stroke="none"
                        />
                        <polyline
                          points={prices.map((p, i) => `${(i / Math.max(prices.length - 1, 1)) * 100},${100 - ((p - minP) / range) * 100}`).join(' ')}
                          fill="none" stroke={trend} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeOpacity="0.8"
                        />
                      </svg>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.textDim, marginTop: 5 }}>
                      <span>Apertura 50%</span>
                      <span>Ahora {currentPrice.toFixed(1)}%</span>
                    </div>
                  </div>
                )
              })()}

              {/* Trade controls OR expired state */}
              {!isExpired(selectedMarket.close_date) ? (
                <>
                  {/* Order type toggle */}
                  <div style={{ display: 'flex', background: C.surface, borderRadius: 7, padding: 3, marginBottom: 16 }}>
                    {['MARKET', 'LIMIT'].map(mode => (
                      <button key={mode} onClick={() => setOrderMode(mode)} style={{ flex: 1, padding: '7px 0', borderRadius: 5, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', background: orderMode === mode ? C.card : 'transparent', color: orderMode === mode ? C.text : C.textDim, transition: 'all 0.12s' }}>
                        {mode === 'MARKET' ? 'Mercado' : 'Límite'}
                      </button>
                    ))}
                  </div>

                  {/* YES / NO selector */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                    {['YES', 'NO'].map(side => (
                      <button key={side} onClick={() => setTradeSide(side)} style={{
                        padding: '14px 8px', borderRadius: 7, fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${tradeSide === side ? (side === 'YES' ? C.yes : C.no) : C.cardBorder}`,
                        background: tradeSide === side ? (side === 'YES' ? `${C.yes}08` : `${C.no}08`) : 'transparent',
                        color: tradeSide === side ? (side === 'YES' ? C.yes : C.no) : C.textMuted,
                        transition: 'all 0.12s',
                      }}>
                        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.09em', marginBottom: 5 }}>{side === 'YES' ? 'SÍ' : 'NO'}</div>
                        <div style={{ fontSize: 22, fontFamily: 'ui-monospace, monospace', lineHeight: 1 }}>
                          {side === 'YES' ? selectedMarket.prices.yes : selectedMarket.prices.no}¢
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Limit price */}
                  {orderMode === 'LIMIT' && (
                    <div style={{ marginBottom: 16, padding: 14, background: C.surface, borderRadius: 7, border: `1px solid ${C.cardBorder}` }}>
                      {sectionLabel('Precio límite')}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input
                          type="range"
                          min="5"
                          max={Math.max(6, parseInt(tradeSide === 'YES' ? selectedMarket.prices.yes : selectedMarket.prices.no) - 1)}
                          value={limitPrice * 100}
                          onChange={e => setLimitPrice(e.target.value / 100)}
                          style={{ flex: 1, accentColor: C.accent }} />
                        <span style={{ minWidth: 48, textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontWeight: 700, fontSize: 16, color: C.accentLight }}>
                          {(limitPrice * 100).toFixed(0)}¢
                        </span>
                      </div>
                      <div style={{ marginTop: 8, fontSize: 11, color: C.textDim }}>
                        Actual: {tradeSide === 'YES' ? selectedMarket.prices.yes : selectedMarket.prices.no}¢ · Retorno estimado: +{((1 / limitPrice - 1) * 100).toFixed(0)}%
                      </div>
                    </div>
                  )}

                  {/* Amount */}
                  <div style={{ marginBottom: 16 }}>
                    {sectionLabel('Cantidad')}
                    <input
                      type="number" value={tradeAmount}
                      onChange={e => setTradeAmount(Math.max(1, Number(e.target.value)))}
                      style={{ ...inputStyle, fontSize: 18, fontWeight: 700, fontFamily: 'ui-monospace, monospace', marginBottom: 8 }}
                      min="1" max={user?.balance || 1000} />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                      {[10, 25, 50, 100].map(v => (
                        <button key={v} onClick={() => setTradeAmount(v)} style={{ padding: '6px 0', fontSize: 12, fontWeight: 500, background: 'transparent', color: tradeAmount === v ? C.text : C.textDim, borderRadius: 6, border: `1px solid ${tradeAmount === v ? C.accent : C.cardBorder}`, cursor: 'pointer' }}>
                          {v}€
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div style={{ background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 7, padding: '14px 16px', marginBottom: 14 }}>
                    {sectionLabel('Resumen')}
                    {orderMode === 'MARKET' ? (
                      tradeImpact && tradeImpact.valid ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                          {[
                            ['Contratos', `${tradeImpact.shares.toFixed(2)}`],
                            ['Precio medio', `${(tradeImpact.avgPrice * 100).toFixed(1)}¢`],
                            ['Impacto en precio', `${tradeImpact.priceImpactPercent}¢`],
                          ].map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: 12, color: C.textMuted }}>{k}</span>
                              <span style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', fontWeight: 600 }}>{v}</span>
                            </div>
                          ))}
                          <div style={{ borderTop: `1px solid ${C.cardBorder}`, paddingTop: 10, marginTop: 3 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontSize: 12, fontWeight: 500 }}>Si aciertas</span>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 18, fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: C.yes }}>€{tradeImpact.potentialWinnings.toFixed(2)}</div>
                                <div style={{ fontSize: 11, color: tradeImpact.potentialProfit > 0 ? C.yes : C.no, fontFamily: 'ui-monospace, monospace' }}>
                                  {tradeImpact.potentialProfit > 0 ? '+' : ''}{tradeImpact.potentialProfit.toFixed(2)}€ ({tradeImpact.roi > 0 ? '+' : ''}{tradeImpact.roi.toFixed(0)}%)
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: C.no }}>{tradeImpact?.error || 'Introduce una cantidad'}</div>
                      )
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {[
                          ['Fondos a reservar', `€${tradeAmount}`],
                          ['Ejecutar cuando', `${tradeSide} ≤ ${(limitPrice * 100).toFixed(0)}¢`],
                          ['Contratos estimados', `${(tradeAmount / limitPrice).toFixed(1)}`],
                          ['Retorno potencial', `+${((1 / limitPrice - 1) * 100).toFixed(0)}%`],
                        ].map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 12, color: C.textMuted }}>{k}</span>
                            <span style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: k === 'Retorno potencial' ? C.yes : C.text }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Execute button */}
                  {orderMode === 'MARKET' ? (
                    <button
                      onClick={executeTrade}
                      disabled={!tradeImpact || !tradeImpact.valid || tradeAmount > (user?.balance || 0) || processing}
                      style={{
                        width: '100%', padding: '12px 0', borderRadius: 7, fontWeight: 600, fontSize: 14,
                        border: 'none', cursor: 'pointer', letterSpacing: '-0.01em', transition: 'all 0.12s',
                        background: (!tradeImpact || !tradeImpact.valid || tradeAmount > (user?.balance || 0) || processing) ? C.cardBorder : (tradeSide === 'YES' ? C.yes : C.no),
                        color: (!tradeImpact || !tradeImpact.valid || tradeAmount > (user?.balance || 0) || processing) ? C.textDim : '#0a0a0a',
                      }}>
                      {processing ? 'Procesando...'
                        : !tradeImpact ? 'Calculando...'
                        : !tradeImpact.valid ? tradeImpact.error
                        : tradeAmount > (user?.balance || 0) ? 'Saldo insuficiente'
                        : `Comprar ${tradeSide === 'YES' ? 'SÍ' : 'NO'} — €${tradeAmount}`}
                    </button>
                  ) : (
                    <button
                      onClick={placeLimitOrder}
                      disabled={processing || tradeAmount > (user?.balance || 0)}
                      style={{
                        width: '100%', padding: '12px 0', borderRadius: 7, fontWeight: 600, fontSize: 14,
                        border: 'none', cursor: 'pointer', transition: 'all 0.12s',
                        background: (processing || tradeAmount > (user?.balance || 0)) ? C.cardBorder : C.accent,
                        color: (processing || tradeAmount > (user?.balance || 0)) ? C.textDim : '#fff',
                      }}>
                      {processing ? 'Procesando...' : tradeAmount > (user?.balance || 0) ? 'Saldo insuficiente' : `Colocar límite ${tradeSide} a ${(limitPrice * 100).toFixed(0)}¢`}
                    </button>
                  )}

                  {/* My pending orders */}
                  {userOrders.length > 0 && (
                    <div style={{ marginTop: 16, padding: '12px 14px', background: C.surface, borderRadius: 7, border: `1px solid ${C.cardBorder}` }}>
                      {sectionLabel('Mis órdenes pendientes')}
                      {userOrders.map(o => (
                        <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${C.divider}` }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={badge(o.side === 'YES' ? C.yes : C.no)}>{o.side}</span>
                            <span style={{ fontSize: 12, color: C.textMuted }}>€{o.amount} a {(o.target_price * 100).toFixed(0)}¢</span>
                          </div>
                          <button onClick={() => cancelOrder(o.id)} style={{ fontSize: 11, color: C.no, background: 'none', border: `1px solid ${C.no}30`, borderRadius: 4, padding: '3px 8px', cursor: 'pointer' }}>
                            Cancelar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ padding: 24, background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.textMuted, marginBottom: 5 }}>Mercado cerrado</div>
                  <div style={{ fontSize: 12, color: C.textDim }}>Pendiente de resolución automática por el oráculo.</div>
                </div>
              )}

              {/* Liquidity & Order book */}
              <div style={{ marginTop: 20, padding: '14px 16px', background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8 }}>
                {sectionLabel('Liquidez del mercado')}
                {(() => {
                  const yp = parseFloat(selectedMarket.yes_pool), np = parseFloat(selectedMarket.no_pool)
                  const total = yp + np
                  return (
                    <div>
                      <div style={{ display: 'flex', gap: 2, height: 3, borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
                        <div style={{ width: `${yp / total * 100}%`, background: C.yes, opacity: 0.7 }} />
                        <div style={{ width: `${np / total * 100}%`, background: C.no, opacity: 0.7 }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.textDim }}>
                        <span>Pool SÍ: <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: C.yes }}>€{yp.toFixed(0)}</span></span>
                        <span>Pool NO: <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: C.no }}>€{np.toFixed(0)}</span></span>
                      </div>
                    </div>
                  )
                })()}

                {orderBook.length > 0 && (
                  <div style={{ marginTop: 16, borderTop: `1px solid ${C.divider}`, paddingTop: 14 }}>
                    {sectionLabel('Libro de órdenes límite')}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {['YES', 'NO'].map(side => {
                        const sideOrders = orderBook.filter(o => o.side === side).sort((a, b) => b.target_price - a.target_price)
                        const maxAmt = Math.max(...orderBook.map(x => x.total_amount), 1)
                        return (
                          <div key={side}>
                            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: side === 'YES' ? C.yes : C.no, marginBottom: 6 }}>
                              Límites {side === 'YES' ? 'SÍ' : 'NO'}
                            </div>
                            {sideOrders.length === 0 ? (
                              <div style={{ fontSize: 11, color: C.textDim }}>Sin órdenes</div>
                            ) : sideOrders.map((o, i) => (
                              <div key={i} style={{ position: 'relative', marginBottom: 2, padding: '4px 6px', borderRadius: 3 }}>
                                <div style={{ position: 'absolute', [side === 'YES' ? 'left' : 'right']: 0, top: 0, bottom: 0, width: `${(o.total_amount / maxAmt) * 100}%`, background: `${side === 'YES' ? C.yes : C.no}0c`, borderRadius: 3 }} />
                                <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                                  <span style={{ color: side === 'YES' ? C.yes : C.no, fontFamily: 'ui-monospace, monospace' }}>{(o.target_price * 100).toFixed(0)}¢</span>
                                  <span style={{ color: C.textDim, fontFamily: 'ui-monospace, monospace' }}>€{parseFloat(o.total_amount).toFixed(0)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Recent trades */}
                {recentActivity.length > 0 && (
                  <div style={{ marginTop: 14, borderTop: `1px solid ${C.divider}`, paddingTop: 12 }}>
                    {sectionLabel('Últimas operaciones')}
                    <div style={{ maxHeight: 100, overflowY: 'auto' }}>
                      {recentActivity.slice(0, 8).map((a, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', fontSize: 11 }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={badge(a.side === 'YES' ? C.yes : C.no)}>{a.side}</span>
                            <span style={{ color: C.textDim, fontFamily: 'ui-monospace, monospace' }}>€{parseFloat(a.amount).toFixed(0)}</span>
                          </div>
                          <span style={{ color: C.textDim, fontSize: 10 }}>
                            {new Date(a.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PORTFOLIO MODAL ── */}
      {showPortfolio && (
        <div style={modal}>
          <div style={{ minHeight: '100%', padding: '24px 16px' }}>
            <div style={{ ...panel, maxWidth: 640, margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.025em' }}>Posiciones abiertas</h2>
                <button onClick={() => setShowPortfolio(false)} style={closeBtn}>✕</button>
              </div>

              {openTrades.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: C.textDim, fontSize: 13 }}>Sin posiciones abiertas</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {openTrades.map(trade => (
                    <div key={trade.id} style={{ background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: 16 }}>
                      <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 10, lineHeight: 1.45 }}>{trade.markets.title}</div>
                      <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
                        <span style={badge(trade.side === 'YES' ? C.yes : C.no)}>{trade.side === 'YES' ? 'SÍ' : 'NO'}</span>
                        <span style={neutralBadge()}>{trade.shares.toFixed(1)} contratos</span>
                        {trade.isExpired && <span style={badge(C.warning)}>PENDIENTE</span>}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                        {[
                          ['Invertido', `€${trade.amount.toFixed(0)}`, null],
                          ['Valor actual', `€${trade.currentValue.toFixed(1)}`, null],
                          ['Si acierta', `€${trade.potentialPayout.toFixed(1)}`, C.yes],
                          ['P&L', `${trade.profit > 0 ? '+' : ''}€${trade.profit.toFixed(1)}`, trade.profit > 0 ? C.yes : C.no],
                        ].map(([label, val, col]) => (
                          <div key={label}>
                            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.textDim, marginBottom: 3 }}>{label}</div>
                            <div style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, fontSize: 13, color: col || C.text }}>{val}</div>
                          </div>
                        ))}
                      </div>
                      {!trade.isExpired && (
                        <button onClick={() => handleSell(trade)} style={{ width: '100%', padding: '7px 0', background: 'transparent', color: C.no, border: `1px solid ${C.no}30`, borderRadius: 6, fontWeight: 500, fontSize: 12, cursor: 'pointer' }}>
                          Vender ~€{trade.currentValue.toFixed(2)}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PROFILE MODAL ── */}
      {showProfile && user && (
        <div style={modal}>
          <div style={{ minHeight: '100%', padding: '24px 16px' }}>
            <div style={{ ...panel, maxWidth: 560, margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.025em' }}>Mi perfil</h2>
                <button onClick={() => setShowProfile(false)} style={closeBtn}>✕</button>
              </div>

              {/* User header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, padding: '14px 16px', background: C.surface, borderRadius: 8, border: `1px solid ${C.cardBorder}` }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: `${C.accent}15`, border: `1px solid ${C.accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: C.accent }}>
                  {(user.display_name || user.email || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{user.display_name || user.email.split('@')[0]}</div>
                  <div style={{ fontSize: 11, color: C.textDim }}>{user.email}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: C.accentLight }}>€{parseFloat(user.balance).toFixed(0)}</div>
                  <div style={{ fontSize: 9, color: C.textDim, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Saldo</div>
                </div>
              </div>

              {/* KPI cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'P/L realizado', value: `${realizedPnL >= 0 ? '+' : ''}€${realizedPnL.toFixed(0)}`, color: realizedPnL >= 0 ? C.yes : C.no, sub: 'Solo cerrados' },
                  { label: 'Win rate', value: `${winRate.toFixed(0)}%`, color: winRate >= 50 ? C.yes : C.no, sub: `${wonTrades.length}G · ${lostTrades.length}P` },
                  { label: 'Retorno', value: `${((user.balance - 1000) / 10).toFixed(1)}%`, color: user.balance >= 1000 ? C.yes : C.no, sub: 'vs 1.000 inicial' },
                ].map(({ label, value, color, sub }) => (
                  <div key={label} style={{ background: C.surface, borderRadius: 7, padding: '12px 14px', border: `1px solid ${C.cardBorder}` }}>
                    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textDim, marginBottom: 7 }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color, lineHeight: 1 }}>{value}</div>
                    <div style={{ fontSize: 10, color: C.textDim, marginTop: 5 }}>{sub}</div>
                  </div>
                ))}
              </div>

              {/* Open exposure */}
              {openTrades.length > 0 && (
                <div style={{ padding: '11px 14px', background: `${C.warning}06`, border: `1px solid ${C.warning}18`, borderRadius: 7, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: C.warning }}>Exposición abierta</div>
                    <div style={{ fontSize: 11, color: C.textDim }}>{openTrades.length} posiciones · €{totalInvested.toFixed(0)} en juego</div>
                  </div>
                  <span style={badge(C.warning)}>ABIERTO</span>
                </div>
              )}

              {/* Category breakdown */}
              {Object.keys(catBreakdown).length > 0 && (
                <div style={{ padding: '14px 16px', background: C.surface, borderRadius: 7, border: `1px solid ${C.cardBorder}`, marginBottom: 14 }}>
                  {sectionLabel('Por categoría')}
                  <div style={{ display: 'flex', height: 3, borderRadius: 3, overflow: 'hidden', gap: 1, marginBottom: 14 }}>
                    {Object.entries(catBreakdown).map(([cat, data]) => (
                      <div key={cat} style={{ flex: data.count, background: getCategoryColor(cat), minWidth: 4, opacity: 0.7 }} />
                    ))}
                  </div>
                  {Object.entries(catBreakdown).sort((a, b) => b[1].count - a[1].count).map(([cat, data]) => {
                    const wr = (data.won + data.lost) > 0 ? (data.won / (data.won + data.lost) * 100) : 0
                    return (
                      <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${C.divider}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{ width: 6, height: 6, borderRadius: 2, background: getCategoryColor(cat), flexShrink: 0, opacity: 0.8 }} />
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 500 }}>{getCategoryLabel(cat)}</div>
                            <div style={{ fontSize: 10, color: C.textDim }}>{data.count} trades · WR {wr.toFixed(0)}%</div>
                          </div>
                        </div>
                        <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, fontWeight: 700, color: data.pnl >= 0 ? C.yes : C.no }}>
                          {data.pnl >= 0 ? '+' : ''}€{data.pnl.toFixed(0)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Stats */}
              <div style={{ padding: '14px 16px', background: C.surface, borderRadius: 7, border: `1px solid ${C.cardBorder}`, marginBottom: 14 }}>
                {sectionLabel('Estadísticas')}
                {[
                  ['Total operaciones', userTrades.length, null],
                  ['Ganadas', wonTrades.length, C.yes],
                  ['Perdidas', lostTrades.length, C.no],
                  ['Vendidas (anticipado)', soldTrades.length, C.accentLight],
                  ['Mayor ganancia', realizedTrades.length > 0 ? `+€${Math.max(0, ...realizedTrades.map(t => t.pnl || 0)).toFixed(0)}` : '—', C.yes],
                  ['Mayor pérdida', realizedTrades.length > 0 ? `-€${Math.abs(Math.min(0, ...realizedTrades.map(t => t.pnl || 0))).toFixed(0)}` : '—', C.no],
                  ['Avg por trade', realizedTrades.length > 0 ? `${realizedPnL >= 0 ? '+' : ''}€${(realizedPnL / realizedTrades.length).toFixed(1)}` : '—', null],
                  ['Capital inicial', '€1.000', null],
                  ['Saldo actual', `€${parseFloat(user.balance).toFixed(0)}`, user.balance >= 1000 ? C.yes : C.no],
                ].map(([label, val, col], i, arr) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < arr.length - 1 ? `1px solid ${C.divider}` : 'none' }}>
                    <span style={{ fontSize: 12, color: C.textMuted }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'ui-monospace, monospace', color: col || C.text }}>{val}</span>
                  </div>
                ))}
              </div>

              {/* ── Trade history ── */}
              <div style={{ padding: '14px 16px', background: C.surface, borderRadius: 7, border: `1px solid ${C.cardBorder}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  {sectionLabel('Historial de trades')}
                  <span style={{ fontSize: 11, color: C.textDim, marginBottom: 10 }}>{filteredHistory.length} operaciones</span>
                </div>

                {/* Filter tabs */}
                <div style={{ display: 'flex', background: C.bg, borderRadius: 6, padding: 2, marginBottom: 12 }}>
                  {[['ALL', 'Todos'], ['OPEN', 'Abiertos'], ['WON', 'Ganados'], ['LOST', 'Perdidos'], ['SOLD', 'Vendidos']].map(([f, l]) => (
                    <button key={f} onClick={() => setTradeHistoryFilter(f)} style={{
                      flex: 1, padding: '5px 0', borderRadius: 4, fontSize: 10, fontWeight: tradeHistoryFilter === f ? 600 : 400,
                      border: 'none', cursor: 'pointer',
                      background: tradeHistoryFilter === f ? C.card : 'transparent',
                      color: tradeHistoryFilter === f ? C.text : C.textDim,
                      transition: 'all 0.12s',
                    }}>
                      {l}
                    </button>
                  ))}
                </div>

                {filteredHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: C.textDim, fontSize: 12 }}>Sin trades en este filtro</div>
                ) : (
                  <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {filteredHistory.map(trade => {
                      const pnl = trade.pnl || 0
                      const statusColor = getTradeStatusColor(trade.status)
                      return (
                        <div key={trade.id} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 6, padding: '10px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: C.text, flex: 1, marginRight: 8, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {trade.markets?.title}
                            </div>
                            <span style={{ ...badge(statusColor), flexShrink: 0 }}>{getTradeStatusLabel(trade.status)}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <span style={badge(trade.side === 'YES' ? C.yes : C.no)}>{trade.side === 'YES' ? 'SÍ' : 'NO'}</span>
                            <span style={{ fontSize: 11, color: C.textDim }}>€{trade.amount.toFixed(0)} invertido</span>
                            {trade.status !== 'OPEN' && (
                              <span style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: pnl >= 0 ? C.yes : C.no, marginLeft: 'auto' }}>
                                {pnl >= 0 ? '+' : ''}€{pnl.toFixed(1)}
                              </span>
                            )}
                            {trade.status === 'OPEN' && (
                              <span style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', color: trade.profit >= 0 ? C.yes : C.no, marginLeft: 'auto' }}>
                                {trade.profit >= 0 ? '+' : ''}€{trade.profit.toFixed(1)} (ahora)
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 10, color: C.textDim, marginTop: 5 }}>
                            {new Date(trade.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            {trade.markets?.category && ` · ${getCategoryLabel(trade.markets.category)}`}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LEADERBOARD MODAL ── */}
      {showLeaderboard && (
        <div style={modal}>
          <div style={{ minHeight: '100%', padding: '24px 16px' }}>
            <div style={{ ...panel, maxWidth: 540, margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 4 }}>Ranking</h2>
                  <div style={{ fontSize: 11, color: C.textDim }}>P/L realizado · Trades cerrados (WON / LOST / SOLD)</div>
                </div>
                <button onClick={() => setShowLeaderboard(false)} style={closeBtn}>✕</button>
              </div>

              {leaderboard.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: C.textDim, fontSize: 13 }}>Cargando ranking...</div>
              ) : (
                <div>
                  {/* Table header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 80px 56px 44px', gap: 8, padding: '0 8px 10px', borderBottom: `1px solid ${C.cardBorder}` }}>
                    {[['#', 'left'], ['Trader', 'left'], ['P/L', 'right'], ['WR', 'right'], ['Trades', 'right']].map(([h, align]) => (
                      <div key={h} style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textDim, textAlign: align }}>{h}</div>
                    ))}
                  </div>

                  {/* Table rows */}
                  {leaderboard.map((entry, i) => {
                    const pnl = parseFloat(entry.realized_pnl ?? entry.pnl ?? 0)
                    const wr = parseFloat(entry.win_rate ?? 0)
                    const trades = entry.total_trades ?? entry.closed_trades ?? 0
                    const name = entry.display_name || entry.user_email?.split('@')[0] || `Trader ${i + 1}`
                    const rank = entry.rank_position ?? i + 1
                    const isMe = user && entry.user_email === user.email
                    const rankColor = rank === 1 ? '#f59e0b' : rank === 2 ? '#9ca3af' : rank === 3 ? '#cd7f32' : C.textDim
                    return (
                      <div key={entry.user_email || i} style={{
                        display: 'grid', gridTemplateColumns: '28px 1fr 80px 56px 44px', gap: 8,
                        padding: '10px 8px', borderBottom: `1px solid ${C.divider}`, alignItems: 'center',
                        background: isMe ? `${C.accent}05` : 'transparent',
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: rankColor, fontFamily: 'ui-monospace, monospace' }}>{rank}</div>
                        <div style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {entry.emoji && <span style={{ fontSize: 14, flexShrink: 0 }}>{entry.emoji}</span>}
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                            {isMe && <span style={badge(C.accent)}>tú</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, fontWeight: 700, color: pnl >= 0 ? C.yes : C.no }}>
                          {pnl >= 0 ? '+' : ''}€{pnl.toFixed(0)}
                        </div>
                        <div style={{ textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 12, color: C.textMuted }}>
                          {wr.toFixed(0)}%
                        </div>
                        <div style={{ textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 12, color: C.textDim }}>
                          {trades}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
