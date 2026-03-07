import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { getActiveMarkets, getResolvedMarkets, getOrCreateUser, createTrade, getUserTrades, getPriceHistory, sellPosition } from '../lib/supabase'
import { previewTrade, previewSellValue, calculatePrices } from '../lib/amm'
import { supabase } from '../lib/supabase'
import { getLeaderboard } from '../lib/leaderboard'
import { C, modalStyle, panelStyle, closeBtnStyle, inputStyle, badge, neutralBadge } from '../lib/theme'
import MarketNav from '../components/Marketnav'
import MarketHero from '../components/Markethero'
import MarketFilters from '../components/Marketfilters'
import MarketGrid from '../components/MarketGrid'
import TrendingRow from '../components/TrendingRow'

const TradingModal = dynamic(() => import('../components/TradingModal'), { ssr: false })
const ProfileModal = dynamic(() => import('../components/ProfileModal'), { ssr: false })

export default function Home() {
  // ─── State ────────────────────────────────────────────────────────────────
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
  const [trendingMarkets, setTrendingMarkets] = useState([])

  // ─── Lifecycle ────────────────────────────────────────────────────────────
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

  // ─── Data loaders ─────────────────────────────────────────────────────────
  async function loadMarkets() {
    setLoading(true)
    const data = await getActiveMarkets()
    const enriched = data.map(m => ({
      ...m,
      prices: calculatePrices(parseFloat(m.yes_pool), parseFloat(m.no_pool)),
      isExpired: new Date(m.close_date) < new Date(),
    }))
    setMarkets(enriched)
    // Compute trending: top 4 by volume among active, non-expired
    const active = enriched.filter(m => !m.isExpired)
    const trending = [...active]
      .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
      .slice(0, 4)
    setTrendingMarkets(trending)
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

  async function loadPriceHistory(marketId) {
    const history = await getPriceHistory(marketId, 168)
    setPriceHistory(history)
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function hasAcceptedDisclaimer() {
    try { return localStorage.getItem('predi_disclaimer_v1') === 'accepted' } catch { return false }
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────
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

  // ─── Trade handlers ───────────────────────────────────────────────────────
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

  // ─── Computed ─────────────────────────────────────────────────────────────
  const activeMarkets = markets.filter(m => !m.isExpired)
  const pendingMarkets = markets.filter(m => m.isExpired)
  const openTrades = userTrades.filter(t => t.status === 'OPEN')

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

  // Leaderboard helpers
  const rankColor = (rank) => rank === 1 ? '#f59e0b' : rank === 2 ? '#9ca3af' : rank === 3 ? '#cd7f32' : C.textDim

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: C.bg, color: C.text,
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: 14, lineHeight: 1.5,
    }}>

      <MarketNav
        user={user}
        openTradesCount={openTrades.length}
        onShowLeaderboard={() => { setShowLeaderboard(true); loadLeaderboard() }}
        onShowPortfolio={() => { setShowPortfolio(true); loadUserTrades(user.email) }}
        onShowProfile={() => { setShowProfile(true); loadUserTrades(user.email) }}
        onShowAuth={() => setShowAuth(true)}
        onLogout={handleLogout}
      />

      <MarketHero user={user} onShowAuth={() => setShowAuth(true)} />

      <MarketFilters
        filter={filter} setFilter={setFilter}
        catFilter={catFilter} setCatFilter={setCatFilter}
        activeMarkets={activeMarkets}
      />

      <TrendingRow markets={trendingMarkets} onOpen={openTradeModal} />

      <MarketGrid
        filtered={filtered}
        loading={loading}
        pendingMarkets={pendingMarkets}
        resolvedMarkets={resolvedMarkets}
        showResolved={showResolved}
        setShowResolved={setShowResolved}
        onOpen={openTradeModal}
      />

      {/* ── AUTH MODAL ── */}
      {showAuth && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ ...panelStyle, maxWidth: 360, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.025em' }}>Empezar</h2>
              <button onClick={() => setShowAuth(false)} style={closeBtnStyle}>✕</button>
            </div>
            <form onSubmit={handleLogin}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textDim, marginBottom: 7 }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                style={{ ...inputStyle, marginBottom: 12 }} placeholder="tu@email.com" required
              />
              <button type="submit" style={{ width: '100%', background: C.accent, color: '#fff', fontWeight: 600, padding: '11px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 14 }}>
                Empezar con 1.000 créditos
              </button>
            </form>
            <p style={{ fontSize: 11, color: C.textDim, marginTop: 14, textAlign: 'center', lineHeight: 1.5 }}>Créditos virtuales · Sin riesgo real</p>
          </div>
        </div>
      )}

      {/* ── TRADE MODAL (lazy) ── */}
      {showTradeModal && selectedMarket && (
        <TradingModal
          market={selectedMarket}
          user={user}
          userTrades={userTrades}
          tradeSide={tradeSide} setTradeSide={setTradeSide}
          tradeAmount={tradeAmount} setTradeAmount={setTradeAmount}
          orderMode={orderMode} setOrderMode={setOrderMode}
          limitPrice={limitPrice} setLimitPrice={setLimitPrice}
          modalTab={modalTab} setModalTab={setModalTab}
          tradeImpact={tradeImpact}
          processing={processing}
          priceHistory={priceHistory}
          recentActivity={recentActivity}
          orderBook={orderBook}
          userOrders={userOrders}
          comments={comments}
          newComment={newComment} setNewComment={setNewComment}
          topHolders={topHolders}
          onClose={() => setShowTradeModal(false)}
          onExecuteTrade={executeTrade}
          onLimitOrder={placeLimitOrder}
          onCancelOrder={cancelOrder}
          onSell={handleSell}
          onPostComment={postComment}
          onLikeComment={likeComment}
        />
      )}

      {/* ── PORTFOLIO MODAL ── */}
      {showPortfolio && (
        <div style={modalStyle}>
          <div style={{ minHeight: '100%', padding: '24px 16px' }}>
            <div style={{ ...panelStyle, maxWidth: 640, margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.025em' }}>Posiciones abiertas</h2>
                <button onClick={() => setShowPortfolio(false)} style={closeBtnStyle}>✕</button>
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

      {/* ── PROFILE MODAL (lazy) ── */}
      {showProfile && user && (
        <ProfileModal
          user={user}
          userTrades={userTrades}
          onClose={() => setShowProfile(false)}
        />
      )}

      {/* ── LEADERBOARD MODAL ── */}
      {showLeaderboard && (
        <div style={modalStyle}>
          <div style={{ minHeight: '100%', padding: '24px 16px' }}>
            <div style={{ ...panelStyle, maxWidth: 540, margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 4 }}>Ranking</h2>
                  <div style={{ fontSize: 11, color: C.textDim }}>P/L realizado · Trades cerrados (WON / LOST / SOLD)</div>
                </div>
                <button onClick={() => setShowLeaderboard(false)} style={closeBtnStyle}>✕</button>
              </div>
              {leaderboard.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: C.textDim, fontSize: 13 }}>Cargando ranking...</div>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 80px 56px 44px', gap: 8, padding: '0 8px 10px', borderBottom: `1px solid ${C.cardBorder}` }}>
                    {[['#', 'left'], ['Trader', 'left'], ['P/L', 'right'], ['WR', 'right'], ['Trades', 'right']].map(([h, align]) => (
                      <div key={h} style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textDim, textAlign: align }}>{h}</div>
                    ))}
                  </div>
                  {leaderboard.map((entry, i) => {
                    const pnl = parseFloat(entry.realized_pnl ?? entry.pnl ?? 0)
                    const wr = parseFloat(entry.win_rate ?? 0)
                    const trades = entry.total_trades ?? entry.closed_trades ?? 0
                    const name = entry.display_name || entry.user_email?.split('@')[0] || `Trader ${i + 1}`
                    const rank = entry.rank_position ?? i + 1
                    const isMe = user && entry.user_email === user.email
                    return (
                      <div key={entry.user_email || i} style={{
                        display: 'grid', gridTemplateColumns: '28px 1fr 80px 56px 44px', gap: 8,
                        padding: '10px 8px', borderBottom: `1px solid ${C.divider}`, alignItems: 'center',
                        background: isMe ? `${C.accent}05` : 'transparent',
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: rankColor(rank), fontFamily: 'ui-monospace, monospace' }}>{rank}</div>
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
          <div style={{ ...panelStyle, maxWidth: 440, width: '100%' }}>
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
