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
  const [modalTab, setModalTab] = useState('BOOK')
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [topHolders, setTopHolders] = useState([])
  const [toast, setToast] = useState(null)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [pendingTradeAction, setPendingTradeAction] = useState(null)

  // ─── Design tokens ───────────────────────────────────────────────────────
  const C = {
    bg: '#08080a',
    card: '#0f0f11',
    cardAlt: '#111114',
    cardBorder: '#1c1c20',
    cardBorderHover: '#2a2a32',
    accent: '#2563eb',
    accentLight: '#60a5fa',
    yes: '#10b981',
    no: '#ef4444',
    text: '#f4f4f5',
    textMuted: '#a1a1aa',
    textDim: '#4a4a54',
    surface: '#0a0a0c',
    warning: '#d97706',
    divider: '#16161a',
    shadow: '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
    shadowHover: '0 8px 24px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.4)',
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

  // ─── AMM synthetic order book ────────────────────────────────────────────
  function computeAMMBook(yes_pool, no_pool) {
    const yp = parseFloat(yes_pool) || 5000
    const np = parseFloat(no_pool) || 5000
    const k = yp * np
    const cur = np / (yp + np) * 100
    const amts = [50, 200, 500, 2000]
    // ASK: buying YES → NO pool grows → YES price rises
    const asks = amts.map(a => {
      const np2 = np + a, yp2 = k / np2
      return { price: np2 / (yp2 + np2) * 100, amount: a, synthetic: true }
    }).filter(l => l.price > cur + 0.2 && l.price < 99).sort((a, b) => a.price - b.price)
    // BID: buying NO → YES pool grows → YES price falls
    const bids = amts.map(a => {
      const yp2 = yp + a, np2 = k / yp2
      return { price: np2 / (yp2 + np2) * 100, amount: a, synthetic: true }
    }).filter(l => l.price < cur - 0.2 && l.price > 1).sort((a, b) => b.price - a.price)
    return { bids, asks, mid: cur }
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

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function hasAcceptedDisclaimer() {
    try { return localStorage.getItem('predi_disclaimer_v1') === 'accepted' } catch { return false }
  }

  // SQL needed: CREATE TABLE IF NOT EXISTS comments (
  //   id BIGSERIAL PRIMARY KEY, market_id BIGINT REFERENCES markets(id),
  //   user_email TEXT NOT NULL, text TEXT NOT NULL, likes INT DEFAULT 0,
  //   created_at TIMESTAMPTZ DEFAULT NOW()
  // );
  async function loadComments(marketId) {
    const { data } = await supabase.from('comments').select('*').eq('market_id', marketId).order('created_at', { ascending: false }).limit(20)
    if (data) setComments(data)
  }

  async function loadTopHolders(marketId) {
    const { data } = await supabase.from('trades').select('user_email, side, shares').eq('market_id', marketId).eq('status', 'OPEN')
    if (data) {
      const agg = {}
      data.forEach(t => {
        if (!agg[t.user_email]) agg[t.user_email] = { email: t.user_email, yes: 0, no: 0 }
        if (t.side === 'YES') agg[t.user_email].yes += parseFloat(t.shares || 0)
        else agg[t.user_email].no += parseFloat(t.shares || 0)
      })
      setTopHolders(Object.values(agg).map(h => ({ ...h, total: h.yes + h.no })).sort((a, b) => b.total - a.total).slice(0, 10))
    }
  }

  async function postComment() {
    if (!user || !newComment.trim() || !selectedMarket) return
    const { error } = await supabase.from('comments').insert({ market_id: selectedMarket.id, user_email: user.email, text: newComment.trim() })
    if (!error) { setNewComment(''); loadComments(selectedMarket.id) }
    else showToast('Error al publicar comentario', 'error')
  }

  async function likeComment(commentId) {
    await supabase.rpc('like_comment', { p_comment_id: commentId })
    loadComments(selectedMarket.id)
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
    setModalTab('BOOK')
    setComments([])
    setTopHolders([])
    loadPriceHistory(market.id)
    loadRecentActivity(market.id)
    loadOrderBook(market.id)
    loadComments(market.id)
    loadTopHolders(market.id)
  }

  async function executeTrade() {
    if (!user || !selectedMarket || !tradeImpact || !tradeImpact.valid || processing) return
    if (!hasAcceptedDisclaimer()) { setPendingTradeAction('MARKET'); setShowDisclaimer(true); return }
    setProcessing(true)
    const result = await createTrade(user.email, selectedMarket.id, tradeSide, tradeAmount)
    setProcessing(false)
    if (result.success) {
      const newUser = { ...user, balance: result.new_balance }
      setUser(newUser)
      localStorage.setItem('predi_user', JSON.stringify(newUser))
      setTradeAmount(10)
      loadUserTrades(user.email)
      loadMarkets()
      showToast(`Orden ejecutada: ${tradeSide === 'YES' ? 'SÍ' : 'NO'} €${tradeAmount}`)
    } else {
      showToast(result.error || 'Error al ejecutar orden', 'error')
    }
  }

  async function placeLimitOrder() {
    if (!user || !selectedMarket || processing) return
    if (!hasAcceptedDisclaimer()) { setPendingTradeAction('LIMIT'); setShowDisclaimer(true); return }
    setProcessing(true)
    const { data, error } = await supabase.rpc('place_limit_order', {
      p_email: user.email, p_market_id: selectedMarket.id,
      p_side: tradeSide, p_amount: tradeAmount, p_target_price: limitPrice,
    })
    setProcessing(false)
    if (error) { showToast(error.message, 'error'); return }
    if (data && !data.success) { showToast(data.error, 'error'); return }
    const newUser = { ...user, balance: data.new_balance }
    setUser(newUser)
    localStorage.setItem('predi_user', JSON.stringify(newUser))
    loadOrderBook(selectedMarket.id)
    loadUserTrades(user.email)
    showToast(`Orden límite colocada: ${tradeSide} a ${(limitPrice * 100).toFixed(0)}¢`)
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

  const ALL_CATS = ['ECONOMIA', 'POLITICA', 'DEPORTES', 'ENERGIA', 'CRIPTO', 'ACTUALIDAD', 'GEOPOLITICA', 'CLIMA']
  const activeCats = new Set(activeMarkets.map(m => m.category).filter(Boolean))
  const availableCategories = ['ALL', ...ALL_CATS]

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

  // Racha actual de victorias/derrotas consecutivas
  const streakData = (() => {
    const closed = [...userTrades]
      .filter(t => t.status === 'WON' || t.status === 'LOST')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    if (closed.length === 0) return { count: 0, type: null }
    const first = closed[0].status
    let count = 0
    for (const t of closed) {
      if (t.status === first) count++
      else break
    }
    return { count, type: first }
  })()

  // Trades este mes vs mes anterior
  const now = new Date()
  const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const tradesThisMonth = userTrades.filter(t => new Date(t.created_at) >= thisMonthStart).length
  const tradesPrevMonth = userTrades.filter(t => {
    const d = new Date(t.created_at)
    return d >= prevMonthStart && d < thisMonthStart
  }).length

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 14, lineHeight: 1.5 }}>

      {/* ── HEADER ── */}
      <header style={{ borderBottom: `1px solid ${C.divider}`, background: `${C.bg}e8`, position: 'sticky', top: 0, zIndex: 40, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
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
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '52px 24px 20px' }}>
        <h1 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.2, marginBottom: 8, color: C.text }}>
          Mercados de predicción — España
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6, margin: 0 }}>
            Economía, política y deportes. Resolución automática por oráculo público.
          </p>
          {!user && (
            <button onClick={() => setShowAuth(true)} style={{ padding: '7px 18px', background: C.accent, borderRadius: 6, fontWeight: 600, fontSize: 12, color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s ease' }}>
              Empezar gratis →
            </button>
          )}
        </div>
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
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '12px 0 20px' }}>
          {availableCategories.map(cat => {
            const isActive = catFilter === cat
            const hasMarkets = cat === 'ALL' || activeCats.has(cat)
            return (
              <button
                key={cat}
                onClick={() => hasMarkets && setCatFilter(cat)}
                style={{
                  padding: '5px 13px', fontSize: 12, fontWeight: isActive ? 600 : 400,
                  letterSpacing: '0.01em', borderRadius: 20, transition: 'all 0.2s ease',
                  cursor: hasMarkets ? 'pointer' : 'default',
                  border: `1px solid ${isActive ? C.accent : hasMarkets ? C.cardBorder : C.divider}`,
                  background: isActive ? C.accent : 'transparent',
                  color: isActive ? '#fff' : hasMarkets ? C.textMuted : C.textDim,
                  opacity: hasMarkets ? 1 : 0.4,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                {cat !== 'ALL' && (
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: isActive ? 'rgba(255,255,255,0.7)' : getCategoryColor(cat),
                    display: 'inline-block', flexShrink: 0,
                  }} />
                )}
                {cat === 'ALL' ? 'Todos' : getCategoryLabel(cat)}
                {cat !== 'ALL' && hasMarkets && (
                  <span style={{ fontSize: 10, opacity: 0.6, fontWeight: 400 }}>
                    {activeMarkets.filter(m => m.category === cat).length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── MARKET GRID ── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 56px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: C.textDim, fontSize: 13 }}>Cargando mercados...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: C.textDim, fontSize: 13 }}>No hay mercados activos en este filtro.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {filtered.map((m, index) => {
              const oracle = getOracleDescription(m)
              const isFeatured = index === 0 && filtered.length > 1
              const yesP = parseFloat(m.prices.yes)
              return (
                <div
                  key={m.id}
                  onClick={() => openTradeModal(m)}
                  style={{
                    background: isFeatured ? C.cardAlt : C.card,
                    border: `1px solid ${C.cardBorder}`,
                    borderRadius: 10,
                    padding: isFeatured ? '28px 28px 24px' : '20px 20px 18px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: C.shadow,
                    gridColumn: isFeatured ? 'span 2' : undefined,
                    position: 'relative', overflow: 'hidden',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = C.cardBorderHover
                    e.currentTarget.style.boxShadow = C.shadowHover
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = C.cardBorder
                    e.currentTarget.style.boxShadow = C.shadow
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}>

                  {/* Featured accent line */}
                  {isFeatured && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${C.accent}, ${C.accentLight})`, opacity: 0.6 }} />
                  )}

                  {/* Top: category badge + type + time */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isFeatured ? 16 : 12 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {catBadge(m.category)}
                      <span style={neutralBadge()}>{getTypeLabel(m)}</span>
                      {isFeatured && <span style={{ ...neutralBadge(), color: C.accentLight, borderColor: `${C.accent}40` }}>Destacado</span>}
                    </div>
                    <span style={{ fontSize: 11, color: C.textDim, fontWeight: 400, flexShrink: 0, marginLeft: 8 }}>{getTimeLeft(m.close_date)}</span>
                  </div>

                  {/* Title */}
                  <p style={{
                    fontWeight: 500,
                    fontSize: isFeatured ? 16 : 14,
                    marginBottom: isFeatured ? 24 : 18,
                    lineHeight: 1.5, color: C.text, flex: 1,
                    letterSpacing: isFeatured ? '-0.01em' : 0,
                  }}>{m.title}</p>

                  {/* Prices */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: isFeatured ? 32 : 20, marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>SÍ</div>
                      <span style={{ fontSize: isFeatured ? 32 : 26, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: C.yes, lineHeight: 1 }}>{m.prices.yes}¢</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>NO</div>
                      <span style={{ fontSize: isFeatured ? 32 : 26, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: C.no, lineHeight: 1 }}>{m.prices.no}¢</span>
                    </div>
                  </div>

                  {/* Probability bar — gradient green→red */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ height: 4, borderRadius: 4, background: `linear-gradient(to right, ${C.yes}30, ${C.no}30)`, overflow: 'hidden', position: 'relative' }}>
                      <div style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0,
                        width: `${yesP}%`,
                        background: `linear-gradient(to right, ${C.yes}, ${C.yes}88)`,
                        borderRadius: 4, transition: 'width 0.4s ease',
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: C.textDim }}>
                      <span>SÍ {yesP.toFixed(0)}%</span>
                      <span>NO {(100-yesP).toFixed(0)}%</span>
                    </div>
                  </div>

                  {/* Meta row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ fontSize: 11, color: C.textDim }}>€{((m.total_volume || 0) / 1000).toFixed(1)}K vol · {m.active_traders || m.total_traders || 0} traders</span>
                    <span style={{ fontSize: 10, color: C.textDim }}>{oracle.source}</span>
                  </div>

                  <button
                    style={{ width: '100%', padding: '8px 0', borderRadius: 7, fontWeight: 600, fontSize: 12, border: `1px solid ${C.cardBorder}`, cursor: 'pointer', background: 'transparent', color: C.textMuted, letterSpacing: '0.01em', transition: 'all 0.2s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.accent; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = C.accent }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textMuted; e.currentTarget.style.borderColor = C.cardBorder }}>
                    Predecir →
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
              {(showResolved ? resolvedMarkets : resolvedMarkets.slice(0, 10)).map(m => (
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
            <div style={{ ...panel, maxWidth: 920, width: '100%' }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 16 }}>
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

              {/* Tabs: Libro de Pedidos | Gráfico | Resolución */}
              <div style={{ display: 'flex', borderBottom: `1px solid ${C.cardBorder}`, marginBottom: 20 }}>
                {[['BOOK', 'Libro de Pedidos'], ['CHART', 'Gráfico'], ['RESOLUTION', 'Resolución']].map(([t, label]) => (
                  <button key={t} onClick={() => setModalTab(t)} style={{
                    padding: '8px 16px', fontSize: 12, fontWeight: modalTab === t ? 600 : 400,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: modalTab === t ? C.text : C.textDim,
                    borderBottom: `2px solid ${modalTab === t ? C.accent : 'transparent'}`,
                    marginBottom: -1, transition: 'all 0.15s ease',
                  }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* 2-column body */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, alignItems: 'start' }}>

              {/* ─ LEFT COLUMN — Tab content ─ */}
              <div>

              {/* BOOK TAB — vertical order book + trades + top holders + comments */}
              {modalTab === 'BOOK' && (() => {
                const yp = parseFloat(selectedMarket.yes_pool)
                const np = parseFloat(selectedMarket.no_pool)
                const ammBook = computeAMMBook(yp, np)
                const hasBids = orderBook.some(o => o.side === 'YES')
                const hasAsks = orderBook.some(o => o.side === 'NO')
                const rawBids = hasBids
                  ? orderBook.filter(o => o.side === 'YES').map(o => ({ price: o.target_price * 100, amount: parseFloat(o.total_amount) }))
                  : ammBook.bids
                const rawAsks = hasAsks
                  ? orderBook.filter(o => o.side === 'NO').map(o => ({ price: o.target_price * 100, amount: parseFloat(o.total_amount) }))
                  : ammBook.asks
                // ASK: buy YES (green), sorted highest first (worst deal at top, best near center)
                const asksDesc = [...rawAsks].sort((a, b) => b.price - a.price)
                // BID: buy NO / sell YES (red), sorted highest first (best bid near center)
                const bidsDesc = [...rawBids].sort((a, b) => b.price - a.price)
                // Cumulative volume (grows away from center)
                let askCum = 0
                const asksWithTot = asksDesc.map(l => { askCum += l.amount; return { ...l, total: askCum } }).reverse()
                  .map((l, i, arr) => { const cum = arr.slice(0, i + 1).reduce((s, x) => s + x.amount, 0); return { ...l, total: cum } }).reverse()
                let bidCum = 0
                const bidsWithTot = bidsDesc.map(l => { bidCum += l.amount; return { ...l, total: bidCum } })
                const maxVol = Math.max(1, ...asksDesc.map(l => l.amount), ...bidsDesc.map(l => l.amount))
                const currentYes = parseFloat(selectedMarket.prices.yes)
                const bestAsk = asksDesc.length > 0 ? asksDesc[asksDesc.length - 1].price : currentYes + 2
                const bestBid = bidsDesc.length > 0 ? bidsDesc[0].price : currentYes - 2
                const spread = Math.max(0, bestAsk - bestBid).toFixed(0)
                return (
                  <>
                    {/* Vertical order book */}
                    <div style={{ background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                      {/* Column headers */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '7px 12px', background: C.card, borderBottom: `1px solid ${C.divider}` }}>
                        {['PRECIO', 'CANTIDAD', 'TOTAL'].map((h, i) => (
                          <span key={h} style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textDim, textAlign: i === 0 ? 'left' : i === 1 ? 'center' : 'right' }}>{h}</span>
                        ))}
                      </div>
                      {/* ASK levels — compra SÍ (verde), mayor a menor */}
                      {asksWithTot.slice(0, 5).map((level, i) => (
                        <div key={i} style={{ position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(level.amount / maxVol) * 80}%`, background: `${C.yes}18` }} />
                          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '5px 12px', alignItems: 'center' }}>
                            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: C.yes, fontWeight: 600 }}>{level.price.toFixed(0)}¢</span>
                            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: C.textMuted, textAlign: 'center' }}>€{level.amount.toFixed(0)}</span>
                            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: C.textDim, textAlign: 'right' }}>€{level.total.toFixed(0)}</span>
                          </div>
                        </div>
                      ))}
                      {asksWithTot.length === 0 && <div style={{ padding: '8px 12px', fontSize: 11, color: C.textDim }}>Sin niveles SÍ</div>}
                      {/* Center spread line */}
                      <div style={{ padding: '8px 12px', borderTop: `1px solid ${C.divider}`, borderBottom: `1px solid ${C.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: `${C.card}dd` }}>
                        <span style={{ fontSize: 11 }}>
                          <span style={{ color: C.textDim }}>Precio: </span>
                          <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: C.text }}>{currentYes.toFixed(0)}¢</span>
                        </span>
                        <span style={{ fontSize: 10, color: C.textDim }}>
                          Spread: <span style={{ fontFamily: 'ui-monospace, monospace', color: C.warning }}>{spread}¢</span>
                        </span>
                      </div>
                      {/* BID levels — compra NO (rojo), mayor a menor desde centro */}
                      {bidsWithTot.slice(0, 5).map((level, i) => (
                        <div key={i} style={{ position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(level.amount / maxVol) * 80}%`, background: `${C.no}18` }} />
                          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '5px 12px', alignItems: 'center' }}>
                            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: C.no, fontWeight: 600 }}>{level.price.toFixed(0)}¢</span>
                            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: C.textMuted, textAlign: 'center' }}>€{level.amount.toFixed(0)}</span>
                            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: C.textDim, textAlign: 'right' }}>€{level.total.toFixed(0)}</span>
                          </div>
                        </div>
                      ))}
                      {bidsWithTot.length === 0 && <div style={{ padding: '8px 12px', fontSize: 11, color: C.textDim }}>Sin niveles NO</div>}
                      <div style={{ padding: '4px 12px', background: C.card, borderTop: `1px solid ${C.divider}` }}>
                        <span style={{ fontSize: 9, color: C.textDim, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{(hasBids || hasAsks) ? 'Órdenes límite reales' : 'AMM sintético'}</span>
                      </div>
                    </div>

                    {/* Recent trades */}
                    {recentActivity.length > 0 && (
                      <div style={{ padding: '12px 14px', background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, marginBottom: 16 }}>
                        {sectionLabel('Últimas operaciones')}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {recentActivity.slice(0, 8).map((a, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <span style={badge(a.side === 'YES' ? C.yes : C.no)}>{a.side === 'YES' ? 'SÍ' : 'NO'}</span>
                                <span style={{ color: C.textMuted, fontFamily: 'ui-monospace, monospace' }}>€{parseFloat(a.amount).toFixed(0)}</span>
                              </div>
                              <span style={{ color: C.textDim, fontSize: 10 }}>{new Date(a.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top Holders */}
                    {topHolders.length > 0 && (
                      <div style={{ padding: '12px 14px', background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, marginBottom: 16 }}>
                        {sectionLabel('Top holders')}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {topHolders.map((h, i) => (
                            <div key={h.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                              <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                                <span style={{ fontSize: 10, color: C.textDim, fontFamily: 'ui-monospace, monospace', minWidth: 16 }}>{i + 1}</span>
                                <span style={{ color: C.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                                  {h.email.split('@')[0]}
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                                {h.yes > 0 && <span style={badge(C.yes)}>{h.yes.toFixed(0)} SÍ</span>}
                                {h.no > 0 && <span style={badge(C.no)}>{h.no.toFixed(0)} NO</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Comments */}
                    <div style={{ padding: '12px 14px', background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8 }}>
                      {sectionLabel('Comentarios')}
                      {user && (
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                          <input
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && postComment()}
                            placeholder="Añade un comentario..."
                            style={{ ...inputStyle, flex: 1, fontSize: 13 }}
                          />
                          <button onClick={postComment} style={{ padding: '8px 14px', background: C.accent, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                            Publicar
                          </button>
                        </div>
                      )}
                      {comments.length === 0 ? (
                        <div style={{ fontSize: 12, color: C.textDim, textAlign: 'center', padding: '12px 0' }}>Sin comentarios aún</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {comments.map(c => {
                            const age = (() => {
                              const diff = Date.now() - new Date(c.created_at)
                              const h = Math.floor(diff / 3600000)
                              if (h < 1) return `${Math.floor(diff / 60000)}m`
                              if (h < 24) return `${h}h`
                              return `${Math.floor(h / 24)}d`
                            })()
                            return (
                              <div key={c.id} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                                <div style={{ width: 28, height: 28, borderRadius: 6, background: `${C.accent}18`, border: `1px solid ${C.accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: C.accent, flexShrink: 0 }}>
                                  {c.user_email[0].toUpperCase()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 3 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{c.user_email.split('@')[0]}</span>
                                    <span style={{ fontSize: 10, color: C.textDim }}>hace {age}</span>
                                  </div>
                                  <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5, wordBreak: 'break-word' }}>{c.text}</div>
                                  <button onClick={() => likeComment(c.id)} style={{ marginTop: 4, fontSize: 11, color: C.textDim, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                    ♡ {c.likes || 0}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}

              {/* CHART TAB — price chart */}
              {modalTab === 'CHART' && (() => {
                const rawPrices = priceHistory.map(p => parseFloat(p.yes_price))
                const currentPrice = parseFloat(selectedMarket.prices.yes)
                const prices = rawPrices.length > 0 ? [50, ...rawPrices, currentPrice] : [50, currentPrice]
                if (prices.length < 2) return <div style={{ padding: 24, textAlign: 'center', color: C.textDim, fontSize: 13 }}>Sin historial de precios</div>
                const minP = Math.max(0, Math.min(...prices) - 5)
                const maxP = Math.min(100, Math.max(...prices) + 5)
                const range = maxP - minP || 1
                const first = prices[0], last = prices[prices.length - 1]
                const trend = last > first ? C.yes : last < first ? C.no : C.accent
                return (
                  <div style={{ padding: '14px 16px', background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.textDim, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Precio SÍ</div>
                      <div style={{ fontSize: 12, display: 'flex', gap: 8, alignItems: 'baseline' }}>
                        <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, fontSize: 20, color: trend }}>{last.toFixed(1)}¢</span>
                        <span style={{ color: last > first ? C.yes : C.no, fontSize: 11, fontFamily: 'ui-monospace, monospace' }}>{last > first ? '+' : ''}{(last - first).toFixed(1)} pts</span>
                      </div>
                    </div>
                    <div style={{ height: 160, position: 'relative' }}>
                      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={trend} stopOpacity="0.15" />
                            <stop offset="100%" stopColor={trend} stopOpacity="0.01" />
                          </linearGradient>
                        </defs>
                        <polygon
                          points={`0,100 ${prices.map((p, i) => `${(i / Math.max(prices.length - 1, 1)) * 100},${100 - ((p - minP) / range) * 100}`).join(' ')} 100,100`}
                          fill="url(#chartGrad)" stroke="none"
                        />
                        <polyline
                          points={prices.map((p, i) => `${(i / Math.max(prices.length - 1, 1)) * 100},${100 - ((p - minP) / range) * 100}`).join(' ')}
                          fill="none" stroke={trend} strokeWidth="1.5" vectorEffect="non-scaling-stroke"
                        />
                        {/* 50% reference line */}
                        <line x1="0" y1={`${100 - ((50 - minP) / range) * 100}`} x2="100" y2={`${100 - ((50 - minP) / range) * 100}`}
                          stroke={C.textDim} strokeWidth="0.5" strokeDasharray="2,3" vectorEffect="non-scaling-stroke" opacity="0.4" />
                      </svg>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.textDim, marginTop: 6 }}>
                      <span>Apertura 50%</span>
                      <span>Ahora {currentPrice.toFixed(1)}%</span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.divider}` }}>
                      {[
                        ['Volumen', `€${((selectedMarket.total_volume || 0) / 1000).toFixed(1)}K`],
                        ['Traders', `${selectedMarket.active_traders || selectedMarket.total_traders || 0}`],
                        ['Cierre', getTimeLeft(selectedMarket.close_date)],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textDim, marginBottom: 3 }}>{k}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'ui-monospace, monospace', color: C.text }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* RESOLUTION TAB — oracle + rules */}
              {modalTab === 'RESOLUTION' && (() => {
                const oracle = getOracleDescription(selectedMarket)
                const rules = selectedMarket.resolution_rules || `Este mercado se resolverá como SÍ si se cumple la condición indicada, según datos de ${oracle.source} publicados en ${oracle.url || 'fuente oficial'}. Se resolverá como NO en caso contrario. La resolución es automática y basada en datos públicos verificables. PrediMarket actúa como intermediario tecnológico; no emite opinión sobre el resultado ni garantiza beneficios. Existe riesgo de pérdida total del capital invertido.`
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ padding: '14px 16px', background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8 }}>
                      {sectionLabel('Fuente del oráculo')}
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.accentLight, marginBottom: 6 }}>{oracle.source}</div>
                      <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>{oracle.method}</div>
                      {oracle.url && (
                        <a href={oracle.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11, color: C.accent, textDecoration: 'none' }}>
                          Ver fuente oficial ↗
                        </a>
                      )}
                    </div>
                    <div style={{ padding: '14px 16px', background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8 }}>
                      {sectionLabel('Reglas de resolución')}
                      <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.7 }}>{rules}</div>
                    </div>
                    <div style={{ padding: '12px 14px', background: `${C.warning}06`, border: `1px solid ${C.warning}18`, borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: C.warning, fontWeight: 600, marginBottom: 4 }}>Aviso de riesgo</div>
                      <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.6 }}>
                        PrediMarket es un mercado de predicción con créditos virtuales. La resolución depende de fuentes externas. No constituye asesoramiento financiero. Riesgo de pérdida total del capital.
                      </div>
                    </div>
                  </div>
                )
              })()}

              </div>{/* end left column */}

              {/* ─ RIGHT COLUMN — Trade controls (always visible) ─ */}
              <div style={{ position: 'sticky', top: 24 }}>
              {!isExpired(selectedMarket.close_date) ? (
                <>
                  {/* Order type toggle — 44px height */}
                  <div style={{ display: 'flex', background: C.surface, borderRadius: 8, padding: 3, marginBottom: 14, border: `1px solid ${C.cardBorder}` }}>
                    {[['MARKET', '⚡ Mercado'], ['LIMIT', '📋 Límite']].map(([mode, label]) => (
                      <button key={mode} onClick={() => setOrderMode(mode)} style={{
                        flex: 1, height: 44, borderRadius: 6, fontSize: 13, fontWeight: orderMode === mode ? 700 : 400,
                        border: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
                        background: orderMode === mode ? '#fff' : 'transparent',
                        color: orderMode === mode ? '#0a0a0a' : C.textDim,
                        boxShadow: orderMode === mode ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                      }}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* YES / NO selector — 56px height */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                    {['YES', 'NO'].map(side => {
                      const isSelected = tradeSide === side
                      const color = side === 'YES' ? C.yes : C.no
                      return (
                        <button key={side} onClick={() => setTradeSide(side)} style={{
                          minHeight: 56, padding: '12px 8px', borderRadius: 8, fontWeight: 700, cursor: 'pointer',
                          border: `2px solid ${isSelected ? color : C.cardBorder}`,
                          background: isSelected ? color : `${color}08`,
                          color: isSelected ? '#fff' : color,
                          transition: 'all 0.2s ease',
                          transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                          boxShadow: isSelected ? `0 4px 16px ${color}40` : 'none',
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>{side === 'YES' ? 'SÍ' : 'NO'}</div>
                          <div style={{ fontSize: 24, fontFamily: 'ui-monospace, monospace', lineHeight: 1 }}>
                            {side === 'YES' ? selectedMarket.prices.yes : selectedMarket.prices.no}¢
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Limit price */}
                  {orderMode === 'LIMIT' && (
                    <div style={{ marginBottom: 14, padding: '12px 14px', background: C.surface, borderRadius: 7, border: `1px solid ${C.cardBorder}` }}>
                      {sectionLabel('Precio límite')}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input type="range" min="5"
                          max={Math.max(6, parseInt(tradeSide === 'YES' ? selectedMarket.prices.yes : selectedMarket.prices.no) - 1)}
                          value={limitPrice * 100} onChange={e => setLimitPrice(e.target.value / 100)}
                          style={{ flex: 1, accentColor: C.accent }} />
                        <span style={{ minWidth: 48, textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontWeight: 700, fontSize: 18, color: C.accentLight }}>
                          {(limitPrice * 100).toFixed(0)}¢
                        </span>
                      </div>
                      <div style={{ marginTop: 6, fontSize: 11, color: C.textDim }}>
                        Actual: {tradeSide === 'YES' ? selectedMarket.prices.yes : selectedMarket.prices.no}¢ · Retorno si ejecuta: +{((1 / limitPrice - 1) * 100).toFixed(0)}%
                      </div>
                    </div>
                  )}

                  {/* Amount */}
                  <div style={{ marginBottom: 14 }}>
                    {sectionLabel('Cantidad')}
                    <input
                      type="number" value={tradeAmount}
                      onChange={e => setTradeAmount(Math.max(1, Number(e.target.value)))}
                      style={{ ...inputStyle, fontSize: 18, fontWeight: 700, fontFamily: 'ui-monospace, monospace', marginBottom: 8 }}
                      min="1" max={user?.balance || 1000} />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                      {[10, 25, 50, 100].map(v => (
                        <button key={v} onClick={() => setTradeAmount(v)} style={{
                          padding: '6px 0', fontSize: 12, fontWeight: 500, background: 'transparent',
                          color: tradeAmount === v ? C.text : C.textDim,
                          borderRadius: 6, border: `1px solid ${tradeAmount === v ? C.accent : C.cardBorder}`, cursor: 'pointer',
                        }}>
                          {v}€
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summary box — highlighted with left border */}
                  <div style={{
                    background: '#111114',
                    border: `1px solid ${C.cardBorder}`,
                    borderLeft: `3px solid ${tradeSide === 'YES' ? C.yes : C.no}`,
                    borderRadius: 7, padding: '14px 16px', marginBottom: 14,
                  }}>
                    {orderMode === 'MARKET' ? (
                      tradeImpact && tradeImpact.valid ? (
                        <>
                          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
                            Compras <span style={{ fontWeight: 700, color: C.text }}>{tradeImpact.shares.toFixed(2)} contratos</span> de <span style={{ fontWeight: 700, color: tradeSide === 'YES' ? C.yes : C.no }}>{tradeSide === 'YES' ? 'SÍ' : 'NO'}</span> a <span style={{ fontFamily: 'ui-monospace, monospace' }}>{(tradeImpact.avgPrice * 100).toFixed(1)}¢</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div>
                              <div style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>Impacto precio</div>
                              <div style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', color: C.textMuted }}>{tradeImpact.priceImpactPercent}¢</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>Retorno potencial</div>
                              <div style={{ fontSize: 22, fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: C.yes, lineHeight: 1 }}>
                                +{tradeImpact.roi.toFixed(0)}%
                              </div>
                              <div style={{ fontSize: 11, color: C.yes, fontFamily: 'ui-monospace, monospace' }}>€{tradeImpact.potentialWinnings.toFixed(2)} si acierta</div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: 12, color: C.no }}>{tradeImpact?.error || 'Introduce una cantidad'}</div>
                      )
                    ) : (
                      <>
                        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
                          Orden límite {tradeSide} — ejecutar a ≤{(limitPrice * 100).toFixed(0)}¢
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <div>
                            <div style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>Reservado</div>
                            <div style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', color: C.textMuted }}>€{tradeAmount}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>Retorno potencial</div>
                            <div style={{ fontSize: 22, fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: C.yes, lineHeight: 1 }}>
                              +{((1 / limitPrice - 1) * 100).toFixed(0)}%
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Execute button — 56px, full width, green/red */}
                  {orderMode === 'MARKET' ? (
                    <button
                      onClick={executeTrade}
                      disabled={!tradeImpact || !tradeImpact.valid || tradeAmount > (user?.balance || 0) || processing}
                      style={{
                        width: '100%', height: 56, borderRadius: 8, fontWeight: 700, fontSize: 15,
                        border: 'none', cursor: (!tradeImpact || !tradeImpact.valid || tradeAmount > (user?.balance || 0) || processing) ? 'not-allowed' : 'pointer',
                        letterSpacing: '-0.01em', transition: 'all 0.15s ease',
                        background: (!tradeImpact || !tradeImpact.valid || tradeAmount > (user?.balance || 0) || processing) ? C.cardBorder : (tradeSide === 'YES' ? C.yes : C.no),
                        color: (!tradeImpact || !tradeImpact.valid || tradeAmount > (user?.balance || 0) || processing) ? C.textDim : '#fff',
                        boxShadow: (!tradeImpact || !tradeImpact.valid || tradeAmount > (user?.balance || 0) || processing) ? 'none' : `0 4px 20px ${tradeSide === 'YES' ? C.yes : C.no}40`,
                        marginBottom: 14,
                      }}
                      onMouseEnter={e => { if (!processing && tradeImpact?.valid) { e.currentTarget.style.filter = 'brightness(1.12)'; e.currentTarget.style.boxShadow = `0 6px 28px ${tradeSide === 'YES' ? C.yes : C.no}60` } }}
                      onMouseLeave={e => { e.currentTarget.style.filter = ''; e.currentTarget.style.boxShadow = (!tradeImpact || !tradeImpact.valid) ? 'none' : `0 4px 20px ${tradeSide === 'YES' ? C.yes : C.no}40` }}>
                      {processing ? (
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                          Procesando...
                        </span>
                      ) : !tradeImpact ? 'Calculando...'
                        : !tradeImpact.valid ? tradeImpact.error
                        : tradeAmount > (user?.balance || 0) ? 'Saldo insuficiente'
                        : `Comprar ${tradeSide === 'YES' ? 'SÍ' : 'NO'} — €${tradeAmount}`}
                    </button>
                  ) : (
                    <button
                      onClick={placeLimitOrder}
                      disabled={processing || tradeAmount > (user?.balance || 0)}
                      style={{
                        width: '100%', height: 56, borderRadius: 8, fontWeight: 700, fontSize: 15,
                        border: 'none', cursor: (processing || tradeAmount > (user?.balance || 0)) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease',
                        background: (processing || tradeAmount > (user?.balance || 0)) ? C.cardBorder : C.accent,
                        color: (processing || tradeAmount > (user?.balance || 0)) ? C.textDim : '#fff',
                        boxShadow: (processing || tradeAmount > (user?.balance || 0)) ? 'none' : `0 4px 20px ${C.accent}40`,
                        marginBottom: 14,
                      }}>
                      {processing ? 'Procesando...' : tradeAmount > (user?.balance || 0) ? 'Saldo insuficiente' : `Colocar límite ${tradeSide === 'YES' ? 'SÍ' : 'NO'} a ${(limitPrice * 100).toFixed(0)}¢`}
                    </button>
                  )}

                  {/* User's open positions in this market */}
                  {(() => {
                    const myTrades = userTrades.filter(t => t.market_id == selectedMarket.id && t.status === 'OPEN')
                    if (myTrades.length === 0) return null
                    return (
                      <div style={{ padding: '12px 14px', background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 7, marginBottom: 14 }}>
                        {sectionLabel('Mis posiciones en este mercado')}
                        {myTrades.map(t => (
                          <div key={t.id} style={{ padding: '8px 0', borderBottom: `1px solid ${C.divider}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <span style={badge(t.side === 'YES' ? C.yes : C.no)}>{t.side === 'YES' ? 'SÍ' : 'NO'}</span>
                                <span style={{ fontSize: 11, color: C.textMuted }}>{t.shares?.toFixed(1)} contratos · €{t.amount?.toFixed(0)} invertido</span>
                              </div>
                              <span style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: (t.profit || 0) >= 0 ? C.yes : C.no }}>
                                {(t.profit || 0) >= 0 ? '+' : ''}€{(t.profit || 0).toFixed(1)}
                              </span>
                            </div>
                            <button onClick={() => { handleSell(t) }} style={{ fontSize: 11, color: C.no, background: 'none', border: `1px solid ${C.no}25`, borderRadius: 4, padding: '3px 10px', cursor: 'pointer', width: '100%' }}>
                              Vender ~€{t.currentValue?.toFixed(2)}
                            </button>
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  {/* My pending orders */}
                  {userOrders.length > 0 && (
                    <div style={{ padding: '12px 14px', background: C.surface, borderRadius: 7, border: `1px solid ${C.cardBorder}` }}>
                      {sectionLabel('Mis órdenes pendientes')}
                      {userOrders.map(o => (
                        <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${C.divider}` }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={badge(o.side === 'YES' ? C.yes : C.no)}>{o.side === 'YES' ? 'SÍ' : 'NO'}</span>
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
              </div>{/* end right column */}
              </div>{/* end 2-column grid */}
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
              {Object.keys(catBreakdown).length > 0 && (() => {
                const sorted = Object.entries(catBreakdown).sort((a, b) => b[1].count - a[1].count)
                const maxCount = Math.max(1, ...sorted.map(([, d]) => d.count))
                const bestCat = sorted.reduce((best, cur) => {
                  const wr = (cur[1].won + cur[1].lost) > 0 ? cur[1].won / (cur[1].won + cur[1].lost) : 0
                  const bestWr = (best[1].won + best[1].lost) > 0 ? best[1].won / (best[1].won + best[1].lost) : 0
                  return wr > bestWr ? cur : best
                }, sorted[0])
                const worstCat = sorted.reduce((worst, cur) => {
                  const wr = (cur[1].won + cur[1].lost) > 0 ? cur[1].won / (cur[1].won + cur[1].lost) : 1
                  const worstWr = (worst[1].won + worst[1].lost) > 0 ? worst[1].won / (worst[1].won + worst[1].lost) : 1
                  return wr < worstWr ? cur : worst
                }, sorted[0])
                return (
                  <div style={{ padding: '14px 16px', background: C.surface, borderRadius: 7, border: `1px solid ${C.cardBorder}`, marginBottom: 14 }}>
                    {sectionLabel('Por categoría')}
                    {/* Best / worst */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                      <div style={{ flex: 1, padding: '8px 10px', background: `${C.yes}08`, border: `1px solid ${C.yes}20`, borderRadius: 6 }}>
                        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: C.yes, marginBottom: 2 }}>MEJOR</div>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>{getCategoryLabel(bestCat[0])}</div>
                        <div style={{ fontSize: 10, color: C.textDim }}>{((bestCat[1].won + bestCat[1].lost) > 0 ? bestCat[1].won / (bestCat[1].won + bestCat[1].lost) * 100 : 0).toFixed(0)}% WR</div>
                      </div>
                      <div style={{ flex: 1, padding: '8px 10px', background: `${C.no}08`, border: `1px solid ${C.no}20`, borderRadius: 6 }}>
                        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: C.no, marginBottom: 2 }}>PEOR</div>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>{getCategoryLabel(worstCat[0])}</div>
                        <div style={{ fontSize: 10, color: C.textDim }}>{((worstCat[1].won + worstCat[1].lost) > 0 ? worstCat[1].won / (worstCat[1].won + worstCat[1].lost) * 100 : 0).toFixed(0)}% WR</div>
                      </div>
                    </div>
                    {/* Horizontal bars */}
                    {sorted.map(([cat, data]) => {
                      const wr = (data.won + data.lost) > 0 ? (data.won / (data.won + data.lost) * 100) : 0
                      const color = getCategoryColor(cat)
                      return (
                        <div key={cat} style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <div style={{ width: 6, height: 6, borderRadius: 2, background: color, flexShrink: 0 }} />
                              <span style={{ fontSize: 12, fontWeight: 500 }}>{getCategoryLabel(cat)}</span>
                              <span style={{ fontSize: 10, color: C.textDim }}>{data.count} trades</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span style={{ fontSize: 10, color: C.textDim }}>{wr.toFixed(0)}% WR</span>
                              <span style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: data.pnl >= 0 ? C.yes : C.no }}>
                                {data.pnl >= 0 ? '+' : ''}€{data.pnl.toFixed(0)}
                              </span>
                            </div>
                          </div>
                          {/* Bar: trades count */}
                          <div style={{ height: 3, borderRadius: 2, background: C.divider, overflow: 'hidden' }}>
                            <div style={{ width: `${(data.count / maxCount) * 100}%`, height: '100%', background: color, opacity: 0.6, transition: 'width 0.4s ease' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}

              {/* Stats */}
              <div style={{ padding: '14px 16px', background: C.surface, borderRadius: 7, border: `1px solid ${C.cardBorder}`, marginBottom: 14 }}>
                {sectionLabel('Estadísticas')}
                {[
                  ['Total operaciones', userTrades.length, null],
                  ['Ganadas', wonTrades.length, C.yes],
                  ['Perdidas', lostTrades.length, C.no],
                  ['Vendidas', soldTrades.length, C.accentLight],
                  ['Mayor ganancia', realizedTrades.length > 0 ? `+€${Math.max(0, ...realizedTrades.map(t => t.pnl || 0)).toFixed(0)}` : '—', C.yes],
                  ['Mayor pérdida', realizedTrades.length > 0 ? `-€${Math.abs(Math.min(0, ...realizedTrades.map(t => t.pnl || 0))).toFixed(0)}` : '—', C.no],
                  ['Avg por trade', realizedTrades.length > 0 ? `${realizedPnL >= 0 ? '+' : ''}€${(realizedPnL / realizedTrades.length).toFixed(1)}` : '—', null],
                  ['Racha actual', streakData.count > 0 ? `${streakData.count} ${streakData.type === 'WON' ? 'ganadas' : 'perdidas'}` : '—', streakData.type === 'WON' ? C.yes : streakData.type === 'LOST' ? C.no : null],
                  ['Este mes', `${tradesThisMonth} trades`, null],
                  ['Mes anterior', `${tradesPrevMonth} trades`, tradesPrevMonth > 0 && tradesThisMonth > tradesPrevMonth ? C.yes : null],
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

      {/* ── DISCLAIMER MODAL ── */}
      {showDisclaimer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ ...panel, maxWidth: 440, width: '100%' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 16 }}>Antes de tu primera operación</h2>
            <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7, marginBottom: 20, padding: '14px 16px', background: C.surface, borderRadius: 7, border: `1px solid ${C.cardBorder}` }}>
              PrediMarket es una plataforma de mercados de predicción con <strong style={{ color: C.text }}>créditos virtuales</strong>. Al operar, aceptas que:
              <ul style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li>Puedes perder el 100% del crédito invertido en cada operación</li>
                <li>PrediMarket actúa como intermediario tecnológico, no como asesor financiero</li>
                <li>La resolución depende de oráculos externos y datos públicos verificables</li>
                <li>Los créditos son virtuales y no tienen valor monetario real</li>
              </ul>
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 16 }}>
              <input
                type="checkbox"
                id="disclaimer-check"
                style={{ marginTop: 2, width: 16, height: 16, accentColor: C.accent, flexShrink: 0 }}
                onChange={e => {
                  document.getElementById('disclaimer-accept-btn').disabled = !e.target.checked
                  document.getElementById('disclaimer-accept-btn').style.opacity = e.target.checked ? '1' : '0.4'
                }}
              />
              <span style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>
                Entiendo que puedo perder el 100% de mis créditos y que PrediMarket es un intermediario tecnológico, no un servicio financiero regulado.
              </span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setShowDisclaimer(false); setPendingTradeAction(null) }}
                style={{ flex: 1, padding: '11px 0', borderRadius: 7, border: `1px solid ${C.cardBorder}`, background: 'transparent', color: C.textDim, fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button
                id="disclaimer-accept-btn"
                disabled
                style={{ flex: 2, padding: '11px 0', borderRadius: 7, border: 'none', background: C.accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: 0.4, transition: 'opacity 0.15s' }}
                onClick={() => {
                  localStorage.setItem('predi_disclaimer_v1', 'accepted')
                  setShowDisclaimer(false)
                  if (pendingTradeAction === 'MARKET') executeTrade()
                  else if (pendingTradeAction === 'LIMIT') placeLimitOrder()
                  setPendingTradeAction(null)
                }}>
                Acepto — Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, padding: '12px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: toast.type === 'error' ? '#1a0a0a' : '#0a1a0f',
          border: `1px solid ${toast.type === 'error' ? C.no + '60' : C.yes + '60'}`,
          color: toast.type === 'error' ? C.no : C.yes,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fadeInUp 0.2s ease',
          whiteSpace: 'nowrap',
        }}>
          <span>{toast.type === 'error' ? '✕' : '✓'}</span>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      `}</style>
    </div>
  )
}
